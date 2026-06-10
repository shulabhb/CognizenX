import React from 'react';
import { View, StyleSheet } from 'react-native';

import { radii } from '../../../styles/theme';
import { shapeSizes, shapeStroke, shapeTones } from '../../../styles/gameTheme';

const ShapeSymbol = ({
  id = 'circle',
  tone = 'muted',
  size = shapeSizes.cell,
  variant = 'normal',
  accessibilityLabel,
}) => {
  const color = shapeTones[tone] || shapeTones.muted;
  const scale = variant === 'large' ? 1.4 : 1;
  const inner = Math.max(12, size * 0.65 * scale);
  const lineThickness = Math.max(3, Math.round(size * 0.1));
  const bordered = { borderWidth: 1, borderColor: shapeStroke };

  if (id === 'square') {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel || 'Square shape'}
        style={[styles.square, bordered, { width: inner, height: inner, backgroundColor: color, borderRadius: radii.sm }]}
      />
    );
  }

  if (id === 'diamond') {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel || 'Diamond shape'}
        style={[styles.diamondWrap, { width: inner, height: inner }]}
      >
        <View style={[styles.diamond, bordered, { width: inner * 0.72, height: inner * 0.72, backgroundColor: color }]} />
      </View>
    );
  }

  if (id === 'triangle') {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel || 'Triangle shape'}
        style={styles.triangleWrap}
      >
        <View style={[styles.triangle, { borderBottomColor: color, borderLeftWidth: inner * 0.55, borderRightWidth: inner * 0.55, borderBottomWidth: inner }]} />
      </View>
    );
  }

  if (id === 'cross' || id === 'plus') {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel || (id === 'plus' ? 'Plus shape' : 'Cross shape')}
        style={{ width: inner, height: inner, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={[styles.crossH, { width: inner, height: lineThickness, backgroundColor: color }]} />
        <View style={[styles.crossV, { width: lineThickness, height: inner, backgroundColor: color }]} />
      </View>
    );
  }

  if (id === 'line-h') {
    return <View style={{ width: inner, height: lineThickness, backgroundColor: color }} accessibilityLabel={accessibilityLabel || 'Horizontal line'} />;
  }

  if (id === 'line-v') {
    return <View style={{ width: lineThickness, height: inner, backgroundColor: color }} accessibilityLabel={accessibilityLabel || 'Vertical line'} />;
  }

  if (id === 'ring') {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel || 'Ring shape'}
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          borderWidth: lineThickness,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
    );
  }

  if (id === 'arc') {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel || 'Arc shape'}
        style={{
          width: inner,
          height: inner / 2,
          borderTopLeftRadius: inner,
          borderTopRightRadius: inner,
          borderWidth: lineThickness,
          borderBottomWidth: 0,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
    );
  }

  if (id === 'dot') {
    const dotSize = Math.max(10, inner * 0.35);
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel || 'Dot'}
        style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel || 'Circle shape'}
      style={[bordered, { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: color }]}
    />
  );
};

const styles = StyleSheet.create({
  square: {},
  diamondWrap: { alignItems: 'center', justifyContent: 'center' },
  diamond: { transform: [{ rotate: '45deg' }] },
  triangleWrap: { alignItems: 'center', justifyContent: 'center' },
  triangle: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    backgroundColor: 'transparent',
  },
  crossH: { position: 'absolute' },
  crossV: { position: 'absolute' },
});

export default ShapeSymbol;
