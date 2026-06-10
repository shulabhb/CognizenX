import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { GAME_PHASE } from '../games/engine/gameState';

export function useGameExit(navigation, { setCompleteVisible, setGameStarted, setPhase }) {
  const returnToActivities = useCallback(() => {
    setCompleteVisible(false);
    setGameStarted(false);
    if (setPhase) setPhase(GAME_PHASE.INTRO);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Games');
    }
  }, [navigation, setCompleteVisible, setGameStarted, setPhase]);

  useFocusEffect(
    useCallback(() => () => {
      setCompleteVisible(false);
    }, [setCompleteVisible])
  );

  return returnToActivities;
}

export default useGameExit;
