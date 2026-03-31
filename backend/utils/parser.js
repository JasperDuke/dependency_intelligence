const smolToml = require('smol-toml');

// Function to safely extract python requirements based on format
const parseRequirementsTxt = (content) => {
    try {
        return content.split(/\r?\n/).map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(line => {
                const parts = line.split(/[=><~]+/);
                return { name: parts[0].trim(), version: parts[1] ? parts[1].trim() : '*' };
            });
    } catch (err) {
        console.error("Error parsing requirements.txt", err);
        return [];
    }
};

const parseUvLock = (content) => {
    try {
        const parsed = smolToml.parse(content);
        if(!parsed.package) return [];
        return parsed.package.map(pkg => ({
            name: pkg.name,
            version: pkg.version
        }));
    } catch (err) {
        console.error("Error parsing uv.lock", err);
        return [];
    }
};

const parsePackageJson = (content) => {
    try {
        let json = JSON.parse(content);
        if (!json.dependencies && !json.devDependencies) {
            if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
                json = { dependencies: json };
            } else {
                return [];
            }
        }
        const deps = { ...json.dependencies, ...json.devDependencies };
        return Object.keys(deps).map(name => {
            const raw = String(deps[name]).trim();
            const cleaned = raw.replace(/^[\^~>=<]+/, '').split(/[\s,]/)[0] || '*';
            return { name, version: cleaned };
        });
    } catch (err) {
        console.error("Error parsing package.json", err);
        return [];
    }
};

module.exports = {
    parsePackageJson,
    parseRequirementsTxt,
    parseUvLock
};
