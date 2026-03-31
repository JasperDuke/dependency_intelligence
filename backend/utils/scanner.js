const axios = require('axios');
const DataSource = require('../models/DataSource');
const {
    osvVulnAffectsPackageVersion,
    npmAdvisoryAffectsVersion,
    describeOsvVulnerableRanges,
    npmAdvisoryAffectedRange,
} = require('./versionMatch');

const scoreToLabel = (score) => {
    const n = parseFloat(score);
    if (Number.isNaN(n)) return '';
    if (n >= 9.0) return 'CRITICAL';
    if (n >= 7.0) return 'HIGH';
    if (n >= 4.0) return 'MEDIUM';
    return 'LOW';
};

const osvSeverityLabel = (vuln) => {
    if (!vuln.severity || !Array.isArray(vuln.severity)) return '';
    let best = 0;
    let label = '';
    for (const s of vuln.severity) {
        const sc = parseFloat(s.score);
        if (!Number.isNaN(sc) && sc >= best) {
            best = sc;
            label = scoreToLabel(sc) || s.type || '';
        }
    }
    if (label) return label;
    const db = vuln.database_specific;
    if (db && db.severity) return String(db.severity).toUpperCase();
    return '';
};

const osvFixedHint = (vuln) => {
    const fixes = [];
    if (!vuln.affected) return '';
    for (const aff of vuln.affected) {
        if (!aff.ranges) continue;
        for (const r of aff.ranges) {
            if (!r.events) continue;
            for (const ev of r.events) {
                if (ev.fixed) fixes.push(ev.fixed);
            }
        }
    }
    if (fixes.length) return [...new Set(fixes)].join(', ');
    return '';
};

// 1. OSV Strategy
const checkOSV = async (pkgName, version, ecosystem) => {
    const result = { id: 'osv', hasHit: false, vulns: [], hasHistoricBreach: false, historicCount: 0 };
    try {
        const strictPayload = { version, package: { name: pkgName, ecosystem: ecosystem === 'npm' ? 'npm' : 'PyPI' } };
        const res = await axios.post('https://api.osv.dev/v1/query', strictPayload);

        const broadPayload = { package: { name: pkgName, ecosystem: ecosystem === 'npm' ? 'npm' : 'PyPI' } };

        if (res.data && res.data.vulns && res.data.vulns.length > 0) {
            const raw = res.data.vulns;
            const detailed = await Promise.all(
                raw.map(async (v) => {
                    if (v.summary && v.affected) return v;
                    try {
                        const d = await axios.get(`https://api.osv.dev/v1/vulns/${encodeURIComponent(v.id)}`);
                        return d.data || v;
                    } catch {
                        return v;
                    }
                })
            );
            const affectsUs = detailed.filter((v) =>
                osvVulnAffectsPackageVersion(pkgName, version, ecosystem, v)
            );
            if (affectsUs.length > 0) {
                result.hasHit = true;
                result.vulns = affectsUs.map((v) => {
                    const fixed = osvFixedHint(v) || '';
                    const sev = osvSeverityLabel(v);
                    const affectedRange = describeOsvVulnerableRanges(v, ecosystem);
                    return {
                        id: v.id,
                        source: 'OSV',
                        summary: v.summary || 'No summary available',
                        details: v.details && v.details.length > 500 ? `${v.details.substring(0, 500)}…` : (v.details || ''),
                        published: v.published,
                        fixedVersion: fixed || 'See OSV advisory — upgrade to a non-affected release',
                        severity: sev,
                        affectedRange: affectedRange || undefined,
                    };
                });
                result.hasHistoricBreach = true;
                result.historicCount = result.vulns.length;
            }
        }

        if (!result.hasHit) {
            const broadRes = await axios.post('https://api.osv.dev/v1/query', broadPayload);
            if (broadRes.data && broadRes.data.vulns && broadRes.data.vulns.length > 0) {
                result.hasHistoricBreach = true;
                result.historicCount = broadRes.data.vulns.length;
            }
        }
    } catch (e) { console.error('OSV Error', e.message); }
    return result;
};

// 2. NPM Native Bulk Advisory Strategy
const checkNPM = async (pkgName, version, ecosystem) => {
    const result = { id: 'npm', hasHit: false, vulns: [], hasHistoricBreach: false, historicCount: 0 };
    if (ecosystem !== 'npm') return result;

    try {
        const payload = {};
        payload[pkgName] = [version];
        const res = await axios.post('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', payload);
        if (res.data && res.data[pkgName] && res.data[pkgName].length > 0) {
            const rawList = res.data[pkgName];
            const filtered = rawList.filter((adv) => npmAdvisoryAffectsVersion(version, adv));
            if (filtered.length === 0) {
                result.hasHit = false;
                result.vulns = [];
            } else {
                result.hasHit = true;
                result.vulns = filtered.map((v) => {
                    const sev = (v.severity && String(v.severity).toUpperCase()) || '';
                    const ar = npmAdvisoryAffectedRange(v);
                    return {
                        id: v.cwe?.join(', ') || `NPM-${v.id}`,
                        source: 'NPM',
                        summary: v.title,
                        details: v.overview || '…',
                        published: v.created,
                        fixedVersion: v.patched_versions || 'None listed',
                        severity: sev,
                        affectedRange: ar || undefined,
                    };
                });
                result.hasHistoricBreach = true;
                result.historicCount = result.vulns.length;
            }
        }
    } catch (e) { console.error('NPM API Error', e.message); }
    return result;
};

