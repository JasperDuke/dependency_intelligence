'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#7E57C2',
      light: '#b085f5',
      dark: '#4d2c91',
    },
    background: {
      default: '#0f0f13',
      paper: '#1a1a20',
    },
    error: {
      main: '#FF5252',
    },
    success: {
      main: '#69F0AE',
    }
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        }
      }
    }
  },
});

export default theme;
