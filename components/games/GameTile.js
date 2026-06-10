import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';

import { gameColors, gameLayout } from '../../styles/gameTheme';
import { radii, shadow } from '../../styles/theme';

const GameTile = ({
  face = 'hidden',
  symbol,
  size = gameLayout.minTapTarget,
  onPress,
  disabled,
  accessibilityLabel,
}) => {
  const isHidden = face === 'hidden';
  const isMatched = face === 'matched';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isHidden === false && isMatched}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (isHidden ? 'Hidden card' : 'Revealed card')}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: isHidden ? gameColors.surfaceMuted : gameColors.surface,
          borderColor: isMatched ? gameColors.borderFocus : gameColors.border,
          opacity: isMatched ? 0.85 : 1,
        },
      ]}
    >
      {!isHidden ? <View style={styles.symbolWrap}>{symbol}</View> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow({ offsetHeight: 1, opacity: 0.05, radius: 3, elevation: 1 }),
  },
  symbolWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GameTile;
