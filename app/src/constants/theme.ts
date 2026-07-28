
import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    emergency: '#E5484D',
    emergencyGlow: 'rgba(229, 72, 77, 0.15)',
    success: '#1F9254',
    cardBorder: 'rgba(0, 0, 0, 0.06)',
  },
  dark: {
    text: '#ffffff',
    background: '#0A0A0B',
    backgroundElement: '#1C1D20',
    backgroundSelected: '#2E3135',
    textSecondary: '#9BA0A8',
    emergency: '#E5484D',
    emergencyGlow: 'rgba(229, 72, 77, 0.18)',
    success: '#30D158',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 12,
  medium: 16,
  large: 24,
  full: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// App always uses dark theme, regardless of system setting
export const AppColors = Colors.dark;