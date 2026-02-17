// Centralized styling tokens.
// Keep values aligned with existing screens to avoid visual changes.

import { Dimensions, Platform } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
export const isTablet = Platform.OS === 'ios' ? !!Platform.isPad : screenWidth >= 768;

export const typeScale = {
  phone: {
    caption: 13,
    bodySm: 15,
    body: 16,
    bodyLg: 18,
    button: 16,
  },
  tablet: {
    caption: 15,
    bodySm: 17,
    body: 18,
    bodyLg: 20,
    button: 18,
  },
};

export const type = isTablet ? typeScale.tablet : typeScale.phone;

export const layout = {
  contentMaxWidth: 900,
  modalMaxWidth: 520,
};

export const colors = {
  background: '#f7f7f7',
  surface: '#ffffff',
  borderSubtle: '#eeeeee',

  // Alternate app backgrounds used in multiple screens
  backgroundTint: '#F5F3FF',

  // Slate/gray scale (existing screens use a mix of Tailwind slate + gray)
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',

  gray50: '#FAFAFA',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',

  // Non-tailwind misc values used in a few legacy screens
  backgroundLight: '#f9f9f9',
  neutral200: '#e0e0e0',

  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  textHint: '#666',

  brand: '#A78BFA',
  brandDark: '#8B5CF6',
  brandBorder: '#D8B4FE',
  brandTint: '#F3E8FF',
  brandShadow: '#9061F9',
  brandSelectedBg: '#EDE9FE',
  brandSelectedText: '#6D28D9',

  success: '#10B981',
  successDark: '#059669',
  successTextDark: '#065F46',
  successTextLight: '#D1FAE5',
  successAlt: '#34D399',
  successBg: '#F0FDF4',
  successBorder: '#86EFAC',

  danger: '#EF4444',
  dangerDark: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FCA5A5',

  warning: '#F59E0B',
  warningBg: '#FEF3C7',

  // Blues used in game screens
  blue50: '#F0F9FF',
  blue100: '#DBEAFE',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue800: '#1E40AF',
  bluePure: '#0000ff',

  // Other accents used in a few screens
  sky500: '#0EA5E9',
  sky400: '#38BDF8',
  pink500: '#EC4899',
  cyan500: '#06B6D4',
  lime500: '#84CC16',

  white: '#FFFFFF',
  black: '#000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 15,
  xl: 16,
  pill: 25,
};

export function shadow({
  color = colors.black,
  offsetWidth = 0,
  offsetHeight = 1,
  opacity = 0.1,
  radius = 2,
  elevation = 2,
} = {}) {
  return {
    shadowColor: color,
    shadowOffset: { width: offsetWidth, height: offsetHeight },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}
