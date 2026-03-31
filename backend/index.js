require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');

const Project = require('./models/Project');
const AlertConfig = require('./models/AlertConfig');
const { parsePackageJson, parseRequirementsTxt, parseUvLock } = require('./utils/parser');
const { checkVulnerability } = require('./utils/scanner');
const {
    sendAlert,
    sendTestEmail,
    getScanAlertEmails,
    snapshotPackagesForAlert,
    packagesDeltaForAlert,
} = require('./utils/mailer');
const DataSource = require('./models/DataSource');
const MailConfig = require('./models/MailConfig');

const app = express();
app.use(cors());
app.use(express.json());

// Connect DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vulntracker')
    .then(async () => {
        console.log('MongoDB Connected');
        const count = await DataSource.countDocuments();
        if (count === 0) {
            await DataSource.insertMany([
                { name: 'OSV', active: true },
                { name: 'NPM Audit', active: true },
                { name: 'Snyk', active: false, apiKey: '' }
            ]);
            console.log('Data Sources seeded');
        }
    })
    .catch(err => console.error(err));

function projectTypeFromFileType(fileType) {
    if (fileType === 'package.json' || fileType === 'plain-npm') return 'npm';
    return 'python';
}

// API Routes
app.post('/api/projects', async (req, res) => {
    const { title, projectType, content, fileType, projectId } = req.body;

    if (!projectType || !content || !fileType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const displayTitle = (title && String(title).trim()) || 'Untitled project';

    let parsedPackages = [];
    if (fileType === 'package.json' || fileType === 'plain-npm') {
        parsedPackages = parsePackageJson(content);
    } else if (fileType === 'requirements.txt' || fileType === 'plain-python') {
        parsedPackages = parseRequirementsTxt(content);
    } else if (fileType === 'uv.lock') {
        parsedPackages = parseUvLock(content);
    } else {
        return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!parsedPackages.length) {
        return res.status(400).json({ error: 'No packages found. Check the file format.' });
    }

    const ecosystem = projectType === 'npm' ? 'npm' : 'PyPI';

    const packagesWithStatuses = await Promise.all(parsedPackages.map(async (pkg) => {
        const status = await checkVulnerability(pkg.name, pkg.version, ecosystem);
        return {
            name: pkg.name,
            version: pkg.version,
            vulnerable: status.vulnerable,
            vulnerabilities: status.vulnerabilities,
            hasHistoricBreach: status.hasHistoricBreach,
            historicBreachCount: status.historicBreachCount
        };
    }));

    try {
        let project;
        let previousSnapshot = [];

        if (projectId) {
            project = await Project.findById(projectId);
            if (!project) return res.status(404).json({ error: 'Project not found' });
            previousSnapshot = snapshotPackagesForAlert(project.packages);
            project.title = displayTitle;
            project.projectType = projectType;
            project.sourceContent = String(content);
            project.fileType = String(fileType);
            project.packages = packagesWithStatuses;
            project.lastScanned = Date.now();
            await project.save();
        } else {
            const name = `p-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
            project = new Project({
                name,
                title: displayTitle,
                projectType,
                sourceContent: String(content),
                fileType: String(fileType),
                packages: packagesWithStatuses,
                lastScanned: Date.now()
            });
            await project.save();
        }

        const emails = await getScanAlertEmails();
        const alertPkgs = packagesDeltaForAlert(previousSnapshot, packagesWithStatuses);
        const deltaMode = previousSnapshot.length > 0;
        if (emails.length > 0 && alertPkgs.length > 0) {
            sendAlert(emails, project, alertPkgs, { deltaMode }).catch((e) => console.error('Email error:', e));
        } else if (emails.length === 0) {
            console.warn('Scan alert skipped after save: no recipients (Settings → Alerts or SMTP From / ALERT_EMAIL).');
        }

        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().sort('-updatedAt');
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }
        const deleted = await Project.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const previousSnapshot = snapshotPackagesForAlert(project.packages);

        const { title, content, fileType, projectType: bodyProjectType } = req.body;

        if (content === undefined || content === null || String(content).trim() === '') {
            return res.status(400).json({ error: 'content is required (full manifest text)' });
        }
        if (!fileType || typeof fileType !== 'string') {
            return res.status(400).json({ error: 'fileType is required' });
        }

        const ft = String(fileType).trim();
        let parsedPackages = [];
        if (ft === 'package.json' || ft === 'plain-npm') {
            parsedPackages = parsePackageJson(String(content));
        } else if (ft === 'requirements.txt' || ft === 'plain-python') {
            parsedPackages = parseRequirementsTxt(String(content));
        } else if (ft === 'uv.lock') {
            parsedPackages = parseUvLock(String(content));
        } else {
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        if (!parsedPackages.length) {
            return res.status(400).json({ error: 'No packages found. Check the file format.' });
        }

        const projectType =
            bodyProjectType === 'npm' || bodyProjectType === 'python'
                ? bodyProjectType
                : projectTypeFromFileType(ft);

        const displayTitle = title !== undefined ? String(title).trim() : project.title;
        if (title !== undefined) {
            project.title = displayTitle || project.title;
        }
        project.projectType = projectType;
        project.sourceContent = String(content);
        project.fileType = ft;

        const ecosystem = projectType === 'npm' ? 'npm' : 'PyPI';
        const packagesWithStatuses = await Promise.all(
            parsedPackages.map(async (pkg) => {
                const status = await checkVulnerability(pkg.name, pkg.version, ecosystem);
                return {
                    name: pkg.name,
                    version: pkg.version,
                    vulnerable: status.vulnerable,
                    vulnerabilities: status.vulnerabilities,
                    hasHistoricBreach: status.hasHistoricBreach,
                    historicBreachCount: status.historicBreachCount,
                };
            })
        );

        project.packages = packagesWithStatuses;
        project.lastScanned = Date.now();
        await project.save();

        const emails = await getScanAlertEmails();
        const alertPkgs = packagesDeltaForAlert(previousSnapshot, packagesWithStatuses);
        const deltaMode = previousSnapshot.length > 0;
        if (emails.length > 0 && alertPkgs.length > 0) {
            sendAlert(emails, project, alertPkgs, { deltaMode }).catch((e) => console.error('Email error:', e));
        } else if (emails.length === 0) {
            console.warn('Scan alert skipped after save: no recipients (Settings → Alerts or SMTP From / ALERT_EMAIL).');
        }

        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** Re-run vulnerability checks from stored manifest (or existing package rows). No alert email. */
app.post('/api/projects/:id/rescan', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }
        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        let parsedPackages = [];
        const sc = project.sourceContent && String(project.sourceContent).trim();
        const ft = project.fileType && String(project.fileType).trim();

        if (sc && ft) {
            if (ft === 'package.json' || ft === 'plain-npm') {
                parsedPackages = parsePackageJson(sc);
            } else if (ft === 'requirements.txt' || ft === 'plain-python') {
                parsedPackages = parseRequirementsTxt(sc);
            } else if (ft === 'uv.lock') {
                parsedPackages = parseUvLock(sc);
            }
        }
        if (!parsedPackages.length && project.packages?.length) {
            parsedPackages = project.packages.map((p) => ({ name: p.name, version: p.version }));
        }
        if (!parsedPackages.length) {
            return res.status(400).json({ error: 'Nothing to rescan: add manifest content or packages first.' });
        }

        const ecosystem = project.projectType === 'npm' ? 'npm' : 'PyPI';
        const packagesWithStatuses = await Promise.all(
            parsedPackages.map(async (pkg) => {
                const status = await checkVulnerability(pkg.name, pkg.version, ecosystem);
                return {
                    name: pkg.name,
                    version: pkg.version,
                    vulnerable: status.vulnerable,
                    vulnerabilities: status.vulnerabilities,
                    hasHistoricBreach: status.hasHistoricBreach,
                    historicBreachCount: status.historicBreachCount,
                };
            })
        );

        project.packages = packagesWithStatuses;
        project.lastScanned = Date.now();
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/search', async (req, res) => {
    const { name, version, ecosystem } = req.query;
    if (!name || !ecosystem) return res.status(400).json({ error: 'Name and ecosystem required' });
    
    try {
        // Find highest version or exact version
        const status = await checkVulnerability(name, version || '1.0.0', ecosystem);
        res.json({ name, ecosystem, status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const GH_ADVISORY_HEADERS = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'VulnerabilityTracker/1.0',
};

function formatGithubAdvisory(a) {
    const pkgs = (a.vulnerabilities || [])
        .map((v) => v.package?.name)
        .filter(Boolean);
    const unique = [...new Set(pkgs)];
    const ecosystem = a.vulnerabilities?.[0]?.package?.ecosystem || '';
    return {
        id: a.ghsa_id,
        cveId: a.cve_id || null,
        summary: a.summary || '',
        severity: (a.severity && String(a.severity)) || '',
        publishedAt: a.published_at,
        url: a.html_url,
        ecosystem,
        packageNames: unique.slice(0, 12),
        headline: unique.length
            ? unique.slice(0, 2).join(', ') + (unique.length > 2 ? ` +${unique.length - 2}` : '')
            : a.ghsa_id,
    };
}

/** Recent npm + PyPI package advisories (GitHub Advisory Database, public API). */
app.get('/api/recent-breaches', async (req, res) => {
    try {
        const params = { per_page: 14, sort: 'published', direction: 'desc' };
        const [npmRes, pipRes] = await Promise.all([
            axios.get('https://api.github.com/advisories', {
                params: { ...params, ecosystem: 'npm' },
                headers: GH_ADVISORY_HEADERS,
                timeout: 20000,
            }),
            axios.get('https://api.github.com/advisories', {
                params: { ...params, ecosystem: 'pip' },
                headers: GH_ADVISORY_HEADERS,
                timeout: 20000,
            }),
        ]);
        const merged = [...npmRes.data, ...pipRes.data];
        merged.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
        const seen = new Set();
        const out = [];
        for (const a of merged) {
            if (!a.ghsa_id || seen.has(a.ghsa_id)) continue;
            seen.add(a.ghsa_id);
            out.push(formatGithubAdvisory(a));
            if (out.length >= 12) break;
        }
        res.json(out);
    } catch (err) {
        console.error('recent-breaches', err.message);
        res.json([]);
    }
});

app.get('/api/alerts', async (req, res) => {
    const alerts = await AlertConfig.find();
    res.json(alerts);
});

app.post('/api/alerts', async (req, res) => {
    const { email } = req.body;
    try {
        await AlertConfig.findOneAndUpdate({ email }, { email, active: true }, { upsert: true, new: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/alerts/:id', async (req, res) => {
    await AlertConfig.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// DataSource Routes
app.get('/api/datasources', async (req, res) => {
    try {
        const sources = await DataSource.find();
        res.json(sources);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/datasources/:id', async (req, res) => {
    try {
        const { active, apiKey } = req.body;
        const source = await DataSource.findByIdAndUpdate(req.params.id, { active, apiKey }, { new: true });
        res.json(source);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function sanitizeMailConfig(doc) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : { ...doc };
    delete o.pass;
    o.hasPassword = !!(doc.pass && String(doc.pass).length > 0);
    return o;
}

app.get('/api/mail-config', async (req, res) => {
    try {
        let doc = await MailConfig.findOne().sort({ updatedAt: -1 });
        if (!doc) {
            doc = await MailConfig.create({});
        }
        res.json(sanitizeMailConfig(doc));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/mail-config', async (req, res) => {
    try {
        let doc = await MailConfig.findOne().sort({ updatedAt: -1 });
        if (!doc) doc = new MailConfig({});

        const { host, port, secure, user, pass, fromName, fromEmail, enabled } = req.body;

        if (host !== undefined) doc.host = String(host);
        if (port !== undefined) doc.port = Number(port) || 587;
        if (secure !== undefined) doc.secure = !!secure;
        if (user !== undefined) doc.user = String(user);
        if (pass !== undefined && String(pass).length > 0) doc.pass = String(pass);
        if (fromName !== undefined) doc.fromName = String(fromName);
        if (fromEmail !== undefined) doc.fromEmail = String(fromEmail);
        if (enabled !== undefined) doc.enabled = !!enabled;

        await doc.save();
        res.json(sanitizeMailConfig(doc));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/mail-test', async (req, res) => {
    try {
        const raw = req.body?.to;
        const to = raw && String(raw).trim();
        if (to) {
            await sendTestEmail(to);
            return res.json({ success: true, sentTo: to });
        }
        const recipients = await getScanAlertEmails();
        if (recipients.length > 0) {
            await sendTestEmail(recipients[0]);
            return res.json({ success: true, sentTo: recipients[0] });
        }
        return res.status(400).json({
            error:
                'Add an alert email in Settings, set SMTP From (with mail enabled), set ALERT_EMAIL, or POST { "to": "you@mail.com" }',
        });
    } catch (err) {
        console.error('mail-test', err);
        res.status(500).json({ error: err.message || 'Failed to send test email' });
    }
});

// Cron Background Worker (every 3 hours)
cron.schedule('0 */3 * * *', async () => {
    console.log('Running automated vulnerability scan...');
    const projects = await Project.find();
    const emails = await getScanAlertEmails();

    for (const project of projects) {
        let newVulnsFound = [];
        const ecosystem = project.projectType === 'npm' ? 'npm' : 'PyPI';
        
        for (const pkg of project.packages) {
            const status = await checkVulnerability(pkg.name, pkg.version, ecosystem);
            if (!pkg.vulnerable && status.vulnerable) {
                newVulnsFound.push(pkg);
            }
            pkg.vulnerable = status.vulnerable;
            pkg.vulnerabilities = status.vulnerabilities;
            pkg.hasHistoricBreach = status.hasHistoricBreach;
            pkg.historicBreachCount = status.historicBreachCount;
        }

        project.lastScanned = Date.now();
        await project.save();

        if (newVulnsFound.length > 0 && emails.length > 0) {
            await sendAlert(emails, project, newVulnsFound);
        } else if (newVulnsFound.length > 0 && emails.length === 0) {
            console.warn(
                `Cron: new vulnerabilities on ${project.name || project.title} but no alert recipients configured.`
            );
        }
    }
    console.log('Automated scan completed.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
