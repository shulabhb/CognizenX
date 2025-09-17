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
  Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Game constants
const GRID_SIZE = 24; // Size of each grid cell - bigger for larger snake and food
const INITIAL_SPEED = 200; // Initial speed in milliseconds - faster for smooth flow
const SPEED_DECREASE = 8; // Speed decrease per food eaten
const MIN_SPEED = 80; // Minimum speed - faster for smooth flow
const BOARD_PADDING = 20;
const POINTS_PER_LEVEL = 50; // Points needed to advance to next level

// Level configurations
const LEVEL_CONFIGS = {
  Beginner: { initialSpeed: 300, speedDecrease: 6, minSpeed: 120 },
  Intermediate: { initialSpeed: 200, speedDecrease: 8, minSpeed: 80 },
  Expert: { initialSpeed: 150, speedDecrease: 10, minSpeed: 60 }
};

// Smooth movement constants - removed MOVEMENT_DURATION for seamless flow

// Calculate game board dimensions
const BOARD_WIDTH = width - (BOARD_PADDING * 2);
const BOARD_HEIGHT = height * 0.55;
const GRID_COLS = Math.floor(BOARD_WIDTH / GRID_SIZE);
const GRID_ROWS = Math.floor(BOARD_HEIGHT / GRID_SIZE);
const ACTUAL_BOARD_WIDTH = GRID_COLS * GRID_SIZE;
const ACTUAL_BOARD_HEIGHT = GRID_ROWS * GRID_SIZE;

// Directions
const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

