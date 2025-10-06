import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Alert,
  PanResponder,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Gameplay constants optimized for touch
const GRID_SIZE = 24;
const TICK_MS = 150; // medium speed tick for touch gameplay
const BOARD_PADDING = 20;

const BOARD_WIDTH = width - (BOARD_PADDING * 2);
const BOARD_HEIGHT = height * 0.55;
const GRID_COLS = Math.floor(BOARD_WIDTH / GRID_SIZE);
const GRID_ROWS = Math.floor(BOARD_HEIGHT / GRID_SIZE);
const ACTUAL_BOARD_WIDTH = GRID_COLS * GRID_SIZE;
const ACTUAL_BOARD_HEIGHT = GRID_ROWS * GRID_SIZE;

const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

// Touch control constants
const DEADZONE = 2; // Smaller deadzone for more responsive touch

const SnakeTouch = () => {
  const navigation = useNavigation();
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [snake, setSnake] = useState([]);
  const [food, setFood] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState(DIRECTIONS.RIGHT);
  const [gameOverAnimation, setGameOverAnimation] = useState(false);
  const [snakeColor, setSnakeColor] = useState('#64748B');
  const [foodColor, setFoodColor] = useState('#FCA5A5');
  const [foodShape, setFoodShape] = useState('●');
  const [wallsEnabled] = useState(false); // walls disabled by default (wrap-around)
  const [isTouching, setIsTouching] = useState(false);

  const gameLoopRef = useRef(null);
  const directionRef = useRef(DIRECTIONS.RIGHT);
  const lastTouchRef = useRef(null);

  // Reuse exact same helper functions as original Snake game
  const initializeSnake = () => {
    const startX = Math.floor(GRID_COLS / 2);
    const startY = Math.floor(GRID_ROWS / 2);
    return [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];
  };

  const foodItems = [
    { color: '#EF4444', shape: '●', name: 'Cherry' },
    { color: '#F59E0B', shape: '▲', name: 'Triangle' },
    { color: '#10B981', shape: '■', name: 'Square' },
    { color: '#3B82F6', shape: '◆', name: 'Diamond' },
    { color: '#8B5CF6', shape: '★', name: 'Star' },
    { color: '#EC4899', shape: '♥', name: 'Heart' },
    { color: '#06B6D4', shape: '♦', name: 'Club' },
    { color: '#84CC16', shape: '▲', name: 'Leaf' },
  ];

  const generateFood = (snakeBody) => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS)
      };
    } while (snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y));

    const randomFoodItem = foodItems[Math.floor(Math.random() * foodItems.length)];
    setFoodColor(randomFoodItem.color);
    setFoodShape(randomFoodItem.shape);

    return newFood;
  };

  const checkCollision = (head, snakeBody, willGrow = false) => {
    // With walls disabled, only self-collision ends the run
    const bodyToCheck = willGrow ? snakeBody : snakeBody.slice(0, -1);
    return bodyToCheck.some(segment => segment.x === head.x && segment.y === head.y);
  };

  // Touch-based direction control
  const setDirectionFromVector = useCallback((vx, vy) => {
    let nextDirection;
    if (Math.abs(vx) > Math.abs(vy)) {
      nextDirection = { x: vx > 0 ? 1 : -1, y: 0 };
    } else {
      nextDirection = { x: 0, y: vy > 0 ? 1 : -1 };
    }

    // Prevent reversing directly into yourself
    const currentDirection = directionRef.current;
    if (snake.length > 1 && currentDirection.x + nextDirection.x === 0 && currentDirection.y + nextDirection.y === 0) {
      return;
    }

    setDirection(nextDirection);
    directionRef.current = nextDirection;
  }, [snake.length]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gesture) => {
        setIsTouching(true);
        lastTouchRef.current = { x: gesture.moveX || gesture.x0, y: gesture.moveY || gesture.y0 };
      },
      onPanResponderMove: (evt, gesture) => {
        const last = lastTouchRef.current;
        const cur = { x: gesture.moveX, y: gesture.moveY };
        if (last && cur.x != null && cur.y != null) {
          const vx = cur.x - last.x;
          const vy = cur.y - last.y;
          if (Math.abs(vx) + Math.abs(vy) > DEADZONE) {
            setDirectionFromVector(vx, vy);
            lastTouchRef.current = cur;
          }
        } else {
          lastTouchRef.current = cur;
        }
      },
      onPanResponderRelease: () => {
        setIsTouching(false);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        setIsTouching(false);
      },
    })
  );

  // Game loop - only runs while touching
  const gameLoop = useCallback(() => {
    if (isPaused || gameOver || !isTouching) return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      head.x += directionRef.current.x;
      head.y += directionRef.current.y;

      // Smooth wrap-around movement (no walls)
      if (head.x < 0) head.x = GRID_COLS - 1;
      if (head.x >= GRID_COLS) head.x = 0;
      if (head.y < 0) head.y = GRID_ROWS - 1;
      if (head.y >= GRID_ROWS) head.y = 0;

      const willGrow = head.x === food.x && head.y === food.y;

      if (checkCollision(head, newSnake, willGrow)) {
        setSnakeColor('#EF4444');
        setGameOverAnimation(true);
        setGameOver(true);
        return prevSnake;
      }

      newSnake.unshift(head);

      if (willGrow) {
        setScore(prev => prev + 10);
        setSnakeColor(foodColor);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [isPaused, gameOver, isTouching, directionRef, food]);

  // Start/stop game loop based on touch state
  useEffect(() => {
    if (gameStarted && !gameOver && isTouching) {
      gameLoopRef.current = setInterval(gameLoop, TICK_MS);
      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      };
    }
  }, [gameStarted, gameOver, isTouching, gameLoop]);

  const startGame = () => {
    const initialSnake = initializeSnake();
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setScore(0);
    setDirection(DIRECTIONS.RIGHT);
    directionRef.current = DIRECTIONS.RIGHT;
    setGameStarted(true);
    setGameOver(false);
    setGameOverAnimation(false);
    setIsPaused(false);
    setIsTouching(false);
    setSnakeColor('#64748B');
    setFoodColor('#FCA5A5');
    setFoodShape('●');
    // Kick an immediate tick on touch start for responsiveness
  };

  const pauseGame = () => {
    setIsPaused(!isPaused);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setGameOverAnimation(false);
    setIsPaused(false);
    setScore(0);
    setSnake([]);
    setFood({ x: 0, y: 0 });
    setDirection(DIRECTIONS.RIGHT);
    directionRef.current = DIRECTIONS.RIGHT;
    setIsTouching(false);
    setSnakeColor('#64748B');
    setFoodColor('#FCA5A5');
    setFoodShape('●');
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
  };

  const handleBackPress = () => {
    if (gameStarted && !gameOver) {
      Alert.alert(
        "Pause Game",
        "Are you sure you want to leave? Your progress will be lost.",
        [
          { text: "Continue Playing", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Update high score
  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
    }
  }, [gameOver, score, highScore]);

  // Render game board (reuse exact same logic as original Snake)
  const renderGameBoard = () => {
    const board = [];

    // Food
    board.push(
      <View
        key="food"
        style={[
          styles.food,
          {
            left: food.x * GRID_SIZE,
            top: food.y * GRID_SIZE,
            backgroundColor: foodColor,
            borderWidth: 3,
            borderColor: '#FFFFFF',
            shadowColor: foodColor,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.5,
            shadowRadius: 6,
            elevation: 4,
            width: GRID_SIZE + 8,
            height: GRID_SIZE + 8,
            borderRadius: (GRID_SIZE + 8) / 2,
          },
        ]}
      >
        <Text style={styles.foodText}>{foodShape}</Text>
      </View>
    );

    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const isTail = i === snake.length - 1;
      const baseColor = gameOverAnimation ? '#EF4444' : snakeColor;

      let segmentStyle = {};
      let segmentContent = null;

      if (isHead) {
        const headDirection = direction;
        segmentStyle = {
          width: GRID_SIZE + 2,
          height: GRID_SIZE + 2,
          backgroundColor: baseColor,
          borderRadius: (GRID_SIZE + 2) / 2,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          shadowColor: baseColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 3,
        };

        let headSymbol = '●';
        if (headDirection === DIRECTIONS.RIGHT) headSymbol = '▶';
        else if (headDirection === DIRECTIONS.LEFT) headSymbol = '◀';
        else if (headDirection === DIRECTIONS.UP) headSymbol = '▲';
        else if (headDirection === DIRECTIONS.DOWN) headSymbol = '▼';

        segmentContent = <Text style={styles.snakeHeadText}>{headSymbol}</Text>;
      } else if (isTail) {
        segmentStyle = {
          width: GRID_SIZE - 4,
          height: GRID_SIZE - 4,
          backgroundColor: baseColor,
          borderRadius: (GRID_SIZE - 4) / 2,
          borderWidth: 1,
          borderColor: '#FFFFFF',
        };
        segmentContent = <Text style={styles.snakeTailText}>●</Text>;
      } else {
        const alpha = Math.max(0.4, 1 - i / snake.length);
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);

        segmentStyle = {
          width: GRID_SIZE,
          height: GRID_SIZE,
          backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})`,
          borderRadius: GRID_SIZE / 2,
          borderWidth: 1,
          borderColor: `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`,
        };
        segmentContent = <Text style={styles.snakeBodyText}>●</Text>;
      }

      board.push(
        <View
          key={`snake-${i}`}
          style={[
            segmentStyle,
            {
              position: 'absolute',
              left: seg.x * GRID_SIZE,
              top: seg.y * GRID_SIZE,
            },
          ]}
        >
          {segmentContent}
        </View>
      );
    });

    return board;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Snake Touch</Text>
        <View style={styles.emptyBox} />
      </View>

      {/* Game Stats (simplified) */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Length</Text>
          <Text style={styles.statValue}>{snake.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Best</Text>
          <Text style={styles.statValue}>{highScore}</Text>
        </View>
      </View>

      {/* Game Area */}
      <View style={styles.gameContainer}>
        {!gameStarted ? (
          <View style={styles.startScreen}>
            <Text style={styles.gameIcon}>👆</Text>
            <Text style={styles.gameTitle}>Touch Snake</Text>
            <View style={styles.subtleInstructions}>
              <Text style={styles.instructionText}>Touch and drag to guide • Eat to grow • No auto-movement • Avoid moving into yourself</Text>
            </View>
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>

            {/* Controls simplified for touch-first gameplay */}
          </View>
        ) : gameOver ? (
          <View style={styles.gameOverScreen}>
            <Text style={styles.gameOverIcon}>💫</Text>
            <Text style={styles.gameOverTitle}>Well Done!</Text>
            <Text style={styles.finalScore}>Score {score}</Text>
            {score === highScore && score > 0 && (
              <Text style={styles.newHighScore}>New Best!</Text>
            )}
            <View style={styles.gameOverButtons}>
              <TouchableOpacity style={styles.playAgainButton} onPress={startGame}>
                <Text style={styles.playAgainButtonText}>Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuButton} onPress={resetGame}>
                <Text style={styles.menuButtonText}>Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.gameArea}>
            {/* Game Board */}
            <View
              style={[
                styles.gameBoard,
                {
                  width: ACTUAL_BOARD_WIDTH,
                  height: ACTUAL_BOARD_HEIGHT,
                }
              ]}
              {...panResponder.current.panHandlers}
            >
              {renderGameBoard()}
            </View>

            {/* Touch Status Indicator (moved below board) */}
            <View style={styles.touchIndicator}>
              <Text style={[
                styles.touchStatusText,
                isTouching ? styles.touchStatusActive : styles.touchStatusInactive
              ]}>
                {isTouching ? '🎯 Touch Active' : '⏸️ Touch to move'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#F1F5F9",
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: "#64748B",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#475569",
  },
  emptyBox: {
    width: 40,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#E2E8F0",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 16,
    color: "#334155",
    fontWeight: "600",
    marginTop: 2,
  },
  gameContainer: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    padding: BOARD_PADDING,
  },
  startScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gameIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 20,
  },
  subtleInstructions: {
    marginBottom: 40,
  },
  instructionText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    fontStyle: "italic",
  },
  startButton: {
    backgroundColor: "#64748B",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginRight: 12,
    minWidth: 50,
  },
  levelButtons: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    padding: 4,
  },
  levelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  levelButtonActive: {
    backgroundColor: "#64748B",
  },
  levelButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  levelButtonTextActive: {
    color: "#FFFFFF",
  },
  wallToggle: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  wallToggleActive: {
    backgroundColor: "#64748B",
  },
  wallToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  wallToggleTextActive: {
    color: "#FFFFFF",
  },
  gameOverScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gameOverIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  gameOverTitle: {
    fontSize: 24,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 12,
  },
  finalScore: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 8,
  },
  newHighScore: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "500",
    marginBottom: 32,
  },
  gameOverButtons: {
    flexDirection: "row",
    gap: 12,
  },
  playAgainButton: {
    backgroundColor: "#64748B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  playAgainButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  menuButton: {
    backgroundColor: "#94A3B8",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  menuButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  gameArea: {
    flex: 1,
    position: "relative",
  },
  gameBoard: {
    width: ACTUAL_BOARD_WIDTH,
    height: ACTUAL_BOARD_HEIGHT,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  gameCell: {
    position: "absolute",
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: "#FFFFFF",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#EEF2F7",
  },
  snakeHead: {
    position: "absolute",
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: "#475569",
    borderRadius: GRID_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  snakeHeadText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  snakeBody: {
    position: "absolute",
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: "#64748B",
    borderRadius: GRID_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#475569",
  },
  snakeBodyText: {
    fontSize: 10,
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  snakeTail: {
    position: "absolute",
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: "#94A3B8",
    borderRadius: GRID_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#64748B",
  },
  snakeTailText: {
    fontSize: 8,
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  food: {
    position: "absolute",
    width: GRID_SIZE - 4,
    height: GRID_SIZE - 4,
    borderRadius: (GRID_SIZE - 4) / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  foodText: {
    fontSize: 18,
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  touchIndicator: {
    alignItems: "center",
    marginTop: 10,
  },
  touchStatusText: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    textAlign: "center",
  },
  touchStatusActive: {
    backgroundColor: "#10B981",
    color: "#FFFFFF",
  },
  touchStatusInactive: {
    backgroundColor: "#6B7280",
    color: "#FFFFFF",
  },
});

export default SnakeTouch;
