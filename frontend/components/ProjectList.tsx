'use client';

import { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Divider,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { API_BASE } from '../lib/api';
import EditProjectDialog from './EditProjectDialog';

function severityColor(sev: string) {
  const u = (sev || '').toUpperCase();
  if (u === 'CRITICAL') return 'error';
  if (u === 'HIGH') return 'error';
  if (u === 'MEDIUM') return 'warning';
  if (u === 'LOW') return 'info';
  return 'default';
}

export default function ProjectList({
  projects,
  onDeleted,
  onUpdated,
}: {
  projects: any[];
  onDeleted?: () => void;
  onUpdated?: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rescanningId, setRescanningId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<any | null>(null);

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete “${label}”? This removes the project and its scan history from the tracker.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await axios.delete(`${API_BASE}/api/projects/${id}`);
      onDeleted?.();
    } catch (err) {
      console.error(err);
      alert('Could not delete project. Try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRescan = async (id: string) => {
    setRescanningId(id);
    try {
      await axios.post(`${API_BASE}/api/projects/${id}/rescan`);
      onUpdated?.();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Rescan failed. Try again.');
    } finally {
      setRescanningId(null);
    }
  };

  if (!projects || projects.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        No projects yet. Add a title above and upload or paste a manifest to see results here.
      </Typography>
    );
  }

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {projects.map((proj) => (
        <Paper
          key={proj._id}
          elevation={0}
          sx={{
            width: '100%',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            borderLeft: '4px solid',
            borderLeftColor: 'primary.dark',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'flex-start' },
              gap: 2,
              p: { xs: 2.5, md: 3 },
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'rgba(0,0,0,0.2)',
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.14em', fontSize: '0.7rem' }}>
                Project
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mt: 0.25 }}>
                {proj.title || proj.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, fontFamily: 'ui-monospace, monospace' }}>
                {proj.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Last scan:{' '}
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  {proj.lastScanned ? new Date(proj.lastScanned).toLocaleString() : '—'}
                </Box>
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexShrink={0} flexWrap="wrap" useFlexGap>
              <Chip
                label={proj.projectType === 'npm' ? 'npm' : 'Python'}
                size="small"
                sx={{
                  bgcolor: proj.projectType === 'npm' ? 'rgba(126,87,194,0.25)' : 'rgba(105,240,174,0.15)',
                  color: proj.projectType === 'npm' ? 'primary.light' : 'success.light',
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: proj.projectType === 'npm' ? 'rgba(126,87,194,0.4)' : 'rgba(105,240,174,0.35)',
                }}
              />
              <Button
                size="small"
                variant="contained"
                color="secondary"
                disabled={deletingId === proj._id || rescanningId === proj._id}
                onClick={() => handleRescan(proj._id)}
                sx={{ minWidth: 96 }}
              >
                {rescanningId === proj._id ? <CircularProgress color="inherit" size={18} /> : 'Rescan'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={deletingId === proj._id || rescanningId === proj._id}
                onClick={() => setEditProject(proj)}
                sx={{ minWidth: 88 }}
              >
                Edit
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={deletingId === proj._id || rescanningId === proj._id}
                onClick={() => handleDelete(proj._id, proj.title || proj.name)}
                sx={{ minWidth: 96 }}
              >
                {deletingId === proj._id ? <CircularProgress color="inherit" size={18} /> : 'Delete'}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
            <Typography variant="subtitle2" sx={{ px: { xs: 1, md: 2 }, mb: 1.5, fontWeight: 700, color: 'text.secondary' }}>
              Dependency matrix
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: { xs: 1, md: 2 }, mb: 2, maxWidth: 960, lineHeight: 1.65 }}>
              Scans use every <strong>enabled</strong> data source in Settings (OSV, npm Security API, Snyk with token).
              Findings are <strong>merged</strong>; each row shows <strong>Sources</strong> chips and the combined
              severity / fix text.
              <br />
              <strong>Vulnerable</strong> only if your pinned version satisfies the advisory’s range (npm uses{' '}
              <Box component="span" sx={{ fontFamily: 'ui-monospace, monospace' }}>semver</Box>:{' '}
              <Box component="span" sx={{ fontFamily: 'ui-monospace, monospace' }}>1.6.5</Box> is{' '}
              <em>lower</em> than <Box component="span" sx={{ fontFamily: 'ui-monospace, monospace' }}>1.12.0</Box>, so it
              can still fall inside <Box component="span" sx={{ fontFamily: 'ui-monospace, monospace' }}>{'>=1.0.0 <1.12.0'}</Box>
              . Each finding lists the <strong>vulnerable versions</strong> range and your version for clarity. Use{' '}
              <strong>Rescan</strong> for a fresh pass, re-upload, or wait for the scheduled scan.
            </Typography>

            <TableContainer
              sx={{
                maxHeight: 480,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'rgba(0,0,0,0.2)',
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'rgba(26,26,32,0.98)', borderColor: 'divider' }}>
                      Package
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'rgba(26,26,32,0.98)', borderColor: 'divider', width: 140 }}>
                      Your version
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, bgcolor: 'rgba(26,26,32,0.98)', borderColor: 'divider', width: 160 }}
                    >
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proj.packages?.map((pkg: any) => (
                    <TableRow
                      key={`${proj._id}-${pkg.name}`}
                      hover
                      sx={{ '&:last-child td': { borderBottom: 0 }, verticalAlign: 'top' }}
                    >
                      <TableCell sx={{ borderColor: 'divider', py: 2, maxWidth: { xs: 200, md: 'none' } }}>
                        <Typography fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                          {pkg.name}
                        </Typography>
                        {pkg.vulnerable &&
                          pkg.vulnerabilities?.map((v: any, i: number) => (
                            <Box
                              key={`${v.id}-${i}`}
                              sx={{
                                mt: 1.5,
                                p: 1.5,
                                borderRadius: 1,
                                bgcolor: 'rgba(211,47,47,0.1)',
                                border: '1px solid',
                                borderColor: 'error.dark',
                              }}
                            >
                              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mb: 0.5 }}>
                                {v.severity ? (
                                  <Chip
                                    label={v.severity}
                                    size="small"
                                    color={severityColor(v.severity) as 'error' | 'warning' | 'info' | 'default'}
                                    sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700 }}
                                  />
                                ) : null}
                                {v.sources?.map((s: string) => (
                                  <Chip
                                    key={s}
                                    label={s}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 22, fontSize: '0.65rem' }}
                                  />
                                ))}
                              </Stack>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {v.id}
                                {v.published ? ` · ${new Date(v.published).toLocaleDateString()}` : ''}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.55 }}>
                                {v.summary}
                              </Typography>
                              {v.affectedRange ? (
                                <Box
                                  sx={{
                                    mt: 1.25,
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(0,0,0,0.25)',
                                    border: '1px solid',
                                    borderColor: 'rgba(255,255,255,0.08)',
                                  }}
                                >
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                                    Vulnerable versions (from advisory)
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', mt: 0.5, wordBreak: 'break-word' }}
                                  >
                                    {v.affectedRange}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, lineHeight: 1.5 }}>
                                    Your version <Box component="span" sx={{ fontFamily: 'ui-monospace, monospace', color: 'text.primary' }}>{pkg.version}</Box> is included in this range — that is why this row is marked vulnerable.
                                  </Typography>
                                </Box>
                              ) : null}
                              <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
                              <Typography variant="body2" sx={{ color: 'warning.light' }}>
                                <strong>Upgrade to (non-vulnerable):</strong> {v.fixedVersion}
                              </Typography>
                            </Box>
                          ))}
                        {!pkg.vulnerable && pkg.hasHistoricBreach && (
                          <Typography variant="caption" color="warning.light" sx={{ display: 'block', mt: 1, lineHeight: 1.5 }}>
                            {pkg.historicBreachCount} historical advisories exist for this package name —{' '}
                            <strong>your version is outside the vulnerable ranges</strong> we evaluated.
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'divider', fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}>
                        {pkg.version}
                      </TableCell>
                      <TableCell align="right" sx={{ borderColor: 'divider' }}>
                        <Chip
                          label={
                            pkg.vulnerable ? 'Vulnerable' : pkg.hasHistoricBreach ? 'Safe · context' : 'Safe'
                          }
                          size="small"
                          sx={{
                            height: 26,
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            bgcolor: pkg.vulnerable
                              ? 'error.dark'
                              : pkg.hasHistoricBreach
                                ? 'rgba(237,108,2,0.35)'
                                : 'success.dark',
                            color: '#fff',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      ))}
      <EditProjectDialog
        open={!!editProject}
        project={editProject}
        onClose={() => setEditProject(null)}
        onSaved={() => onUpdated?.()}
      />
    </Stack>
  );
}
