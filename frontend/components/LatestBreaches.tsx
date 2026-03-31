'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Link as MuiLink,
  Chip,
  Stack,
  CircularProgress,
  Button,
  Collapse,
  Divider,
} from '@mui/material';
import { API_BASE } from '../lib/api';

type Item = {
  id: string;
  cveId: string | null;
  summary: string;
  severity: string;
  publishedAt: string;
  url: string;
  ecosystem: string;
  packageNames: string[];
  headline: string;
};

type Group = {
  key: string;
  displayName: string;
  items: Item[];
};

function severityRank(sev: string): number {
  const u = (sev || '').toLowerCase();
  if (u === 'critical') return 4;
  if (u === 'high') return 3;
  if (u === 'medium') return 2;
  if (u === 'low') return 1;
  return 0;
}

function maxSeverityLabel(items: Item[]): string {
  let best = 0;
  let label = '';
  for (const it of items) {
    const r = severityRank(it.severity);
    if (r > best) {
      best = r;
      label = it.severity || '';
    }
  }
  return label;
}

function severityChipColor(sev: string): 'error' | 'warning' | 'info' | 'default' {
  const u = (sev || '').toLowerCase();
  if (u === 'critical' || u === 'high') return 'error';
  if (u === 'medium') return 'warning';
  if (u === 'low') return 'info';
  return 'default';
}

function groupByPackage(items: Item[]): Group[] {
  const map = new Map<string, Item[]>();
  for (const it of items) {
    let display: string;
    let key: string;
    if (it.packageNames?.length) {
      display = it.packageNames[0];
      key = display.toLowerCase();
    } else {
      const h = it.headline.trim();
      if (h.startsWith('GHSA-')) {
        key = it.id.toLowerCase();
        display = it.id;
      } else {
        display = h.split(/[,+]/)[0].trim() || it.id;
        key = display.toLowerCase() || it.id.toLowerCase();
      }
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }

  const groups: Group[] = [];
  for (const [key, arr] of map.entries()) {
    arr.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const first = arr[0];
    const displayName =
      first.packageNames?.[0] ||
      (first.headline.trim().startsWith('GHSA-') ? first.id : first.headline.split(/[,+]/)[0].trim()) ||
      first.id;
    groups.push({ key, displayName, items: arr });
  }

  groups.sort(
    (a, b) => new Date(b.items[0].publishedAt).getTime() - new Date(a.items[0].publishedAt).getTime()
  );
  return groups;
}

function uniqueEcosystems(items: Item[]): string[] {
  const s = new Set<string>();
  for (const it of items) {
    if (it.ecosystem) s.add(it.ecosystem === 'pip' ? 'PyPI' : it.ecosystem);
  }
  return [...s];
}

export default function LatestBreaches() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/recent-breaches`, { timeout: 25000 });
        if (!cancelled) setItems(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => groupByPackage(items), [items]);

  const toggle = (key: string) => {
    setOpenMap((o) => ({ ...o, [key]: !o[key] }));
  };

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>
        Live feed
      </Typography>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2, mt: 0.5 }}>
        Latest package advisories
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 800, lineHeight: 1.65 }}>
        <strong>Feed source:</strong> recently published advisories from the{' '}
        <strong>GitHub Security Advisory</strong> API (npm + PyPI). That is ideal for a compact “what’s new” list and
        matches GHSA IDs you see elsewhere.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 800, lineHeight: 1.65 }}>
        <strong>OSV (osv.dev)</strong> powers <em>your</em> project scans when enabled in Settings — version-specific
        queries and ranges. OSV does not expose the same kind of simple “global latest” HTTP feed, so this home section
        uses GitHub; scanning still merges OSV + npm + Snyk as configured.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={36} />
        </Box>
      ) : groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Advisories could not be loaded (network or GitHub rate limit). Refresh the page to retry.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          {groups.map((g) => {
            const latest = g.items[0];
            const maxSev = maxSeverityLabel(g.items);
            const ecosystems = uniqueEcosystems(g.items);
            const expanded = !!openMap[g.key];
            return (
              <Paper
                key={g.key}
                elevation={0}
                sx={{
                  p: 2.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    borderColor: 'rgba(126,87,194,0.35)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  },
                }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
                  {maxSev ? (
                    <Chip
                      label={maxSev}
                      size="small"
                      color={severityChipColor(maxSev)}
                      sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize' }}
                    />
                  ) : null}
                  {ecosystems.map((eco) => (
                    <Chip key={eco} label={eco} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                  ))}
                </Stack>

                <Typography
                  color="primary.light"
                  sx={{ fontWeight: 700, fontSize: '1rem', display: 'block', mb: 0.5, wordBreak: 'break-word' }}
                >
                  {g.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  {g.items.length} advisory{g.items.length === 1 ? '' : 'ies'} · latest{' '}
                  {latest?.publishedAt ? new Date(latest.publishedAt).toLocaleDateString() : '—'}
                </Typography>

                <Button size="small" variant="outlined" onClick={() => toggle(g.key)} sx={{ mb: expanded ? 1 : 0 }}>
                  {expanded ? 'Hide details' : 'Show details'}
                </Button>

                <Collapse in={expanded}>
                  <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Stack spacing={1.25}>
                    {g.items.map((it) => (
                      <Box key={it.id} sx={{ pl: 0.5 }}>
                        <MuiLink
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          color="primary.light"
                          sx={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          {it.id}
                        </MuiLink>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.25, lineHeight: 1.5 }}
                        >
                          {it.summary}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
