import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import GameShell from '../components/games/GameShell';
import GameCompleteSheet from '../components/games/GameCompleteSheet';
import GameIntro from '../components/games/GameIntro';
import CategoryBin from '../components/games/CategoryBin';
import CategoryItem from '../components/games/CategoryItem';
import useGameSession from '../hooks/useGameSession';
import useGameExit from '../hooks/useGameExit';
import { GAME_PHASE, canAcceptInput } from '../games/engine/gameState';
import { pickWithoutRecent, fisherYatesShuffle } from '../games/engine/contentPool';
import { SORT_ROUNDS, shuffleItems } from '../games/data/sortCategoriesData';
import { gameColors, gameType } from '../styles/gameTheme';
import { radii, shadow, spacing } from '../styles/theme';

const POOL_KEY = 'gamePool:sort_categories';
const ROUNDS_EASY = 4;
const ROUNDS_STANDARD = 6;

const SortCategoriesGame = () => {
  const navigation = useNavigation();
  const [difficulty, setDifficulty] = useState('easy');
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASE.INTRO);
  const [sessionRounds, setSessionRounds] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [remainingItems, setRemainingItems] = useState([]);
  const [score, setScore] = useState(0);
  const [sortActions, setSortActions] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [completeVisible, setCompleteVisible] = useState(false);
  const sessionCompletedRef = useRef(false);

  const { startSession, completeSession, pauseSession, resumeSession, clearAllTimers } = useGameSession('sort_categories', difficulty);
  const currentRound = sessionRounds[roundIndex];

  const returnToActivities = useGameExit(navigation, {
    setCompleteVisible,
    setGameStarted,
    setPhase,
  });

  const startGame = async (mode = 'easy') => {
    sessionCompletedRef.current = false;
    const count = mode === 'standard' ? ROUNDS_STANDARD : ROUNDS_EASY;
    const picked = await pickWithoutRecent(POOL_KEY, SORT_ROUNDS, count, 20, (r) => r.id);
    setDifficulty(mode);
    setSessionRounds(fisherYatesShuffle(picked));
    setRoundIndex(0);
    setScore(0);
    setSortActions(0);
    setSelectedItemId(null);
    setRemainingItems(shuffleItems(picked[0].items));
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
    setCompleteVisible(true);
    await completeSession({
      finalScore,
      finalMoves: sortActions,
      extraMetrics: { roundsCompleted: sessionRounds.length, sortActions },
    });
  };

  const advanceRound = (nextScore) => {
    setPhase(GAME_PHASE.LOCKED);
    setTimeout(() => {
      if (roundIndex + 1 >= sessionRounds.length) {
        finishGame(nextScore);
        return;
      }
      const nextIndex = roundIndex + 1;
      setRoundIndex(nextIndex);
      setRemainingItems(shuffleItems(sessionRounds[nextIndex].items));
      setSelectedItemId(null);
      setFeedback('Next group.');
      setPhase(GAME_PHASE.PLAYING);
    }, 400);
  };

  const handleItemPress = (itemId) => {
    if (!canAcceptInput(phase)) return;
    setSelectedItemId(itemId);
    setFeedback('Now tap the group where it belongs.');
  };

  const handleBinPress = (binId) => {
    if (!canAcceptInput(phase)) return;
    if (!selectedItemId) {
      setFeedback('Tap an item first, then tap a group.');
      return;
    }
    const item = currentRound?.items.find((entry) => entry.id === selectedItemId);
    if (!item || item.binId !== binId) {
      setFeedback('Try another group.');
      return;
    }
    setPhase(GAME_PHASE.LOCKED);
    const nextScore = score + 1;
    const nextActions = sortActions + 1;
    setScore(nextScore);
    setSortActions(nextActions);
    setSelectedItemId(null);
    const nextRemaining = remainingItems.filter((entry) => entry.id !== item.id);
    setRemainingItems(nextRemaining);
    setFeedback('Sorted correctly.');
    if (nextRemaining.length === 0) advanceRound(nextScore);
    else setPhase(GAME_PHASE.PLAYING);
  };

  return (
    <GameShell
      title="Category Sort"
      isActive={gameStarted && phase !== GAME_PHASE.COMPLETE}
      onPause={pauseSession}
      onResume={resumeSession}
      onExit={clearAllTimers}
      stats={gameStarted ? [
        { label: 'Round', value: `${roundIndex + 1}/${sessionRounds.length}` },
        { label: 'Sorted', value: score },
      ] : []}
    >
      <View style={styles.container}>
        {!gameStarted ? (
          <GameIntro
            title="Category Sort"
            description="Tap an item, then tap the group where it belongs."
            estimatedMinutes={5}
            onStartGentle={() => startGame('easy')}
            onStartStandard={() => startGame('standard')}
            gentleLabel="Gentle (4 rounds)"
            standardLabel="Standard (6 rounds)"
          />
        ) : (
          <View style={styles.boardCard}>
            <Text style={styles.prompt}>Sort each item into the right group</Text>
            <View style={styles.itemsRow}>
              {remainingItems.map((item) => (
                <CategoryItem
                  key={item.id}
                  label={item.label}
                  selected={selectedItemId === item.id}
                  onPress={() => handleItemPress(item.id)}
                />
              ))}
            </View>
            <View style={styles.binsRow}>
              {currentRound?.bins.map((bin) => (
                <CategoryBin key={bin.id} label={bin.label} onPress={() => handleBinPress(bin.id)} />
              ))}
            </View>
            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          </View>
        )}
      </View>

      <GameCompleteSheet
        visible={completeVisible}
        message={`You sorted ${score} items across ${sessionRounds.length} rounds.`}
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
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  binsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  feedback: { ...gameType.instruction, textAlign: 'center' },
});

export default SortCategoriesGame;
