import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import GameShell from '../components/games/GameShell';
import GameCompleteSheet from '../components/games/GameCompleteSheet';
import GameIntro from '../components/games/GameIntro';
import LetterChip, { LetterSlot } from '../components/games/LetterChip';
import useGameSession from '../hooks/useGameSession';
import useGameExit from '../hooks/useGameExit';
import { GAME_PHASE, canAcceptInput } from '../games/engine/gameState';
import {
  pickSessionWords,
  shuffleLetters,
  WORDS_PER_SESSION_EASY,
  WORDS_PER_SESSION_STANDARD,
} from '../games/data/wordList';
import { gameColors, gameType } from '../styles/gameTheme';
import { radii, shadow, spacing } from '../styles/theme';

const WordUnscrambleGame = () => {
  const navigation = useNavigation();
  const [difficulty, setDifficulty] = useState('easy');
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASE.INTRO);
  const [sessionWords, setSessionWords] = useState([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [availableLetters, setAvailableLetters] = useState([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [completeVisible, setCompleteVisible] = useState(false);
  const [completeScore, setCompleteScore] = useState(0);
  const sessionCompletedRef = useRef(false);

  const { startSession, completeSession, pauseSession, resumeSession, clearAllTimers } = useGameSession('word_unscramble', difficulty);
  const currentWord = sessionWords[wordIndex] || '';
  const wordsPerSession = difficulty === 'standard' ? WORDS_PER_SESSION_STANDARD : WORDS_PER_SESSION_EASY;
  const hintThreshold = difficulty === 'standard' ? 3 : 2;

  const returnToActivities = useGameExit(navigation, {
    setCompleteVisible,
    setGameStarted,
    setPhase,
  });

  const resetWordState = (word) => {
    setSelectedLetters([]);
    setAvailableLetters(shuffleLetters(word));
    setHintUsed(false);
    setWrongAttempts(0);
    setFeedback('');
  };

  const startGame = async (mode = 'easy') => {
    sessionCompletedRef.current = false;
    const words = await pickSessionWords(mode);
    setDifficulty(mode);
    setSessionWords(words);
    setWordIndex(0);
    setScore(0);
    setHintsUsed(0);
    setCompleteVisible(false);
    setPhase(GAME_PHASE.PLAYING);
    setGameStarted(true);
    startSession();
    resetWordState(words[0]);
  };

  const finishGame = async (finalScore) => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    setPhase(GAME_PHASE.COMPLETE);
    setCompleteScore(finalScore);
    setCompleteVisible(true);
    await completeSession({
      finalScore,
      finalMoves: sessionWords.length,
      extraMetrics: { wordsCompleted: finalScore, hintsUsed, wrongAttempts },
    });
  };

  const advanceWord = (nextScore) => {
    setPhase(GAME_PHASE.LOCKED);
    setTimeout(() => {
      if (wordIndex + 1 >= sessionWords.length) {
        finishGame(nextScore);
        return;
      }
      const nextIndex = wordIndex + 1;
      setWordIndex(nextIndex);
      resetWordState(sessionWords[nextIndex]);
      setPhase(GAME_PHASE.PLAYING);
    }, 500);
  };

  const handleLetterPress = (letter, index) => {
    if (!canAcceptInput(phase)) return;

    const nextSelected = [...selectedLetters, { letter, index }];
    const nextAvailable = availableLetters.filter((_, i) => i !== index);
    setSelectedLetters(nextSelected);
    setAvailableLetters(nextAvailable);

    const attempt = nextSelected.map((e) => e.letter).join('');
    if (attempt.length !== currentWord.length) return;

    if (attempt === currentWord) {
      const nextScore = score + 1;
      setScore(nextScore);
      setFeedback('Word complete.');
      advanceWord(nextScore);
      return;
    }

    const nextWrong = wrongAttempts + 1;
    setWrongAttempts(nextWrong);
    if (nextWrong >= hintThreshold && !hintUsed) {
      setHintUsed(true);
      setHintsUsed((prev) => prev + 1);
      setFeedback(`Starts with ${currentWord[0]}. Try again.`);
    } else {
      setFeedback('Not quite. Letters cleared — try again.');
    }
    setTimeout(() => resetWordState(currentWord), 600);
  };

  const handleReset = () => resetWordState(currentWord);

  const handleHint = () => {
    if (hintUsed || !currentWord || !canAcceptInput(phase)) return;
    setHintUsed(true);
    setHintsUsed((prev) => prev + 1);
    setFeedback(`Starts with ${currentWord[0]}.`);
  };

  return (
    <GameShell
      title="Word Builder"
      isActive={gameStarted && phase !== GAME_PHASE.COMPLETE}
      onPause={pauseSession}
      onResume={resumeSession}
      onExit={clearAllTimers}
      stats={gameStarted ? [
        { label: 'Word', value: `${wordIndex + 1}/${sessionWords.length || wordsPerSession}` },
        { label: 'Score', value: score },
      ] : []}
    >
      <View style={styles.container}>
        {!gameStarted ? (
          <GameIntro
            title="Word Builder"
            description="Tap letter tiles in order to spell familiar words."
            estimatedMinutes={5}
            onStartGentle={() => startGame('easy')}
            onStartStandard={() => startGame('standard')}
            gentleLabel="Gentle (6 words)"
            standardLabel="Standard (8 words)"
          />
        ) : (
          <View style={styles.boardCard}>
            <Text style={styles.prompt}>Spell the word</Text>
            <View style={styles.answerRow}>
              {Array.from({ length: currentWord.length }).map((_, index) => (
                <LetterSlot key={`slot-${index}`} letter={selectedLetters[index]?.letter} />
              ))}
            </View>
            <View style={styles.lettersRow}>
              {availableLetters.map((letter, index) => (
                <LetterChip
                  key={`${letter}-${index}`}
                  letter={letter}
                  onPress={() => handleLetterPress(letter, index)}
                />
              ))}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryAction} onPress={handleReset}>
                <Text style={styles.secondaryActionText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryAction, hintUsed && styles.secondaryActionDisabled]}
                onPress={handleHint}
                disabled={hintUsed}
              >
                <Text style={styles.secondaryActionText}>Hint</Text>
              </TouchableOpacity>
            </View>
            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          </View>
        )}
      </View>

      <GameCompleteSheet
        visible={completeVisible}
        message={`You built ${completeScore} of ${wordsPerSession} words.`}
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
    justifyContent: 'center',
    ...shadow({ offsetHeight: 2, opacity: 0.06, radius: 8, elevation: 2 }),
  },
  prompt: { ...gameType.title, textAlign: 'center', marginBottom: spacing.lg },
  answerRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  lettersRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  secondaryAction: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: gameColors.surfaceMuted,
    borderWidth: 1,
    borderColor: gameColors.border,
  },
  secondaryActionDisabled: { opacity: 0.5 },
  secondaryActionText: { fontSize: 15, fontWeight: '600', color: gameColors.textSecondary },
  feedback: { ...gameType.instruction, textAlign: 'center' },
});

export default WordUnscrambleGame;
