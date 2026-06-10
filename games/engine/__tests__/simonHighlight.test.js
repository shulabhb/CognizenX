const PAD_OPTIONS = [
  { id: 1, shape: 'circle' },
  { id: 2, shape: 'square' },
  { id: 3, shape: 'diamond' },
  { id: 4, shape: 'triangle' },
];

function getHighlightPadId(pattern, stepIndex) {
  return pattern[stepIndex]?.id ?? null;
}

function isPadActive(highlightPadId, optionId) {
  return highlightPadId === optionId;
}

describe('Simon highlight mapping', () => {
  test('highlights pad by sequence id not grid index', () => {
    const pattern = [PAD_OPTIONS[2], PAD_OPTIONS[0], PAD_OPTIONS[1]];
    expect(getHighlightPadId(pattern, 0)).toBe(3);
    expect(isPadActive(getHighlightPadId(pattern, 0), 1)).toBe(false);
    expect(isPadActive(getHighlightPadId(pattern, 0), 3)).toBe(true);
  });
});
