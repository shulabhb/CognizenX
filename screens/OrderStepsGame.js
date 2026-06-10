import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import GameShell from '../components/games/GameShell';
import GameCompleteSheet from '../components/games/GameCompleteSheet';
import GameIntro from '../components/games/GameIntro';
import CategoryItem from '../components/games/CategoryItem';
import useGameSession from '../hooks/useGameSession';
import useGameExit from '../hooks/useGameExit';
import { GAME_PHASE, canAcceptInput } from '../games/engine/gameState';
import { pickWithoutRecent, fisherYatesShuffle } from '../games/engine/contentPool';
import { ORDER_STEPS_SETS, shuffleSteps } from '../games/data/orderStepsSets';
import { gameColors, gameType } from '../styles/gameTheme';
import { radii, shadow, spacing } from '../styles/theme';

const POOL_KEY = 'gamePool:order_steps';
const SETS_EASY = 3;
const SETS_STANDARD = 5;

const OrderStepsGame = () => {
  const navigation = useNavigation();
  const [difficulty, setDifficulty] = useState('easy');
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASE.INTRO);
  const [sessionSets, setSessionSets] = useState([]);
  const [setIndex, setSetIndex] = useState(0);
  const [shuffledSteps, setShuffledSteps] = useState([]);
  const [nextExpected, setNextExpected] = useState(1);
  const [completedIds, setCompletedIds] = useState([]);
  const [stepTaps, setStepTaps] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [completeVisible, setCompleteVisible] = useState(false);
  const [score, setScore] = useState(0);
  const sessionCompletedRef = useRef(false);

  const { startSession, completeSession, pauseSession, resumeSession, clearAllTimers } = useGameSession('order_steps', difficulty);

  const returnToActivities = useGameExit(navigation, {
    setCompleteVisible,
    setGameStarted,
    setPhase,
  });

  const startGame = async (mode = 'easy') => {
    sessionCompletedRef.current = false;
    const count = mode === 'standard' ? SETS_STANDARD : SETS_EASY;
    const picked = await pickWithoutRecent(POOL_KEY, ORDER_STEPS_SETS, count, 20, (s) => s.id);
    setDifficulty(mode);
    setSessionSets(fisherYatesShuffle(picked));
    setSetIndex(0);
    setShuffledSteps(shuffleSteps(picked[0].steps));
    setNextExpected(1);
    setCompletedIds([]);
    setStepTaps(0);
    setScore(0);
    setFeedback('Tap the first step.');
    setCompleteVisible(false);
    setPhase(GAME_PHASE.PLAYING);
    setGameStarted(true);
    startSession();
  };

  const finishGame = async (finalScore) => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    setPhase(GAME_PHASE.COMPLETE);
    setCompleteVisible(true);
    await completeSession({
      finalScore,
      finalMoves: stepTaps,
      extraMetrics: { setsCompleted: sessionSets.length, stepTaps },
    });
  };

  const advanceSet = (nextScore) => {
    setPhase(GAME_PHASE.LOCKED);
    setTimeout(() => {
      if (setIndex + 1 >= sessionSets.length) {
        finishGame(nextScore);
        return;
      }
      const nextIndex = setIndex + 1;
      setSetIndex(nextIndex);
      setShuffledSteps(shuffleSteps(sessionSets[nextIndex].steps));
      setNextExpected(1);
      setCompletedIds([]);
      setFeedback('Next routine. Tap the first step.');
      setPhase(GAME_PHASE.PLAYING);
    }, 400);
  };

  const handleStepPress = (step) => {
    if (!canAcceptInput(phase) || completedIds.includes(step.id)) return;
    setStepTaps((prev) => prev + 1);

    if (step.order !== nextExpected) {
      setFeedback('Consider what would come next in daily life.');
      return;
    }

    setPhase(GAME_PHASE.LOCKED);
    const nextCompleted = [...completedIds, step.id];
    setCompletedIds(nextCompleted);
    const next = nextExpected + 1;
    setNextExpected(next);
    setFeedback(`Step ${step.order} selected.`);

    if (next > shuffledSteps.length) {
      const nextScore = score + 1;
      setScore(nextScore);
      advanceSet(nextScore);
      return;
    }
    setTimeout(() => setPhase(GAME_PHASE.PLAYING), 300);
  };

  return (
    <GameShell
      title="Order Steps"
      isActive={gameStarted && phase !== GAME_PHASE.COMPLETE}
      onPause={pauseSession}
      onResume={resumeSession}
      onExit={clearAllTimers}
      stats={gameStarted ? [
        { label: 'Routine', value: `${setIndex + 1}/${sessionSets.length}` },
        { label: 'Next', value: nextExpected },
      ] : []}
    >
      <View style={styles.container}>
        {!gameStarted ? (
          <GameIntro
            title="Order Steps"
            description="Put everyday steps in a sensible order."
            estimatedMinutes={5}
            onStartGentle={() => startGame('easy')}
            onStartStandard={() => startGame('standard')}
            gentleLabel="Gentle (3 routines)"
            standardLabel="Standard (5 routines)"
          />
        ) : (
          <View style={styles.boardCard}>
            <Text style={styles.prompt}>Tap steps in the right order</Text>
            <View style={styles.stepsRow}>
              {shuffledSteps.map((step) => (
                <CategoryItem
                  key={step.id}
                  label={step.label}
                  fullWidth
                  selected={completedIds.includes(step.id)}
                  onPress={() => handleStepPress(step)}
                  accessibilityLabel={`Step: ${step.label}`}
                />
              ))}
            </View>
            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          </View>
        )}
      </View>

      <GameCompleteSheet
        visible={completeVisible}
        message={`You ordered ${score} of ${sessionSets.length} routines.`}
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
  prompt: { ...gameType.title, textAlign: 'center', marginBottom: spacing.lg },
  stepsRow: { gap: spacing.sm },
  feedback: { ...gameType.instruction, textAlign: 'center', marginTop: spacing.lg },
});

export default OrderStepsGame;
