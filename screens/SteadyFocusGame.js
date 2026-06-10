import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import GameShell from '../components/games/GameShell';
import GameCompleteSheet from '../components/games/GameCompleteSheet';
import GameIntro from '../components/games/GameIntro';
import ShapeSymbol from '../components/games/shapes/ShapeSymbol';
import useGameSession from '../hooks/useGameSession';
import useGameExit from '../hooks/useGameExit';
import { GAME_PHASE, canAcceptInput } from '../games/engine/gameState';
import { generateFocusSession } from '../games/engine/steadyFocusGenerator';
import { gameColors, gameLayout, gameType, shapeSizes } from '../styles/gameTheme';
import { radii, shadow, spacing } from '../styles/theme';

const ROUND_COUNT_EASY = 6;
const ROUND_COUNT_STANDARD = 6;

const SteadyFocusGame = () => {
  const navigation = useNavigation();
  const [difficulty, setDifficulty] = useState('easy');
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASE.INTRO);
  const [rounds, setRounds] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [tappedIndices, setTappedIndices] = useState(new Set());
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [completeVisible, setCompleteVisible] = useState(false);
  const sessionCompletedRef = useRef(false);
  const sessionSeedRef = useRef(Date.now());

  const { startSession, completeSession, pauseSession, resumeSession, clearAllTimers } = useGameSession('steady_focus', difficulty);

  const currentRound = rounds[roundIndex];
  const targetIndices = currentRound?.grid
    .map((shape, index) => (shape === currentRound.targetShape ? index : -1))
    .filter((i) => i >= 0) || [];
  const progress = targetIndices.length ? tappedIndices.size / targetIndices.length : 0;
  const cellSize = Math.max(gameLayout.minTapTarget, currentRound?.gridSize === 5 ? 64 : 72);

  const returnToActivities = useGameExit(navigation, {
    setCompleteVisible,
    setGameStarted,
    setPhase,
  });

  const startGame = (mode = 'easy') => {
    sessionCompletedRef.current = false;
    sessionSeedRef.current = Date.now();
    const gridSize = mode === 'standard' ? 5 : 4;
    const roundCount = mode === 'standard' ? ROUND_COUNT_STANDARD : ROUND_COUNT_EASY;
    setDifficulty(mode);
    setRounds(generateFocusSession(roundCount, gridSize, sessionSeedRef.current));
    setRoundIndex(0);
    setTappedIndices(new Set());
    setErrors(0);
    setFeedback('');
    setCompleteVisible(false);
    setPhase(GAME_PHASE.PLAYING);
    setGameStarted(true);
    startSession();
  };

  const finishGame = async () => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    setPhase(GAME_PHASE.COMPLETE);
    setCompleteVisible(true);
    const targetsFound = rounds.reduce((sum, r) => sum + r.targetCount, 0);
    await completeSession({
      finalScore: targetsFound,
      finalMoves: rounds.length,
      extraMetrics: { roundsCompleted: rounds.length, errors, targetsFound },
    });
  };

  const advanceRound = () => {
    setPhase(GAME_PHASE.LOCKED);
    setTimeout(() => {
      if (roundIndex + 1 >= rounds.length) {
        finishGame();
        return;
      }
      setRoundIndex((prev) => prev + 1);
      setTappedIndices(new Set());
      setFeedback('Next grid.');
      setPhase(GAME_PHASE.PLAYING);
    }, 400);
  };

  const handleCellPress = (index, shape) => {
    if (!canAcceptInput(phase) || tappedIndices.has(index)) return;

    if (shape !== currentRound.targetShape) {
      setErrors((prev) => prev + 1);
      setFeedback('That is not a target shape. Keep looking.');
      return;
    }

    const nextTapped = new Set(tappedIndices);
    nextTapped.add(index);
    setTappedIndices(nextTapped);
    setFeedback('Good.');

    if (nextTapped.size >= targetIndices.length) {
      advanceRound();
    }
  };

  return (
    <GameShell
      title="Steady Focus"
      isActive={gameStarted && phase !== GAME_PHASE.COMPLETE}
      onPause={pauseSession}
      onResume={resumeSession}
      onExit={clearAllTimers}
      stats={gameStarted ? [
        { label: 'Round', value: `${roundIndex + 1}/${rounds.length}` },
        { label: 'Found', value: `${tappedIndices.size}/${targetIndices.length}` },
        { label: 'Errors', value: errors },
      ] : []}
    >
      <View style={styles.container}>
        {!gameStarted ? (
          <GameIntro
            title="Steady Focus"
            description="Find and tap each target shape in the grid."
            estimatedMinutes={4}
            onStartGentle={() => startGame('easy')}
            onStartStandard={() => startGame('standard')}
            gentleLabel="Gentle (4×4)"
            standardLabel="Standard (5×5)"
          />
        ) : (
          <View style={styles.boardCard}>
            <Text style={styles.prompt}>{currentRound?.prompt}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <View style={[styles.grid, { maxWidth: cellSize * (currentRound?.gridSize || 4) + spacing.sm * ((currentRound?.gridSize || 4) - 1) }]}>
              {currentRound?.grid.map((shape, index) => {
                const isTapped = tappedIndices.has(index);
                return (
                  <TouchableOpacity
                    key={`cell-${index}`}
                    style={[styles.cell, { width: cellSize, height: cellSize }, isTapped && styles.cellTapped]}
                    onPress={() => handleCellPress(index, shape)}
                    disabled={isTapped || !canAcceptInput(phase)}
                    accessibilityRole="button"
                    accessibilityLabel={`Grid cell ${index + 1}, ${shape}`}
                  >
                    <ShapeSymbol id={shape} tone={isTapped ? 'accent' : 'muted'} size={shapeSizes.cell} />
                  </TouchableOpacity>
                );
              })}
            </View>
            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          </View>
        )}
      </View>

      <GameCompleteSheet
        visible={completeVisible}
        message={`You completed ${rounds.length} focus rounds with ${errors} mis-taps.`}
        onHide={() => setCompleteVisible(false)}
        onPrimaryPress={() => startGame(difficulty)}
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
  prompt: { ...gameType.title, textAlign: 'center', marginBottom: spacing.md },
  progressTrack: {
    height: 4,
    backgroundColor: gameColors.surfaceMuted,
    borderRadius: 2,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: gameColors.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, alignSelf: 'center' },
  cell: {
    borderRadius: radii.md,
    backgroundColor: gameColors.surfaceMuted,
    borderWidth: 1,
    borderColor: gameColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTapped: { backgroundColor: gameColors.accentSoft, borderColor: gameColors.borderFocus },
  feedback: { ...gameType.instruction, textAlign: 'center', marginTop: spacing.lg },
});

export default SteadyFocusGame;
