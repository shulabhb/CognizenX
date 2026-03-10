import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, isTablet, layout, radii, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL } from "../config/backend";

const AnswerScreen = ({ route, navigation }) => {
  const { selectedAnswers = [], questions = [], category, subDomain } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const insets = useSafeAreaInsets();

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

  const fetchDescription = async (question, userAnswer, correctAnswer, questionId, category, subDomain) => {
    setLoading(true);
    try {
      // Get session token for authentication
      const sessionToken = await AsyncStorage.getItem('sessionToken');
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
      console.error('Error fetching description:', error);
      console.error('Error response:', error.response?.data);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        setDescription("Authentication required. Please log in to get explanations.");
      } else if (error.response?.status === 500) {
        const errorMsg = error.response?.data?.message || error.message || 'Server error';
        
        // Handle OpenAI quota/rate limit errors gracefully
        if (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('rate limit')) {
          setDescription("Explanation generation is temporarily unavailable due to API limits. Please try again later.");
        } else if (errorMsg.includes('API key')) {
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
      Alert.alert("Quiz Completed", "You have completed the quiz. Redirecting to the homepage.", [
        {
          text: "OK",
          onPress: () => navigation.navigate('Home'), // Navigate to the Home screen
        },
      ]);
    }
  };

  const isCorrect = questions[currentIndex] && 
                   selectedAnswers[currentIndex] && 
                   questions[currentIndex].correctAnswer === selectedAnswers[currentIndex].answer;

  return (
    <SafeAreaView style={ui.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={ui.header}>
        <Text style={ui.screenTitle}>Results</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentIndex + 1) / questions.length) * 100}%` }
            ]} 
          />
        </View>
      </View>
      
      <View style={styles.container}>
        {questions[currentIndex] ? (
          <>
            <View style={ui.card}>
              <Text style={styles.questionCounter}>Question {currentIndex + 1} of {questions.length}</Text>
              <Text style={styles.questionTitle}>Question:</Text>
              <Text style={styles.questionText}>{questions[currentIndex].question}</Text>
              
              <View style={styles.answerSection}>
                <View style={styles.correctAnswerContainer}>
                  <Text style={styles.answerLabel}>Correct Answer:</Text>
                  <Text style={styles.correctAnswerText}>
                    {questions[currentIndex].correctAnswer}
                  </Text>
                </View>
                
                <View style={[styles.userAnswerContainer, isCorrect ? styles.correctBg : styles.incorrectBg]}>
                  <Text style={styles.answerLabel}>Your Answer:</Text>
                  <Text style={[styles.userAnswerText, isCorrect ? styles.correctText : styles.incorrectText]}>
                    {selectedAnswers[currentIndex]?.answer || "No answer provided"}
                  </Text>
                </View>

                {loading ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={colors.brand} />
                    <Text style={styles.loaderText}>Loading explanation...</Text>
                  </View>
                ) : (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>Explanation:</Text>
                    <ScrollView
                      style={styles.descriptionScroll}
                      contentContainerStyle={styles.descriptionScrollContent}
                      showsVerticalScrollIndicator
                      nestedScrollEnabled
                    >
                      <Text style={styles.descriptionText}>{description}</Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={[ui.buttonPrimary, styles.nextButton]} onPress={handleNext}>
              <Text style={ui.buttonPrimaryText}>
                {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.noQuestionsText}>No questions available.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  progressBar: {
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: 3,
    marginTop: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 3,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCounter: {
    fontSize: type.caption,
    color: colors.textMuted,
    marginBottom: 10,
  },
  questionTitle: {
    fontSize: type.body,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 5,
  },
  questionText: {
    fontSize: type.bodyLg,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  answerSection: {
    width: '100%',
  },
  answerLabel: {
    fontSize: type.bodySm,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.textSecondary,
  },
  correctAnswerContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  userAnswerContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
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
    fontSize: type.body,
    color: colors.success,
    fontWeight: '500',
  },
  userAnswerText: {
    fontSize: type.body,
    fontWeight: '500',
  },
  correctText: {
    color: colors.success,
  },
  incorrectText: {
    color: colors.danger,
  },
  loaderContainer: {
    alignItems: 'center',
    padding: 15,
  },
  loaderText: {
    marginTop: 10,
    fontSize: type.bodySm,
    color: colors.textMuted,
  },
  descriptionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.gray100,
    borderRadius: radii.sm,
    flexShrink: 1,
  },
  descriptionLabel: {
    fontSize: type.bodySm,
    fontWeight: '600',
    marginBottom: 6,
    color: colors.textSecondary,
  },
  descriptionScroll: {
    minHeight: isTablet ? 140 : 90,
    maxHeight: isTablet ? 240 : 140,
  },
  descriptionScrollContent: {
    paddingBottom: 2,
  },
  descriptionText: {
    fontSize: type.bodySm,
    lineHeight: isTablet ? 24 : 22,
    color: colors.textSecondary,
  },
  nextButton: {
    marginTop: 20,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  noQuestionsText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default AnswerScreen;
