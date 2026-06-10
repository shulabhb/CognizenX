import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

import { gameColors, gameLayout } from '../../styles/gameTheme';
import { radii, spacing } from '../../styles/theme';

const CategoryBin = ({ label, onPress, accessibilityLabel }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || `Category ${label}`}
    style={styles.bin}
  >
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  bin: {
    flex: 1,
    minHeight: 110,
    borderRadius: radii.xl,
    backgroundColor: gameColors.surface,
    borderWidth: 1.5,
    borderColor: gameColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: gameColors.accentStrong,
    textAlign: 'center',
  },
});

export default CategoryBin;
