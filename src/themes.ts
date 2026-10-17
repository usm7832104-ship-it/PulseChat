import { createTheme, Theme } from '@mui/material/styles';
import { ThemePaletteOption } from './types';

export const GLOBAL_THEME_PALETTES: ThemePaletteOption[] = [
  {
    id: 'whatsapp-emerald',
    name: 'Emerald Classic',
    category: 'Signature',
    primary: '#00a884',
    secondary: '#008069',
    accent: '#25d366',
    outgoingBubbleLight: '#d9fdd3',
    outgoingBubbleDark: '#005c4b',
    sidebarHeaderLight: '#008069',
    sidebarHeaderDark: '#202c33',
  },
  {
    id: 'royal-ocean',
    name: 'Royal Ocean',
    category: 'Oceanic',
    primary: '#0284c7',
    secondary: '#0369a1',
    accent: '#38bdf8',
    outgoingBubbleLight: '#e0f2fe',
    outgoingBubbleDark: '#0c4a6e',
    sidebarHeaderLight: '#0369a1',
    sidebarHeaderDark: '#0f172a',
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    category: 'Executive',
    primary: '#4f46e5',
    secondary: '#4338ca',
    accent: '#818cf8',
    outgoingBubbleLight: '#e0e7ff',
    outgoingBubbleDark: '#312e81',
    sidebarHeaderLight: '#4338ca',
    sidebarHeaderDark: '#1e1b4b',
  },
  {
    id: 'sunset-coral',
    name: 'Sunset Coral',
    category: 'Warm',
    primary: '#e11d48',
    secondary: '#be123c',
    accent: '#fb7185',
    outgoingBubbleLight: '#ffe4e6',
    outgoingBubbleDark: '#881337',
    sidebarHeaderLight: '#be123c',
    sidebarHeaderDark: '#1f1218',
  },
  {
    id: 'forest-sage',
    name: 'Forest Sage',
    category: 'Botanical',
    primary: '#15803d',
    secondary: '#166534',
    accent: '#4ade80',
    outgoingBubbleLight: '#dcfce7',
    outgoingBubbleDark: '#14532d',
    sidebarHeaderLight: '#166534',
    sidebarHeaderDark: '#111c16',
  },
  {
    id: 'amber-gold',
    name: 'Amber Gold',
    category: 'Warm',
    primary: '#d97706',
    secondary: '#b45309',
    accent: '#fbbf24',
    outgoingBubbleLight: '#fef3c7',
    outgoingBubbleDark: '#78350f',
    sidebarHeaderLight: '#b45309',
    sidebarHeaderDark: '#1c1917',
  },
  {
    id: 'violet-amethyst',
    name: 'Violet Amethyst',
    category: 'Creative',
    primary: '#7c3aed',
    secondary: '#6d28d9',
    accent: '#a78bfa',
    outgoingBubbleLight: '#ede9fe',
    outgoingBubbleDark: '#4c1d95',
    sidebarHeaderLight: '#6d28d9',
    sidebarHeaderDark: '#1e1433',
  },
  {
    id: 'slate-minimal',
    name: 'Slate Minimal',
    category: 'Architectural',
    primary: '#334155',
    secondary: '#1e293b',
    accent: '#64748b',
    outgoingBubbleLight: '#e2e8f0',
    outgoingBubbleDark: '#1e293b',
    sidebarHeaderLight: '#1e293b',
    sidebarHeaderDark: '#0f172a',
  },
  {
    id: 'crimson-ruby',
    name: 'Crimson Ruby',
    category: 'Bold',
    primary: '#dc2626',
    secondary: '#b91c1c',
    accent: '#f87171',
    outgoingBubbleLight: '#fee2e2',
    outgoingBubbleDark: '#7f1d1d',
    sidebarHeaderLight: '#b91c1c',
    sidebarHeaderDark: '#1f1212',
  },
  {
    id: 'teal-lagoon',
    name: 'Teal Lagoon',
    category: 'Oceanic',
    primary: '#0d9488',
    secondary: '#0f766e',
    accent: '#2dd4bf',
    outgoingBubbleLight: '#ccfbf1',
    outgoingBubbleDark: '#134e4a',
    sidebarHeaderLight: '#0f766e',
    sidebarHeaderDark: '#0f1f1e',
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    category: 'Creative',
    primary: '#db2777',
    secondary: '#be185d',
    accent: '#f472b6',
    outgoingBubbleLight: '#fce7f3',
    outgoingBubbleDark: '#831843',
    sidebarHeaderLight: '#be185d',
    sidebarHeaderDark: '#21121a',
  },
  {
    id: 'cobalt-electric',
    name: 'Cobalt Electric',
    category: 'Executive',
    primary: '#2563eb',
    secondary: '#1d4ed8',
    accent: '#60a5fa',
    outgoingBubbleLight: '#dbeafe',
    outgoingBubbleDark: '#1e3a8a',
    sidebarHeaderLight: '#1d4ed8',
    sidebarHeaderDark: '#0f172a',
  },
  {
    id: 'espresso-bronze',
    name: 'Espresso Bronze',
    category: 'Architectural',
    primary: '#92400e',
    secondary: '#78350f',
    accent: '#d97706',
    outgoingBubbleLight: '#fef3c7',
    outgoingBubbleDark: '#451a03',
    sidebarHeaderLight: '#78350f',
    sidebarHeaderDark: '#1c1512',
  },
  {
    id: 'cyber-mint',
    name: 'Cyber Mint',
    category: 'Botanical',
    primary: '#059669',
    secondary: '#047857',
    accent: '#34d399',
    outgoingBubbleLight: '#d1fae5',
    outgoingBubbleDark: '#064e3b',
    sidebarHeaderLight: '#047857',
    sidebarHeaderDark: '#0c1f1a',
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    category: 'Oceanic',
    primary: '#0369a1',
    secondary: '#075985',
    accent: '#38bdf8',
    outgoingBubbleLight: '#e0f2fe',
    outgoingBubbleDark: '#082f49',
    sidebarHeaderLight: '#075985',
    sidebarHeaderDark: '#0c1926',
  },
  {
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    category: 'Signature',
    primary: '#b45309',
    secondary: '#92400e',
    accent: '#f59e0b',
    outgoingBubbleLight: '#fef3c7',
    outgoingBubbleDark: '#451a03',
    sidebarHeaderLight: '#92400e',
    sidebarHeaderDark: '#181411',
  },
];

