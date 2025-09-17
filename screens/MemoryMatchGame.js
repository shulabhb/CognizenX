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

const { width, height } = Dimensions.get('window');

const MemoryMatchGame = () => {
  const navigation = useNavigation();
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Memory-friendly symbols for dementia patients
  const symbols = ['🐶', '🐱', '🐰', '🐸', '🐯', '🐻', '🦊', '🐼'];
  const cardSize = (width - 60) / 4; // 4 columns with padding

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
    if (flippedCards.length >= 2 || matchedCards.includes(cardId)) {
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
        // Match found
        setMatchedCards(prev => [...prev, firstCardId, secondCardId]);
        setFlippedCards([]);
        
        // Check if game is completed
        if (matchedCards.length + 2 === cards.length) {
          setTimeout(() => {
            setGameCompleted(true);
            Alert.alert(
              '🎉 Congratulations!',
              `You completed the memory game in ${moves + 1} moves!`,
              [
                { text: 'Play Again', onPress: initializeGame },
                { text: 'Back to Puzzles', onPress: () => navigation.goBack() }
              ]
            );
          }, 500);
        }
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
          { width: cardSize, height: cardSize },
          isFlipped && styles.cardFlipped
        ]}
        onPress={() => handleCardPress(card.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.cardInner, isFlipped && styles.cardInnerFlipped]}>
          <View style={styles.cardFront}>
            <Text style={styles.cardSymbol}>❓</Text>
          </View>
          <View style={styles.cardBack}>
            <Text style={styles.cardSymbol}>{card.symbol}</Text>
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
      <StatusBar backgroundColor="#3B82F6" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Memory Match</Text>
        <View style={styles.emptyBox} />
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
          <Text style={styles.statLabel}>Remaining</Text>
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
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={initializeGame}>
              <Text style={styles.startButtonText}>Start Game</Text>
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
            💡 Tap two cards to find matching pairs
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3B82F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#3B82F6",
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyBox: {
    width: 40,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#2563EB",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#DBEAFE",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: 2,
  },
  gameContainer: {
    flex: 1,
    backgroundColor: "#F0F9FF",
    padding: 20,
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
    color: "#1E40AF",
    marginBottom: 16,
  },
  gameDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  startButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  gameBoard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  card: {
    margin: 5,
  },
  cardFlipped: {
    transform: [{ rotateY: '180deg' }],
  },
  cardInner: {
    flex: 1,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardInnerFlipped: {
    transform: [{ rotateY: '180deg' }],
  },
  cardFront: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  cardBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F59E0B",
    transform: [{ rotateY: '180deg' }],
  },
  cardSymbol: {
    fontSize: 32,
    fontWeight: "600",
  },
  instructionsContainer: {
    backgroundColor: "#DBEAFE",
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: "#1E40AF",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default MemoryMatchGame;