// 3. SNYK — GET /v1/test/{npm|pip}/{package}/{version} (snyk.io)
// Docs: `Authorization: token <key>` — key from https://app.snyk.io/account
// Plan limits may still return 403; OSV + npm remain available.
const checkSnyk = async (pkgName, version, ecosystem, apiKey) => {
    const result = { id: 'snyk', hasHit: false, vulns: [], hasHistoricBreach: false, historicCount: 0 };
    try {
        if (!apiKey) return result;
        const snykEcosystem = ecosystem === 'npm' ? 'npm' : 'pip';
        const url = `https://snyk.io/api/v1/test/${snykEcosystem}/${encodeURIComponent(pkgName)}/${encodeURIComponent(version)}`;
        const key = String(apiKey).trim();
        const headers = { Authorization: `token ${key}` };

        let res;
        try {
            res = await axios.get(url, { headers, timeout: 25000 });
        } catch (e) {
            const st = e.response?.status;
            if (st === 404) return result;
            if (st === 403) {
                const detail = e.response?.data && (typeof e.response.data === 'string'
                    ? e.response.data
                    : JSON.stringify(e.response.data).slice(0, 200));
                console.error(
                    'Snyk 403:',
                    detail || e.message,
                    '— Key from https://app.snyk.io/account; plan may block REST test API (use OSV + npm).'
                );
            } else if (st && st !== 404) {
                console.error('Snyk Error', st, e.message);
            }
            return result;
        }

        if (res && res.data && res.data.vulnerabilities && res.data.vulnerabilities.length > 0) {
            result.hasHit = true;
            result.vulns = res.data.vulnerabilities.map((v) => {
                let sev = '';
                if (v.severity) sev = String(v.severity).toUpperCase();
                else if (v.cvssScore >= 9) sev = 'CRITICAL';
                else if (v.cvssScore >= 7) sev = 'HIGH';
                else if (v.cvssScore >= 4) sev = 'MEDIUM';
                else if (v.cvssScore > 0) sev = 'LOW';
                const snykRange =
                    (v.semver && (v.semver.vulnerable || v.semver['vulnerable'])) ||
                    v.vulnerableSemanticVersion ||
                    '';
                return {
                    id: v.identifiers?.CVE?.[0] || v.id,
                    source: 'Snyk',
                    summary: v.title,
                    details: v.description ? `${v.description.substring(0, 300)}…` : '',
                    published: v.publicationTime,
                    fixedVersion: v.fixedIn && v.fixedIn.length ? v.fixedIn.join(', ') : 'See Snyk advisory',
                    severity: sev,
                    affectedRange: typeof snykRange === 'string' && snykRange ? snykRange : undefined,
                };
            });
            result.hasHistoricBreach = true;
            result.historicCount = result.vulns.length;
        }
    } catch (e) {
        if (e.response && e.response.status !== 404) console.error('Snyk Error', e.message);
    }
    return result;
};

const mergeKey = (v) => `${v.id || ''}|${v.summary || ''}`;

// ORCHESTRATOR
const checkVulnerabilityAggr = async (pkgName, version, ecosystem) => {
    const finalPayload = {
        vulnerable: false,
        sources: [],
        vulnerabilities: [],
        hasHistoricBreach: false,
        historicBreachCount: 0,
    };

    const sources = await DataSource.find({ active: true });

    const promises = [];
    if (sources.find((s) => s.name === 'OSV')) promises.push(checkOSV(pkgName, version, ecosystem));
    if (sources.find((s) => s.name === 'NPM Audit')) promises.push(checkNPM(pkgName, version, ecosystem));

    const snykInst = sources.find((s) => s.name === 'Snyk');
    if (snykInst && snykInst.apiKey) promises.push(checkSnyk(pkgName, version, ecosystem, snykInst.apiKey));

    const results = await Promise.all(promises);

    const mergedVulnsMap = new Map();
    let uniqueHistoricCount = 0;

    const rank = (s) => {
        const u = (s || '').toUpperCase();
        if (u === 'CRITICAL') return 4;
        if (u === 'HIGH') return 3;
        if (u === 'MEDIUM') return 2;
        if (u === 'LOW') return 1;
        return 0;
    };

    for (const r of results) {
        if (r.hasHit) {
            finalPayload.vulnerable = true;
            r.vulns.forEach((v) => {
                const key = mergeKey(v);
                const entry = {
                    ...v,
                    sources: v.sources || [v.source],
                };
                if (!mergedVulnsMap.has(key)) {
                    mergedVulnsMap.set(key, entry);
                } else {
                    const existing = mergedVulnsMap.get(key);
                    if (!existing.sources.includes(v.source)) existing.sources.push(v.source);
                    if (rank(v.severity) > rank(existing.severity)) existing.severity = v.severity;
                    if (existing.fixedVersion === 'See OSV advisory — upgrade to a non-affected release' && v.fixedVersion) {
                        existing.fixedVersion = v.fixedVersion;
                    }
                    if (v.affectedRange) {
                        if (!existing.affectedRange) {
                            existing.affectedRange = v.affectedRange;
                        } else if (!existing.affectedRange.includes(v.affectedRange)) {
                            existing.affectedRange = `${existing.affectedRange} | ${v.affectedRange}`;
                        }
                    }
                    if (v.details && (!existing.details || String(v.details).length > String(existing.details).length)) {
                        existing.details = v.details;
                    }
                    mergedVulnsMap.set(key, existing);
                }
            });
            if (!finalPayload.sources.includes(r.id)) finalPayload.sources.push(r.id.toUpperCase());
        }

        if (r.hasHistoricBreach && r.historicCount > uniqueHistoricCount) {
            finalPayload.hasHistoricBreach = true;
            uniqueHistoricCount = r.historicCount;
        }
    }

    finalPayload.vulnerabilities = Array.from(mergedVulnsMap.values());
    finalPayload.historicBreachCount = uniqueHistoricCount;

    return finalPayload;
};

module.exports = { checkVulnerability: checkVulnerabilityAggr };
