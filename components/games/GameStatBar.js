import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { gameColors, gameLayout, gameType } from '../../styles/gameTheme';
import { radii, shadow, spacing } from '../../styles/theme';

const GameStatBar = ({ stats = [] }) => {
  if (!stats.length) return null;

  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.item}>
          <Text style={styles.label}>{stat.label}</Text>
          <Text style={styles.value}>{stat.value}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: gameColors.surface,
    borderRadius: gameLayout.statBarRadius,
    borderWidth: 1,
    borderColor: gameColors.border,
    ...shadow({ offsetHeight: 2, opacity: 0.06, radius: 6, elevation: 2 }),
  },
  item: {
    alignItems: 'center',
    minWidth: 72,
  },
  label: gameType.statLabel,
  value: {
    ...gameType.statValue,
    marginTop: 4,
  },
});

export default GameStatBar;
