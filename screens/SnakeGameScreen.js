import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  PanResponder,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, radii, shadow, spacing } from '../styles/theme';
import { ui } from '../styles/ui';
import { gameColors } from '../styles/gameTheme';
import { useReduceMotion } from '../styles/gameMotion';
import GameIcon from '../components/games/GameIcon';
import useGameSession from '../hooks/useGameSession';
import {
  GRID_SIZE,
  GRID_COLS,
  GRID_ROWS,
  BOARD_PADDING,
  ACTUAL_BOARD_WIDTH,
  ACTUAL_BOARD_HEIGHT,
  DIRECTIONS,
  CALM_MODE,
  HIGH_SCORE_KEY_SWIPE,
  initializeSnake,
  generateFood as createFood,
  checkCollision,
  wrapHead,
  isReverseDirection,
} from '../games/snake/snakeEngine';

const INITIAL_SPEED = CALM_MODE.tickMs;
const POINTS_PER_LEVEL = 50;

const SnakeGameScreen = () => {
  const navigation = useNavigation();
  const reduceMotion = useReduceMotion();
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
  const [snakeColor, setSnakeColor] = useState(gameColors.snakeBody);
  const [foodColor, setFoodColor] = useState(gameColors.snakeTarget);
  const [foodShape, setFoodShape] = useState('');
  const [wallsEnabled, setWallsEnabled] = useState(CALM_MODE.wallsEnabled);
  const { startSession, completeSession } = useGameSession('snake_calm', 'easy');
  const sessionCompletedRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const lastMilestoneRef = useRef(0);
  
  // Smooth per-tick interpolation (prev → current)
  const prevSnakeRef = useRef([]);
  const tickProgress = useRef(new Animated.Value(1)).current;
  
  const gameLoopRef = useRef(null);
  const lastDirectionRef = useRef(DIRECTIONS.RIGHT);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const snakeColorAnim = useRef(new Animated.Value(0)).current;

  const generateFood = (snakeBody) => {
    const nextFood = createFood(snakeBody);
    setFoodColor(nextFood.color);
    setFoodShape(nextFood.shape);
    return nextFood.position;
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

      if (!wallsEnabled) {
        Object.assign(head, wrapHead(head));
      }

      const willGrow = head.x === food.x && head.y === food.y;

      if (checkCollision(head, newSnake, wallsEnabled, willGrow)) {
        if (CALM_MODE.softCollision) {
          const resetSnake = initializeSnake();
          setSnakeColor(gameColors.snakeBody);
          setFood(generateFood(resetSnake));
          return resetSnake;
        }

        setSnakeColor(gameColors.snakeBody);
        setGameOverAnimation(true);
        if (reduceMotion) {
          setGameOver(true);
        } else {
          Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.2, duration: 300, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 1.1, duration: 200, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
            ]),
          ]).start(() => setGameOver(true));
        }
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
        if (!CALM_MODE.softCollision) {
          setSpeed((prev) => Math.max(CALM_MODE.minSpeed, prev - CALM_MODE.speedDecrease));
        }
      } else {
        newSnake.pop(); // regular move
      }

      return newSnake;
    });
  }, [isPaused, gameOver, nextDirection, food, speed, fadeAnim, scaleAnim]);

  // Start game loop
  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      gameLoopRef.current = setInterval(gameLoop, speed);
      return () => {
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
      };
    }
  }, [gameStarted, gameOver, isPaused, gameLoop, speed]);

  // Handle direction change
  const changeDirection = (newDirection) => {
    if (gameStarted && !gameOver && !isPaused) {
      // Prevent reverse direction
      const currentDir = lastDirectionRef.current;
      if (isReverseDirection(currentDir, newDirection)) {
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

  const endSession = useCallback(async (completed = true) => {
    if (sessionCompletedRef.current || !sessionActiveRef.current) return;
    sessionCompletedRef.current = true;
    sessionActiveRef.current = false;
    await completeSession({
      finalScore: score,
      finalMoves: snake.length,
      completed,
      extraMetrics: { highScore: Math.max(score, highScore), level },
    });
  }, [completeSession, score, snake.length, highScore, level]);

  const startGame = () => {
    const initialSnake = initializeSnake();
    sessionCompletedRef.current = false;
    sessionActiveRef.current = true;
    lastMilestoneRef.current = 0;
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setScore(0);
    setLevel(1);
    setSpeed(INITIAL_SPEED);
    startSession();
    setNextDirection(DIRECTIONS.RIGHT);
    lastDirectionRef.current = DIRECTIONS.RIGHT;
    setGameStarted(true);
    setGameOver(false);
    setGameOverAnimation(false);
    setIsPaused(false);
    // Reset colors to default
    setSnakeColor(gameColors.snakeBody);
    setFoodColor(gameColors.snakeTarget);
    setFoodShape('');
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
    setSnakeColor(gameColors.snakeBody);
    setFoodColor(gameColors.snakeTarget);
    setFoodShape('');
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
        'Leave activity?',
        'Your current progress will be saved if you leave now.',
        [
          { text: 'Keep playing', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              await endSession(true);
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(HIGH_SCORE_KEY_SWIPE).then((value) => {
      if (value) setHighScore(Number(value) || 0);
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && gameStarted && !gameOver) {
        setIsPaused(true);
      }
    });
    return () => subscription.remove();
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (gameOver) {
      if (score > highScore) {
        setHighScore(score);
        AsyncStorage.setItem(HIGH_SCORE_KEY_SWIPE, String(score));
      }
      endSession(true);
    }
  }, [gameOver, score, highScore, endSession]);

  useEffect(() => {
    if (!gameStarted || score === 0 || score % 50 !== 0) return;
    if (score === lastMilestoneRef.current) return;
    lastMilestoneRef.current = score;
    endSession(true).then(() => {
      sessionCompletedRef.current = false;
      sessionActiveRef.current = true;
      startSession();
    });
  }, [score, gameStarted, endSession, startSession]);

  useEffect(() => () => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
  }, []);

  // No bouncing animation - just smooth movement

  // Render game board with smooth interpolated snake movement
  const renderGameBoard = () => {
    const board = [];

    const targetSize = GRID_SIZE * 0.45;
    const targetOffset = (GRID_SIZE - targetSize) / 2;
    board.push(
      <View
        key="food"
        accessibilityLabel="Target"
        style={[
          styles.food,
          {
            left: food.x * GRID_SIZE + targetOffset,
            top: food.y * GRID_SIZE + targetOffset,
            backgroundColor: foodColor,
            width: targetSize,
            height: targetSize,
            borderRadius: targetSize / 2,
          },
        ]}
      />
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
      <StatusBar backgroundColor={colors.slate50} barStyle="dark-content" />
      
      {/* Header */}
      <View style={ui.headerRow}>
        <TouchableOpacity onPress={handleBackPress} style={ui.iconButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Snake game</Text>
        <View style={ui.headerSpacer} />
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
            <GameIcon name="git-commit-outline" size={28} />
            <Text style={styles.gameTitle}>Snake game</Text>
            <View style={styles.subtleInstructions}>
              <Text style={styles.instructionText}>Swipe to guide the snake at a steady pace.</Text>
            </View>
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        ) : gameOver ? (
          <View style={styles.gameOverScreen}>
            <Text style={styles.gameOverTitle}>Pause point</Text>
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
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={pauseGame}
              accessibilityRole="button"
              accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
            >
              <Ionicons
                name={isPaused ? 'play-outline' : 'pause-outline'}
                size={22}
                color={colors.slate600}
              />
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
    backgroundColor: gameColors.canvas,
  },
  backIcon: {
    fontSize: 24,
    color: colors.slate500,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.slate600,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: spacing.xl,
    paddingVertical: 15,
    backgroundColor: colors.slate200,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: colors.slate500,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 16,
    color: colors.slate700,
    fontWeight: "600",
    marginTop: 2,
  },
  gameContainer: {
    flex: 1,
    backgroundColor: gameColors.canvas,
    padding: BOARD_PADDING,
  },
  startScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gameTitle: {
    marginTop: spacing.lg,
    fontSize: 28,
    fontWeight: "500",
    color: colors.slate600,
    marginBottom: 20,
  },
  subtleInstructions: {
    marginBottom: 40,
  },
  instructionText: {
    fontSize: 14,
    color: colors.slate400,
    textAlign: "center",
    fontStyle: "italic",
  },
  startButton: {
    backgroundColor: colors.slate500,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    ...shadow({ offsetHeight: 2, opacity: 0.1, radius: 4, elevation: 2 }),
  },
  startButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingHorizontal: spacing.xl,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate600,
    marginRight: 12,
    minWidth: 50,
  },
  levelButtons: {
    flexDirection: "row",
    backgroundColor: colors.slate200,
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
    backgroundColor: colors.slate500,
  },
  levelButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.slate500,
  },
  levelButtonTextActive: {
    color: colors.white,
  },
  wallToggle: {
    backgroundColor: colors.slate200,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  wallToggleActive: {
    backgroundColor: colors.slate500,
  },
  wallToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate500,
  },
  wallToggleTextActive: {
    color: colors.white,
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
    color: colors.slate600,
    marginBottom: 12,
  },
  finalScore: {
    fontSize: 16,
    color: colors.slate500,
    marginBottom: 8,
  },
  newHighScore: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: "500",
    marginBottom: 32,
  },
  gameOverButtons: {
    flexDirection: "row",
    gap: 12,
  },
  playAgainButton: {
    backgroundColor: colors.slate500,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  playAgainButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "500",
  },
  menuButton: {
    backgroundColor: colors.slate400,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  menuButtonText: {
    color: colors.white,
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
    backgroundColor: colors.slate500,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    ...shadow({ offsetHeight: 2, opacity: 0.1, radius: 4, elevation: 2 }),
  },
  pauseButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: "500",
  },
  gameBoard: {
    width: ACTUAL_BOARD_WIDTH,
    height: ACTUAL_BOARD_HEIGHT,
    backgroundColor: colors.slate50,
    borderRadius: radii.md,
    position: "relative",
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: "hidden",
    ...shadow({ offsetHeight: 2, opacity: 0.05, radius: 4, elevation: 1 }),
  },
  gameCell: {
    position: "absolute",
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#EEF2F7",
  },
  snakeHeadText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  snakeBodyText: {
    fontSize: 10,
    color: colors.white,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  snakeTailText: {
    fontSize: 8,
    color: colors.white,
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
    color: colors.white,
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
    color: colors.slate600,
    marginBottom: 6,
  },
  pauseSubtext: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: "center",
  },
});

export default SnakeGameScreen;