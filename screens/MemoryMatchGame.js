import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, shadow, spacing } from '../styles/theme';
import { ui } from '../styles/ui';

const { width, height } = Dimensions.get('window');

const MemoryMatchGame = () => {
  const navigation = useNavigation();
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Memory-friendly symbols for dementia patients (12 cards = 6 pairs)
  const symbols = ['🐶', '🐱', '🐰', '🐸', '🐯', '🐻'];
  // Calculate card size for 3x4 grid layout
  const availableWidth = width - 60; // Account for padding
  const cardSize = Math.min(availableWidth / 3, 80); // 3 columns, max 80px per card for better fit

  const initializeGame = useCallback(() => {
    // Create pairs of cards
    const cardPairs = [...symbols, ...symbols];
    
    // Shuffle cards
    const shuffledCards = cardPairs
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffledCards);
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setGameCompleted(false);
    setGameStarted(true);
  }, []);

  const handleCardPress = (cardId) => {
    // Don't allow flipping if:
    // 1. Already 2 cards are flipped
    // 2. Card is already matched
    // 3. Card is already flipped
    if (flippedCards.length >= 2 || matchedCards.includes(cardId) || flippedCards.includes(cardId)) {
      return;
    }

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);

      const [firstCardId, secondCardId] = newFlippedCards;
      const firstCard = cards.find(card => card.id === firstCardId);
      const secondCard = cards.find(card => card.id === secondCardId);

      if (firstCard.symbol === secondCard.symbol) {
        // Match found - keep both cards flipped and add to matched
        setMatchedCards(prev => [...prev, firstCardId, secondCardId]);
        setFlippedCards([]);

        // Check if game is completed (all 12 cards matched)
        setTimeout(() => {
          if (matchedCards.length + 2 >= cards.length) {
            setGameCompleted(true);
            Alert.alert(
              '🎉 Congratulations!',
              `You completed the memory game in ${moves + 1} moves!`,
              [
                { text: 'Play Again', onPress: initializeGame },
                { text: 'Back to Puzzles', onPress: () => navigation.goBack() }
              ]
            );
          }
        }, 500);
      } else {
        // No match - flip cards back after delay
        setTimeout(() => {
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const renderCard = (card) => {
    const isFlipped = flippedCards.includes(card.id) || matchedCards.includes(card.id);

    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.card,
          { width: cardSize, height: cardSize }
        ]}
        onPress={() => handleCardPress(card.id)}
        activeOpacity={0.8}
        disabled={isFlipped} // Disable touch when card is already flipped
      >
        <View style={styles.cardInner}>
          <View style={[styles.cardFront, { opacity: isFlipped ? 0 : 1 }]}>
            <Text style={styles.cardSymbol}>❓</Text>
          </View>
          <View style={[styles.cardBack, { opacity: isFlipped ? 1 : 0 }]}>
            <Text style={styles.cardBackSymbol}>{card.symbol}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleBackPress = () => {
    if (gameStarted) {
      Alert.alert(
        "Exit Game",
        "Are you sure you want to leave? Your progress will be lost.",
        [
          { text: "Continue", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.blue500} barStyle="light-content" />
      
      {/* Header */}
      <View style={[ui.headerRow, styles.header]}>
        <TouchableOpacity onPress={handleBackPress} style={ui.iconButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={ui.headerTitleLight}>Memory Match</Text>
        <View style={ui.headerSpacer} />
      </View>

      {/* Game Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Moves</Text>
          <Text style={styles.statValue}>{moves}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Matches</Text>
          <Text style={styles.statValue}>{matchedCards.length / 2}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pairs Left</Text>
          <Text style={styles.statValue}>{(cards.length - matchedCards.length) / 2}</Text>
        </View>
      </View>

      {/* Game Area */}
      <View style={styles.gameContainer}>
        {!gameStarted ? (
          <View style={styles.startScreen}>
            <Text style={styles.gameIcon}>🧠</Text>
            <Text style={styles.gameTitle}>Memory Match</Text>
            <Text style={styles.gameDescription}>
              Find matching pairs of animal cards. Tap cards to flip them and test your memory!
              Match all 6 pairs to win!
            </Text>
            <TouchableOpacity style={[ui.buttonPillLg, styles.startButton]} onPress={initializeGame}>
              <Text style={ui.buttonPillLgText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gameBoard}>
            <View style={styles.cardsGrid}>
              {cards.map(renderCard)}
            </View>
          </View>
        )}
      </View>

      {/* Instructions */}
      {gameStarted && !gameCompleted && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            💡 Tap two cards to find matching pairs{'\n'}
            Match all 6 pairs to complete the game!
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.blue500,
  },
  header: {
    backgroundColor: colors.blue500,
  },
  backIcon: {
    fontSize: 24,
    color: colors.white,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: spacing.xl,
    paddingVertical: 15,
    backgroundColor: colors.blue600,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: colors.blue100,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    color: colors.white,
    fontWeight: "700",
    marginTop: 2,
  },
  gameContainer: {
    flex: 1,
    backgroundColor: colors.blue50,
    padding: spacing.xl,
  },
  startScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gameIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.blue800,
    marginBottom: 16,
  },
  gameDescription: {
    fontSize: 16,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: spacing.xl,
  },
  startButton: {
    backgroundColor: colors.blue500,
  },
  gameBoard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 20,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 15,
    width: '100%',
  },
  card: {
    margin: 6,
    aspectRatio: 1, // Ensure square cards
  },
  cardInner: {
    flex: 1,
    borderRadius: radii.md,
    ...shadow({ offsetHeight: 2, opacity: 0.1, radius: 4, elevation: 3 }),
    position: "relative",
  },
  cardFront: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.gray200,
  },
  cardBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.warningBg,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.warning,
  },
  cardBackSymbol: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardSymbol: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  instructionsContainer: {
    backgroundColor: colors.blue100,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: radii.sm,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.blue800,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default MemoryMatchGame;
