import {
  fisherYatesShuffle,
  pickWithoutRecentSync,
  shuffleSteps,
} from '../contentPool';

describe('contentPool', () => {
  test('fisherYatesShuffle preserves elements', () => {
    const input = [1, 2, 3, 4, 5];
    const output = fisherYatesShuffle(input);
    expect(output.sort()).toEqual(input.sort());
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  test('pickWithoutRecentSync prefers unseen items', () => {
    const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const { picked, recentIds } = pickWithoutRecentSync(pool, 2, ['a'], (item) => item.id);
    expect(picked.map((item) => item.id)).not.toContain('a');
    expect(recentIds.length).toBeGreaterThan(0);
  });

  test('shuffleSteps avoids correct order when possible', () => {
    const steps = [
      { id: '1', order: 1 },
      { id: '2', order: 2 },
      { id: '3', order: 3 },
      { id: '4', order: 4 },
    ];
    const shuffled = shuffleSteps(steps);
    const inOrder = shuffled.every((step, index) => step.order === index + 1);
    expect(inOrder).toBe(false);
  });
});
