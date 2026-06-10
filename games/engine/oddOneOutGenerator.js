import { fisherYatesShuffle } from './contentPool';

const SHAPES = ['circle', 'square', 'diamond', 'triangle', 'cross'];

function makeOptions(items) {
  return fisherYatesShuffle(items.map((item, index) => ({
    id: String.fromCharCode(97 + index),
    ...item,
  })));
}

export function generateShapeOddSet(seed = Math.random()) {
  const commonIdx = Math.floor(seed * SHAPES.length) % SHAPES.length;
  const oddIdx = (commonIdx + 1 + Math.floor(seed * 100) % (SHAPES.length - 1)) % SHAPES.length;
  const commonShape = SHAPES[commonIdx];
  const oddShape = SHAPES[oddIdx];
  const oddPosition = Math.floor(seed * 1000) % 4;

  const items = Array.from({ length: 4 }, (_, i) => ({
    shape: i === oddPosition ? oddShape : commonShape,
    tone: 'muted',
    size: 36,
    isOdd: i === oddPosition,
  }));

  return {
    id: `gen-shape-${commonShape}-${oddShape}-${oddPosition}`,
    prompt: 'Select the different shape',
    options: makeOptions(items),
  };
}

export function generateSizeOddSet(seed = Math.random()) {
  const shape = SHAPES[Math.floor(seed * SHAPES.length) % SHAPES.length];
  const oddPosition = Math.floor(seed * 1000) % 4;
  const small = 28;
  const large = 44;

  const items = Array.from({ length: 4 }, (_, i) => ({
    shape,
    tone: 'muted',
    size: i === oddPosition ? large : small,
    isOdd: i === oddPosition,
  }));

  return {
    id: `gen-size-${shape}-${oddPosition}`,
    prompt: 'Select the different size',
    options: makeOptions(items),
  };
}

export function generateToneOddSet(seed = Math.random()) {
  const shape = SHAPES[Math.floor(seed * SHAPES.length) % SHAPES.length];
  const oddPosition = Math.floor(seed * 1000) % 4;

  const items = Array.from({ length: 4 }, (_, i) => ({
    shape,
    tone: i === oddPosition ? 'accentSoft' : 'muted',
    size: 36,
    variant: i === oddPosition ? 'large' : 'normal',
    isOdd: i === oddPosition,
  }));

  return {
    id: `gen-tone-${shape}-${oddPosition}`,
    prompt: 'Select the different tone',
    options: makeOptions(items),
  };
}

export function buildOddOneOutPool(staticSets, proceduralCount = 20) {
  const generated = [];
  for (let i = 0; i < proceduralCount; i += 1) {
    const seed = Math.random();
    const type = i % 3;
    if (type === 0) generated.push(generateShapeOddSet(seed));
    else if (type === 1) generated.push(generateSizeOddSet(seed));
    else generated.push(generateToneOddSet(seed));
  }
  return [...staticSets, ...generated];
}
