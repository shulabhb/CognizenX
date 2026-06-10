import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';

import { gameColors, gameLayout } from '../../styles/gameTheme';
import { radii } from '../../styles/theme';

const GamePad = ({
  active = false,
  onPress,
  disabled,
  children,
  accessibilityLabel,
  size = gameLayout.padSize,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={[
      styles.pad,
      {
        width: size,
        height: size,
        backgroundColor: active ? gameColors.accentSoft : gameColors.surface,
        borderColor: active ? gameColors.accentStrong : gameColors.border,
        borderWidth: active ? 2 : 1,
      },
    ]}
  >
    <View style={styles.inner}>{children}</View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  pad: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GamePad;
