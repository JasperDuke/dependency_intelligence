'use client';

import { Box, Typography, Paper, Link as MuiLink } from '@mui/material';

const items = [
  {
    title: 'OSV — Open Source Vulnerabilities',
    blurb: 'Cross-ecosystem advisory database used by this app for npm and PyPI queries.',
    href: 'https://osv.dev/',
  },
  {
    title: 'GitHub Advisory Database',
    blurb: 'Security advisories for open source packages; many IDs align with OSV records.',
    href: 'https://github.com/advisories',
  },
  {
    title: 'PyPI security',
    blurb: 'Official guidance on reporting and understanding vulnerabilities in Python packages.',
    href: 'https://pypi.org/security/',
  },
  {
    title: 'npm security best practices',
    blurb: 'How npm handles advisories and what “bulk advisory” responses mean for your lockfile.',
    href: 'https://docs.npmjs.com/threats-and-mitigations',
  },
];

export default function LatestNews() {
  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>
        Stay informed
      </Typography>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2, mt: 0.5 }}>
        Latest references
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
        Short list of authoritative sources behind dependency scanning. Use them alongside this dashboard
        when triaging CVEs and upgrade paths.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        {items.map((item) => (
          <Paper
            key={item.href}
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
            <MuiLink
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              color="primary.light"
              sx={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', mb: 1 }}
            >
              {item.title}
            </MuiLink>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {item.blurb}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
