import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const JigsawGame = () => {
  const navigation = useNavigation();
  const [puzzlePieces, setPuzzlePieces] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState(null);

  // Simple, dementia-friendly images
  const puzzleImages = [
    { id: 1, name: 'Sunny Day', emoji: '☀️', color: '#FEF3C7' },
    { id: 2, name: 'Flower Garden', emoji: '🌸', color: '#FCE7F3' },
    { id: 3, name: 'Happy Face', emoji: '😊', color: '#FEF3C7' },
    { id: 4, name: 'Rainbow', emoji: '🌈', color: '#E0E7FF' },
    { id: 5, name: 'Heart', emoji: '❤️', color: '#FEE2E2' },
  ];

  const generatePuzzle = useCallback((imageId, gridSize = 3) => {
    const image = puzzleImages.find(img => img.id === imageId);
    const pieces = [];
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const pieceId = row * gridSize + col;
        pieces.push({
          id: pieceId,
          row,
          col,
          correctRow: row,
          correctCol: col,
          image: image,
          isInCorrectPosition: false,
          position: { x: 50 + (pieceId % 3) * 100, y: 200 + Math.floor(pieceId / 3) * 100 },
        });
      }
    }
    
    // Shuffle pieces (except keep one in correct position for easier start)
    const shuffledPieces = pieces.map(piece => ({
      ...piece,
      position: {
        x: 50 + Math.random() * (width - 150),
        y: 200 + Math.random() * (height - 400),
      }
    }));
    
    // Keep the first piece in correct position for easier gameplay
    shuffledPieces[0].position = { x: 50, y: 200 };
    shuffledPieces[0].isInCorrectPosition = true;
    
    return shuffledPieces;
  }, []);

  const initializeGame = useCallback(() => {
    const imageId = Math.floor(Math.random() * puzzleImages.length) + 1;
    const gridSize = Math.min(3 + level - 1, 4); // Max 4x4 grid
    const pieces = generatePuzzle(imageId, gridSize);
    
    setPuzzlePieces(pieces);
    setLevel(1);
    setScore(0);
    setGameStarted(true);
    setGameCompleted(false);
    setSelectedPiece(null);
  }, [level, generatePuzzle]);

  const checkPiecePosition = (piece, x, y) => {
    const gridSize = Math.sqrt(puzzlePieces.length);
    const pieceSize = 80;
    const startX = 50;
    const startY = 200;
    
    const targetX = startX + piece.correctCol * pieceSize;
    const targetY = startY + piece.correctRow * pieceSize;
    
    const threshold = 40; // How close to target position
    
    return (
      Math.abs(x - targetX) < threshold &&
      Math.abs(y - targetY) < threshold
    );
  };

  const handlePiecePress = (piece) => {
    setSelectedPiece(piece);
  };

  const handlePieceMove = (piece, gestureState) => {
    if (!selectedPiece || selectedPiece.id !== piece.id) return;
    
    const newX = piece.position.x + gestureState.dx;
    const newY = piece.position.y + gestureState.dy;
    
    // Check if piece is in correct position
    const isCorrect = checkPiecePosition(piece, newX, newY);
    
    setPuzzlePieces(prevPieces => 
      prevPieces.map(p => 
        p.id === piece.id 
          ? { 
              ...p, 
              position: { x: newX, y: newY },
              isInCorrectPosition: isCorrect
            }
          : p
      )
    );
    
    // Check if all pieces are in correct positions
    const updatedPieces = puzzlePieces.map(p => 
      p.id === piece.id 
        ? { ...p, position: { x: newX, y: newY }, isInCorrectPosition: isCorrect }
        : p
    );
    
    const allCorrect = updatedPieces.every(p => p.isInCorrectPosition);
    if (allCorrect) {
      setGameCompleted(true);
      const newScore = score + (level * 50);
      setScore(newScore);
      
      Alert.alert(
        '🎉 Puzzle Complete!',
        `Great job! You completed the ${puzzlePieces[0].image.name} puzzle!`,
        [
          { text: 'Next Level', onPress: () => {
            setLevel(prev => prev + 1);
            setTimeout(initializeGame, 500);
          }},
          { text: 'Back to Puzzles', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  const createPanResponder = (piece) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => handlePiecePress(piece),
      onPanResponderMove: (evt, gestureState) => {
        handlePieceMove(piece, gestureState);
      },
      onPanResponderRelease: () => {
        setSelectedPiece(null);
      },
    });
  };

  const renderPuzzlePiece = (piece) => {
    const panResponder = createPanResponder(piece);
    
    return (
      <View
        key={piece.id}
        {...panResponder.panHandlers}
        style={[
          styles.puzzlePiece,
          {
            left: piece.position.x,
            top: piece.position.y,
            backgroundColor: piece.image.color,
            borderColor: piece.isInCorrectPosition ? '#10B981' : '#E5E7EB',
            borderWidth: piece.isInCorrectPosition ? 3 : 2,
            transform: [
              { scale: selectedPiece?.id === piece.id ? 1.1 : 1 }
            ]
          }
        ]}
      >
        <Text style={styles.pieceEmoji}>{piece.image.emoji}</Text>
        <Text style={styles.pieceNumber}>{piece.id + 1}</Text>
      </View>
    );
  };

  const renderPuzzleGrid = () => {
    const gridSize = Math.sqrt(puzzlePieces.length);
    const pieceSize = 80;
    const startX = 50;
    const startY = 200;
    
    return (
      <View style={styles.puzzleGrid}>
        {Array.from({ length: gridSize * gridSize }).map((_, index) => {
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          const x = startX + col * pieceSize;
          const y = startY + row * pieceSize;
          
          return (
            <View
              key={index}
              style={[
                styles.gridSlot,
                {
                  left: x,
                  top: y,
                  width: pieceSize,
                  height: pieceSize,
                }
              ]}
            />
          );
        })}
      </View>
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
      <StatusBar backgroundColor="#F59E0B" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Simple Jigsaw</Text>
        <View style={styles.emptyBox} />
      </View>

      {/* Game Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Level</Text>
          <Text style={styles.statValue}>{level}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pieces</Text>
          <Text style={styles.statValue}>{puzzlePieces.length}</Text>
        </View>
      </View>

      {/* Game Area */}
      <View style={styles.gameContainer}>
        {!gameStarted ? (
          <View style={styles.startScreen}>
            <Text style={styles.gameIcon}>🧩</Text>
            <Text style={styles.gameTitle}>Simple Jigsaw</Text>
            <Text style={styles.gameDescription}>
              Drag the puzzle pieces to their correct positions. 
              Match the numbers and colors to complete the picture!
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={initializeGame}>
              <Text style={styles.startButtonText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gameBoard}>
            {puzzlePieces.length > 0 && (
              <>
                <View style={styles.puzzleInfo}>
                  <Text style={styles.puzzleTitle}>
                    {puzzlePieces[0].image.name} Puzzle
                  </Text>
                  <Text style={styles.puzzleEmoji}>{puzzlePieces[0].image.emoji}</Text>
                </View>
                
                {renderPuzzleGrid()}
                
                <View style={styles.piecesContainer}>
                  {puzzlePieces.map(renderPuzzlePiece)}
                </View>
                
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsText}>
                    💡 Drag pieces to the numbered grid slots
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F59E0B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#F59E0B",
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
    backgroundColor: "#D97706",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#FEF3C7",
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
    backgroundColor: "#FFFBEB",
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
    color: "#92400E",
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
    backgroundColor: "#F59E0B",
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
  },
  puzzleInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  puzzleTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 8,
  },
  puzzleEmoji: {
    fontSize: 32,
  },
  puzzleGrid: {
    position: "absolute",
    top: 200,
    left: 50,
  },
  gridSlot: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  piecesContainer: {
    flex: 1,
  },
  puzzlePiece: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pieceEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  pieceNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  instructionsContainer: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  instructionsText: {
    fontSize: 14,
    color: "#92400E",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default JigsawGame;
