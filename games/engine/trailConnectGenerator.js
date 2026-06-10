import { fisherYatesShuffle } from './contentPool';

const HAND_LAYOUTS = [
  {
    id: 'layout-a',
    nodes: [
      { id: 1, x: 0.15, y: 0.2 }, { id: 2, x: 0.75, y: 0.15 },
      { id: 3, x: 0.55, y: 0.55 }, { id: 4, x: 0.2, y: 0.75 },
      { id: 5, x: 0.85, y: 0.8 },
    ],
  },
  {
    id: 'layout-b',
    nodes: [
      { id: 1, x: 0.2, y: 0.15 }, { id: 2, x: 0.7, y: 0.25 },
      { id: 3, x: 0.35, y: 0.5 }, { id: 4, x: 0.8, y: 0.7 },
      { id: 5, x: 0.15, y: 0.8 }, { id: 6, x: 0.5, y: 0.35 },
    ],
  },
  {
    id: 'layout-c',
    nodes: [
      { id: 1, x: 0.5, y: 0.12 }, { id: 2, x: 0.15, y: 0.4 },
      { id: 3, x: 0.85, y: 0.45 }, { id: 4, x: 0.35, y: 0.78 },
      { id: 5, x: 0.7, y: 0.65 },
    ],
  },
  {
    id: 'layout-d',
    nodes: [
      { id: 1, x: 0.1, y: 0.1 }, { id: 2, x: 0.45, y: 0.2 },
      { id: 3, x: 0.8, y: 0.15 }, { id: 4, x: 0.25, y: 0.55 },
      { id: 5, x: 0.65, y: 0.5 }, { id: 6, x: 0.4, y: 0.85 },
    ],
  },
  {
    id: 'layout-e',
    nodes: [
      { id: 1, x: 0.3, y: 0.15 }, { id: 2, x: 0.7, y: 0.2 },
      { id: 3, x: 0.15, y: 0.5 }, { id: 4, x: 0.55, y: 0.45 },
      { id: 5, x: 0.85, y: 0.75 }, { id: 6, x: 0.25, y: 0.8 },
    ],
  },
  {
    id: 'layout-f',
    nodes: [
      { id: 1, x: 0.5, y: 0.08 }, { id: 2, x: 0.2, y: 0.3 },
      { id: 3, x: 0.75, y: 0.35 }, { id: 4, x: 0.4, y: 0.6 },
      { id: 5, x: 0.15, y: 0.85 },
    ],
  },
  {
    id: 'layout-g',
    nodes: [
      { id: 1, x: 0.12, y: 0.25 }, { id: 2, x: 0.38, y: 0.12 },
      { id: 3, x: 0.62, y: 0.28 }, { id: 4, x: 0.88, y: 0.42 },
      { id: 5, x: 0.5, y: 0.72 },
    ],
  },
  {
    id: 'layout-h',
    nodes: [
      { id: 1, x: 0.25, y: 0.18 }, { id: 2, x: 0.55, y: 0.22 },
      { id: 3, x: 0.82, y: 0.38 }, { id: 4, x: 0.18, y: 0.62 },
      { id: 5, x: 0.48, y: 0.78 }, { id: 6, x: 0.78, y: 0.82 },
    ],
  },
];

function minDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function generateTrailLayout(nodeCount = 5, seed = Math.random()) {
  const nodes = [];
  const minDist = 0.18;
  let attempts = 0;
  while (nodes.length < nodeCount && attempts < 200) {
    attempts += 1;
    const candidate = {
      id: nodes.length + 1,
      x: 0.1 + (seed * attempts * 0.37) % 0.8,
      y: 0.1 + (seed * attempts * 0.53) % 0.75,
    };
    candidate.x = Math.min(0.88, Math.max(0.1, candidate.x));
    candidate.y = Math.min(0.85, Math.max(0.1, candidate.y));
    if (nodes.every((n) => minDistance(n, candidate) >= minDist)) {
      nodes.push(candidate);
    }
  }
  while (nodes.length < nodeCount) {
    nodes.push({ id: nodes.length + 1, x: 0.1 + nodes.length * 0.15, y: 0.2 + nodes.length * 0.1 });
  }
  return { id: `gen-${nodeCount}-${Math.floor(seed * 10000)}`, nodes };
}

export function buildTrailSession(roundCount = 5, difficulty = 'easy') {
  const procedural = Array.from({ length: 4 }, (_, i) => generateTrailLayout(
    difficulty === 'easy' ? 4 : 5 + (i % 2),
    Math.random() + i
  ));
  const pool = fisherYatesShuffle([...HAND_LAYOUTS, ...procedural]);
  return pool.slice(0, roundCount).map((layout, index) => ({
    ...layout,
    id: `${layout.id}-r${index}`,
    nodes: difficulty === 'easy' ? layout.nodes.slice(0, 4) : layout.nodes.slice(0, Math.min(6, layout.nodes.length)),
  }));
}
