import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import GameShell from '../components/games/GameShell';
import GameCompleteSheet from '../components/games/GameCompleteSheet';
import GameIntro from '../components/games/GameIntro';
import GamePad from '../components/games/GamePad';
import ShapeSymbol from '../components/games/shapes/ShapeSymbol';
import useGameSession from '../hooks/useGameSession';
import useGameExit from '../hooks/useGameExit';
import { GAME_PHASE, canAcceptInput } from '../games/engine/gameState';
import { gameMotion } from '../styles/gameMotion';
import { gameColors, gameType, shapeSizes } from '../styles/gameTheme';
import { radii, shadow, spacing } from '../styles/theme';

const PAD_OPTIONS = [
  { id: 1, shape: 'circle', tone: 'muted' },
  { id: 2, shape: 'square', tone: 'muted' },
  { id: 3, shape: 'diamond', tone: 'muted' },
  { id: 4, shape: 'triangle', tone: 'muted' },
];

const DIFFICULTY_CONFIG = {
  easy: { startLength: 3, maxLength: 5, maxLevels: 5 },
  standard: { startLength: 3, maxLength: 8, maxLevels: 8 },
};

const STEP_MS = gameMotion.sequenceOnMs + gameMotion.sequenceOffMs + 50;

const PatternGame = () => {
  const navigation = useNavigation();
  const [difficulty, setDifficulty] = useState('easy');
  const [currentPattern, setCurrentPattern] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASE.INTRO);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [completeScore, setCompleteScore] = useState(0);
  const [showingPattern, setShowingPattern] = useState(false);
  const [highlightPadId, setHighlightPadId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [completeVisible, setCompleteVisible] = useState(false);
  const sessionCompletedRef = useRef(false);

  const {
    startSession,
    completeSession,
    registerTimer,
    clearAllTimers,
    pauseSession,
    resumeSession,
  } = useGameSession('simon_sequence', difficulty);

  const returnToActivities = useGameExit(navigation, {
    setCompleteVisible,
    setGameStarted,
    setPhase,
  });

  const config = DIFFICULTY_CONFIG[difficulty];

  const randomPad = useCallback(() => (
    PAD_OPTIONS[Math.floor(Math.random() * PAD_OPTIONS.length)]
  ), []);

  const buildInitialPattern = useCallback((length) => {
    const pattern = [];
    for (let i = 0; i < length; i += 1) {
      pattern.push(randomPad());
    }
    return pattern;
  }, [randomPad]);

  const showPattern = useCallback((pattern) => {
    clearAllTimers();
    setShowingPattern(true);
    setUserSequence([]);
    setHighlightPadId(null);
    setPhase(GAME_PHASE.LOCKED);
    setFeedback('Watch the sequence.');

    pattern.forEach((pad, index) => {
      registerTimer(setTimeout(() => setHighlightPadId(pad.id), index * STEP_MS));
      registerTimer(setTimeout(() => setHighlightPadId(null), index * STEP_MS + gameMotion.sequenceOnMs));
    });

    registerTimer(setTimeout(() => {
      setShowingPattern(false);
      setHighlightPadId(null);
      setPhase(GAME_PHASE.PLAYING);
      setFeedback('Tap the pads in the same order.');
    }, pattern.length * STEP_MS + 200));
  }, [clearAllTimers, registerTimer]);

  const initializeGame = useCallback((nextDifficulty = 'easy') => {
    clearAllTimers();
    sessionCompletedRef.current = false;
    const nextConfig = DIFFICULTY_CONFIG[nextDifficulty];
    const pattern = buildInitialPattern(nextConfig.startLength);
    setDifficulty(nextDifficulty);
    setCurrentPattern(pattern);
    setUserSequence([]);
    setLevel(1);
    setScore(0);
    setCompleteScore(0);
    setGameStarted(true);
    setCompleteVisible(false);
    setPhase(GAME_PHASE.LOCKED);
    startSession();
    showPattern(pattern);
  }, [buildInitialPattern, clearAllTimers, showPattern, startSession]);

  const finishGame = useCallback(async (finalScore) => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    setPhase(GAME_PHASE.COMPLETE);
    setCompleteScore(finalScore);
    setCompleteVisible(true);
    await completeSession({
      finalScore,
      finalMoves: config.maxLevels,
      extraMetrics: { levelsCompleted: config.maxLevels },
    });
  }, [completeSession, config.maxLevels]);

  const handlePadPress = (item) => {
    if (!canAcceptInput(phase) || showingPattern) return;

    const newUserSequence = [...userSequence, item];
    setUserSequence(newUserSequence);
    const currentIndex = newUserSequence.length - 1;

    if (newUserSequence[currentIndex].id !== currentPattern[currentIndex].id) {
      setFeedback('Take your time. Watch the sequence again.');
      setUserSequence([]);
      showPattern(currentPattern);
      return;
    }

    if (newUserSequence.length !== currentPattern.length) return;

    setPhase(GAME_PHASE.LOCKED);
    const newScore = score + level * 10;
    setScore(newScore);

    if (level >= config.maxLevels) {
      finishGame(newScore);
      return;
    }

    const nextLevel = level + 1;
    const nextPattern = [...currentPattern, randomPad()];
    setLevel(nextLevel);
    setCurrentPattern(nextPattern);
    setUserSequence([]);
    setFeedback(`Level ${nextLevel}. Watch the new step.`);
    registerTimer(setTimeout(() => showPattern(nextPattern), 700));
  };

  const handleWatchAgain = () => {
    if (showingPattern) return;
    showPattern(currentPattern);
  };

  return (
    <GameShell
      title="Sequence Recall"
      isActive={gameStarted && phase !== GAME_PHASE.COMPLETE}
      onPause={pauseSession}
      onResume={resumeSession}
      onExit={clearAllTimers}
      stats={gameStarted ? [
        { label: 'Level', value: level },
        { label: 'Score', value: score },
        { label: 'Length', value: currentPattern.length },
      ] : []}
    >
      <View style={styles.container}>
        {!gameStarted ? (
          <GameIntro
            title="Sequence Recall"
            description="Each pad lights up one at a time. Repeat the sequence in order."
            estimatedMinutes={5}
            onStartGentle={() => initializeGame('easy')}
            onStartStandard={() => initializeGame('standard')}
          />
        ) : (
          <View style={styles.boardCard}>
            <Text style={styles.feedback}>{feedback}</Text>

            <View style={styles.sequenceRow}>
              {currentPattern.map((item, index) => (
                <View
                  key={`slot-${index}`}
                  style={[styles.sequenceSlot, userSequence[index] ? styles.sequenceSlotFilled : null]}
                >
                  {userSequence[index] ? (
                    <ShapeSymbol id={userSequence[index].shape} tone="accent" size={shapeSizes.pad} />
                  ) : null}
                </View>
              ))}
            </View>

            {!showingPattern ? (
              <TouchableOpacity onPress={handleWatchAgain} style={styles.watchAgain}>
                <Text style={styles.watchAgainText}>Watch again</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.padGrid}>
              {PAD_OPTIONS.map((option) => (
                <GamePad
                  key={option.id}
                  active={showingPattern && highlightPadId === option.id}
                  disabled={showingPattern || !canAcceptInput(phase)}
                  onPress={() => handlePadPress(option)}
                  accessibilityLabel={`Pad ${option.shape}`}
                >
                  <ShapeSymbol id={option.shape} tone={option.tone} size={shapeSizes.pad} />
                </GamePad>
              ))}
            </View>
          </View>
        )}
      </View>

      <GameCompleteSheet
        visible={completeVisible}
        message={`You completed ${config.maxLevels} levels with a score of ${completeScore}.`}
        onHide={() => setCompleteVisible(false)}
        onPrimaryPress={() => initializeGame(difficulty)}
        onSecondaryPress={returnToActivities}
      />
    </GameShell>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  boardCard: {
    flex: 1,
    backgroundColor: gameColors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: gameColors.border,
    ...shadow({ offsetHeight: 2, opacity: 0.06, radius: 8, elevation: 2 }),
  },
  feedback: { ...gameType.instruction, textAlign: 'center', marginBottom: spacing.lg },
  sequenceRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  sequenceSlot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: gameColors.border,
    backgroundColor: gameColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceSlotFilled: { borderStyle: 'solid', borderColor: gameColors.borderFocus },
  watchAgain: { alignSelf: 'center', marginBottom: spacing.lg, paddingVertical: spacing.sm },
  watchAgainText: { color: gameColors.textSecondary, fontWeight: '600', fontSize: 15 },
  padGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
});

export default PatternGame;
