import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { API_BASE_URL } from '../config/backend';
import { getStoredSessionToken } from '../utils/session';
import { getGameById } from '../constants/gamesRegistry';

const LOCAL_SESSIONS_KEY = 'gameSessions:local';

async function saveLocalSession(sessionPayload) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_SESSIONS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const next = [sessionPayload, ...existing].slice(0, 50);
    await AsyncStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Failed to save local game session:', error?.message || error);
  }
}

async function submitRemoteSession(sessionPayload, retryOnce = true) {
  const sessionToken = await getStoredSessionToken();
  if (!sessionToken) {
    return false;
  }

  try {
    await axios.post(`${API_BASE_URL}/api/games/sessions`, sessionPayload, {
      headers: { Authorization: `Bearer ${sessionToken}` },
      timeout: 10000,
    });
    return true;
  } catch (error) {
    if (retryOnce) {
      return submitRemoteSession(sessionPayload, false);
    }
    console.warn('Failed to submit game session:', error?.message || error);
    return false;
  }
}

export function useGameSession(gameId, difficulty = 'easy') {
  const gameMeta = getGameById(gameId);
  const startedAtRef = useRef(null);
  const timersRef = useRef([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [metrics, setMetrics] = useState({});

  const registerTimer = useCallback((timerId) => {
    timersRef.current.push(timerId);
    return timerId;
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  const startSession = useCallback(() => {
    startedAtRef.current = new Date();
    setScore(0);
    setMoves(0);
    setMetrics({});
    setIsActive(true);
    setIsPaused(false);
  }, []);

  const pauseSession = useCallback(() => {
    clearAllTimers();
    setIsPaused(true);
  }, [clearAllTimers]);

  const resumeSession = useCallback(() => {
    setIsPaused(false);
  }, []);

  const updateMetrics = useCallback((partialMetrics) => {
    setMetrics((prev) => ({ ...prev, ...partialMetrics }));
  }, []);

  const completeSession = useCallback(async ({
    finalScore = score,
    finalMoves = moves,
    completed = true,
    extraMetrics = {},
  } = {}) => {
    const startedAt = startedAtRef.current || new Date();
    const completedAt = new Date();
    const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());

    const payload = {
      gameId,
      cognitiveDomains: gameMeta?.cognitiveDomains || [],
      difficulty,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
      score: finalScore,
      moves: finalMoves,
      completed,
      metrics: { ...metrics, ...extraMetrics },
    };

    setIsActive(false);
    await saveLocalSession(payload);
    await submitRemoteSession(payload);

    return payload;
  }, [difficulty, gameId, gameMeta, metrics, moves, score]);

  return {
    gameMeta,
    score,
    setScore,
    moves,
    setMoves,
    isActive,
    isPaused,
    metrics,
    setMetrics,
    updateMetrics,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    registerTimer,
    clearAllTimers,
  };
}

export default useGameSession;
