const semver = require('semver');

/**
 * Normalize user-facing version strings from manifests (ranges stripped upstream).
 */
function coerceSemver(version) {
    if (!version || version === '*') return null;
    const c = semver.coerce(String(version).trim());
    return c;
}

/**
 * OSV SEMVER range events: introduced / fixed / last_affected chains.
 * @see https://ossf.github.io/osv-schema/#affectedranges-field
 */
function matchOsvSemverEvents(version, events) {
    if (!events?.length) return false;
    const v = coerceSemver(version);
    if (!v) return false;

    let low = null;
    for (const ev of events) {
        if (ev.introduced !== undefined) {
            const intro = ev.introduced === '0' ? semver.parse('0.0.0') : semver.coerce(ev.introduced);
            low = intro;
        }
        if (ev.fixed !== undefined && low) {
            const hi = semver.coerce(ev.fixed);
            if (hi && semver.gte(v, low) && semver.lt(v, hi)) return true;
            low = null;
        }
        if (ev.last_affected !== undefined && low) {
            const hi = semver.coerce(ev.last_affected);
            if (hi && semver.gte(v, low) && semver.lte(v, hi)) return true;
            low = null;
        }
    }
    return false;
}

/**
 * Returns true if this OSV vuln's affected entries include `version` for `pkgName` / ecosystem.
 * If affected metadata is missing, returns true (trust OSV query response).
 */
function osvVulnAffectsPackageVersion(pkgName, version, ecosystem, vuln) {
    if (!vuln.affected || !Array.isArray(vuln.affected) || vuln.affected.length === 0) {
        return true;
    }

    const v = coerceSemver(version);
    const eco = ecosystem === 'npm' ? 'npm' : 'PyPI';

    let sawMatchingPackage = false;

    for (const aff of vuln.affected) {
        const p = aff.package;
        if (p && p.name && p.name !== pkgName) continue;
        if (p && p.ecosystem && p.ecosystem !== eco) continue;

        sawMatchingPackage = true;

        if (aff.versions?.length && v) {
            for (const ver of aff.versions) {
                const c = semver.coerce(ver);
                if (c && semver.eq(v, c)) return true;
            }
        }

        for (const range of aff.ranges || []) {
            if (!range.events?.length) continue;
            if (eco === 'npm' && range.type === 'SEMVER') {
                if (matchOsvSemverEvents(version, range.events)) return true;
            }
            if (eco === 'PyPI' && (range.type === 'ECOSYSTEM' || range.type === 'SEMVER')) {
                if (matchOsvSemverEvents(version, range.events)) return true;
            }
        }
    }

    return sawMatchingPackage ? false : true;
}

/**
 * npm security advisory bulk item — only flag if vulnerable_versions range matches.
 */
function npmAdvisoryAffectsVersion(version, advisory) {
    const v = coerceSemver(version);
    if (!v) return true;

    const rangeStr =
        advisory.vulnerable_versions ||
        advisory.vulnerableVersions ||
        advisory.vulnerable;

    if (!rangeStr || typeof rangeStr !== 'string') {
        return true;
    }

    try {
        return semver.satisfies(v, rangeStr, { includePrerelease: true });
    } catch {
        return true;
    }
}

/**
 * Human-readable range from one OSV SEMVER event list (introduced → fixed / last_affected).
 */
function formatOsvSemverEventsToRange(events) {
    if (!events?.length) return '';
    const parts = [];
    let low = null;
    for (const ev of events) {
        if (ev.introduced !== undefined) {
            low = ev.introduced === '0' ? '0' : String(ev.introduced);
        }
        if (ev.fixed !== undefined && low !== null) {
            parts.push(`>=${low} <${ev.fixed}`);
            low = null;
        }
        if (ev.last_affected !== undefined && low !== null) {
            parts.push(`>=${low} <=${ev.last_affected}`);
            low = null;
        }
    }
    return parts.filter(Boolean).join(' · ');
}

/**
 * All vulnerable semver ranges for this OSV record (npm / PyPI), for UI disclosure.
 */
function describeOsvVulnerableRanges(vuln, ecosystem) {
    const eco = ecosystem === 'npm' ? 'npm' : 'PyPI';
    const chunks = [];
    if (!vuln.affected?.length) return '';

    for (const aff of vuln.affected) {
        if (aff.package?.ecosystem && aff.package.ecosystem !== eco) continue;

        for (const range of aff.ranges || []) {
            if (range.type === 'SEMVER' && range.events?.length) {
                const s = formatOsvSemverEventsToRange(range.events);
                if (s) chunks.push(s);
            }
            if (eco === 'PyPI' && range.type === 'ECOSYSTEM' && range.events?.length) {
                const s = formatOsvSemverEventsToRange(range.events);
                if (s) chunks.push(s);
            }
        }

        const hint = aff.database_specific?.last_known_affected_version_range;
        if (hint) chunks.push(String(hint).trim());
    }

    return [...new Set(chunks.filter(Boolean))].join(' · ');
}

function npmAdvisoryAffectedRange(advisory) {
    const s = advisory.vulnerable_versions || advisory.vulnerableVersions;
    return typeof s === 'string' ? s.trim() : '';
}

module.exports = {
    coerceSemver,
    osvVulnAffectsPackageVersion,
    npmAdvisoryAffectsVersion,
    formatOsvSemverEventsToRange,
    describeOsvVulnerableRanges,
    npmAdvisoryAffectedRange,
};
