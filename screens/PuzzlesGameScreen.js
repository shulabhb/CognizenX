import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../styles/theme';

const PuzzlesGameScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.replace('Games');
  }, [navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundTint }}>
      <ActivityIndicator size="large" color={colors.brandDark} />
    </View>
  );
};

export default PuzzlesGameScreen;