export function getPaletteById(themeId: string): ThemePaletteOption {
  return (
    GLOBAL_THEME_PALETTES.find((p) => p.id === themeId) || GLOBAL_THEME_PALETTES[0]
  );
}

export function createPulseTheme(themeId: string, mode: 'light' | 'dark'): Theme {
  const paletteOption = getPaletteById(themeId);
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: paletteOption.primary,
        dark: paletteOption.secondary,
        light: paletteOption.accent,
        contrastText: '#ffffff',
      },
      secondary: {
        main: paletteOption.secondary,
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0b141a' : '#f8fafc',
        paper: isDark ? '#111b21' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e9edef' : '#0f172a',
        secondary: isDark ? '#8696a0' : '#475569',
      },
      divider: isDark ? 'rgba(134, 150, 160, 0.15)' : 'rgba(15, 23, 42, 0.08)',
      success: {
        main: '#16a34a',
      },
      warning: {
        main: '#d97706',
      },
      error: {
        main: '#dc2626',
      },
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 700,
        letterSpacing: '-0.015em',
      },
      h6: {
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      subtitle1: {
        fontWeight: 600,
      },
      subtitle2: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            border: isDark
              ? '1px solid rgba(134, 150, 160, 0.18)'
              : '1px solid rgba(15, 23, 42, 0.08)',
          },
        },
      },
    },
  });
}
