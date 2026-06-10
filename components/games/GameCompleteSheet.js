import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';

import { gameColors, gameType } from '../../styles/gameTheme';
import { colors, radii, spacing } from '../../styles/theme';
import { ui } from '../../styles/ui';

const GameCompleteSheet = ({
  visible,
  title = 'Session complete',
  message,
  primaryLabel = 'Play again',
  secondaryLabel = 'Back to activities',
  onPrimaryPress,
  onSecondaryPress,
  onHide,
}) => {
  const handleSecondaryPress = () => {
    onHide?.();
    onSecondaryPress?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity style={[ui.buttonPrimary, styles.primaryButton]} onPress={onPrimaryPress}>
            <Text style={ui.buttonPrimaryText}>{primaryLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSecondaryPress}>
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: gameColors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: gameColors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...gameType.instruction,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  primaryButton: {
    alignSelf: 'stretch',
    marginBottom: spacing.sm,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: gameColors.textSecondary,
    fontWeight: '600',
  },
});

export default GameCompleteSheet;
