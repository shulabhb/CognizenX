import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, StatusBar } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, radii, shadow, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL, SESSION_TOKEN_KEY } from "../config/backend";

function normaliseAnswer(answer) {
  return String(answer || "").trim().toLowerCase();
}

function uniqueSelections(selections = []) {
  const seen = new Set();
  return selections.filter((item) => {
    const category = String(item?.category || "").trim();
    const subDomain = String(item?.subDomain || item?.domain || "").trim();
    if (!category || !subDomain) return false;
    const key = `${category}::${subDomain}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeQuestions(questions = []) {
  const seen = new Set();
  return questions.filter((question) => {
    const key =
      question?._id?.toString?.() ||
      `${String(question?.question || "").trim()}::${String(question?.correctAnswer || question?.correct_answer || "").trim()}`;
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const QuizScreen = ({ route, navigation }) => {
  console.log(route.params)
  const { categories = [], subDomain, selections = [] } = route.params || {};
  const savedSelections = useMemo(() => uniqueSelections(selections), [selections]);
  const categoriesKey = Array.isArray(categories) ? categories.join('|') : '';
  const selectionsKey = savedSelections
    .map((item) => `${item.category}::${item.subDomain}`)
    .join('|');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const questionStartAtRef = useRef(Date.now());

  useEffect(() => {
    setLoading(true);
    fetchRandomQuestions();
  }, [categoriesKey, subDomain, selectionsKey]);

  useEffect(() => {
    questionStartAtRef.current = Date.now();
  }, [currentQuestionIndex, questions.length]);

  const fetchRandomQuestions = async () => {
    console.log('Fetching questions for categories:', categories?.join(','), 'subDomain:', subDomain);
    try {
      if (savedSelections.length > 0) {
        const responses = await Promise.all(
          savedSelections.map((selection) =>
            axios.get(`${API_BASE_URL}/api/random-questions`, {
              params: {
                categories: selection.category,
                subDomain: selection.subDomain,
              },
            })
          )
        );

        const combinedQuestions = dedupeQuestions(
          responses.flatMap((response) => response.data.questions || [])
        );
        const shuffledQuestions = combinedQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
        setQuestions(shuffledQuestions);
        console.log(`Fetched ${shuffledQuestions.length} questions across ${savedSelections.length} saved selections`);
        return;
      }

      const params = { categories: categories.join(',') };
      if (subDomain) {
        params.subDomain = subDomain;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/random-questions`, {
        params: params,
      });
      const fetchedQuestions = response.data.questions || [];
      setQuestions(fetchedQuestions);
      console.log(`Fetched ${fetchedQuestions.length} questions`);
    } catch (error) {
      console.error('Error fetching random questions:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to fetch questions.');
    } finally {
      setLoading(false);
    }
  };

  const recordAttempt = async ({ questionId, selectedAnswer, timeTakenMs }) => {
    try {
      const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      if (!sessionToken) return;

      await axios.post(
        `${API_BASE_URL}/api/trivia/attempts`,
        {
          questionId,
          selectedAnswer,
          timeTakenMs,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );
    } catch (e) {
      // Intentionally silent: attempt logging shouldn't interrupt quiz UX.
    }
  };

  const handleSelectAnswer = (option) => {
    const currentQuestion = questions[currentQuestionIndex];
    const questionId = currentQuestion?._id?.toString?.() || currentQuestion?._id;
    const timeTakenMs = Math.max(0, Date.now() - (questionStartAtRef.current || Date.now()));
    const correctAnswer = currentQuestion?.correctAnswer || currentQuestion?.correct_answer || "";
    const isCorrect = normaliseAnswer(option) === normaliseAnswer(correctAnswer);

    if (questionId) {
      recordAttempt({
        questionId,
        selectedAnswer: option,
        timeTakenMs,
      });
    }

    const updatedAnswers = [
      ...selectedAnswers,
      {
        question: currentQuestion,
        answer: option,
        timeTakenMs,
        isCorrect,
      },
    ];
    setSelectedAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      const selectionCategories = [...new Set(savedSelections.map((item) => item.category))];
      const answerCategoryLabel = savedSelections.length > 0
        ? (selectionCategories.length > 1 ? `${selectionCategories.length} categories` : selectionCategories[0])
        : (categories[0] || categories.join(','));

      navigation.navigate('AnswerScreen', {
        selectedAnswers: updatedAnswers,
        questions,
        category: answerCategoryLabel,
        subDomain: savedSelections.length === 1 ? savedSelections[0].subDomain : subDomain
      });
    }
  };

  const handleExitQuiz = () => {
    Alert.alert(
      "Exit quiz?",
      "You can leave now and come back to a new quiz later.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Exit quiz", style: "destructive", onPress: () => navigation.navigate("Home") },
      ]
    );
  };

  const totalQuestions = questions.length || 10;
  const currentStep = Math.min(currentQuestionIndex + 1, totalQuestions);
  const progressRatio = questions.length ? (currentQuestionIndex + 1) / questions.length : 0;
  const selectionCategories = useMemo(
    () => [...new Set(savedSelections.map((item) => item.category))],
    [selectionsKey]
  );
  const quizContextLabel = savedSelections.length > 0
    ? `${savedSelections.length} saved topics across ${selectionCategories.length} categories`
    : subDomain
      ? `${categories[0] || "Quiz"} • ${subDomain}`
      : categories.length > 1
        ? `${categories.length} categories`
        : (categories[0] || "Quiz");

  if (loading) {
    return (
      <SafeAreaView style={styles.loader}>
        <ActivityIndicator size="large" color={colors.brandDark} />
        <Text style={styles.loaderText}>Preparing your quiz...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTint} />
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>Quiz in progress</Text>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Question {currentStep} of {totalQuestions}</Text>
          <View style={styles.headerActions}>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>{Math.round(progressRatio * 100)}%</Text>
            </View>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={handleExitQuiz}
              accessibilityRole="button"
              accessibilityLabel="Exit quiz and return home"
            >
              <Text style={styles.exitButtonText}>Exit quiz</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>{quizContextLabel}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
        </View>
      </View>

      <View style={[ui.screen, styles.container]}>
      {questions.length > 0 ? (
        <View style={styles.contentWrap}>
          <View style={[ui.card, styles.questionCard]}>
            <Text style={styles.questionText}>
              {questions[currentQuestionIndex].question}
            </Text>
            {questions[currentQuestionIndex].options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.answerButton}
                onPress={() => handleSelectAnswer(option)}
                activeOpacity={0.85}
              >
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>{String.fromCharCode(65 + index)}</Text>
                </View>
                <Text style={styles.answerText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No questions available right now</Text>
          <Text style={styles.emptyText}>Please try another category or come back in a moment.</Text>
        </View>
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.backgroundTint,
  },
  headerEyebrow: {
    fontSize: type.caption,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: spacing.sm,
    fontSize: 17,
    lineHeight: 26,
    color: colors.textMuted,
  },
  progressBadge: {
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brandDark,
  },
  exitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  exitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dangerDark,
  },
  progressTrack: {
    marginTop: spacing.md,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.slate200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.brandDark,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.backgroundTint,
    justifyContent: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundTint,
    padding: spacing.xxl,
  },
  loaderText: {
    marginTop: spacing.lg,
    fontSize: 18,
    color: colors.textMuted,
  },
  questionCard: {
    borderRadius: 24,
    padding: 24,
    ...shadow({ color: colors.brand, offsetHeight: 6, opacity: 0.12, radius: 16, elevation: 4 }),
  },
  questionText: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 22,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  answerButton: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow({ color: colors.brandShadow, offsetHeight: 4, opacity: 0.08, radius: 8, elevation: 2 }),
  },
  optionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandDark,
  },
  answerText: {
    flex: 1,
    fontSize: 19,
    lineHeight: 28,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 17,
    lineHeight: 26,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default QuizScreen;
