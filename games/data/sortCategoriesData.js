import { fisherYatesShuffle } from '../engine/contentPool';

export const SORT_ROUNDS = [
  {
    id: 'fruit_animal',
    bins: [{ id: 'fruit', label: 'Fruit' }, { id: 'animal', label: 'Animal' }],
    items: [
      { id: 'apple', label: 'Apple', binId: 'fruit' },
      { id: 'dog', label: 'Dog', binId: 'animal' },
      { id: 'banana', label: 'Banana', binId: 'fruit' },
      { id: 'cat', label: 'Cat', binId: 'animal' },
    ],
  },
  {
    id: 'time_meal',
    bins: [{ id: 'time', label: 'Time of day' }, { id: 'meal', label: 'Meal' }],
    items: [
      { id: 'morning', label: 'Morning', binId: 'time' },
      { id: 'lunch', label: 'Lunch', binId: 'meal' },
      { id: 'night', label: 'Night', binId: 'time' },
      { id: 'dinner', label: 'Dinner', binId: 'meal' },
    ],
  },
  {
    id: 'clothing_nature',
    bins: [{ id: 'clothing', label: 'Clothing' }, { id: 'nature', label: 'Nature' }],
    items: [
      { id: 'shirt', label: 'Shirt', binId: 'clothing' },
      { id: 'tree', label: 'Tree', binId: 'nature' },
      { id: 'hat', label: 'Hat', binId: 'clothing' },
      { id: 'flower', label: 'Flower', binId: 'nature' },
    ],
  },
  {
    id: 'room_outdoor',
    bins: [{ id: 'room', label: 'Room item' }, { id: 'outdoor', label: 'Outdoor' }],
    items: [
      { id: 'lamp', label: 'Lamp', binId: 'room' },
      { id: 'bench', label: 'Bench', binId: 'outdoor' },
      { id: 'clock', label: 'Clock', binId: 'room' },
      { id: 'fence', label: 'Fence', binId: 'outdoor' },
    ],
  },
  {
    id: 'weather_season',
    bins: [{ id: 'weather', label: 'Weather' }, { id: 'season', label: 'Season' }],
    items: [
      { id: 'rain', label: 'Rain', binId: 'weather' },
      { id: 'spring', label: 'Spring', binId: 'season' },
      { id: 'snow', label: 'Snow', binId: 'weather' },
      { id: 'winter', label: 'Winter', binId: 'season' },
    ],
  },
  {
    id: 'tool_food',
    bins: [{ id: 'tool', label: 'Tool' }, { id: 'food', label: 'Food' }],
    items: [
      { id: 'hammer', label: 'Hammer', binId: 'tool' },
      { id: 'bread', label: 'Bread', binId: 'food' },
      { id: 'brush', label: 'Brush', binId: 'tool' },
      { id: 'cheese', label: 'Cheese', binId: 'food' },
    ],
  },
  {
    id: 'transport_place',
    bins: [{ id: 'transport', label: 'Transport' }, { id: 'place', label: 'Place' }],
    items: [
      { id: 'bus', label: 'Bus', binId: 'transport' },
      { id: 'park', label: 'Park', binId: 'place' },
      { id: 'train', label: 'Train', binId: 'transport' },
      { id: 'school', label: 'School', binId: 'place' },
    ],
  },
  {
    id: 'body_action',
    bins: [{ id: 'body', label: 'Body' }, { id: 'action', label: 'Action' }],
    items: [
      { id: 'hand', label: 'Hand', binId: 'body' },
      { id: 'walk', label: 'Walk', binId: 'action' },
      { id: 'foot', label: 'Foot', binId: 'body' },
      { id: 'read', label: 'Read', binId: 'action' },
    ],
  },
  {
    id: 'kitchen_bedroom',
    bins: [{ id: 'kitchen', label: 'Kitchen' }, { id: 'bedroom', label: 'Bedroom' }],
    items: [
      { id: 'spoon', label: 'Spoon', binId: 'kitchen' },
      { id: 'pillow', label: 'Pillow', binId: 'bedroom' },
      { id: 'plate', label: 'Plate', binId: 'kitchen' },
      { id: 'blanket', label: 'Blanket', binId: 'bedroom' },
    ],
  },
  {
    id: 'music_art',
    bins: [{ id: 'music', label: 'Music' }, { id: 'art', label: 'Art' }],
    items: [
      { id: 'piano', label: 'Piano', binId: 'music' },
      { id: 'paint', label: 'Paint', binId: 'art' },
      { id: 'drum', label: 'Drum', binId: 'music' },
      { id: 'brush-art', label: 'Paintbrush', binId: 'art' },
    ],
  },
  {
    id: 'hot_cold',
    bins: [{ id: 'hot', label: 'Hot' }, { id: 'cold', label: 'Cold' }],
    items: [
      { id: 'soup', label: 'Soup', binId: 'hot' },
      { id: 'ice', label: 'Ice', binId: 'cold' },
      { id: 'tea', label: 'Tea', binId: 'hot' },
      { id: 'snow-item', label: 'Snow', binId: 'cold' },
    ],
  },
  {
    id: 'liquid_solid',
    bins: [{ id: 'liquid', label: 'Liquid' }, { id: 'solid', label: 'Solid' }],
    items: [
      { id: 'water', label: 'Water', binId: 'liquid' },
      { id: 'rock', label: 'Rock', binId: 'solid' },
      { id: 'milk', label: 'Milk', binId: 'liquid' },
      { id: 'wood', label: 'Wood', binId: 'solid' },
    ],
  },
];

export function shuffleItems(items) {
  return fisherYatesShuffle(items);
}
