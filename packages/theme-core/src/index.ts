export const theme = {
  light: {
    bg: '#ffffff',
    fg: '#1a1a1a',
    accent: '#0066cc',
  },
  dark: {
    bg: '#1a1a1a',
    fg: '#f5f5f5',
    accent: '#4da6ff',
  },
} as const

export type Theme = typeof theme
export type ThemePalette = typeof theme.light
