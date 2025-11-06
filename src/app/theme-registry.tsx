"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

// Modern Artistic Red-Black-White-Grey Palette for Enescena
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#DC2626", // Bold artistic red
      light: "#EF4444", // Lighter red for hover states
      dark: "#B91C1C", // Darker red for pressed states
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#1F2937", // Deep charcoal grey
      light: "#374151", // Medium grey
      dark: "#111827", // Almost black
      contrastText: "#FFFFFF",
    },
    background: {
      default: "linear-gradient(135deg, #1F2937 0%, #374151 50%, #4B5563 100%)", // Dark gradient background
      paper: "#FFFFFF", // Pure white for cards/surfaces to create contrast
    },
    text: {
      primary: "#111827", // Near black for primary text
      secondary: "#6B7280", // Medium grey for secondary text
    },
    grey: {
      50: "#F9FAFB",
      100: "#F3F4F6",
      200: "#E5E7EB",
      300: "#D1D5DB",
      400: "#9CA3AF",
      500: "#6B7280",
      600: "#4B5563",
      700: "#374151",
      800: "#1F2937",
      900: "#111827",
    },
    error: {
      main: "#DC2626", // Using our primary red for errors
      light: "#F87171",
      dark: "#B91C1C",
    },
    warning: {
      main: "#D97706", // Artistic orange-red
      light: "#F59E0B",
      dark: "#92400E",
    },
    success: {
      main: "#059669", // Balanced green that works with red
      light: "#10B981",
      dark: "#047857",
    },
    divider: "#E5E7EB", // Light grey dividers
  },
  shape: { 
    borderRadius: 12 
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      color: "#111827",
    },
    h2: {
      fontWeight: 700,
      color: "#111827",
    },
    h3: {
      fontWeight: 600,
      color: "#111827",
    },
    h4: {
      fontWeight: 600,
      color: "#111827",
    },
    h5: {
      fontWeight: 600,
      color: "#1F2937",
    },
    h6: {
      fontWeight: 600,
      color: "#1F2937",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.15)",
          },
        },
        contained: {
          backgroundColor: "#DC2626",
          color: "#FFFFFF",
          "&:hover": {
            backgroundColor: "#B91C1C",
            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
          },
          "&:disabled": {
            backgroundColor: "#D1D5DB",
            color: "#6B7280",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
          "&:hover": {
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #1F2937 0%, #374151 100%)",
          color: "#FFFFFF",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
          backdropFilter: "blur(10px)",
        },
      },
    },
  },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}