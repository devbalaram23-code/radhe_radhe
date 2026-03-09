import { createTheme } from '@mui/material/styles';

// Gold color palette
const goldAccent = '#C9A14A';
const goldLight = '#D4AF37';
const goldDark = '#B8932F';

export const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? goldLight : goldAccent,
      light: '#E5C46E',
      dark: goldDark,
      contrastText: mode === 'dark' ? '#0b1220' : '#1E1E1E',
    },
    secondary: {
      main: mode === 'dark' ? '#4A90E2' : '#1976d2',
      light: mode === 'dark' ? '#6BA3E8' : '#42a5f5',
      dark: mode === 'dark' ? '#357ABD' : '#1565c0',
    },
    background: {
      default: mode === 'dark' ? '#0b1220' : '#FAF7F2',
      paper: mode === 'dark' ? '#1a2332' : '#FFFFFF',
    },
    text: {
      primary: mode === 'dark' ? '#e6eef8' : '#333333',
      secondary: mode === 'dark' ? '#b8c5d6' : '#666666',
    },
    divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    error: {
      main: mode === 'dark' ? '#f44336' : '#d32f2f',
    },
    warning: {
      main: mode === 'dark' ? '#ffa726' : '#ed6c02',
    },
    success: {
      main: mode === 'dark' ? '#66bb6a' : '#2e7d32',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 700,
      color: mode === 'dark' ? '#e6eef8' : '#333333',
    },
    h5: {
      fontWeight: 600,
      color: mode === 'dark' ? '#e6eef8' : '#333333',
    },
    h6: {
      fontWeight: 600,
      color: mode === 'dark' ? '#e6eef8' : '#333333',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: mode === 'dark' ? '#1a2332' : '#FFFFFF',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: mode === 'dark' 
            ? '0 2px 8px rgba(0, 0, 0, 0.4)' 
            : '0 2px 8px rgba(0, 0, 0, 0.15)',
          '&:hover': {
            boxShadow: mode === 'dark' 
              ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        },
        head: {
          backgroundColor: mode === 'dark' ? '#0f1a2a' : '#f5f5f5',
          fontWeight: 600,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: mode === 'dark' ? 'rgba(201, 161, 74, 0.08)' : 'rgba(201, 161, 74, 0.04)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: mode === 'dark' ? '#1a2332' : '#FFFFFF',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: mode === 'dark' ? 'rgba(201, 161, 74, 0.5)' : 'rgba(201, 161, 74, 0.7)',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? '#b8c5d6' : '#666666',
          '&:hover': {
            backgroundColor: mode === 'dark' ? 'rgba(201, 161, 74, 0.08)' : 'rgba(201, 161, 74, 0.04)',
          },
        },
      },
    },
  },
});
