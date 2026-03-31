const nodemailer = require('nodemailer');
const MailConfig = require('../models/MailConfig');
const AlertConfig = require('../models/AlertConfig');

/**
 * Recipients for vulnerability scan alerts: Settings → alert emails first; if none,
 * fall back to SMTP "From" when mail is enabled (same inbox you verified with test email);
 * then ALERT_EMAIL env.
 */
async function getScanAlertEmails() {
  const alertConfigs = await AlertConfig.find({ active: true });
  const fromList = alertConfigs.map((a) => a.email).filter(Boolean);
  if (fromList.length > 0) return fromList;

  try {
    const cfg = await MailConfig.findOne().sort({ updatedAt: -1 });
    if (cfg && cfg.enabled && cfg.fromEmail && String(cfg.fromEmail).trim()) {
      return [String(cfg.fromEmail).trim()];
    }
  } catch (e) {
    console.error('getScanAlertEmails:', e.message);
  }

  const env = process.env.ALERT_EMAIL && String(process.env.ALERT_EMAIL).trim();
  if (env) return [env];

  return [];
}

/** Minimal snapshot for comparing manifest saves (name + version + prior vulnerable flag). */
function snapshotPackagesForAlert(packages) {
  if (!Array.isArray(packages)) return [];
  return packages
    .filter((p) => p && p.name)
    .map((p) => ({
      name: p.name,
      version: String(p.version ?? ''),
      vulnerable: !!p.vulnerable,
    }));
}

/**
 * After a manifest save, only packages that *changed* vs the previous scan should trigger mail:
 * new dependency, version change, or same version newly flagged vulnerable (feeds updated).
 * Unchanged rows that were already vulnerable are omitted so you can ignore known issues without repeat noise.
 * First scan (no previous rows) uses the full result.
 */
function packagesDeltaForAlert(previousPackages, nextPackages) {
  if (!previousPackages || previousPackages.length === 0) {
    return nextPackages || [];
  }
  const prevByName = new Map();
  for (const p of previousPackages) {
    if (p && p.name) prevByName.set(p.name, { version: p.version, vulnerable: p.vulnerable });
  }
  const out = [];
  for (const pkg of nextPackages || []) {
    if (!pkg || !pkg.name) continue;
    const prev = prevByName.get(pkg.name);
    const ver = String(pkg.version ?? '');
    const isNew = !prev;
    const versionChanged = prev && prev.version !== ver;
    const newlyVulnerable = prev && !versionChanged && !prev.vulnerable && pkg.vulnerable;
    const inDelta = isNew || versionChanged || newlyVulnerable;
    if (!inDelta) continue;
    const worthReport = pkg.vulnerable || (!pkg.vulnerable && pkg.hasHistoricBreach);
    if (!worthReport) continue;
    out.push(pkg);
  }
  return out;
}

async function getMailerOptions() {
  try {
    const cfg = await MailConfig.findOne().sort({ updatedAt: -1 });
    if (cfg && cfg.enabled && cfg.host && String(cfg.host).trim()) {
      const auth =
        cfg.user && String(cfg.user).trim()
          ? { user: String(cfg.user).trim(), pass: cfg.pass || '' }
          : undefined;
      const transport = nodemailer.createTransport({
        host: String(cfg.host).trim(),
        port: Number(cfg.port) || 587,
        secure: !!cfg.secure,
        auth,
      });
      const fromEmail = (cfg.fromEmail && String(cfg.fromEmail).trim()) || cfg.user || 'alerts@localhost';
      const fromName = (cfg.fromName && String(cfg.fromName).trim()) || 'Nexus Security Alerts';
      return {
        transport,
        from: `"${fromName}" <${fromEmail}>`,
        mode: 'database',
      };
    }
  } catch (e) {
    console.error('MailConfig read error:', e.message);
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
        : undefined,
  });
  const from = process.env.SMTP_FROM || '"Nexus Security Alerts" <alerts@nexustracker.local>';
  return { transport, from, mode: 'env' };
}

