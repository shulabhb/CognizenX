export const GAME_CATEGORIES = {
  memory: {
    id: 'memory',
    label: 'Memory and Focus',
    filterLabel: 'Memory',
  },
  language: {
    id: 'language',
    label: 'Language',
    filterLabel: 'Language',
  },
  planning: {
    id: 'planning',
    label: 'Planning and Logic',
    filterLabel: 'Logic',
  },
  calm: {
    id: 'calm',
    label: 'Calm Movement',
    filterLabel: 'Calm',
  },
};

export const GAME_FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'memory', label: 'Memory' },
  { id: 'language', label: 'Language' },
  { id: 'planning', label: 'Logic' },
  { id: 'calm', label: 'Calm' },
];

export const GAMES_REGISTRY = [
  {
    id: 'memory_match',
    route: 'MemoryMatchGame',
    title: 'Pair Match',
    category: 'memory',
    clinicalDomain: 'memory',
    cognitiveDomains: ['memory', 'attention'],
    difficultyDefault: 'easy',
    iconName: 'grid-outline',
    description: 'Find matching pairs at a calm, steady pace.',
    tag: 'Memory',
    estimatedMinutes: 5,
  },
  {
    id: 'simon_sequence',
    route: 'PatternGame',
    title: 'Sequence Recall',
    category: 'memory',
    clinicalDomain: 'attention',
    cognitiveDomains: ['attention', 'memory'],
    difficultyDefault: 'easy',
    iconName: 'pulse-outline',
    description: 'Watch each step light up, then repeat the sequence.',
    tag: 'Focus',
    estimatedMinutes: 5,
  },
  {
    id: 'odd_one_out',
    route: 'OddOneOutGame',
    title: 'Pattern Discrimination',
    category: 'memory',
    clinicalDomain: 'attention',
    cognitiveDomains: ['attention', 'executive'],
    difficultyDefault: 'easy',
    iconName: 'scan-outline',
    description: 'Select the shape that differs from the others.',
    tag: 'Reasoning',
    estimatedMinutes: 4,
  },
  {
    id: 'steady_focus',
    route: 'SteadyFocusGame',
    title: 'Steady Focus',
    category: 'memory',
    clinicalDomain: 'attention',
    cognitiveDomains: ['attention'],
    difficultyDefault: 'easy',
    iconName: 'eye-outline',
    description: 'Tap each target shape in the grid.',
    tag: 'Attention',
    estimatedMinutes: 4,
  },
  {
    id: 'word_unscramble',
    route: 'WordUnscrambleGame',
    title: 'Word Builder',
    category: 'language',
    clinicalDomain: 'language',
    cognitiveDomains: ['language'],
    difficultyDefault: 'easy',
    iconName: 'text-outline',
    description: 'Tap letter tiles to build familiar words.',
    tag: 'Language',
    estimatedMinutes: 5,
  },
  {
    id: 'sort_categories',
    route: 'SortCategoriesGame',
    title: 'Category Sort',
    category: 'planning',
    clinicalDomain: 'executive',
    cognitiveDomains: ['executive', 'attention'],
    difficultyDefault: 'easy',
    iconName: 'layers-outline',
    description: 'Sort items into the right groups, one at a time.',
    tag: 'Sorting',
    estimatedMinutes: 5,
  },
  {
    id: 'trail_connect',
    route: 'TrailConnectGame',
    title: 'Trail Connect',
    category: 'planning',
    clinicalDomain: 'executive',
    cognitiveDomains: ['executive', 'attention'],
    difficultyDefault: 'easy',
    iconName: 'navigate-outline',
    description: 'Tap numbers in order from first to last.',
    tag: 'Sequencing',
    estimatedMinutes: 4,
  },
  {
    id: 'order_steps',
    route: 'OrderStepsGame',
    title: 'Order Steps',
    category: 'planning',
    clinicalDomain: 'executive',
    cognitiveDomains: ['executive', 'memory'],
    difficultyDefault: 'easy',
    iconName: 'list-outline',
    description: 'Put everyday steps in a sensible order.',
    tag: 'Planning',
    estimatedMinutes: 5,
  },
  {
    id: 'snake_calm',
    route: 'SnakeGame',
    title: 'Snake game',
    category: 'calm',
    clinicalDomain: 'motor',
    cognitiveDomains: ['motor', 'attention'],
    difficultyDefault: 'easy',
    iconName: 'git-commit-outline',
    description: 'Swipe to guide the snake at a steady, calm pace.',
    tag: 'Movement',
    estimatedMinutes: 6,
  },
  {
    id: 'snake_touch_calm',
    route: 'SnakeTouch',
    title: 'Touch snake game',
    category: 'calm',
    clinicalDomain: 'motor',
    cognitiveDomains: ['motor', 'attention'],
    difficultyDefault: 'easy',
    iconName: 'hand-left-outline',
    description: 'Touch and drag to guide the snake at a relaxed speed.',
    tag: 'Touch',
    estimatedMinutes: 6,
  },
];

export function getGameById(gameId) {
  return GAMES_REGISTRY.find((game) => game.id === gameId) || null;
}

export function getGamesByCategory(categoryId) {
  if (!categoryId || categoryId === 'all') {
    return GAMES_REGISTRY;
  }
  return GAMES_REGISTRY.filter((game) => game.category === categoryId);
}

export function getGamesGroupedByCategory() {
  return Object.values(GAME_CATEGORIES).map((category) => ({
    ...category,
    games: GAMES_REGISTRY.filter((game) => game.category === category.id),
  })).filter((section) => section.games.length > 0);
}
