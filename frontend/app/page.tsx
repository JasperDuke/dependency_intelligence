'use client';

import { Container, Typography, Box } from '@mui/material';
import SearchBar from '../components/SearchBar';
import LatestBreaches from '../components/LatestBreaches';
import LatestNews from '../components/LatestNews';

export default function Home() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ mb: 1 }}>
        <Typography
          variant="h3"
          component="h1"
          fontWeight={800}
          sx={{
            letterSpacing: '-0.03em',
            background: 'linear-gradient(120deg, #ce93d8 0%, #64b5f6 55%, #4fc3f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Dependency intelligence
        </Typography>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 520, lineHeight: 1.7 }}>
        Search any npm or PyPI package for known issues. Connect data sources and alert emails under{' '}
        <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Settings</strong>. Track lockfiles and manifests on the{' '}
        <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Tracked projects</strong> page.
      </Typography>

      <SearchBar />
      <LatestBreaches />
      <LatestNews />
    </Container>
  );
}
