'use client';

import { useState } from 'react';
import { Box } from '@mui/material';
import AppHeader from './AppHeader';
import SettingsModal from './SettingsModal';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader onOpenSettings={() => setSettingsOpen(true)} />
      <Box component="main" sx={{ flex: 1 }}>{children}</Box>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
}
