const SHAPES = ['circle', 'square', 'diamond', 'triangle'];

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pickShape(seed, exclude) {
  const available = SHAPES.filter((s) => s !== exclude);
  const idx = Math.floor(seededRandom(seed) * available.length) % available.length;
  return available[idx];
}

export function generateFocusRound(roundIndex, gridSize = 4, sessionSeed = Date.now()) {
  const seed = sessionSeed + roundIndex * 137;
  const targetShape = SHAPES[Math.floor(seededRandom(seed) * SHAPES.length) % SHAPES.length];
  const decoyShape = pickShape(seed + 1, targetShape);
  const totalCells = gridSize * gridSize;
  const targetCount = gridSize === 4 ? 4 : 5;

  const indices = Array.from({ length: totalCells }, (_, i) => i);
  const shuffled = indices.sort((a, b) => seededRandom(seed + a) - seededRandom(seed + b));
  const targetPositions = new Set(shuffled.slice(0, targetCount));

  const grid = indices.map((i) => (targetPositions.has(i) ? targetShape : decoyShape));

  const shapeLabel = targetShape.charAt(0).toUpperCase() + targetShape.slice(1);

  return {
    id: `focus-${gridSize}-${roundIndex}-${sessionSeed}`,
    prompt: `Tap every ${shapeLabel}`,
    targetShape,
    grid,
    gridSize,
    targetCount,
  };
}

export function generateFocusSession(roundCount, gridSize = 4, sessionSeed = Date.now()) {
  return Array.from({ length: roundCount }, (_, i) => generateFocusRound(i, gridSize, sessionSeed));
}
