'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

export default function AppHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const pathname = usePathname();

  const linkSx = (active: boolean) => ({
    color: active ? 'primary.light' : 'text.secondary',
    fontWeight: active ? 600 : 500,
    textDecoration: 'none',
    fontSize: '0.95rem',
    '&:hover': { color: 'primary.light' },
  });

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'rgba(15,15,19,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', px: { xs: 2, sm: 3 } }}>
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{
            fontWeight: 700,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(120deg, #b39ddb 0%, #64b5f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textDecoration: 'none',
            mr: 4,
          }}
        >
          Nexus Security
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
          <Typography component={Link} href="/" sx={linkSx(pathname === '/')}>
            Home
          </Typography>
          <Typography component={Link} href="/tracked" sx={linkSx(pathname === '/tracked')}>
            Tracked projects
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={onOpenSettings}
          sx={{
            borderColor: 'rgba(255,255,255,0.2)',
            color: 'text.primary',
            '&:hover': { borderColor: 'primary.light', bgcolor: 'rgba(126,87,194,0.08)' },
          }}
        >
          Settings
        </Button>
      </Toolbar>
    </AppBar>
  );
}
