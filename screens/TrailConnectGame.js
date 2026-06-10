import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import GameShell from '../components/games/GameShell';
import GameCompleteSheet from '../components/games/GameCompleteSheet';
import GameIntro from '../components/games/GameIntro';
import useGameSession from '../hooks/useGameSession';
import useGameExit from '../hooks/useGameExit';
import { GAME_PHASE, canAcceptInput } from '../games/engine/gameState';
import { buildTrailSession } from '../games/engine/trailConnectGenerator';
import { gameColors, gameLayout, gameType } from '../styles/gameTheme';
import { radii, shadow, spacing } from '../styles/theme';

const { width } = Dimensions.get('window');
const BOARD_SIZE = Math.min(width - 48, 360);
const BOARD_HEIGHT = BOARD_SIZE * 0.85;
const NODE_SIZE = gameLayout.minTapTarget;

const TrailConnectGame = () => {
  const navigation = useNavigation();
  const [difficulty, setDifficulty] = useState('easy');
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASE.INTRO);
  const [rounds, setRounds] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [nextExpected, setNextExpected] = useState(1);
  const [connected, setConnected] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [completeVisible, setCompleteVisible] = useState(false);
  const [score, setScore] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const sessionCompletedRef = useRef(false);

  const { startSession, completeSession, pauseSession, resumeSession, clearAllTimers } = useGameSession('trail_connect', difficulty);
  const currentRound = rounds[roundIndex];

  const returnToActivities = useGameExit(navigation, {
    setCompleteVisible,
    setGameStarted,
    setPhase,
  });

  const startGame = (mode = 'easy') => {
    sessionCompletedRef.current = false;
    const sessionRounds = buildTrailSession(5, mode);
    setDifficulty(mode);
    setRounds(sessionRounds);
    setRoundIndex(0);
    setNextExpected(1);
    setConnected([]);
    setScore(0);
    setTotalTaps(0);
    setFeedback('Tap number 1 to begin.');
    setCompleteVisible(false);
    setPhase(GAME_PHASE.PLAYING);
    setGameStarted(true);
    startSession();
  };

  const finishGame = async (finalScore) => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    setPhase(GAME_PHASE.COMPLETE);
    setCompleteVisible(true);
    await completeSession({
      finalScore,
      finalMoves: totalTaps,
      extraMetrics: { roundsCompleted: rounds.length, totalTaps },
    });
  };

  const getNodeCenter = (node) => ({
    x: node.x * (BOARD_SIZE - NODE_SIZE) + NODE_SIZE / 2,
    y: node.y * (BOARD_HEIGHT - NODE_SIZE) + NODE_SIZE / 2,
  });

  const renderConnectors = () => {
    if (connected.length < 2) return null;
    return connected.slice(1).map((nodeId, index) => {
      const prevNode = currentRound.nodes.find((n) => n.id === connected[index]);
      const currNode = currentRound.nodes.find((n) => n.id === nodeId);
      if (!prevNode || !currNode) return null;
      const from = getNodeCenter(prevNode);
      const to = getNodeCenter(currNode);
      const length = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
      const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
      return (
        <View
          key={`line-${index}`}
          style={{
            position: 'absolute',
            left: from.x,
            top: from.y,
            width: length,
            height: 2,
            backgroundColor: gameColors.border,
            transform: [{ rotate: `${angle}deg` }],
            transformOrigin: 'left center',
          }}
        />
      );
    });
  };

  const handleNodePress = (nodeId) => {
    if (!canAcceptInput(phase)) return;
    setTotalTaps((prev) => prev + 1);

    if (nodeId !== nextExpected) {
      setFeedback('Tap the next number in order.');
      return;
    }
    const nextConnected = [...connected, nodeId];
    setConnected(nextConnected);
    const next = nextExpected + 1;
    setNextExpected(next);
    setFeedback(`Connected ${nodeId}.`);

    if (next > currentRound.nodes.length) {
      const nextScore = score + 1;
      setScore(nextScore);
      if (roundIndex + 1 >= rounds.length) {
        finishGame(nextScore);
        return;
      }
      setPhase(GAME_PHASE.LOCKED);
      setTimeout(() => {
        setRoundIndex((prev) => prev + 1);
        setNextExpected(1);
        setConnected([]);
        setFeedback('Next trail. Tap number 1.');
        setPhase(GAME_PHASE.PLAYING);
      }, 500);
    }
  };

  return (
    <GameShell
      title="Trail Connect"
      isActive={gameStarted && phase !== GAME_PHASE.COMPLETE}
      onPause={pauseSession}
      onResume={resumeSession}
      onExit={clearAllTimers}
      stats={gameStarted ? [
        { label: 'Round', value: `${roundIndex + 1}/${rounds.length}` },
        { label: 'Next', value: nextExpected },
      ] : []}
    >
      <View style={styles.container}>
        {!gameStarted ? (
          <GameIntro
            title="Trail Connect"
            description="Tap numbers in order from first to last."
            estimatedMinutes={4}
            onStartGentle={() => startGame('easy')}
            onStartStandard={() => startGame('standard')}
            gentleLabel="Gentle (4 nodes each)"
            standardLabel="Standard (4–6 nodes)"
          />
        ) : (
          <View style={styles.boardCard}>
            <Text style={styles.feedback}>{feedback}</Text>
            <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_HEIGHT }]}>
              {renderConnectors()}
              {currentRound?.nodes.map((node) => {
                const isConnected = connected.includes(node.id);
                const isNext = node.id === nextExpected;
                return (
                  <TouchableOpacity
                    key={node.id}
                    style={[
                      styles.node,
                      {
                        left: node.x * (BOARD_SIZE - NODE_SIZE),
                        top: node.y * (BOARD_HEIGHT - NODE_SIZE),
                        width: NODE_SIZE,
                        height: NODE_SIZE,
                        borderRadius: NODE_SIZE / 2,
                        backgroundColor: isConnected ? gameColors.accentSoft : gameColors.surface,
                        borderColor: isNext ? gameColors.accentStrong : gameColors.border,
                        borderWidth: isNext ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleNodePress(node.id)}
                    disabled={!canAcceptInput(phase)}
                    accessibilityRole="button"
                    accessibilityLabel={`Node ${node.id}`}
                  >
                    <Text style={styles.nodeText}>{node.id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <GameCompleteSheet
        visible={completeVisible}
        message={`You completed ${score} of ${rounds.length} trails.`}
        onHide={() => setCompleteVisible(false)}
        onPrimaryPress={() => startGame(difficulty)}
        onSecondaryPress={returnToActivities}
      />
    </GameShell>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  boardCard: {
    flex: 1,
    backgroundColor: gameColors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: gameColors.border,
    alignItems: 'center',
    ...shadow({ offsetHeight: 2, opacity: 0.06, radius: 8, elevation: 2 }),
  },
  feedback: { ...gameType.instruction, textAlign: 'center', marginBottom: spacing.lg },
  board: {
    position: 'relative',
    backgroundColor: gameColors.surfaceMuted,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: gameColors.border,
  },
  node: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: { fontSize: 18, fontWeight: '700', color: gameColors.textPrimary },
});

export default TrailConnectGame;
