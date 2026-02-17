import { StyleSheet } from 'react-native';

import { colors, radii, shadow, spacing } from './theme';

export const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  screenTint: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    paddingBottom: 15,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    ...shadow({ offsetHeight: 1, radius: 2, elevation: 2 }),
  },

  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginVertical: 10,
    textTransform: 'capitalize',
  },

  headerTitleLg: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  headerTitleLight: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },

  iconButton: {
    padding: 8,
  },

  headerSpacer: {
    width: 40,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: '100%',
    ...shadow({ offsetHeight: 2, radius: 4, elevation: 3 }),
  },

  cardSm: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    ...shadow({ color: colors.brand, opacity: 0.1, radius: 10, elevation: 3 }),
  },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    ...shadow({ color: colors.brand, offsetHeight: 4, opacity: 0.1, radius: 20, elevation: 4 }),
  },

  sectionCard: {
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadow({ color: colors.brand, offsetHeight: 4, opacity: 0.1, radius: 8, elevation: 3 }),
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },

  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    overflow: 'hidden',
  },

  input: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },

  buttonPrimary: {
    backgroundColor: colors.brand,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    ...shadow({ offsetHeight: 2, radius: 4, elevation: 3 }),
  },

  buttonPrimaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  buttonPill: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
  },

  buttonPillText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  buttonPillLg: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    ...shadow({ offsetHeight: 4, opacity: 0.2, radius: 8, elevation: 4 }),
  },

  buttonPillLgText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },

  buttonPrimaryBg: {
    backgroundColor: colors.brand,
  },

  brandFill: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },

  subdomainCard: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.sm,
    margin: 4,
    minWidth: '45%',
    alignItems: 'center',
  },

  subdomainText: {
    color: colors.white,
    fontWeight: '500',
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    ...shadow({ color: colors.black, offsetHeight: 2, opacity: 0.25, radius: 4, elevation: 5 }),
  },
});
