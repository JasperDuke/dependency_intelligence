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
  TextField,
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
  const [packageQuery, setPackageQuery] = useState('');

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

          <Box sx={{ px: { xs: 1, md: 2 }, py: 2.5 }}>
            {(() => {
              const packages = proj.packages || [];
              const vulnerableCount = packages.filter((pkg: any) => pkg.vulnerable).length;
              const contextualCount = packages.filter((pkg: any) => !pkg.vulnerable && pkg.hasHistoricBreach).length;
              const filteredPackages = packages.filter((pkg: any) => pkg.name.toLowerCase().includes(packageQuery.trim().toLowerCase()));
              return <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, px: { xs: 1, md: 2 }, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box><Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>DEPENDENCY INVENTORY</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>{packages.length} package{packages.length === 1 ? '' : 's'} scanned · findings are matched to your pinned versions.</Typography></Box>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap"><Chip label={`${vulnerableCount} need${vulnerableCount === 1 ? 's' : ''} attention`} size="small" color={vulnerableCount ? 'error' : 'success'} variant={vulnerableCount ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />{contextualCount > 0 && <Chip label={`${contextualCount} historical`} size="small" variant="outlined" color="warning" sx={{ fontWeight: 700 }} />}</Stack>
                </Box>
                <Box sx={{ px: { xs: 1, md: 2 }, mb: 2 }}><TextField size="small" fullWidth value={packageQuery} onChange={(event) => setPackageQuery(event.target.value)} placeholder="Filter packages by name" slotProps={{ input: { 'aria-label': 'Filter packages by name' } }} sx={{ maxWidth: 420, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.18)' } }} /></Box>
                <TableContainer sx={{ maxHeight: 520, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'rgba(0,0,0,0.16)' }}>
                  <Table size="small" stickyHeader aria-label={`${proj.title || proj.name} dependency inventory`}>
                    <TableHead><TableRow><TableCell sx={{ fontWeight: 800, letterSpacing: '0.04em', fontSize: '0.7rem', bgcolor: 'rgba(26,26,32,0.98)', borderColor: 'divider' }}>PACKAGE</TableCell><TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, letterSpacing: '0.04em', fontSize: '0.7rem', bgcolor: 'rgba(26,26,32,0.98)', borderColor: 'divider', width: 160 }}>PINNED VERSION</TableCell><TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, letterSpacing: '0.04em', fontSize: '0.7rem', bgcolor: 'rgba(26,26,32,0.98)', borderColor: 'divider', width: 170 }}>ASSESSMENT</TableCell></TableRow></TableHead>
                    <TableBody>{filteredPackages.map((pkg: any) => {
                      const statusLabel = pkg.vulnerable ? 'Action needed' : pkg.hasHistoricBreach ? 'Historical context' : 'Clear';
                      const statusColor = pkg.vulnerable ? 'error.dark' : pkg.hasHistoricBreach ? 'rgba(237,108,2,0.35)' : 'success.dark';
                      return <TableRow key={`${proj._id}-${pkg.name}`} hover sx={{ '&:last-child td': { borderBottom: 0 }, verticalAlign: 'top', '&:hover': { bgcolor: 'rgba(126,87,194,0.045)' } }}>
                        <TableCell sx={{ borderColor: 'divider', py: 2, maxWidth: { xs: 200, md: 'none' } }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}><Box sx={{ minWidth: 0 }}><Typography fontWeight={800} sx={{ wordBreak: 'break-word' }}>{pkg.name}</Typography><Typography sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.4, fontFamily: 'ui-monospace, monospace', fontSize: '0.76rem', color: 'text.secondary' }}>v{pkg.version}</Typography></Box><Chip label={statusLabel} size="small" sx={{ display: { xs: 'flex', sm: 'none' }, height: 23, fontSize: '0.62rem', fontWeight: 800, bgcolor: statusColor, color: '#fff', flexShrink: 0 }} /></Stack>
                        {pkg.vulnerable && pkg.vulnerabilities?.map((v: any, i: number) => <Box key={`${v.id}-${i}`} sx={{ mt: 1.5, p: { xs: 1.25, sm: 1.5 }, borderRadius: 1.5, bgcolor: 'rgba(211,47,47,0.1)', border: '1px solid', borderColor: 'error.dark' }}><Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mb: 0.75 }}>{v.severity && <Chip label={v.severity} size="small" color={severityColor(v.severity) as 'error' | 'warning' | 'info' | 'default'} sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800 }} />}{v.sources?.map((source: string) => <Chip key={source} label={source} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />)}</Stack><Typography variant="caption" color="text.secondary" display="block">{v.id}{v.published ? ` · ${new Date(v.published).toLocaleDateString()}` : ''}</Typography><Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.55 }}>{v.summary}</Typography>{v.affectedRange && <Box sx={{ mt: 1.25, p: 1, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.22)' }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AFFECTED RANGE</Typography><Typography variant="body2" sx={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', mt: 0.35, wordBreak: 'break-word' }}>{v.affectedRange}</Typography></Box>}<Typography variant="body2" sx={{ mt: 1.25, color: 'warning.light' }}><strong>Upgrade to:</strong> {v.fixedVersion}</Typography></Box>)}
                        {!pkg.vulnerable && pkg.hasHistoricBreach && <Typography variant="caption" color="warning.light" sx={{ display: 'block', mt: 1, lineHeight: 1.5 }}>{pkg.historicBreachCount} historical advisories exist, but your pinned version is outside the affected ranges.</Typography>}</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, borderColor: 'divider', fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem', color: 'text.secondary' }}>{pkg.version}</TableCell><TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' }, borderColor: 'divider' }}><Chip label={statusLabel} size="small" sx={{ height: 26, fontSize: '0.7rem', fontWeight: 800, bgcolor: statusColor, color: '#fff' }} /></TableCell>
                      </TableRow>;
                    })}{filteredPackages.length === 0 && <TableRow><TableCell colSpan={3} sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>No packages match “{packageQuery}”.</TableCell></TableRow>}</TableBody>
                  </Table>
                </TableContainer>
              </>;
            })()}
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
