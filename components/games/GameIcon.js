import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { gameColors } from '../../styles/gameTheme';

const GameIcon = ({ name, size = 22 }) => (
  <View style={styles.wrap}>
    <Ionicons name={name} size={size} color={gameColors.accentStrong} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: gameColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GameIcon;
