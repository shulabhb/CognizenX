import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

import { gameColors, gameLayout } from '../../styles/gameTheme';
import { radii, shadow } from '../../styles/theme';

export const LetterChip = ({ letter, onPress, disabled, accessibilityLabel }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || `Letter ${letter}`}
    style={styles.chip}
  >
    <Text style={styles.letter}>{letter}</Text>
  </TouchableOpacity>
);

export const LetterSlot = ({ letter }) => (
  <View
    style={[styles.slot, letter ? styles.slotFilled : styles.slotEmpty]}
    accessibilityLabel={letter ? `Selected letter ${letter}` : 'Empty letter slot'}
  >
    <Text style={styles.letter}>{letter || ''}</Text>
  </View>
);

const styles = StyleSheet.create({
  chip: {
    minWidth: gameLayout.chipMinSize,
    minHeight: gameLayout.chipMinSize,
    borderRadius: radii.md,
    backgroundColor: gameColors.surface,
    borderWidth: 1,
    borderColor: gameColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    ...shadow({ offsetHeight: 1, opacity: 0.05, radius: 3, elevation: 1 }),
  },
  slot: {
    width: 42,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: gameColors.borderFocus,
    backgroundColor: gameColors.surfaceMuted,
  },
  slotFilled: {
    borderWidth: 1,
    borderColor: gameColors.borderFocus,
    backgroundColor: gameColors.surface,
  },
  letter: {
    fontSize: 20,
    fontWeight: '700',
    color: gameColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});

export default LetterChip;
