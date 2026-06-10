import { colors, isTablet, radii, spacing, type } from './theme';

export const gameColors = {
  canvas: colors.backgroundTint,
  surface: colors.surface,
  surfaceMuted: colors.slate50,
  border: colors.slate200,
  borderFocus: colors.brandBorder,
  textPrimary: colors.textPrimary,
  textSecondary: colors.textMuted,
  accent: colors.brand,
  accentSoft: colors.brandTint,
  accentStrong: colors.brandDark,
  feedbackPositiveBg: colors.brandSelectedBg,
  feedbackPositiveText: colors.brandSelectedText,
  feedbackNeutral: colors.slate100,
  snakeBody: colors.slate500,
  snakeTarget: colors.brand,
  gridLine: colors.slate100,
};

export const gameLayout = {
  minTapTarget: isTablet ? 64 : 56,
  tileGap: spacing.md,
  boardPadding: spacing.xl,
  padSize: isTablet ? 80 : 72,
  chipMinSize: isTablet ? 60 : 52,
  statBarRadius: radii.xl,
};

export const gameType = {
  title: {
    fontSize: type.bodyLg,
    fontWeight: '700',
    color: gameColors.textPrimary,
  },
  instruction: {
    fontSize: type.bodySm,
    fontWeight: '500',
    color: gameColors.textSecondary,
    lineHeight: 22,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: gameColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: type.caption,
    fontWeight: '600',
    color: gameColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  caption: {
    fontSize: type.caption,
    color: gameColors.textSecondary,
  },
};

export const shapeTones = {
  muted: colors.slate300,
  accent: colors.brand,
  accentSoft: colors.brandTint,
  accentStrong: colors.brandDark,
};

export const shapeSizes = {
  board: 36,
  pad: 32,
  cell: 28,
  discrimination: 40,
};

export const shapeStroke = colors.slate400;
