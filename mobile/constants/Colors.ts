// Colors matching frontend web (tailwind.config.ts)

const Colors = {
  // Primary Orange - Energetic & Modern
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main Orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  // Secondary Blue - Trust & Professionalism
  secondary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e3a5f', // Dark blue for text
    900: '#1e3a8a',
  },
  // Neutral Gray
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  // Success Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  // Warning Yellow
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
  },
  // Error Red
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
  },
  // Background
  background: {
    primary: '#ffffff',
    secondary: '#fafafa',
    tertiary: '#f5f5f5',
  },
  // Text
  text: {
    primary: '#1e3a5f', // Dark blue
    secondary: '#525252',
    tertiary: '#737373',
    muted: '#a3a3a3',
    inverse: '#ffffff',
  },
  // Border
  border: {
    light: '#e5e5e5',
    default: '#d4d4d4',
    dark: '#a3a3a3',
  },
  // Dark mode
  dark: {
    bg: '#0f0f0f',
    card: '#1a1a1a',
    border: '#2a2a2a',
    hover: '#252525',
    text: '#f5f5f5',
    textSecondary: '#a3a3a3',
  },
};

// Theme configuration for light mode
export const lightTheme = {
  colors: {
    primary: Colors.primary[500],
    primaryLight: Colors.primary[100],
    primaryDark: Colors.primary[700],
    secondary: Colors.secondary[500],
    secondaryDark: Colors.secondary[800],
    background: Colors.background.primary,
    backgroundSecondary: Colors.background.secondary,
    card: Colors.background.primary,
    text: Colors.text.primary,
    textSecondary: Colors.text.secondary,
    textMuted: Colors.text.muted,
    border: Colors.border.light,
    success: Colors.success[500],
    warning: Colors.warning[500],
    error: Colors.error[500],
    tabBar: Colors.background.primary,
    tabBarInactive: Colors.neutral[400],
    tabBarActive: Colors.primary[500],
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    tabBar: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 10,
    },
  },
};

// Theme-based colors for Themed components
export const themeColors = {
  light: {
    text: Colors.text.primary,
    background: Colors.background.primary,
    tint: Colors.primary[500],
    tabIconDefault: Colors.neutral[400],
    tabIconSelected: Colors.primary[500],
  },
  dark: {
    text: Colors.dark.text,
    background: Colors.dark.bg,
    tint: Colors.primary[500],
    tabIconDefault: Colors.neutral[500],
    tabIconSelected: Colors.primary[500],
  },
};

export default Colors;