const sendAlert = async (emails, project, packagesWithStatus, options = {}) => {
  const { deltaMode = false } = options;
  if (!emails || emails.length === 0) {
    console.warn(
      'Alert not sent: no recipients. Add emails under Settings → Alerts, or set SMTP From (with Use these settings), or ALERT_EMAIL.'
    );
    return;
  }

  const active = packagesWithStatus.filter((p) => p.vulnerable);
  const historic = packagesWithStatus.filter((p) => !p.vulnerable && p.hasHistoricBreach);

  if (active.length === 0 && historic.length === 0) return;

  const label = project.title || project.name;
  const subjectSuffix = deltaMode ? 'dependency changes' : 'scan summary';

  let html = `<div style="font-family: Arial, sans-serif; background-color: #f4f4f9; padding: 20px;">
        <h2 style="color: #333;">Vulnerability scan: ${label}</h2>
        ${
          deltaMode
            ? `<p style="color:#555;font-size:14px;"><strong>This message lists only dependencies that changed in this save</strong> (new, version bump, newly flagged vulnerable, or new “safe but historic context”). Dependencies that stayed on the same version and were already reported as vulnerable are omitted so you are not re-notified about issues you are already tracking.</p>`
            : `<p style="color:#555;font-size:14px;">Your pinned version is shown below. “Action required” means a feed reports issues for <em>your</em> version. Multiple sources (OSV, npm advisories, Snyk) are merged; each finding lists which feeds reported it.</p>`
        }`;

  if (active.length > 0) {
    html += `<h3 style="color: #c62828;">Action required — vulnerable version in use</h3>`;
    active.forEach((pkg) => {
      html += `<div style="background: #fff; border-left: 5px solid #c62828; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
                <h4 style="margin:0 0 10px 0; font-size: 16px;">${pkg.name} @ ${pkg.version}</h4>
                <p style="margin:0 0 10px 0;font-size:13px;color:#333;">Security issue reported for <strong>this</strong> dependency version. Plan an upgrade or patch.</p>`;
      pkg.vulnerabilities.forEach((v) => {
        const sev = v.severity ? `<strong>Severity:</strong> ${v.severity}<br/>` : '';
        const src =
          v.sources && v.sources.length
            ? `<strong>Sources:</strong> ${v.sources.join(', ')}<br/>`
            : v.source
              ? `<strong>Source:</strong> ${v.source}<br/>`
              : '';
        const ar = v.affectedRange ? `<strong>Affected range:</strong> ${v.affectedRange}<br/>` : '';
        html += `<div style="background-color: #ffe6e6; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                   ${sev}${src}${ar}
                   <strong>ID:</strong> ${v.id}<br/>
                   <strong>Published:</strong> ${v.published ? new Date(v.published).toLocaleDateString() : '—'}<br/>
                   <strong>Summary:</strong> ${v.summary}<br/>
                   <strong style="color: #d32f2f;">Suggested fix:</strong> ${v.fixedVersion}
                 </div>`;
      });
      html += `</div>`;
    });
  }

  if (historic.length > 0) {
    html += `<h3 style="color: #2e7d32;">Informational — not affected at your version</h3>`;
    historic.forEach((pkg) => {
      html += `<div style="background: #fff; border-left: 5px solid #2e7d32; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
                <p style="margin: 0 0 5px 0;"><strong>${pkg.name}</strong> — about <strong>${pkg.historicBreachCount}</strong> related advisories exist for this package over time.</p>
                <p style="margin: 0; color: #1b5e20; font-weight: bold;">Your locked version <code>${pkg.version}</code> is outside the vulnerable ranges we evaluated (or feeds mark you clean).</p>
             </div>`;
    });
  }

  html += `</div>`;

  try {
    const { transport, from } = await getMailerOptions();
    await transport.sendMail({
      from,
      to: emails.join(', '),
      subject: `[Nexus Alert] ${label} — ${subjectSuffix}`,
      html,
    });
    console.log(`Sent HTML alert for ${project.name} to ${emails.length} recipients`);
  } catch (err) {
    console.error('Failed to send email alert:', err?.message || err);
    if (err?.response) console.error('SMTP response:', err.response);
  }
};

const sendTestEmail = async (to) => {
  const { transport, from } = await getMailerOptions();
  await transport.sendMail({
    from,
    to,
    subject: '[Nexus] Test email',
    text: 'If you receive this message, SMTP settings are working for Vulnerability Tracker.',
    html: '<p>If you receive this message, <strong>SMTP settings</strong> are working for Vulnerability Tracker.</p>',
  });
  console.log(`Test email sent to ${to}`);
};

module.exports = {
  sendAlert,
  sendTestEmail,
  getMailerOptions,
  getScanAlertEmails,
  snapshotPackagesForAlert,
  packagesDeltaForAlert,
};
