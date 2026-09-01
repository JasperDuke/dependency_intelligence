'use client';

import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import SearchBar from '../components/SearchBar';
import LatestBreaches from '../components/LatestBreaches';
import LatestNews from '../components/LatestNews';

const capabilities = [
  ['Version-aware', 'See whether the version you use is actually affected.'],
  ['Multi-source', 'Bring OSV, npm, and Snyk findings into one view.'],
  ['Continuous', 'Track manifests and rescan projects as dependencies change.'],
];

export default function Home() {
  return (
    <>
      <Box
        component="section"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid',
          borderColor: 'divider',
          background:
            'radial-gradient(circle at 14% 15%, rgba(126, 87, 194, 0.22), transparent 28%), radial-gradient(circle at 84% 10%, rgba(66, 165, 245, 0.16), transparent 26%)',
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 7, md: 11 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.12fr) minmax(320px, 0.88fr)' }, gap: { xs: 5, md: 8 }, alignItems: 'center', justifyItems: { md: 'stretch' } }}>
            <Box>
              <Chip
                label="Dependency security, clarified"
                size="small"
                sx={{ mb: 2.5, px: 0.5, bgcolor: 'rgba(179, 157, 219, 0.12)', color: 'primary.light', border: '1px solid rgba(179, 157, 219, 0.28)', fontWeight: 700 }}
              />
              <Typography variant="h1" component="h1" sx={{ maxWidth: 720, fontSize: { xs: '2.6rem', sm: '3.7rem', md: '4.4rem' }, lineHeight: 1.04, fontWeight: 800, letterSpacing: '-0.055em' }}>
                Know what your{' '}
                <Box component="span" sx={{ background: 'linear-gradient(105deg, #d5b8ff 12%, #77c9ff 86%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  dependencies
                </Box>{' '}
                are carrying.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 3, maxWidth: 590, fontSize: { xs: '1rem', md: '1.12rem' }, lineHeight: 1.75 }}>
                Search a package before it ships, or monitor the manifests your team already relies on. Nexus turns noisy advisory data into clear version-specific guidance.
              </Typography>
              <Box sx={{ mt: 4, maxWidth: 650 }}>
                <SearchBar />
              </Box>
            </Box>

            <Box sx={{ position: 'relative', mx: { xs: 'auto', md: 0 }, width: '100%', maxWidth: 430 }}>
              <Box sx={{ position: 'absolute', width: 260, height: 260, right: -75, top: -75, borderRadius: '50%', bgcolor: 'rgba(126,87,194,0.18)', filter: 'blur(8px)' }} />
              <Box sx={{ position: 'relative', p: { xs: 2, sm: 2.5 }, borderRadius: 2, bgcolor: 'rgba(24, 25, 35, 0.82)', border: '1px solid rgba(179, 157, 219, 0.25)', boxShadow: '0 24px 70px rgba(0,0,0,0.3)', backdropFilter: 'blur(18px)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>SCAN SUMMARY</Typography>
                    <Typography fontWeight={700}>Customer portal</Typography>
                  </Box>
                  <Chip label="MONITORED" size="small" color="success" sx={{ fontSize: '0.62rem', fontWeight: 800 }} />
                </Stack>
                <Stack spacing={1.25} sx={{ py: 2 }}>
                  {[
                    ['axios', '1.7.9', 'Clear'],
                    ['cookie', '0.6.0', 'Review'],
                    ['lodash', '4.17.21', 'Clear'],
                  ].map(([name, version, state]) => (
                    <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.035)' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: state === 'Review' ? 'warning.main' : 'success.main', boxShadow: state === 'Review' ? '0 0 12px rgba(255, 183, 77, .7)' : '0 0 12px rgba(105, 240, 174, .55)' }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700} fontSize="0.88rem">{name}</Typography><Typography color="text.secondary" fontSize="0.75rem">v{version}</Typography></Box>
                      <Typography color={state === 'Review' ? 'warning.light' : 'success.light'} fontWeight={700} fontSize="0.75rem">{state}</Typography>
                    </Box>
                  ))}
                </Stack>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(126,87,194,0.13)', border: '1px solid rgba(179,157,219,0.18)' }}>
                  <Typography variant="caption" color="primary.light" fontWeight={800}>ACTIONABLE, NOT ALARMING</Typography>
                  <Typography variant="body2" sx={{ mt: 0.4, lineHeight: 1.5 }}>Focus attention only where your pinned version falls in an affected range.</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Box component="section" aria-label="Product capabilities" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.015)' }}>
          {capabilities.map(([title, detail], index) => (
            <Box key={title} sx={{ p: { xs: 2.5, md: 3 }, borderBottom: { xs: index < capabilities.length - 1 ? '1px solid' : 0, md: 0 }, borderRight: { md: index < capabilities.length - 1 ? '1px solid' : 0 }, borderColor: 'divider' }}>
              <Typography color="primary.light" fontWeight={800} variant="overline" sx={{ letterSpacing: '0.1em' }}>0{index + 1}</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>{title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.65 }}>{detail}</Typography>
            </Box>
          ))}
        </Box>
        <LatestBreaches />
        <LatestNews />
      </Container>
    </>
  );
}