const SnakeGameScreen = () => {
  const navigation = useNavigation();
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [snake, setSnake] = useState([]);
  const [food, setFood] = useState({ x: 0, y: 0 });
  const [nextDirection, setNextDirection] = useState(DIRECTIONS.RIGHT);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [gameOverAnimation, setGameOverAnimation] = useState(false);
  const [snakeColor, setSnakeColor] = useState('#64748B'); // Default snake color
  const [foodColor, setFoodColor] = useState('#FCA5A5'); // Default food color
  const [foodShape, setFoodShape] = useState('●'); // Default food shape
  const [gameLevel, setGameLevel] = useState('Beginner'); // Beginner, Intermediate, Expert
  const [wallsEnabled, setWallsEnabled] = useState(true); // Wall collision on/off
  
  // Smooth per-tick interpolation (prev → current)
  const prevSnakeRef = useRef([]);
  const tickProgress = useRef(new Animated.Value(1)).current;
  
  const gameLoopRef = useRef(null);
  const lastDirectionRef = useRef(DIRECTIONS.RIGHT);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const snakeColorAnim = useRef(new Animated.Value(0)).current;

  // Initialize snake
  const initializeSnake = () => {
    const startX = Math.floor(GRID_COLS / 2);
    const startY = Math.floor(GRID_ROWS / 2);
    return [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];
  };

  // Food colors and shapes array
  const foodItems = [
    { color: '#EF4444', shape: '●', name: 'Cherry' }, // Red circle
    { color: '#F59E0B', shape: '▲', name: 'Triangle' }, // Orange triangle
    { color: '#10B981', shape: '■', name: 'Square' }, // Green square
    { color: '#3B82F6', shape: '◆', name: 'Diamond' }, // Blue diamond
    { color: '#8B5CF6', shape: '★', name: 'Star' }, // Purple star
    { color: '#EC4899', shape: '♥', name: 'Heart' }, // Pink heart
    { color: '#06B6D4', shape: '♦', name: 'Club' }, // Cyan club
    { color: '#84CC16', shape: '▲', name: 'Leaf' }, // Lime triangle
  ];

  // Generate random food position with random color and shape
  const generateFood = (snakeBody) => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS)
      };
    } while (snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y));

    // Set random food item (color and shape)
    const randomFoodItem = foodItems[Math.floor(Math.random() * foodItems.length)];
    setFoodColor(randomFoodItem.color);
    setFoodShape(randomFoodItem.shape);

    return newFood;
  };

  // Check collision
  const checkCollision = (head, snakeBody, willGrow = false) => {
    // Wall collision only when walls are enabled
    if (wallsEnabled && (head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS)) {
      return true;
    }
    // Check self collision (ignore tail if it will move this tick)
    const bodyToCheck = willGrow ? snakeBody : snakeBody.slice(0, -1);
    return bodyToCheck.some(segment => segment.x === head.x && segment.y === head.y);
  };

  // Helper to convert grid coordinates to pixels
  const toPx = useCallback((coord) => ({ 
    x: coord.x * GRID_SIZE, 
    y: coord.y * GRID_SIZE 
  }), []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (isPaused || gameOver) return;

    // start a new 0→1 animation for this tick (no pause, immediate flow)
    tickProgress.setValue(0);
    Animated.timing(tickProgress, {
      toValue: 1,
      duration: speed,
      easing: Easing.linear,
      useNativeDriver: true, // transform animations → GPU
    }).start();

    setSnake(prevSnake => {
      // snapshot previous positions for interpolation
      prevSnakeRef.current = prevSnake;

      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      // apply direction
      const currentDirection = nextDirection;
      lastDirectionRef.current = currentDirection;

      head.x += currentDirection.x;
      head.y += currentDirection.y;

      // Handle smooth wall wrapping only when walls are disabled
      if (!wallsEnabled) {
        if (head.x < 0) head.x = GRID_COLS - 1;
        if (head.x >= GRID_COLS) head.x = 0;
        if (head.y < 0) head.y = GRID_ROWS - 1;
        if (head.y >= GRID_ROWS) head.y = 0;
      }

      // check if will grow this tick
      const willGrow = head.x === food.x && head.y === food.y;

      // collision (wall or self)
      if (checkCollision(head, newSnake, willGrow)) {
        setSnakeColor('#EF4444');
        setGameOverAnimation(true);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.2, duration: 300, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.1, duration: 200, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
          ]),
        ]).start(() => setGameOver(true));
        return prevSnake;
      }

      newSnake.unshift(head);

      // eat → grow (no pop) and speed up
      if (willGrow) {
        setScore(prev => {
          const ns = prev + 10;
          const nl = Math.floor(ns / POINTS_PER_LEVEL) + 1;
          if (nl > level) setLevel(nl);
          return ns;
        });
        setSnakeColor(foodColor);
        setFood(generateFood(newSnake));
        // Increase speed based on level
        const levelConfig = LEVEL_CONFIGS[gameLevel];
        setSpeed(prev => Math.max(levelConfig.minSpeed, prev - levelConfig.speedDecrease));
      } else {
        newSnake.pop(); // regular move
      }

      return newSnake;
    });
  }, [isPaused, gameOver, nextDirection, food, speed, fadeAnim, scaleAnim]);

  // Start game loop
  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = setInterval(gameLoop, speed);
      return () => {
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
      };
    }
  }, [gameStarted, gameOver, gameLoop, speed]);

  // Handle direction change
  const changeDirection = (newDirection) => {
    if (gameStarted && !gameOver && !isPaused) {
      // Prevent reverse direction
      const currentDir = lastDirectionRef.current;
      if (currentDir.x === -newDirection.x && currentDir.y === -newDirection.y) {
        return;
      }
      setNextDirection(newDirection);
    }
  };

  // Pan responder for swipe gestures - improved for better responsiveness
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 15 || Math.abs(gestureState.dy) > 15;
    },
    onPanResponderGrant: (evt, gestureState) => {
      // Handle immediate touch for better responsiveness
    },
    onPanResponderMove: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      // Only change direction if movement is significant
      if (absDx > 15 || absDy > 15) {
        if (absDx > absDy) {
          // Horizontal swipe
          if (dx > 0) {
            changeDirection(DIRECTIONS.RIGHT);
          } else {
            changeDirection(DIRECTIONS.LEFT);
          }
        } else {
          // Vertical swipe
          if (dy > 0) {
            changeDirection(DIRECTIONS.DOWN);
          } else {
            changeDirection(DIRECTIONS.UP);
          }
        }
      }
    },
    onPanResponderRelease: () => {
      // Reset any gesture state if needed
    },
  });

  const startGame = () => {
    const levelConfig = LEVEL_CONFIGS[gameLevel];
    const initialSnake = initializeSnake();
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setScore(0);
    setLevel(1);
    setSpeed(levelConfig.initialSpeed);
    setNextDirection(DIRECTIONS.RIGHT);
    lastDirectionRef.current = DIRECTIONS.RIGHT;
    setGameStarted(true);
    setGameOver(false);
    setGameOverAnimation(false);
    setIsPaused(false);
    // Reset colors to default
    setSnakeColor('#64748B');
    setFoodColor('#FCA5A5');
    setFoodShape('●');
    // Reset animations
    fadeAnim.setValue(1);
    scaleAnim.setValue(1);
    snakeColorAnim.setValue(0);
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
    setLevel(1);
    setSnake([]);
    setFood({ x: 0, y: 0 });
    setNextDirection(DIRECTIONS.RIGHT);
    lastDirectionRef.current = DIRECTIONS.RIGHT;
    setSpeed(INITIAL_SPEED);
    // Reset colors to default
    setSnakeColor('#64748B');
    setFoodColor('#FCA5A5');
    setFoodShape('●');
    // Reset animations
    fadeAnim.setValue(1);
    scaleAnim.setValue(1);
    snakeColorAnim.setValue(0);
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

  // No bouncing animation - just smooth movement

  // Render game board with smooth interpolated snake movement
  const renderGameBoard = () => {
    const board = [];

    // Food - colorful shapes, bigger size
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
            width: GRID_SIZE + 8, // Bigger food
            height: GRID_SIZE + 8,
            borderRadius: (GRID_SIZE + 8) / 2,
          },
        ]}
      >
        <Text style={styles.foodText}>{foodShape}</Text>
      </View>
    );

    // helper: grid → px
    const toPx = (c) => ({ x: c.x * GRID_SIZE, y: c.y * GRID_SIZE });
    
    // Wrap-aware interpolation endpoints in grid space
    const wrapAwareEnds = (prev, curr) => {
      let fromX = prev.x, toX = curr.x;
      let fromY = prev.y, toY = curr.y;

      const dx = curr.x - prev.x;
      if (dx === -(GRID_COLS - 1)) {
        // moved RIGHT across right edge (last col -> 0)
        toX = curr.x + GRID_COLS; // 0 -> GRID_COLS (one past)
      } else if (dx === (GRID_COLS - 1)) {
        // moved LEFT across left edge (0 -> last col)
        fromX = prev.x - GRID_COLS; // 0 -> -GRID_COLS (one before)
      }

      const dy = curr.y - prev.y;
      if (dy === -(GRID_ROWS - 1)) {
        // moved DOWN across bottom edge (last row -> 0)
        toY = curr.y + GRID_ROWS;
      } else if (dy === (GRID_ROWS - 1)) {
        // moved UP across top edge (0 -> last row)
        fromY = prev.y - GRID_ROWS;
      }

      return { fromX, toX, fromY, toY };
    };

    snake.forEach((seg, i) => {
      const prev = prevSnakeRef.current[i] ?? seg; // fallback (spawn/grow)
      const adj = wrapAwareEnds(prev, seg);

      const translateX = tickProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [adj.fromX * GRID_SIZE, adj.toX * GRID_SIZE],
      });
      const translateY = tickProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [adj.fromY * GRID_SIZE, adj.toY * GRID_SIZE],
      });
      const isHead = i === 0;
      const isTail = i === snake.length - 1;
      const baseColor = gameOverAnimation ? '#EF4444' : snakeColor;

      // slight overlap so segments look continuous
      const size = GRID_SIZE + 4;

      // Create actual snake graphics
      let segmentStyle = {};
      let segmentContent = null;

      if (isHead) {
        // Snake head - larger and more prominent
        const headDirection = nextDirection;
        segmentStyle = {
          width: size + 2,
          height: size + 2,
          backgroundColor: baseColor,
          borderRadius: (size + 2) / 2,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          shadowColor: baseColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 3,
        };
        
        // Directional head symbol
        let headSymbol = '●';
        if (headDirection === DIRECTIONS.RIGHT) headSymbol = '▶';
        else if (headDirection === DIRECTIONS.LEFT) headSymbol = '◀';
        else if (headDirection === DIRECTIONS.UP) headSymbol = '▲';
        else if (headDirection === DIRECTIONS.DOWN) headSymbol = '▼';
        
        segmentContent = <Text style={styles.snakeHeadText}>{headSymbol}</Text>;
      } else if (isTail) {
        // Snake tail - smaller and tapered
        segmentStyle = {
          width: size - 4,
          height: size - 4,
          backgroundColor: baseColor,
          borderRadius: (size - 4) / 2,
          borderWidth: 1,
          borderColor: '#FFFFFF',
        };
        segmentContent = <Text style={styles.snakeTailText}>●</Text>;
      } else {
        // Snake body - medium size with gradient
        const alpha = Math.max(0.4, 1 - i / snake.length);
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        
        segmentStyle = {
          width: size,
          height: size,
          backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})`,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`,
        };
        segmentContent = <Text style={styles.snakeBodyText}>●</Text>;
      }

      // detect if this segment wrapped this tick
      const dx = seg.x - prev.x;
      const dy = seg.y - prev.y;
      const isWrapX = dx === (GRID_COLS - 1) || dx === -(GRID_COLS - 1);
      const isWrapY = dy === (GRID_ROWS - 1) || dy === -(GRID_ROWS - 1);

      const main = (
        <Animated.View
          key={`snake-${i}`}
          style={[
            segmentStyle,
            {
              position: 'absolute',
              transform: [{ translateX }, { translateY }],
            },
          ]}
        >
          {segmentContent}
        </Animated.View>
      );

      let ghost = null;
      if (isWrapX || isWrapY) {
        const ghostShiftX = isWrapX ? (dx > 0 ? -GRID_COLS * GRID_SIZE : GRID_COLS * GRID_SIZE) : 0;
        const ghostShiftY = isWrapY ? (dy > 0 ? -GRID_ROWS * GRID_SIZE : GRID_ROWS * GRID_SIZE) : 0;

        ghost = (
          <Animated.View
            key={`snake-ghost-${i}`}
            style={[
              segmentStyle,
              {
                position: 'absolute',
                transform: [
                  { translateX: Animated.add(translateX, new Animated.Value(ghostShiftX)) },
                  { translateY: Animated.add(translateY, new Animated.Value(ghostShiftY)) },
                ],
                opacity: 1,
              },
            ]}
          >
            {segmentContent}
          </Animated.View>
        );
      }

      board.push(main);
      if (ghost) board.push(ghost);
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
        <Text style={styles.headerTitle}>Snake Game</Text>
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
            <Text style={styles.gameIcon}>🐍</Text>
            <Text style={styles.gameTitle}>Snake</Text>
            <View style={styles.subtleInstructions}>
              <Text style={styles.instructionText}>Swipe to guide • Eat to grow • Wrap around edges</Text>
            </View>
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
            
            {/* Level Selection */}
            <View style={styles.controlsContainer}>
              <Text style={styles.controlLabel}>Level:</Text>
              <View style={styles.levelButtons}>
                {['Beginner', 'Intermediate', 'Expert'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelButton,
                      gameLevel === level && styles.levelButtonActive
                    ]}
                    onPress={() => setGameLevel(level)}
                  >
                    <Text style={[
                      styles.levelButtonText,
                      gameLevel === level && styles.levelButtonTextActive
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Wall Toggle */}
            <View style={styles.controlsContainer}>
              <Text style={styles.controlLabel}>Visual Walls:</Text>
              <TouchableOpacity
                style={[
                  styles.wallToggle,
                  wallsEnabled && styles.wallToggleActive
                ]}
                onPress={() => setWallsEnabled(!wallsEnabled)}
              >
                <Text style={[
                  styles.wallToggleText,
                  wallsEnabled && styles.wallToggleTextActive
                ]}>
                  {wallsEnabled ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : gameOver ? (
          <View style={styles.gameOverScreen}>
            <Text style={styles.gameOverIcon}>💫</Text>
            <Text style={styles.gameOverTitle}>Well Done!</Text>
            <Text style={styles.finalScore}>Level {level} • Score {score}</Text>
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
            <Animated.View
              style={[
                styles.gameBoard,
                {
                  width: ACTUAL_BOARD_WIDTH,
                  height: ACTUAL_BOARD_HEIGHT,
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                }
              ]}
              {...panResponder.panHandlers}
            >
              {/* faint grid to visualize container */}
              {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, idx) => (
                <View
                  key={`cell-${idx}`}
                  style={[
                    styles.gameCell,
                    {
                      left: (idx % GRID_COLS) * GRID_SIZE,
                      top: Math.floor(idx / GRID_COLS) * GRID_SIZE,
                    },
                  ]}
                />
              ))}
              {renderGameBoard()}
            </Animated.View>
            
            {/* Game Status */}
            {isPaused && (
              <View style={styles.pauseOverlay}>
                <Text style={styles.pauseText}>Game Paused</Text>
                <Text style={styles.pauseSubtext}>Tap the pause button to resume</Text>
              </View>
            )}
            
            {/* Pause Button */}
            <TouchableOpacity style={styles.pauseButton} onPress={pauseGame}>
              <Text style={styles.pauseButtonText}>{isPaused ? '▶️' : '⏸️'}</Text>
            </TouchableOpacity>
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
  pauseButton: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: "#64748B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pauseButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
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
  pauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(241, 245, 249, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  pauseText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 6,
  },
  pauseSubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
});

export default SnakeGameScreen;