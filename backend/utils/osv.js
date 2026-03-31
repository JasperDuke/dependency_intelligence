const axios = require('axios');

const extractFixVersion = (vuln, pkgName, ecosystem) => {
    if (!vuln.affected) return 'None';
    for (const af of vuln.affected) {
        if (af.package && af.package.name === pkgName && af.package.ecosystem === ecosystem) {
            if (af.ranges) {
                for (const range of af.ranges) {
                    if (range.events) {
                        for (const event of range.events) {
                            if (event.fixed) return event.fixed;
                        }
                    }
                }
            }
        }
    }
    return 'None';
};

const checkVulnerability = async (pkgName, version, ecosystem) => {
    let result = { vulnerable: false, vulnerabilities: [], hasHistoricBreach: false, historicBreachCount: 0 };
    try {
        const strictPayload = {
            version,
            package: { name: pkgName, ecosystem: ecosystem === 'npm' ? 'npm' : 'PyPI' }
        };
        const res = await axios.post('https://api.osv.dev/v1/query', strictPayload);
        
        if (res.data && res.data.vulns && res.data.vulns.length > 0) {
            result.vulnerable = true;
            result.vulnerabilities = res.data.vulns.map(v => ({
                id: v.id,
                summary: v.summary || 'No summary available',
                details: (v.details && v.details.length > 200) ? v.details.substring(0, 200) + '...' : (v.details || ''),
                published: v.published,
                fixedVersion: extractFixVersion(v, pkgName, ecosystem === 'npm' ? 'npm' : 'PyPI')
            }));
            result.hasHistoricBreach = true;
            result.historicBreachCount = result.vulnerabilities.length;
        } else {
            const broadPayload = { package: { name: pkgName, ecosystem: ecosystem === 'npm' ? 'npm' : 'PyPI' } };
            const broadRes = await axios.post('https://api.osv.dev/v1/query', broadPayload);
            if (broadRes.data && broadRes.data.vulns && broadRes.data.vulns.length > 0) {
                result.hasHistoricBreach = true;
                result.historicBreachCount = broadRes.data.vulns.length;
            }
        }
        return result;
    } catch (err) {
        console.error(`OSV query failed for ${pkgName}@${version}`, err.message);
        return result;
    }
}

module.exports = { checkVulnerability };
