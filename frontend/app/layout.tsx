import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme';
import ClientShell from '../components/ClientShell';

export const metadata: Metadata = {
  title: 'Vulnerability Tracker',
  description: 'Track NPM and PyPI vulnerabilities.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0f0f13', color: '#fff' }}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ClientShell>{children}</ClientShell>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
