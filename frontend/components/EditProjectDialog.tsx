'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  MenuItem,
} from '@mui/material';
import { API_BASE } from '../lib/api';

const FILE_TYPES: { value: string; label: string }[] = [
  { value: 'package.json', label: 'package.json (npm)' },
  { value: 'plain-npm', label: 'npm — pasted JSON / dependencies' },
  { value: 'requirements.txt', label: 'requirements.txt (Python)' },
  { value: 'plain-python', label: 'Python — pasted lines (name==version)' },
  { value: 'uv.lock', label: 'uv.lock' },
];

function legacyPlaintext(project: any): string {
  if (project?.sourceContent && String(project.sourceContent).trim()) {
    return String(project.sourceContent);
  }
  const pkgs = project?.packages || [];
  if (!pkgs.length) return '';
  if (project.projectType === 'npm') {
    const deps: Record<string, string> = {};
    pkgs.forEach((p: any) => {
      deps[p.name] = p.version || '*';
    });
    return JSON.stringify({ dependencies: deps }, null, 2);
  }
  return pkgs.map((p: any) => `${p.name}==${p.version || '*'}`).join('\n');
}

function defaultFileType(project: any): string {
  if (project?.fileType) return project.fileType;
  return project?.projectType === 'npm' ? 'package.json' : 'requirements.txt';
}

export default function EditProjectDialog({
  open,
  onClose,
  project,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  project: any | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fileType, setFileType] = useState('package.json');
  const [saving, setSaving] = useState(false);
  const [legacyHint, setLegacyHint] = useState(false);

  useEffect(() => {
    if (!open || !project) return;
    setTitle(project.title || project.name || '');
    const hadSource = !!(project.sourceContent && String(project.sourceContent).trim());
    setLegacyHint(!hadSource && (project.packages?.length > 0));
    setContent(legacyPlaintext(project));
    setFileType(defaultFileType(project));
  }, [open, project]);

  const handleSave = async () => {
    if (!project?._id) return;
    const body = content;
    if (!body.trim()) {
      alert('Paste or keep your manifest text before saving.');
      return;
    }
    setSaving(true);
    try {
      await axios.patch(`${API_BASE}/api/projects/${project._id}`, {
        title: title.trim() || undefined,
        content: body,
        fileType,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          minHeight: '70vh',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Edit manifest</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          Edit the <strong>full file</strong> as plain text — same as when you uploaded. Saving replaces the whole
          dependency set and runs a <strong>full rescan</strong> (no partial row updates).
        </Typography>
        {legacyHint ? (
          <Typography variant="caption" color="warning.light" sx={{ display: 'block' }}>
            Original file text was not stored for this project; we pre-filled a best-effort export from scanned packages.
            Replace with your real <code>package.json</code> / <code>requirements.txt</code> / lockfile content if needed.
          </Typography>
        ) : null}
        <TextField
          label="Title"
          fullWidth
          size="small"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
        />
        <TextField
          select
          label="Format"
          size="small"
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          sx={{ maxWidth: 360, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
        >
          {FILE_TYPES.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            File contents
          </Typography>
          <TextField
            multiline
            fullWidth
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or edit the full manifest here…"
            sx={{
              flex: 1,
              '& .MuiInputBase-root': {
                alignItems: 'stretch',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
              },
              '& textarea': { minHeight: 'min(55vh, 520px) !important' },
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Save updates stored text, rescans all packages, and refreshes last scan time. Alert emails run if configured.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save & replace all'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
