import { fisherYatesShuffle, pickWithoutRecent } from '../engine/contentPool';

const POOL_KEY = 'gamePool:word_unscramble';

export const EASY_WORDS = [
  'HOME', 'TREE', 'BOOK', 'LOVE', 'HAND', 'FISH', 'BIRD', 'MOON', 'STAR', 'RAIN',
  'FIRE', 'LAKE', 'DOOR', 'MILK', 'CAKE', 'SONG', 'KING', 'LION', 'BEAR', 'FARM',
  'ROAD', 'SHIP', 'COAT', 'SHOE', 'FOOD', 'WARM', 'COLD', 'GOOD', 'KIND', 'HOPE',
  'LIFE', 'WORK', 'PLAY', 'REST', 'WALK', 'TALK', 'READ', 'HELP', 'GIVE', 'CARE',
  'CHAIR', 'TABLE', 'PHONE', 'WATER', 'BREAD', 'APPLE', 'GRAPE', 'PEACH', 'LEMON',
  'HAPPY', 'SMILE', 'HEART', 'PEACE', 'LIGHT', 'CLOUD', 'GRASS', 'STONE', 'SAND',
  'BEACH', 'RIVER', 'FIELD', 'HOUSE', 'ROOM', 'DESK', 'LAMP', 'BELL', 'CLOCK',
  'WATCH', 'PAPER', 'PEN', 'MAP', 'KEY', 'BAG', 'HAT', 'CAP', 'SOCK', 'BELT',
  'DRESS', 'SKIRT', 'SHIRT', 'PANTS', 'COAT', 'BOOT', 'GLOVE', 'SCARF', 'RING',
  'NECK', 'FACE', 'NOSE', 'EARS', 'EYES', 'HAIR', 'ARM', 'LEG', 'FOOT', 'TOES',
  'MOUTH', 'TEETH', 'CHEST', 'BACK', 'KNEE', 'PALM', 'FINGER', 'THUMB', 'NAIL',
  'SPOON', 'FORK', 'KNIFE', 'PLATE', 'BOWL', 'CUP', 'MUG', 'POT', 'PAN', 'OVEN',
  'STOVE', 'SINK', 'SOAP', 'TOWEL', 'BATH', 'BED', 'PILLOW', 'SHEET', 'BLANKET',
  'WINDOW', 'FLOOR', 'WALL', 'ROOF', 'YARD', 'GATE', 'PATH', 'STEP', 'PORCH',
  'PLANT', 'SEED', 'LEAF', 'ROOT', 'STEM', 'BLOOM', 'PETAL', 'BUSH', 'VINE',
  'HORSE', 'SHEEP', 'GOAT', 'DUCK', 'HEN', 'OWL', 'DEER', 'FROG', 'CRAB',
  'SNAIL', 'WORM', 'BEE', 'ANT', 'MOTH', 'DOVE', 'SWAN', 'HAWK', 'SEAL',
];

export const STANDARD_WORDS = [
  'FRIEND', 'FAMILY', 'GARDEN', 'FLOWER', 'MOTHER', 'FATHER', 'SPRING', 'WINTER',
  'SUMMER', 'AUTUMN', 'SISTER', 'BROTHER', 'COUSIN', 'NEPHEW', 'NIECE', 'PARENT',
  'COUPLE', 'NEIGHBOR', 'PERSON', 'WOMAN', 'HUSBAND', 'WIFE', 'CHILD', 'BABY',
  'KITCHEN', 'BEDROOM', 'BATHROOM', 'LIVING', 'DINING', 'GARAGE', 'ATTIC', 'BASEMENT',
  'CABINET', 'COUNTER', 'FRIDGE', 'FREEZER', 'TOASTER', 'BLENDER', 'KETTLE', 'FILTER',
  'BLANKET', 'CURTAIN', 'CARPET', 'MIRROR', 'CLOSET', 'DRAWER', 'SHELF', 'CUSHION',
  'MORNING', 'EVENING', 'TONIGHT', 'TODAY', 'TOMORROW', 'YESTERDAY', 'WEEKEND', 'HOLIDAY',
  'BIRTHDAY', 'WEDDING', 'MEETING', 'VISITOR', 'JOURNEY', 'TRAVEL', 'VACATION', 'PICNIC',
  'HOSPITAL', 'DOCTOR', 'NURSE', 'PATIENT', 'MEDICINE', 'TABLET', 'BANDAGE', 'THERAPY',
  'LIBRARY', 'STATION', 'AIRPORT', 'HIGHWAY', 'BRIDGE', 'TUNNEL', 'VILLAGE', 'COUNTRY',
  'MOUNTAIN', 'VALLEY', 'FOREST', 'MEADOW', 'ISLAND', 'OCEAN', 'STREAM', 'WATERFALL',
  'SUNSHINE', 'RAINBOW', 'THUNDER', 'LIGHTNING', 'BREEZE', 'WEATHER', 'CLIMATE', 'SEASON',
  'PAINTING', 'DRAWING', 'MUSIC', 'DANCING', 'SINGING', 'READING', 'WRITING', 'LEARNING',
  'TEACHING', 'LISTENING', 'TALKING', 'WALKING', 'RUNNING', 'COOKING', 'BAKING', 'GARDENING',
  'SHOPPING', 'WORKING', 'RESTING', 'SLEEPING', 'WAKING', 'DRESSING', 'WASHING', 'CLEANING',
  'COMFORT', 'GENTLE', 'KINDNESS', 'PATIENCE', 'COURAGE', 'HONESTY', 'RESPECT', 'FRIENDSHIP',
  'HAPPINESS', 'GRATITUDE', 'MEMORIES', 'STORIES', 'PICTURE', 'PHOTO', 'CAMERA', 'LETTER',
];

export const WORDS_PER_SESSION_EASY = 6;
export const WORDS_PER_SESSION_STANDARD = 8;

export function shuffleLetters(word) {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.join('') === word && word.length > 1) {
    return shuffleLetters(word);
  }
  return letters;
}

export async function pickSessionWords(difficulty = 'easy') {
  const pool = difficulty === 'standard'
    ? [...EASY_WORDS, ...STANDARD_WORDS]
    : EASY_WORDS.filter((w) => w.length <= 5);
  const count = difficulty === 'standard' ? WORDS_PER_SESSION_STANDARD : WORDS_PER_SESSION_EASY;
  return pickWithoutRecent(POOL_KEY, pool, count, 40, (w) => w);
}

// Legacy export
export const WORD_LIST = [...EASY_WORDS, ...STANDARD_WORDS];
export const WORDS_PER_SESSION = WORDS_PER_SESSION_EASY;

export function pickSessionWordsSync(count = WORDS_PER_SESSION_EASY) {
  return fisherYatesShuffle(EASY_WORDS).slice(0, count);
}
