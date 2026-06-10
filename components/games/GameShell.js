import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import GameStatBar from './GameStatBar';
import { gameColors } from '../../styles/gameTheme';
import { colors, spacing } from '../../styles/theme';
import { ui } from '../../styles/ui';

const GameShell = ({
  title,
  subtitle,
  isActive = false,
  onPause,
  onResume,
  onExit,
  stats,
  children,
}) => {
  const navigation = useNavigation();
  const [appPaused, setAppPaused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'background' || nextState === 'inactive') {
          setAppPaused(true);
          onPause?.();
        } else if (nextState === 'active' && appPaused) {
          setAppPaused(false);
          onResume?.();
        }
      });

      return () => subscription.remove();
    }, [appPaused, onPause, onResume])
  );

  const handleBackPress = () => {
    if (isActive) {
      Alert.alert(
        'Leave activity?',
        'Your current progress will be lost if you leave now.',
        [
          { text: 'Keep going', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              onExit?.();
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }

    onExit?.();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={gameColors.canvas} barStyle="dark-content" />

      <View style={[ui.headerRow, styles.header]}>
        <TouchableOpacity onPress={handleBackPress} style={ui.iconButton} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={ui.headerTitleLg}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={ui.headerSpacer} />
      </View>

      <GameStatBar stats={stats} />

      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gameColors.canvas,
  },
  header: {
    backgroundColor: gameColors.canvas,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});

export default GameShell;
