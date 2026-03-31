'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Dialog,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  InputAdornment,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import axios from 'axios';
import { API_BASE } from '../lib/api';

type Section = 'alerts' | 'smtp' | 'sources';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [section, setSection] = useState<Section>('alerts');

  const [emails, setEmails] = useState<{ _id: string; email: string }[]>([]);
  const [newEmail, setNewEmail] = useState('');

  const [sources, setSources] = useState<{ _id: string; name: string; active: boolean; apiKey: string }[]>([]);
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({});

  const [mailHost, setMailHost] = useState('');
  const [mailPort, setMailPort] = useState('587');
  const [mailSecure, setMailSecure] = useState(false);
  const [mailUser, setMailUser] = useState('');
  const [mailPass, setMailPass] = useState('');
  const [mailFromName, setMailFromName] = useState('Nexus Security Alerts');
  const [mailFromEmail, setMailFromEmail] = useState('');
  const [mailEnabled, setMailEnabled] = useState(false);
  const [mailHasPassword, setMailHasPassword] = useState(false);
  const [mailSaving, setMailSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testSending, setTestSending] = useState(false);

  const fetchData = async () => {
    try {
      if (section === 'alerts') {
        const res = await axios.get(`${API_BASE}/api/alerts`);
        setEmails(res.data);
      } else if (section === 'sources') {
        const res = await axios.get(`${API_BASE}/api/datasources`);
        setSources(res.data);
        const map: Record<string, string> = {};
        res.data.forEach((s: { _id: string; apiKey: string }) => {
          map[s._id] = s.apiKey || '';
        });
        setApiKeys(map);
      } else if (section === 'smtp') {
        const res = await axios.get(`${API_BASE}/api/mail-config`);
        const m = res.data;
        setMailHost(m.host || '');
        setMailPort(String(m.port ?? 587));
        setMailSecure(!!m.secure);
        setMailUser(m.user || '');
        setMailPass('');
        setMailFromName(m.fromName || 'Nexus Security Alerts');
        setMailFromEmail(m.fromEmail || '');
        setMailEnabled(!!m.enabled);
        setMailHasPassword(!!m.hasPassword);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open, section]);

  const addEmail = async () => {
    if (!newEmail.trim()) return;
    try {
      await axios.post(`${API_BASE}/api/alerts`, { email: newEmail.trim() });
      setNewEmail('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const removeEmail = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/api/alerts/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSource = async (id: string, current: boolean, key: string) => {
    await axios.put(`${API_BASE}/api/datasources/${id}`, { active: !current, apiKey: key });
    fetchData();
  };

  const saveApiKey = async (id: string, current: boolean, key: string) => {
    await axios.put(`${API_BASE}/api/datasources/${id}`, { active: current, apiKey: key });
    fetchData();
  };

  const saveMailConfig = async () => {
    setMailSaving(true);
    try {
      const body: Record<string, unknown> = {
        host: mailHost,
        port: Number(mailPort) || 587,
        secure: mailSecure,
        user: mailUser,
        fromName: mailFromName,
        fromEmail: mailFromEmail,
        enabled: mailEnabled,
      };
      if (mailPass.trim()) body.pass = mailPass.trim();
      const res = await axios.put(`${API_BASE}/api/mail-config`, body);
      setMailPass('');
      setMailHasPassword(!!res.data?.hasPassword);
    } catch (err) {
      console.error(err);
      alert('Could not save SMTP settings.');
    } finally {
      setMailSaving(false);
    }
  };

  const sendMailTest = async () => {
    setTestSending(true);
    try {
      const res = await axios.post(`${API_BASE}/api/mail-test`, testTo.trim() ? { to: testTo.trim() } : {});
      alert(`Test email sent to ${res.data?.sentTo || 'recipient'}. Check spam folder and backend logs if missing.`);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      alert(msg || 'Could not send test email. Save SMTP first and ensure the server can reach your SMTP host.');
    } finally {
      setTestSending(false);
    }
  };

  const tabBtn = (id: Section, label: string) => (
    <Button
      size="small"
      onClick={() => setSection(id)}
      sx={{
        px: 1.5,
        py: 0.75,
        borderRadius: 999,
        fontWeight: 600,
        fontSize: '0.8rem',
        color: section === id ? 'primary.contrastText' : 'text.secondary',
        bgcolor: section === id ? 'primary.main' : 'transparent',
        '&:hover': {
          bgcolor: section === id ? 'primary.dark' : 'rgba(255,255,255,0.06)',
        },
      }}
    >
      {label}
    </Button>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        backdrop: { sx: { backdropFilter: 'blur(6px)' } },
      }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={700}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Recipients, SMTP (nodemailer), and vulnerability feeds. All enabled feeds are queried in parallel and merged per
          package.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          {tabBtn('alerts', 'Email alerts')}
          {tabBtn('smtp', 'SMTP / nodemailer')}
          {tabBtn('sources', 'Data sources')}
        </Stack>
      </Box>

      <Box sx={{ px: 3, py: 3, maxHeight: '70vh', overflow: 'auto' }}>
        {section === 'alerts' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
              <strong>When mail is sent</strong>
              <br />
              • <strong>After you run a scan</strong> (upload, edit manifest, save): one email per project, but only for
              dependencies that <strong>changed</strong> in that save (new package, version bump, or newly flagged
              vulnerable). Already-known issues on <strong>unchanged</strong> rows are not repeated — use the 3h job or
              Rescan to refresh the UI without mail noise. The <strong>first</strong> upload for a project still reports
              all current vulnerable / informational rows.
              <br />
              • <strong>Scheduled job (every 3 hours)</strong>: email only when a dependency <strong>newly</strong>{' '}
              becomes vulnerable compared to what we stored last time — e.g. a new advisory hits your version. If three
              packages were already flagged and nothing changed, <strong>no repeat email every 3 hours</strong>.
              <br />
              • <strong>Rescan</strong> (button on a project) refreshes findings only — it does <strong>not</strong> send
              email.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
              <strong>Who receives scan alerts</strong>: addresses you add below. If the list is empty, the server uses
              your <strong>SMTP “From” address</strong> (SMTP tab, with “Use these settings” enabled) or{' '}
              <code style={{ color: '#90caf9' }}>ALERT_EMAIL</code> in the environment — so a test email to a custom address
              alone does not enable scan mail unless that address is added here or set as From.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
              Configure SMTP under <strong>SMTP / nodemailer</strong> or use server environment variables (
              <code style={{ color: '#90caf9' }}>SMTP_HOST</code>, etc.).
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="you@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
              />
              <Button variant="contained" onClick={addEmail} sx={{ minWidth: 100 }}>
                Add
              </Button>
            </Stack>
            <Paper variant="outlined" sx={{ maxHeight: 220, overflow: 'auto', bgcolor: 'rgba(0,0,0,0.15)' }}>
              <List dense disablePadding>
                {emails.map((item) => (
                  <ListItem
                    key={item._id}
                    secondaryAction={
                      <Button size="small" color="error" onClick={() => removeEmail(item._id)}>
                        Remove
                      </Button>
                    }
                  >
                    <ListItemText primary={item.email} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                  </ListItem>
                ))}
                {emails.length === 0 && (
                  <Box sx={{ px: 2, py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No addresses yet — scan alerts will still go to your SMTP From if mail is enabled, or add addresses
                      here.
                    </Typography>
                  </Box>
                )}
              </List>
            </Paper>
          </Box>
        )}

        {section === 'smtp' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
              When <strong>Use these settings</strong> is on and host is set, the API uses this config for nodemailer.
              Otherwise it falls back to <code style={{ color: '#90caf9' }}>SMTP_*</code> environment variables on the
              server. Alerts are only sent when a scan finds vulnerable or informational packages — if everything is
              clean, no mail is sent.
            </Typography>
            <FormControlLabel
              control={<Checkbox checked={mailEnabled} onChange={(e) => setMailEnabled(e.target.checked)} />}
              label="Use these SMTP settings (instead of env only)"
            />
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField
                size="small"
                label="Host"
                fullWidth
                value={mailHost}
                onChange={(e) => setMailHost(e.target.value)}
                placeholder="smtp.example.com"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label="Port"
                  value={mailPort}
                  onChange={(e) => setMailPort(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                />
                <FormControlLabel
                  control={<Checkbox checked={mailSecure} onChange={(e) => setMailSecure(e.target.checked)} />}
                  label="TLS (secure)"
                />
              </Stack>
              <TextField
                size="small"
                label="Username"
                fullWidth
                value={mailUser}
                onChange={(e) => setMailUser(e.target.value)}
                autoComplete="off"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
              />
              <TextField
                size="small"
                label={mailHasPassword ? 'Password (leave blank to keep)' : 'Password'}
                fullWidth
                type="password"
                value={mailPass}
                onChange={(e) => setMailPass(e.target.value)}
                autoComplete="new-password"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
              />
              <TextField
                size="small"
                label="From name"
                fullWidth
                value={mailFromName}
                onChange={(e) => setMailFromName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
              />
              <TextField
                size="small"
                label="From email"
                fullWidth
                value={mailFromEmail}
                onChange={(e) => setMailFromEmail(e.target.value)}
                placeholder="alerts@yourdomain.com"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
              />
              <Button variant="contained" onClick={saveMailConfig} disabled={mailSaving} sx={{ alignSelf: 'flex-start' }}>
                {mailSaving ? 'Saving…' : 'Save SMTP'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                After saving, send a test message (uses saved DB config or env SMTP).
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField
                  size="small"
                  label="Send test to (optional)"
                  placeholder="Uses first alert email if empty"
                  fullWidth
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                />
                <Button variant="outlined" onClick={sendMailTest} disabled={testSending || mailSaving}>
                  {testSending ? 'Sending…' : 'Send test email'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        {section === 'sources' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
              Every <strong>enabled</strong> source runs for each package/version. Results are <strong>merged</strong>:
              duplicate findings by ID/summary combine into one row with <strong>sources</strong> chips (OSV, NPM, Snyk).
              Severity and fix text prefer the strongest / most specific value. npm Security API applies to{' '}
              <strong>npm</strong> only; OSV covers npm and PyPI; Snyk needs a token and your org limits.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'rgba(0,0,0,0.12)' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Snyk shows 403?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                Paste the <strong>API key from your Snyk account</strong> (
                <a href="https://app.snyk.io/account" target="_blank" rel="noopener noreferrer" style={{ color: '#90caf9' }}>
                  app.snyk.io → Account settings → Auth / API
                </a>
                ), not only an OAuth “authorized app” used by the CLI. Requests send{' '}
                <code style={{ color: '#b0bec5' }}>{'Authorization: token <key>'}</code> to{' '}
                <code style={{ color: '#b0bec5' }}>api/v1/test</code>. Some plans block that API — if 403 persists, keep OSV + npm
                enabled and turn Snyk off.
              </Typography>
            </Paper>
            <Stack spacing={1.5}>
              {sources.map((src) => (
                <Paper
                  key={src._id}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: src.active ? 'primary.dark' : 'divider',
                    borderLeftWidth: 4,
                    borderLeftColor: src.active ? 'primary.main' : 'divider',
                    bgcolor: src.active ? 'rgba(126,87,194,0.06)' : 'rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onClick={() => {
                    if (src.name === 'Snyk' && !src.active && !(apiKeys[src._id] || '').trim()) {
                      return;
                    }
                    toggleSource(src._id, src.active, apiKeys[src._id] || '');
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                    <Box>
                      <Typography fontWeight={700}>{src.name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {src.name === 'OSV' && 'Cross-ecosystem advisories (npm & PyPI).'}
                        {src.name === 'NPM Audit' && 'npm registry security bulk advisory API (npm only).'}
                        {src.name === 'Snyk' && 'Commercial feed — paste token below, then tap to enable.'}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 999,
                        fontWeight: 700,
                        bgcolor: src.active ? 'success.dark' : 'rgba(255,255,255,0.08)',
                        color: src.active ? '#fff' : 'text.secondary',
                        flexShrink: 0,
                      }}
                    >
                      {src.active ? 'ON' : 'OFF'}
                    </Typography>
                  </Box>

                  {src.name === 'Snyk' && (
                    <Box sx={{ mt: 2 }} onClick={(e) => e.stopPropagation()}>
                      <TextField
                        size="small"
                        fullWidth
                        type="password"
                        placeholder="Snyk API token"
                        value={apiKeys[src._id] || ''}
                        onChange={(e) => setApiKeys({ ...apiKeys, [src._id]: e.target.value })}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Button size="small" onClick={() => saveApiKey(src._id, src.active, apiKeys[src._id] || '')}>
                                Save
                              </Button>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                      />
                      <Typography variant="caption" color="warning.light" sx={{ display: 'block', mt: 1 }}>
                        Enable only after saving a token. Click the row to toggle once the key is stored.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      <Box sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="text" color="inherit">
          Close
        </Button>
      </Box>
    </Dialog>
  );
}
