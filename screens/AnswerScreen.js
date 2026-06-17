import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, StatusBar, ScrollView, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, isTablet, layout, radii, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL, SESSION_TOKEN_KEY } from "../config/backend";
import { getStoredSessionToken } from "../utils/session";
import Ionicons from 'react-native-vector-icons/Ionicons';

function safePct(numerator, denominator) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

function normaliseAnswer(answer) {
  return String(answer || "").trim().toLowerCase();
}

function formatSecondsFromMs(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return "—";
  const seconds = Number(ms) / 1000;
  if (!Number.isFinite(seconds)) return "—";
  return `${seconds.toFixed(1)}s`;
}

function formatAccuracyDelta(deltaPct) {
  if (deltaPct == null || Number.isNaN(deltaPct)) return "—";
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${deltaPct.toFixed(1)} pts`;
}

function formatTimeDelta(deltaMs) {
  if (deltaMs == null || Number.isNaN(deltaMs)) return "—";
  const seconds = Math.abs(deltaMs) / 1000;
  const sign = deltaMs > 0 ? "+" : deltaMs < 0 ? "-" : "±";
  return `${sign}${seconds.toFixed(1)}s`;
}

// Question length stats from prod bank (n≈7859): min 25, avg 72, p95 113, max 200 chars.
const REVIEW_QUESTION_MIN_HEIGHT = isTablet ? 80 : 72;
const REVIEW_QUESTION_MAX_HEIGHT = isTablet ? 168 : 148;
const REVIEW_ANSWER_ROW_HEIGHT = isTablet ? 68 : 58;
const REVIEW_EXPLANATION_SLOT_HEIGHT = isTablet ? 156 : 128;

function ExplanationSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
      <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
      <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
    </View>
  );
}

const AnswerScreen = ({ route, navigation }) => {
  const { selectedAnswers = [], questions = [], category, subDomain } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [analyticsComparison, setAnalyticsComparison] = useState(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportNotes, setReportNotes] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const sessionSummary = useMemo(() => {
    const attempts = selectedAnswers.length;
    const correctCount = selectedAnswers.reduce((acc, item) => {
      if (typeof item?.isCorrect === "boolean") {
        return acc + (item.isCorrect ? 1 : 0);
      }

      const correctAnswer =
        item?.question?.correctAnswer || item?.question?.correct_answer || "";
      const userAnswer = item?.answer || "";
      return acc + (String(correctAnswer).trim().toLowerCase() === String(userAnswer).trim().toLowerCase() ? 1 : 0);
    }, 0);
    const totalTimeMs = selectedAnswers.reduce((acc, item) => acc + Number(item?.timeTakenMs || 0), 0);
    const avgTimeMs = attempts ? Math.round(totalTimeMs / attempts) : null;

    return {
      attempts,
      correctCount,
      incorrectCount: Math.max(0, attempts - correctCount),
      totalTimeMs,
      avgTimeMs,
      accuracyPct: safePct(correctCount, attempts),
    };
  }, [selectedAnswers]);

  useEffect(() => {
    if (questions[currentIndex] && selectedAnswers[currentIndex]) {
      const currentQuestion = questions[currentIndex];
      // Ensure questionId is a string (MongoDB ObjectId as string)
      const questionId = currentQuestion._id?.toString() || currentQuestion._id || null;
      console.log('Fetching explanation for question:', {
        questionId,
        category,
        subDomain,
        hasId: !!currentQuestion._id
      });
      fetchDescription(
        currentQuestion.question,
        selectedAnswers[currentIndex].answer,
        currentQuestion.correctAnswer || currentQuestion.correct_answer,
        questionId, // MongoDB ObjectId as string
        category,
        subDomain
      );
    } else {
      setDescription("No data available for this question.");
    }
  }, [currentIndex]);

  useEffect(() => {
    const loadAnalyticsComparison = async () => {
      if (!sessionSummary.attempts) {
        setAnalyticsLoading(false);
        return;
      }

      setAnalyticsLoading(true);
      try {
        const sessionToken = await getStoredSessionToken();
        if (!sessionToken) {
          setAnalyticsComparison(null);
          return;
        }

        const metricsResp = await axios.get(`${API_BASE_URL}/api/trivia/metrics/daily`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
          params: { days: 365 },
        });

        const rawSeries = metricsResp?.data?.series || [];
        const historicalAttempts = rawSeries.reduce((acc, item) => acc + Number(item?.totalAttempts || 0), 0);
        const historicalCorrect = rawSeries.reduce((acc, item) => acc + Number(item?.correctCount || 0), 0);
        const historicalWeightedTimeMs = rawSeries.reduce((acc, item) => {
          if (!item?.totalAttempts || item?.avgTimeTakenMs == null) return acc;
          return acc + Number(item.avgTimeTakenMs) * Number(item.totalAttempts);
        }, 0);

        const baselineAttempts = Math.max(0, historicalAttempts - sessionSummary.attempts);
        const baselineCorrect = Math.max(0, historicalCorrect - sessionSummary.correctCount);
        const baselineWeightedTimeMs = Math.max(0, historicalWeightedTimeMs - sessionSummary.totalTimeMs);

        if (!baselineAttempts) {
          setAnalyticsComparison({
            hasBaseline: false,
            baselineAttempts: 0,
            baselineAccuracyPct: null,
            baselineAvgTimeMs: null,
            accuracyDeltaPct: null,
            avgTimeDeltaMs: null,
          });
          return;
        }

        const baselineAccuracyPct = safePct(baselineCorrect, baselineAttempts);
        const baselineAvgTimeMs = Math.round(baselineWeightedTimeMs / baselineAttempts);

        setAnalyticsComparison({
          hasBaseline: true,
          baselineAttempts,
          baselineAccuracyPct,
          baselineAvgTimeMs,
          accuracyDeltaPct: sessionSummary.accuracyPct - baselineAccuracyPct,
          avgTimeDeltaMs:
            sessionSummary.avgTimeMs != null && baselineAvgTimeMs != null
              ? sessionSummary.avgTimeMs - baselineAvgTimeMs
              : null,
        });
      } catch (error) {
        console.error("Failed to load analytics comparison:", error);
        setAnalyticsComparison(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalyticsComparison();
  }, [sessionSummary]);

  const fetchDescription = async (question, userAnswer, correctAnswer, questionId, category, subDomain) => {
    setLoading(true);
    try {
      // Get session token for authentication
      const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      if (!sessionToken) {
        setDescription("Please log in to get explanations for answers.");
        setLoading(false);
        return;
      }

      // Call backend endpoint to generate explanation
      // Include questionId, category, and subDomain for caching
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-explanation`,
        {
          question: question,
          userAnswer: userAnswer,
          correctAnswer: correctAnswer,
          questionId: questionId, // MongoDB ObjectId for caching
          category: category,     // For finding the question in database
          subDomain: subDomain     // For finding the question in database
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      if (response.data.status === 'success') {
        setDescription(response.data.explanation || "Could not generate a description at this time.");
      } else {
        setDescription("Error generating description. Please try again later.");
      }
    } catch (error) {
      // Provide more specific error messages
      if (error.response?.status === 401) {
        setDescription("Authentication required. Please log in to get explanations.");
      } else if (error.response?.status === 429) {
        setDescription("Explanation generation is temporarily unavailable due to API limits. Please try again later.");
      } else if (error.response?.status === 500) {
        const errorMsgRaw = error.response?.data?.message || error.message || 'Server error';
        const errorMsg = String(errorMsgRaw).toLowerCase();
        
        // Handle OpenAI quota/rate limit errors gracefully
        if (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('rate limit')) {
          setDescription("Explanation generation is temporarily unavailable due to API limits. Please try again later.");
        } else if (errorMsg.includes('api key')) {
          setDescription("Explanation generation is currently unavailable. Please contact support.");
        } else {
          setDescription("Unable to generate explanation at this time. Please try again later.");
        }
      } else {
        setDescription("Unable to generate explanation. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setDescription(''); // Reset description for the next question
    } else {
      setAnalyticsVisible(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex === 0) {
      return;
    }
    setCurrentIndex(currentIndex - 1);
    setDescription('');
  };

  const handleExitReview = () => {
    Alert.alert(
      "Exit answer review?",
      "You can stop reviewing now and return to the home screen.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Exit review", style: "destructive", onPress: () => navigation.navigate('Home') },
      ]
    );
  };

  const handleBackHome = () => {
    setAnalyticsVisible(false);
    navigation.navigate('Home');
  };

  const handleViewAllAnalytics = () => {
    setAnalyticsVisible(false);
    navigation.navigate('Performance');
  };

  const handleOpenReport = () => {
    setReportVisible(true);
  };

  const handleCloseReport = () => {
    if (reportSubmitting) {
      return;
    }
    setReportVisible(false);
    setReportNotes('');
  };

  const handleSubmitReport = async () => {
    const notes = reportNotes.trim();
    if (notes.length < 5) {
      Alert.alert('Add more detail', 'Please share a short note so we can review this answer properly.');
      return;
    }

    try {
      setReportSubmitting(true);
      const sessionToken = await getStoredSessionToken();
      if (!sessionToken) {
        Alert.alert('Login required', 'Please log in to submit a report.');
        return;
      }

      const currentQuestion = questions[currentIndex] || {};
      const currentAnswer = selectedAnswers[currentIndex] || {};
      const questionId = currentQuestion?._id?.toString?.() || currentQuestion?._id || '';
      const correctAnswer = currentQuestion?.correctAnswer || currentQuestion?.correct_answer || '';

      await axios.post(
        `${API_BASE_URL}/api/reports`,
        {
          type: 'answer_review',
          notes,
          questionId,
          category: category || '',
          subDomain: subDomain || '',
          questionText: currentQuestion?.question || '',
          questionOptions: Array.isArray(currentQuestion?.options) ? currentQuestion.options : [],
          suggestedAnswer: correctAnswer,
          userAnswer: currentAnswer?.answer || '',
          explanationText: description || '',
          isMarkedCorrect: Boolean(isCorrect),
          questionIndex: currentIndex,
          totalQuestions: questions.length || 1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      setReportVisible(false);
      setReportNotes('');
      Alert.alert('Report saved', 'Thanks for flagging this. We will review the question and answer.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Could not save this report right now. Please try again.';
      Alert.alert('Unable to submit', message);
    } finally {
      setReportSubmitting(false);
    }
  };

  const progressRatio = questions.length ? (currentIndex + 1) / questions.length : 0;
  const resolvedCorrectAnswer =
    questions[currentIndex]?.correctAnswer || questions[currentIndex]?.correct_answer || "";
  const isCorrect = questions[currentIndex] &&
                   selectedAnswers[currentIndex] &&
                   (
                     typeof selectedAnswers[currentIndex]?.isCorrect === "boolean"
                       ? selectedAnswers[currentIndex].isCorrect
                       : normaliseAnswer(resolvedCorrectAnswer) === normaliseAnswer(selectedAnswers[currentIndex].answer)
                   );
  const accuracyDeltaPositive = (analyticsComparison?.accuracyDeltaPct ?? 0) >= 0;
  const timeDeltaPositive = (analyticsComparison?.avgTimeDeltaMs ?? 0) <= 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTint} />
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerEyebrow}>Answer review</Text>
            <Text style={styles.headerTitle}>Question {currentIndex + 1} of {questions.length}</Text>
          </View>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={handleExitReview}
            accessibilityRole="button"
            accessibilityLabel="Exit answer review and return home"
          >
            <Text style={styles.exitButtonText}>Exit review</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressRatio * 100}%` }
            ]}
          />
        </View>
      </View>
      
      <View style={styles.body}>
        {questions[currentIndex] ? (
          <>
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[ui.card, styles.reviewCard]}>
                <View style={styles.reviewTopRow}>
                  <View style={styles.reviewStatusWrap}>
                    <Ionicons
                      name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={isCorrect ? colors.success : colors.danger}
                    />
                    <Text style={styles.questionCounter}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.reportButton}
                    onPress={handleOpenReport}
                    accessibilityRole="button"
                    accessibilityLabel="Report a possibly incorrect answer suggestion"
                  >
                    <Text style={styles.reportButtonText}>i</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.questionSlot}>
                  <ScrollView
                    style={styles.questionScroll}
                    contentContainerStyle={styles.questionScrollContent}
                    showsVerticalScrollIndicator
                    nestedScrollEnabled
                  >
                    <Text style={styles.questionText}>
                      {questions[currentIndex].question}
                    </Text>
                  </ScrollView>
                </View>

                <View style={styles.answersSlot}>
                  <View style={[styles.reviewBlock, styles.correctAnswerContainer, styles.answerRowFixed]}>
                    <Text style={styles.answerLabel}>Correct answer</Text>
                    <Text style={styles.correctAnswerText} numberOfLines={2}>
                      {resolvedCorrectAnswer}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.reviewBlock,
                      styles.userAnswerContainer,
                      styles.answerRowFixed,
                      isCorrect ? styles.correctBg : styles.incorrectBg,
                    ]}
                  >
                    <Text style={styles.answerLabel}>Your answer</Text>
                    <Text
                      style={[styles.userAnswerText, isCorrect ? styles.correctText : styles.incorrectText]}
                      numberOfLines={2}
                    >
                      {selectedAnswers[currentIndex]?.answer || "No answer provided"}
                    </Text>
                  </View>
                </View>

                <View style={[styles.reviewBlock, styles.descriptionContainer, styles.explanationSlot]}>
                  <Text style={styles.descriptionLabel}>Explanation</Text>
                  <View style={styles.explanationBody}>
                    {loading ? (
                      <ExplanationSkeleton />
                    ) : (
                      <Text style={styles.descriptionText}>{description}</Text>
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentIndex === 0 && styles.navButtonDisabled,
                ]}
                onPress={handlePrevious}
                disabled={currentIndex === 0}
                accessibilityRole="button"
                accessibilityLabel="Previous question"
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={currentIndex === 0 ? colors.slate400 : colors.textSecondary}
                />
              </TouchableOpacity>

              <Text style={styles.actionProgress}>
                {currentIndex + 1} / {questions.length}
              </Text>

              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary]}
                onPress={handleNext}
                accessibilityRole="button"
                accessibilityLabel={
                  currentIndex < questions.length - 1 ? 'Next question' : 'View session summary'
                }
              >
                <Ionicons
                  name={currentIndex < questions.length - 1 ? 'chevron-forward' : 'stats-chart-outline'}
                  size={currentIndex < questions.length - 1 ? 22 : 20}
                  color={colors.white}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.noQuestionsText}>No questions available.</Text>
          </View>
        )}
      </View>

      <Modal
        visible={reportVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseReport}
      >
        <Pressable style={ui.modalOverlay} onPress={handleCloseReport}>
          <Pressable style={[ui.modalContent, styles.reportModal]} onPress={() => {}}>
            <Text style={styles.reportEyebrow}>Review report</Text>
            <Text style={styles.reportTitle}>Flag this answer for review</Text>
            <Text style={styles.reportSubtitle}>
              We will save the question, suggested answer, your answer, and your note for review.
            </Text>

            <View style={styles.reportSummary}>
              <Text style={styles.reportSummaryLabel}>Question</Text>
              <Text style={styles.reportSummaryText} numberOfLines={3}>
                {questions[currentIndex]?.question}
              </Text>
              <Text style={styles.reportSummaryMeta}>
                Suggested: {resolvedCorrectAnswer || '—'}
              </Text>
              <Text style={styles.reportSummaryMeta}>
                Your answer: {selectedAnswers[currentIndex]?.answer || 'No answer provided'}
              </Text>
            </View>

            <View style={styles.reportInputWrap}>
              <TextInput
                style={styles.reportInput}
                value={reportNotes}
                onChangeText={setReportNotes}
                multiline
                textAlignVertical="top"
                placeholder="What looks wrong about this answer?"
                placeholderTextColor={colors.gray400}
                maxLength={2000}
                editable={!reportSubmitting}
              />
            </View>

            <View style={styles.reportActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.reportSecondaryAction]}
                onPress={handleCloseReport}
                disabled={reportSubmitting}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ui.buttonPrimary, styles.reportPrimaryAction, reportSubmitting && styles.primaryButtonDisabled]}
                onPress={handleSubmitReport}
                disabled={reportSubmitting}
              >
                {reportSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={ui.buttonPrimaryText}>Submit report</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={analyticsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnalyticsVisible(false)}
      >
        <Pressable style={ui.modalOverlay} onPress={() => setAnalyticsVisible(false)}>
          <Pressable style={[ui.modalContent, styles.analyticsModal]} onPress={() => {}}>
            <Text style={styles.analyticsEyebrow}>Quiz complete</Text>
            <Text style={styles.analyticsTitle}>Session summary</Text>
            <Text style={styles.analyticsSubtitle}>
              {category}{subDomain ? ` • ${subDomain}` : ""}
            </Text>

            {analyticsLoading ? (
              <View style={styles.analyticsLoadingWrap}>
                <ActivityIndicator size="small" color={colors.brandDark} />
                <Text style={styles.analyticsLoadingText}>Comparing this session to your running average...</Text>
              </View>
            ) : (
              <>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsCardLabel}>Correct rate</Text>
                    <Text style={styles.analyticsCardValue}>
                      {sessionSummary.accuracyPct.toFixed(1)}%
                    </Text>
                    {analyticsComparison?.hasBaseline ? (
                      <>
                        <Text style={styles.analyticsCardMeta}>
                          Running average {analyticsComparison.baselineAccuracyPct.toFixed(1)}%
                        </Text>
                        <Text
                          style={[
                            styles.analyticsDelta,
                            accuracyDeltaPositive ? styles.analyticsDeltaPositive : styles.analyticsDeltaNegative,
                          ]}
                        >
                          {formatAccuracyDelta(analyticsComparison.accuracyDeltaPct)}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.analyticsCardMeta}>This session sets your first tracked baseline.</Text>
                    )}
                  </View>

                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsCardLabel}>Avg time</Text>
                    <Text style={styles.analyticsCardValue}>
                      {formatSecondsFromMs(sessionSummary.avgTimeMs)}
                    </Text>
                    {analyticsComparison?.hasBaseline ? (
                      <>
                        <Text style={styles.analyticsCardMeta}>
                          Running average {formatSecondsFromMs(analyticsComparison.baselineAvgTimeMs)}
                        </Text>
                        <Text
                          style={[
                            styles.analyticsDelta,
                            timeDeltaPositive ? styles.analyticsDeltaPositive : styles.analyticsDeltaNegative,
                          ]}
                        >
                          {formatTimeDelta(analyticsComparison.avgTimeDeltaMs)}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.analyticsCardMeta}>Complete more quizzes to unlock timing trends.</Text>
                    )}
                  </View>
                </View>

                <View style={styles.analyticsFooter}>
                  <Text style={styles.analyticsFooterText}>
                    {sessionSummary.correctCount} correct, {sessionSummary.incorrectCount} incorrect
                  </Text>
                </View>
              </>
            )}

            <View style={styles.analyticsActions}>
              <TouchableOpacity
                style={styles.compactActionButton}
                onPress={handleBackHome}
                accessibilityRole="button"
                accessibilityLabel="Back home"
              >
                <Ionicons name="home-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.compactActionText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compactActionButton, styles.compactActionButtonPrimary]}
                onPress={handleViewAllAnalytics}
                accessibilityRole="button"
                accessibilityLabel="View all analytics"
              >
                <Ionicons name="stats-chart-outline" size={18} color={colors.white} />
                <Text style={styles.compactActionTextPrimary}>Analytics</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: type.caption,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerTitle: {
    marginTop: spacing.xs,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
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
  progressBar: {
    height: 10,
    backgroundColor: colors.gray200,
    borderRadius: 999,
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 999,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundTint,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.sm,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.backgroundTint,
  },
  reviewCard: {
    borderRadius: 24,
    padding: spacing.xl,
    width: '100%',
  },
  reviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  questionCounter: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reportButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerDark,
  },
  reportButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    marginTop: -1,
  },
  questionSlot: {
    minHeight: REVIEW_QUESTION_MIN_HEIGHT,
    maxHeight: REVIEW_QUESTION_MAX_HEIGHT,
    marginBottom: spacing.md,
  },
  questionScroll: {
    flexGrow: 0,
  },
  questionScrollContent: {
    paddingBottom: 2,
  },
  questionText: {
    fontSize: isTablet ? 24 : 22,
    fontWeight: '800',
    lineHeight: isTablet ? 32 : 28,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  answersSlot: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  answerRowFixed: {
    height: REVIEW_ANSWER_ROW_HEIGHT,
    marginBottom: 0,
    justifyContent: 'center',
  },
  reviewBlock: {
    padding: 16,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  correctAnswerContainer: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  userAnswerContainer: {
    borderColor: colors.gray200,
  },
  correctBg: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  incorrectBg: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  correctAnswerText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.success,
    fontWeight: '700',
  },
  userAnswerText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  correctText: {
    color: colors.success,
  },
  incorrectText: {
    color: colors.danger,
  },
  descriptionContainer: {
    backgroundColor: colors.slate50,
    borderColor: colors.slate200,
  },
  explanationSlot: {
    minHeight: REVIEW_EXPLANATION_SLOT_HEIGHT,
  },
  explanationBody: {
    minHeight: REVIEW_EXPLANATION_SLOT_HEIGHT - 36,
    justifyContent: 'flex-start',
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: isTablet ? 26 : 24,
    color: colors.textSecondary,
  },
  skeletonWrap: {
    gap: 10,
    paddingTop: 2,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.slate200,
  },
  skeletonLineLong: {
    width: '100%',
  },
  skeletonLineMedium: {
    width: '82%',
  },
  skeletonLineShort: {
    width: '58%',
  },
  actionRow: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.backgroundTint,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate300,
  },
  navButtonPrimary: {
    backgroundColor: colors.brand,
    borderColor: colors.brandDark,
  },
  navButtonDisabled: {
    backgroundColor: colors.slate100,
    borderColor: colors.slate200,
  },
  actionProgress: {
    fontSize: type.bodySm,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    minHeight: 60,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: type.button,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  secondaryButtonDisabled: {
    backgroundColor: colors.slate100,
    borderColor: colors.slate200,
  },
  secondaryButtonTextDisabled: {
    color: colors.slate400,
  },
  compactActionButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate300,
  },
  compactActionButtonPrimary: {
    backgroundColor: colors.brand,
    borderColor: colors.brandDark,
  },
  compactActionText: {
    fontSize: type.bodySm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  compactActionTextPrimary: {
    fontSize: type.bodySm,
    fontWeight: '700',
    color: colors.white,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  reportModal: {
    width: '88%',
    maxWidth: 520,
    alignItems: 'stretch',
  },
  reportEyebrow: {
    fontSize: type.caption,
    fontWeight: '700',
    color: colors.dangerDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  reportTitle: {
    marginTop: spacing.xs,
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  reportSubtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  reportSummary: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
  },
  reportSummaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dangerDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reportSummaryText: {
    marginTop: spacing.xs,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  reportSummaryMeta: {
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  reportInputWrap: {
    marginTop: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    overflow: 'hidden',
  },
  reportInput: {
    minHeight: 140,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: type.body,
    color: colors.textSecondary,
  },
  reportActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  reportSecondaryAction: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.slate300,
  },
  reportPrimaryAction: {
    flex: 1.2,
  },
  analyticsModal: {
    width: '88%',
    maxWidth: 520,
    alignItems: 'stretch',
  },
  analyticsEyebrow: {
    fontSize: type.caption,
    fontWeight: '700',
    color: colors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  analyticsTitle: {
    marginTop: spacing.xs,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  analyticsSubtitle: {
    marginTop: spacing.sm,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'center',
  },
  analyticsLoadingWrap: {
    marginTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  analyticsLoadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'center',
  },
  analyticsGrid: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  analyticsCard: {
    backgroundColor: colors.slate50,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  analyticsCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  analyticsCardValue: {
    marginTop: spacing.sm,
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  analyticsCardMeta: {
    marginTop: spacing.xs,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  analyticsDelta: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: '700',
  },
  analyticsDeltaPositive: {
    color: colors.successDark,
  },
  analyticsDeltaNegative: {
    color: colors.dangerDark,
  },
  analyticsFooter: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  analyticsFooterText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  analyticsActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  noQuestionsText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default AnswerScreen;
