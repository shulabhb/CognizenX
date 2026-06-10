import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import GameShell from '../components/games/GameShell';
import GameCompleteSheet from '../components/games/GameCompleteSheet';
import GameIntro from '../components/games/GameIntro';
import GameTile from '../components/games/GameTile';
import ShapeSymbol from '../components/games/shapes/ShapeSymbol';
import useGameSession from '../hooks/useGameSession';
import useGameExit from '../hooks/useGameExit';
import { GAME_PHASE, canAcceptInput } from '../games/engine/gameState';
import { fisherYatesShuffle, pickWithoutRecent } from '../games/engine/contentPool';
import { MEMORY_MATCH_SHAPES } from '../games/data/memoryMatchShapes';
import { gameColors, gameLayout, gameType, shapeSizes } from '../styles/gameTheme';
import { radii, shadow, spacing } from '../styles/theme';

const { width } = Dimensions.get('window');
const POOL_KEY = 'gamePool:memory_match';

const DIFFICULTY_CONFIG = {
  easy: { pairs: 4, flipBackMs: 2000 },
  standard: { pairs: 6, flipBackMs: 1000 },
};

const MemoryMatchGame = () => {
  const navigation = useNavigation();
  const [difficulty, setDifficulty] = useState('easy');
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASE.INTRO);
  const [completeVisible, setCompleteVisible] = useState(false);
  const [completeMessage, setCompleteMessage] = useState('');
  const sessionCompletedRef = useRef(false);

  const {
    moves,
    setMoves,
    startSession,
    completeSession,
    registerTimer,
    clearAllTimers,
    pauseSession,
    resumeSession,
  } = useGameSession('memory_match', difficulty);

  const returnToActivities = useGameExit(navigation, {
    setCompleteVisible,
    setGameStarted,
    setPhase,
  });

  const config = DIFFICULTY_CONFIG[difficulty];
  const columns = difficulty === 'easy' ? 2 : 3;
  const minCard = gameLayout.minTapTarget;
  const cardSize = Math.max(minCard, Math.min((width - 80) / columns - 12, difficulty === 'easy' ? 96 : 88));

  const initializeGame = useCallback(async (nextDifficulty = 'easy') => {
    clearAllTimers();
    sessionCompletedRef.current = false;
    const nextConfig = DIFFICULTY_CONFIG[nextDifficulty];
    const symbols = await pickWithoutRecent(POOL_KEY, MEMORY_MATCH_SHAPES, nextConfig.pairs, 30);
    const cardPairs = fisherYatesShuffle(
      [...symbols, ...symbols].map((symbol, index) => ({
        cardId: index,
        shapeKey: symbol.id,
        ...symbol,
        isMatched: false,
      }))
    );

    setDifficulty(nextDifficulty);
    setCards(cardPairs);
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setCompleteVisible(false);
    setPhase(GAME_PHASE.PLAYING);
    setGameStarted(true);
    startSession();
  }, [clearAllTimers, setMoves, startSession]);

  const finishGame = useCallback(async (finalMoves) => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    setPhase(GAME_PHASE.COMPLETE);
    setCompleteMessage(`Completed in ${finalMoves} moves.`);
    setCompleteVisible(true);
    await completeSession({
      finalScore: finalMoves,
      finalMoves,
      extraMetrics: { pairsMatched: config.pairs },
    });
  }, [completeSession, config.pairs]);

  const handleCardPress = (cardId) => {
    if (!canAcceptInput(phase)) return;
    if (flippedCards.length >= 2 || matchedCards.includes(cardId) || flippedCards.includes(cardId)) return;

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);
    if (newFlippedCards.length < 2) return;

    setPhase(GAME_PHASE.LOCKED);
    setMoves((prev) => prev + 1);
    const [firstId, secondId] = newFlippedCards;
    const firstCard = cards.find((c) => c.cardId === firstId);
    const secondCard = cards.find((c) => c.cardId === secondId);

    if (firstCard.shapeKey === secondCard.shapeKey) {
      const nextMatched = [...matchedCards, firstId, secondId];
      setMatchedCards(nextMatched);
      setFlippedCards([]);
      setPhase(GAME_PHASE.PLAYING);
      if (nextMatched.length === cards.length) {
        registerTimer(setTimeout(() => {
          finishGame(moves + 1);
        }, 500));
      }
      return;
    }

    registerTimer(setTimeout(() => {
      setFlippedCards([]);
      setPhase(GAME_PHASE.PLAYING);
    }, config.flipBackMs));
  };

  const getFace = (card) => {
    if (matchedCards.includes(card.cardId)) return 'matched';
    if (flippedCards.includes(card.cardId)) return 'revealed';
    return 'hidden';
  };

  return (
    <GameShell
      title="Pair Match"
      isActive={gameStarted && phase !== GAME_PHASE.COMPLETE}
      onPause={pauseSession}
      onResume={resumeSession}
      onExit={clearAllTimers}
      stats={gameStarted ? [
        { label: 'Moves', value: moves },
        { label: 'Matches', value: matchedCards.length / 2 },
        { label: 'Remaining', value: (cards.length - matchedCards.length) / 2 },
      ] : []}
    >
      <View style={styles.container}>
        {!gameStarted ? (
          <GameIntro
            title="Pair Match"
            description="Tap two cards to find matching shapes. Take your time."
            estimatedMinutes={5}
            onStartGentle={() => initializeGame('easy')}
            onStartStandard={() => initializeGame('standard')}
            gentleLabel="Gentle (4 pairs)"
            standardLabel="Standard (6 pairs)"
          />
        ) : (
          <View style={styles.boardCard}>
            <Text style={styles.hint}>Tap two cards to find matching pairs.</Text>
            <View style={[styles.grid, { maxWidth: columns * (cardSize + 12) }]}>
              {cards.map((card) => (
                <GameTile
                  key={card.cardId}
                  face={getFace(card)}
                  size={cardSize}
                  onPress={() => handleCardPress(card.cardId)}
                  disabled={!canAcceptInput(phase) || getFace(card) !== 'hidden'}
                  symbol={(
                    <ShapeSymbol
                      id={card.shape}
                      tone={card.tone}
                      size={shapeSizes.board}
                      variant={card.sizeVariant}
                    />
                  )}
                  accessibilityLabel={getFace(card) === 'hidden' ? 'Hidden card' : `${card.shape} shape`}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      <GameCompleteSheet
        visible={completeVisible}
        message={completeMessage}
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
  hint: { ...gameType.instruction, textAlign: 'center', marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: gameLayout.tileGap, alignSelf: 'center' },
});

export default MemoryMatchGame;
