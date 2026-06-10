import { Dimensions } from 'react-native';
import { gameColors } from '../../styles/gameTheme';

const { width, height } = Dimensions.get('window');

export const GRID_SIZE = 24;
export const BOARD_PADDING = 20;

export const BOARD_WIDTH = width - (BOARD_PADDING * 2);
export const BOARD_HEIGHT = height * 0.55;
export const GRID_COLS = Math.floor(BOARD_WIDTH / GRID_SIZE);
export const GRID_ROWS = Math.floor(BOARD_HEIGHT / GRID_SIZE);
export const ACTUAL_BOARD_WIDTH = GRID_COLS * GRID_SIZE;
export const ACTUAL_BOARD_HEIGHT = GRID_ROWS * GRID_SIZE;

export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const CALM_MODE = {
  tickMs: 250,
  speedDecrease: 0,
  minSpeed: 250,
  wallsEnabled: false,
  softCollision: true,
};

export const HIGH_SCORE_KEY_SWIPE = 'game:snake:swipe:highScore';
export const HIGH_SCORE_KEY_TOUCH = 'game:snake:touch:highScore';
export const HIGH_SCORE_KEY = HIGH_SCORE_KEY_SWIPE;

export function initializeSnake() {
  const startX = Math.floor(GRID_COLS / 2);
  const startY = Math.floor(GRID_ROWS / 2);
  return [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
}

export function generateFood(snakeBody) {
  const occupied = new Set(snakeBody.map((segment) => `${segment.x},${segment.y}`));
  const emptyCells = [];
  for (let x = 0; x < GRID_COLS; x += 1) {
    for (let y = 0; y < GRID_ROWS; y += 1) {
      if (!occupied.has(`${x},${y}`)) {
        emptyCells.push({ x, y });
      }
    }
  }
  const newFood = emptyCells.length > 0
    ? emptyCells[Math.floor(Math.random() * emptyCells.length)]
    : { x: 0, y: 0 };

  return {
    position: newFood,
    color: gameColors.snakeTarget,
    shape: '',
  };
}

export function checkCollision(head, snakeBody, wallsEnabled, willGrow = false) {
  if (wallsEnabled && (head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS)) {
    return true;
  }

  const bodyToCheck = willGrow ? snakeBody : snakeBody.slice(0, -1);
  return bodyToCheck.some((segment) => segment.x === head.x && segment.y === head.y);
}

export function wrapHead(head) {
  const wrapped = { ...head };
  if (wrapped.x < 0) wrapped.x = GRID_COLS - 1;
  if (wrapped.x >= GRID_COLS) wrapped.x = 0;
  if (wrapped.y < 0) wrapped.y = GRID_ROWS - 1;
  if (wrapped.y >= GRID_ROWS) wrapped.y = 0;
  return wrapped;
}

export function isReverseDirection(currentDir, newDirection) {
  return currentDir.x === -newDirection.x && currentDir.y === -newDirection.y;
}
