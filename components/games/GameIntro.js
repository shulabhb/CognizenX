import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { gameColors, gameType } from '../../styles/gameTheme';
import { spacing } from '../../styles/theme';
import { ui } from '../../styles/ui';

const GameIntro = ({
  title,
  description,
  estimatedMinutes,
  onStartGentle,
  onStartStandard,
  gentleLabel = 'Gentle',
  standardLabel = 'Standard',
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {estimatedMinutes ? (
      <Text style={styles.caption}>About {estimatedMinutes} minutes</Text>
    ) : null}

    <TouchableOpacity
      style={[ui.buttonPillLg, styles.primaryButton]}
      onPress={onStartGentle}
      accessibilityRole="button"
      accessibilityLabel={`Start ${gentleLabel}`}
    >
      <Text style={ui.buttonPillLgText}>Start {gentleLabel}</Text>
    </TouchableOpacity>

    {onStartStandard ? (
      <TouchableOpacity
        style={[ui.buttonPill, styles.secondaryButton]}
        onPress={onStartStandard}
        accessibilityRole="button"
        accessibilityLabel={`Start ${standardLabel}`}
      >
        <Text style={ui.buttonPillText}>Start {standardLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...gameType.title,
    fontSize: 26,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...gameType.instruction,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  caption: {
    ...gameType.caption,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  primaryButton: {
    backgroundColor: gameColors.accent,
    alignSelf: 'stretch',
  },
  secondaryButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});

export default GameIntro;
