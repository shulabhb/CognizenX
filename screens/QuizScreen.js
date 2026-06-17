import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, StatusBar, ScrollView } from 'react-native';
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

// Question length stats from prod bank (n≈7859): min 25, avg 72, p95 113, max 200 chars.
const OPTION_SLOTS = 4;
const OPTION_ROW_HEIGHT = 56;
const OPTION_BADGE_SIZE = 32;

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

  const fetchQuestionsFromEndpoint = async (endpoint, params, headers = {}) => {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, { params, headers });
    return response.data.questions || [];
  };

  const getQuizRequestConfig = async () => {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      return { endpoint: '/api/random-questions', headers: {} };
    }
    return {
      endpoint: '/api/user-quiz',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    };
  };

  const fetchRandomQuestions = async () => {
    console.log('Fetching questions for categories:', categories?.join(','), 'subDomain:', subDomain);
    try {
      const { endpoint, headers } = await getQuizRequestConfig();

      if (savedSelections.length > 0) {
        const responses = await Promise.all(
          savedSelections.map(async (selection) => {
            try {
              return await fetchQuestionsFromEndpoint(
                endpoint,
                {
                  categories: selection.category,
                  subDomain: selection.subDomain,
                },
                headers
              );
            } catch (error) {
              if (endpoint === '/api/user-quiz') {
                return fetchQuestionsFromEndpoint(
                  '/api/random-questions',
                  {
                    categories: selection.category,
                    subDomain: selection.subDomain,
                  }
                );
              }
              throw error;
            }
          })
        );

        const combinedQuestions = dedupeQuestions(responses.flat());
        const shuffledQuestions = combinedQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
        setQuestions(shuffledQuestions);
        console.log(`Fetched ${shuffledQuestions.length} questions across ${savedSelections.length} saved selections`);
        return;
      }

      const params = { categories: categories.join(',') };
      if (subDomain) {
        params.subDomain = subDomain;
      }

      let fetchedQuestions = [];
      try {
        fetchedQuestions = await fetchQuestionsFromEndpoint(endpoint, params, headers);
      } catch (error) {
        if (endpoint === '/api/user-quiz') {
          fetchedQuestions = await fetchQuestionsFromEndpoint('/api/random-questions', params);
        } else {
          throw error;
        }
      }

      setQuestions(fetchedQuestions);
      console.log(`Fetched ${fetchedQuestions.length} questions`);
    } catch (error) {
      console.error('Error fetching random questions:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to fetch questions.');
    } finally {
      setLoading(false);
    }
  };

  const postAttempt = async (sessionToken, payload) => {
    await axios.post(`${API_BASE_URL}/api/trivia/attempts`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  };

  const recordAttempt = async ({ questionId, selectedAnswer, timeTakenMs }) => {
    try {
      const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      if (!sessionToken) return;

      const payload = {
        questionId,
        selectedAnswer,
        timeTakenMs,
      };

      try {
        await postAttempt(sessionToken, payload);
      } catch (firstError) {
        await postAttempt(sessionToken, payload);
      }
    } catch (e) {
      console.warn('Attempt logging failed after retry:', e?.response?.data || e?.message);
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

  const currentQuestion = questions[currentQuestionIndex];
  const optionSlots = Array.from(
    { length: OPTION_SLOTS },
    (_, index) => currentQuestion?.options?.[index] ?? null
  );

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
            <View style={styles.questionSlot}>
              <ScrollView
                style={styles.questionScroll}
                contentContainerStyle={styles.questionScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Text style={styles.questionText}>{currentQuestion.question}</Text>
              </ScrollView>
            </View>

            <View style={styles.optionsDock}>
              {optionSlots.map((option, index) =>
                option ? (
                  <TouchableOpacity
                    key={`${currentQuestionIndex}-${index}-${option}`}
                    style={styles.answerButton}
                    onPress={() => handleSelectAnswer(option)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.optionBadge}>
                      <Text style={styles.optionBadgeText}>{String.fromCharCode(65 + index)}</Text>
                    </View>
                    <Text style={styles.answerText} numberOfLines={2} ellipsizeMode="tail">
                      {option}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View key={`placeholder-${index}`} style={styles.answerButtonPlaceholder} />
                )
              )}
            </View>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.backgroundTint,
  },
  contentWrap: {
    flex: 1,
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
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    ...shadow({ color: colors.brand, offsetHeight: 6, opacity: 0.12, radius: 16, elevation: 4 }),
  },
  questionSlot: {
    flex: 1,
    minHeight: 72,
    marginBottom: spacing.md,
  },
  questionScroll: {
    flex: 1,
  },
  questionScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: spacing.xs,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  optionsDock: {
    gap: 8,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  answerButton: {
    height: OPTION_ROW_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow({ color: colors.brandShadow, offsetHeight: 2, opacity: 0.06, radius: 6, elevation: 1 }),
  },
  answerButtonPlaceholder: {
    height: OPTION_ROW_HEIGHT,
  },
  optionBadge: {
    width: OPTION_BADGE_SIZE,
    height: OPTION_BADGE_SIZE,
    borderRadius: OPTION_BADGE_SIZE / 2,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  optionBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brandDark,
  },
  answerText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
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
