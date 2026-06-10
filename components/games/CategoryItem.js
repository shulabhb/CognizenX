import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

import { gameColors, gameLayout } from '../../styles/gameTheme';
import { radii, shadow, spacing } from '../../styles/theme';

const CategoryItem = ({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
  fullWidth = false,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || label}
    accessibilityState={{ selected }}
    style={[
      styles.item,
      fullWidth && styles.itemFullWidth,
      selected && styles.itemSelected,
    ]}
  >
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  item: {
    minWidth: 96,
    minHeight: gameLayout.minTapTarget,
    borderRadius: radii.lg,
    backgroundColor: gameColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadow({ offsetHeight: 1, opacity: 0.05, radius: 3, elevation: 1 }),
  },
  itemFullWidth: {
    width: '100%',
    minWidth: '100%',
  },
  itemSelected: {
    borderColor: gameColors.borderFocus,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: gameColors.textPrimary,
    textAlign: 'center',
  },
});

export default CategoryItem;
