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
import { pickWithoutRecent, fisherYatesShuffle } from '../games/engine/contentPool';
import { buildOddOneOutPool } from '../games/engine/oddOneOutGenerator';
import { ODD_ONE_OUT_SETS, ROUNDS_PER_SESSION_EASY, ROUNDS_PER_SESSION_STANDARD } from '../games/data/oddOneOutSets';
import { gameColors, gameLayout, gameType, shapeSizes } from '../styles/gameTheme';
import { radii, shadow, spacing } from '../styles/theme';

const POOL_KEY = 'gamePool:odd_one_out';
const FULL_POOL = buildOddOneOutPool(ODD_ONE_OUT_SETS, 25);

const OddOneOutGame = () => {
  const navigation = useNavigation();
  const [difficulty, setDifficulty] = useState('easy');
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASE.INTRO);
  const [rounds, setRounds] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [completeVisible, setCompleteVisible] = useState(false);
  const [completeScore, setCompleteScore] = useState(0);
  const sessionCompletedRef = useRef(false);
  const lockTimerRef = useRef(null);

  const { startSession, completeSession, pauseSession, resumeSession, clearAllTimers } = useGameSession('odd_one_out', difficulty);
  const currentRound = rounds[roundIndex] || rounds[0];
  const roundsPerSession = difficulty === 'standard' ? ROUNDS_PER_SESSION_STANDARD : ROUNDS_PER_SESSION_EASY;

  const returnToActivities = useGameExit(navigation, {
    setCompleteVisible,
    setGameStarted,
    setPhase,
  });

  const startGame = async (mode = 'easy') => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    sessionCompletedRef.current = false;
    const count = mode === 'standard' ? ROUNDS_PER_SESSION_STANDARD : ROUNDS_PER_SESSION_EASY;
    const picked = await pickWithoutRecent(POOL_KEY, FULL_POOL, count, 30, (item) => item.id);
    setDifficulty(mode);
    setRounds(fisherYatesShuffle(picked));
    setRoundIndex(0);
    setScore(0);
    setWrongAttempts(0);
    setFeedback('');
    setCompleteVisible(false);
    setPhase(GAME_PHASE.PLAYING);
    setGameStarted(true);
    startSession();
  };

  const finishGame = async (finalScore) => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    setPhase(GAME_PHASE.COMPLETE);
    setCompleteScore(finalScore);
    setCompleteVisible(true);
    await completeSession({
      finalScore,
      finalMoves: roundsPerSession,
      extraMetrics: { roundsCompleted: roundsPerSession, wrongAttempts },
    });
  };

  const advanceRound = (nextScore) => {
    setPhase(GAME_PHASE.LOCKED);
    lockTimerRef.current = setTimeout(() => {
      setPhase(GAME_PHASE.PLAYING);
      setFeedback('');
      if (roundIndex + 1 >= rounds.length) {
        finishGame(nextScore);
        return;
      }
      setRoundIndex((prev) => prev + 1);
    }, 400);
  };

  const handleOptionPress = (option) => {
    if (!canAcceptInput(phase)) return;

    if (option.isOdd) {
      const nextScore = score + 1;
      setScore(nextScore);
      setWrongAttempts(0);
      setFeedback('Correct.');
      advanceRound(nextScore);
      return;
    }

    const nextWrong = wrongAttempts + 1;
    setWrongAttempts(nextWrong);
    setFeedback(nextWrong >= 2 ? 'Look for what differs in shape or size.' : 'Try another option.');
  };

  return (
    <GameShell
      title="Pattern Discrimination"
      isActive={gameStarted && phase !== GAME_PHASE.COMPLETE}
      onPause={pauseSession}
      onResume={resumeSession}
      onExit={clearAllTimers}
      stats={gameStarted ? [
        { label: 'Round', value: `${roundIndex + 1}/${rounds.length}` },
        { label: 'Score', value: score },
      ] : []}
    >
      <View style={styles.container}>
        {!gameStarted ? (
          <GameIntro
            title="Pattern Discrimination"
            description="Select the shape that differs from the others."
            estimatedMinutes={4}
            onStartGentle={() => startGame('easy')}
            onStartStandard={() => startGame('standard')}
            gentleLabel="Gentle (5 rounds)"
            standardLabel="Standard (7 rounds)"
          />
        ) : (
          <View style={styles.boardCard}>
            <Text style={styles.prompt}>{currentRound?.prompt}</Text>
            <View style={styles.optionsGrid}>
              {currentRound?.options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.optionCard}
                  onPress={() => handleOptionPress(option)}
                  disabled={!canAcceptInput(phase)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.shape} shape option`}
                >
                  <ShapeSymbol
                    id={option.shape}
                    tone={option.tone}
                    size={option.size || shapeSizes.discrimination}
                    variant={option.variant}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          </View>
        )}
      </View>

      <GameCompleteSheet
        visible={completeVisible}
        message={`You identified ${completeScore} of ${roundsPerSession} patterns.`}
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
    justifyContent: 'center',
    ...shadow({ offsetHeight: 2, opacity: 0.06, radius: 8, elevation: 2 }),
  },
  prompt: { ...gameType.title, textAlign: 'center', marginBottom: spacing.xl },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  optionCard: {
    width: '44%',
    minHeight: 120,
    backgroundColor: gameColors.surfaceMuted,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: gameColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow({ offsetHeight: 1, opacity: 0.04, radius: 4, elevation: 1 }),
  },
  feedback: { ...gameType.instruction, textAlign: 'center', marginTop: spacing.xl },
});

export default OddOneOutGame;
