import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const gameMotion = {
  tilePressMs: 120,
  flipRevealMs: 220,
  sequenceOnMs: 650,
  sequenceOffMs: 150,
  sheetEnterMs: 280,
  pressScale: 0.97,
};

export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(!!enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(!!enabled)
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
}

export function motionScale(reduceMotion, scale = gameMotion.pressScale) {
  return reduceMotion ? 1 : scale;
}
