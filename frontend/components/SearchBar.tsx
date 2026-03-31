'use client';

import { useState } from 'react';
import {
  TextField,
  Box,
  Paper,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  Chip,
  Stack,
} from '@mui/material';
import axios from 'axios';
import { API_BASE } from '../lib/api';

function severityColor(sev: string) {
  const u = (sev || '').toUpperCase();
  if (u === 'CRITICAL' || u === 'HIGH') return 'error';
  if (u === 'MEDIUM') return 'warning';
  if (u === 'LOW') return 'info';
  return 'default';
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [ecosystem, setEcosystem] = useState('npm');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/search?name=${encodeURIComponent(query.trim())}&ecosystem=${ecosystem}`
        );
        setResult(res.data.status);
      } catch (err) {
        console.error(err);
        setResult(null);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Quick lookup
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Select
          value={ecosystem}
          onChange={(e) => setEcosystem(e.target.value as string)}
          size="small"
          sx={{ minWidth: 110, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}
        >
          <MenuItem value="npm">npm</MenuItem>
          <MenuItem value="PyPI">PyPI</MenuItem>
        </Select>
        <TextField
          fullWidth
          size="small"
          placeholder="Package name, then Enter (e.g. lodash)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
          slotProps={{
            input: {
              endAdornment: loading ? <CircularProgress size={20} /> : null,
            },
          }}
          sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
        />
      </Box>

      {result && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: '1px solid',
            borderColor: result.vulnerable ? 'error.dark' : result.hasHistoricBreach ? 'warning.dark' : 'success.dark',
            bgcolor: result.vulnerable
              ? 'rgba(211,47,47,0.08)'
              : result.hasHistoricBreach
                ? 'rgba(237,108,2,0.08)'
                : 'rgba(46,125,50,0.08)',
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            {result.vulnerable
              ? 'Vulnerable for checked version'
              : result.hasHistoricBreach
                ? 'Clear for your version (historic issues exist for this package)'
                : 'No issues reported for this version'}
          </Typography>

          {result.vulnerable &&
            result.vulnerabilities?.map((v: any) => (
              <Box
                key={v.id + v.summary}
                sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}
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
                    <Chip key={s} label={s} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block">
                  {v.id} · {v.published ? new Date(v.published).toLocaleDateString() : '—'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                  {v.summary}
                </Typography>
                {v.affectedRange ? (
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', mt: 1, fontFamily: 'ui-monospace, monospace', color: 'text.secondary', lineHeight: 1.6 }}
                  >
                    <Box component="span" sx={{ fontFamily: 'inherit', fontWeight: 700, color: 'text.primary' }}>
                      Vulnerable versions:{' '}
                    </Box>
                    {v.affectedRange}
                  </Typography>
                ) : null}
                <Typography variant="body2" sx={{ mt: 1, color: 'warning.light' }}>
                  <strong>Upgrade to:</strong> {v.fixedVersion}
                </Typography>
              </Box>
            ))}

          {!result.vulnerable && result.hasHistoricBreach && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
              This package has about <strong>{result.historicBreachCount}</strong> historical advisories. Your queried
              version is not listed as affected — keep your lockfile pinned and re-scan after upgrades.
            </Typography>
          )}

          {!result.vulnerable && !result.hasHistoricBreach && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No current advisories matched the version you searched (default comparison uses a sample version if none
              specified).
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
}
