import { generateShapeOddSet, buildOddOneOutPool } from '../oddOneOutGenerator';

describe('oddOneOutGenerator', () => {
  test('generateShapeOddSet has exactly one odd option', () => {
    const set = generateShapeOddSet(0.42);
    const oddCount = set.options.filter((option) => option.isOdd).length;
    expect(oddCount).toBe(1);
    expect(set.options).toHaveLength(4);
  });

  test('buildOddOneOutPool exceeds static set count', () => {
    const staticSets = [{ id: 's1', prompt: 'test', options: [] }];
    const pool = buildOddOneOutPool(staticSets, 10);
    expect(pool.length).toBe(11);
  });
});
