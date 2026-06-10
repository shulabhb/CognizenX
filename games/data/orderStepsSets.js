import { shuffleSteps as shuffleStepsPool } from '../engine/contentPool';

export const ORDER_STEPS_SETS = [
  {
    id: 'tea',
    steps: [
      { id: 'wash', label: 'Wash hands', order: 1 },
      { id: 'prepare', label: 'Prepare tea', order: 2 },
      { id: 'sit', label: 'Sit down', order: 3 },
      { id: 'drink', label: 'Drink tea', order: 4 },
    ],
  },
  {
    id: 'morning',
    steps: [
      { id: 'wake', label: 'Wake up', order: 1 },
      { id: 'wash-face', label: 'Wash face', order: 2 },
      { id: 'dress', label: 'Get dressed', order: 3 },
      { id: 'breakfast', label: 'Eat breakfast', order: 4 },
    ],
  },
  {
    id: 'bedtime',
    steps: [
      { id: 'brush', label: 'Brush teeth', order: 1 },
      { id: 'pajamas', label: 'Put on pajamas', order: 2 },
      { id: 'lights', label: 'Turn off lights', order: 3 },
      { id: 'sleep', label: 'Go to sleep', order: 4 },
    ],
  },
  {
    id: 'cooking',
    steps: [
      { id: 'wash-hands', label: 'Wash hands', order: 1 },
      { id: 'gather', label: 'Gather ingredients', order: 2 },
      { id: 'cook', label: 'Cook the meal', order: 3 },
      { id: 'serve', label: 'Serve the food', order: 4 },
    ],
  },
  {
    id: 'gardening',
    steps: [
      { id: 'tools', label: 'Get tools', order: 1 },
      { id: 'water', label: 'Water plants', order: 2 },
      { id: 'weed', label: 'Remove weeds', order: 3 },
      { id: 'store', label: 'Put tools away', order: 4 },
    ],
  },
  {
    id: 'phone-call',
    steps: [
      { id: 'find-phone', label: 'Find the phone', order: 1 },
      { id: 'dial', label: 'Dial the number', order: 2 },
      { id: 'greet', label: 'Say hello', order: 3 },
      { id: 'hang-up', label: 'End the call', order: 4 },
    ],
  },
  {
    id: 'laundry',
    steps: [
      { id: 'sort', label: 'Sort clothes', order: 1 },
      { id: 'load', label: 'Load the washer', order: 2 },
      { id: 'dry', label: 'Move to dryer', order: 3 },
      { id: 'fold', label: 'Fold clothes', order: 4 },
    ],
  },
  {
    id: 'shopping',
    steps: [
      { id: 'list', label: 'Make a list', order: 1 },
      { id: 'drive', label: 'Go to the store', order: 2 },
      { id: 'buy', label: 'Buy items', order: 3 },
      { id: 'put-away', label: 'Put groceries away', order: 4 },
    ],
  },
  {
    id: 'exercise',
    steps: [
      { id: 'warm-up', label: 'Warm up', order: 1 },
      { id: 'stretch', label: 'Stretch gently', order: 2 },
      { id: 'walk', label: 'Walk slowly', order: 3 },
      { id: 'cool-down', label: 'Cool down', order: 4 },
    ],
  },
  {
    id: 'letter',
    steps: [
      { id: 'paper', label: 'Get paper', order: 1 },
      { id: 'write', label: 'Write the letter', order: 2 },
      { id: 'envelope', label: 'Put in envelope', order: 3 },
      { id: 'mail', label: 'Mail the letter', order: 4 },
    ],
  },
  {
    id: 'baking',
    steps: [
      { id: 'preheat', label: 'Preheat oven', order: 1 },
      { id: 'mix', label: 'Mix ingredients', order: 2 },
      { id: 'bake', label: 'Bake', order: 3 },
      { id: 'cool', label: 'Let it cool', order: 4 },
    ],
  },
];

export function shuffleSteps(steps) {
  return shuffleStepsPool(steps);
}
