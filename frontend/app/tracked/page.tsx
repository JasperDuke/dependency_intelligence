'use client';

import { useState, useEffect } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import axios from 'axios';
import UploadArea from '../../components/UploadArea';
import ProjectList from '../../components/ProjectList';
import { API_BASE } from '../../lib/api';

export default function TrackedPage() {
  const [projects, setProjects] = useState<any[]>([]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/projects`);
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <Container maxWidth={false} sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3, md: 4, lg: 5 }, maxWidth: 'min(1600px, 100%) !important', mx: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'flex-end' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>
            Monitoring
          </Typography>
          <Typography variant="h4" component="h1" fontWeight={800} sx={{ letterSpacing: '-0.02em', mt: 0.5 }}>
            Tracked projects
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 560 }}>
            Upload a manifest or paste dependency text. Each project keeps your last scan time, per-package status,
            severity, and fix hints from OSV, npm advisories, and optionally Snyk.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={fetchProjects}
          sx={{ borderColor: 'divider', flexShrink: 0 }}
        >
          Refresh list
        </Button>
      </Box>

      <UploadArea onUploadSuccess={fetchProjects} />
      <ProjectList projects={projects} onDeleted={fetchProjects} onUpdated={fetchProjects} />
    </Container>
  );
}
