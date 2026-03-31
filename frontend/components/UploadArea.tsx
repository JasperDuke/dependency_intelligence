'use client';

import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
} from '@mui/material';
import axios from 'axios';
import { API_BASE } from '../lib/api';

function detectFileMeta(fileName: string): { projectType: 'npm' | 'python'; fileType: string } {
  const lower = fileName.toLowerCase();
  if (lower === 'package.json' || lower.endsWith('package.json')) {
    return { projectType: 'npm', fileType: 'package.json' };
  }
  if (lower === 'uv.lock' || lower.endsWith('uv.lock')) {
    return { projectType: 'python', fileType: 'uv.lock' };
  }
  if (lower.includes('requirements') || lower.endsWith('.txt')) {
    return { projectType: 'python', fileType: 'requirements.txt' };
  }
  return { projectType: 'npm', fileType: fileName };
}

export default function UploadArea({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteKind, setPasteKind] = useState<'npm' | 'python'>('npm');
  const [pasteText, setPasteText] = useState('');

  const upload = async (
    content: string,
    projectType: 'npm' | 'python',
    fileType: string,
    clearTitle?: boolean
  ) => {
    const t = title.trim();
    if (!t) {
      alert('Please enter a project title so you can recognize this upload later.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/projects`, {
        title: t,
        projectType,
        content,
        fileType,
      });
      onUploadSuccess();
      if (clearTitle) setPasteText('');
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const { projectType, fileType } = detectFileMeta(file.name);
    await upload(text, projectType, fileType);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await handleFile(f);
    e.target.value = '';
  };

  const submitPaste = async () => {
    const content = pasteText.trim();
    if (!content) return;
    const fileType = pasteKind === 'npm' ? 'plain-npm' : 'plain-python';
    const projectType = pasteKind === 'npm' ? 'npm' : 'python';
    await upload(content, projectType, fileType, true);
    setPasteOpen(false);
  };

  return (
    <>
      <Paper
        elevation={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        sx={{
          p: { xs: 3, sm: 4 },
          mb: 4,
          border: '1px dashed',
          borderColor: drag ? 'primary.light' : 'divider',
          bgcolor: drag ? 'rgba(126,87,194,0.06)' : 'background.paper',
          borderRadius: 2,
          cursor: loading ? 'default' : 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".json,.txt,.lock,package.json,requirements.txt,uv.lock"
          onChange={handleFileChange}
        />

        <Stack spacing={2}>
          <TextField
            label="Project title"
            placeholder="e.g. Customer portal API"
            value={title}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            size="small"
            required
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {loading ? (
              <CircularProgress size={28} />
            ) : (
              <Box
                aria-hidden
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.5,
                  border: '2px solid',
                  borderColor: 'primary.light',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.light',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                }}
              >
                ↑
              </Box>
            )}
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Drop a file here, or click to choose
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported: <strong>package.json</strong>, <strong>requirements.txt</strong>, <strong>uv.lock</strong>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="contained"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                background: 'linear-gradient(120deg, #7E57C2 0%, #42a5f5 100%)',
                '&:hover': { filter: 'brightness(1.05)' },
              }}
            >
              Choose file
            </Button>
            <Button variant="outlined" disabled={loading} onClick={() => setPasteOpen(true)}>
              Paste as text
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Dialog
        open={pasteOpen}
        onClose={() => !loading && setPasteOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Paste dependencies</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose the format, then paste{' '}
            <strong>package.json</strong> JSON (or a dependencies object), or Python-style lines like{' '}
            <code style={{ color: '#90caf9' }}>requests==2.31.0</code>.
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={pasteKind}
            onChange={(_, v) => v && setPasteKind(v)}
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="npm">npm (JSON)</ToggleButton>
            <ToggleButton value="python">Python (requirements)</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            multiline
            minRows={10}
            maxRows={20}
            fullWidth
            placeholder={
              pasteKind === 'npm'
                ? '{ "dependencies": { "lodash": "^4.17.21" } }'
                : 'requests==2.31.0\nurllib3>=2.0'
            }
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            sx={{ '& textarea': { fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPasteOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={loading || !pasteText.trim()} onClick={submitPaste}>
            Scan pasted content
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
