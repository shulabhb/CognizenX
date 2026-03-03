import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, layout, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL } from "../config/backend";

const RandomQuestionsScreen = ({ route, navigation }) => {
  console.log(route.params)
  const { categories, subDomain } = route.params; // Fetch subDomain from params
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const questionsGeneratedRef = useRef(false); // Track if we've attempted generation
  const questionStartRef = useRef(Date.now());

  

  useEffect(() => {
    // Reset generation flag when categories/subDomain change
    questionsGeneratedRef.current = false;
    
    // First fetch existing questions
    fetchRandomQuestions().then(() => {
      // After fetching, check if we need to generate more
      // Generate new questions if categories and subDomain are provided
      if (categories && categories.length > 0 && subDomain && !questionsGeneratedRef.current) {
        // Small delay to let state update
        setTimeout(() => {
          // Check questions count from state
          setQuestions(currentQuestions => {
            if (currentQuestions.length < 5 && !questionsGeneratedRef.current) {
              console.log(`Only ${currentQuestions.length} questions available, generating more...`);
              questionsGeneratedRef.current = true;
              generateAndSaveGPTQuestions();
            } else {
              console.log(`${currentQuestions.length} questions available, skipping generation`);
            }
            return currentQuestions; // Don't change state
          });
        }, 1500);
      }
    });
  }, [categories, subDomain]);

  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentQuestionIndex]);

  const logTriviaAttempt = async ({ questionId, selectedAnswer, timeTakenMs }) => {
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (!sessionToken) return;

      await axios.post(
        `${API_BASE_URL}/api/trivia/attempts`,
        { questionId, selectedAnswer, timeTakenMs },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );
    } catch (error) {
      console.error('Failed to log trivia attempt:', error?.response?.data || error?.message || error);
    }
  };

  // Function to fetch random questions from your API
  const fetchRandomQuestions = async () => {
    console.log('Fetching questions for categories:', categories?.join(','), 'subDomain:', subDomain);
    try {
      const params = { categories: categories.join(',') };
      // Include subDomain if provided
      if (subDomain) {
        params.subDomain = subDomain;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/random-questions`, {
        params: params,
      });
      const fetchedQuestions = response.data.questions || [];
      setQuestions(fetchedQuestions);
      console.log(`Fetched ${fetchedQuestions.length} questions`);
      
      // If we have questions, don't generate new ones
      if (fetchedQuestions.length > 0) {
        console.log('Questions available, skipping generation');
      }
    } catch (error) {
      console.error('Error fetching random questions:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to fetch questions.');
    } finally {
      setLoading(false);
    }
  };

  // Function to generate and save questions using backend endpoint
  const generateAndSaveGPTQuestions = async () => {
    try {
      if (categories.length === 0) {
        Alert.alert('No Categories Selected', 'Please select at least one category.');
        return;
      }

      if (!subDomain) {
        Alert.alert('No Subdomain', 'Subdomain is required to generate questions.');
        return;
      }

      // Get session token for authentication
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (!sessionToken) {
        Alert.alert('Authentication Required', 'Please log in to generate questions.');
        return;
      }

      // Use the first category from the array
      const category = categories[0] || categories.join(',');

      // Call backend endpoint to generate questions
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-questions`,
        {
          category: category,
          subDomain: subDomain,
          count: 10
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      if (response.data.status === 'success') {
        console.log(`✅ Generated ${response.data.questions?.length || 0} questions`);
        // Questions are automatically saved by the backend
        // Refresh the questions list to show newly generated questions
        setTimeout(() => {
          fetchRandomQuestions();
        }, 1000); // Small delay to ensure questions are saved
      } else {
        Alert.alert('Error', response.data.message || 'Failed to generate questions.');
      }
    } catch (error) {
      console.error('❌ Error generating questions:', error);
      console.error('Error response:', error.response?.data);
      
      // Don't show alert if questions are already available from database
      // The fetchRandomQuestions() call will show existing questions
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message ||
                          error.response?.data?.error ||
                          error.message || 
                          'Failed to generate new questions. Showing existing questions.';
      
      // Log detailed error for debugging
      console.log('Full error response:', error.response?.data);
      console.log('Error details:', error.response?.data?.error);
      
      // Only show alert if we don't have questions to display
      // Check current questions state, not the one from closure
      const currentQuestions = questions.length;
      if (currentQuestions === 0) {
        // Check if it's an API key issue - show helpful message
        if (errorMessage.includes('API key') || errorMessage.includes('invalid or missing')) {
          Alert.alert(
            'Question Generation Unavailable', 
            'New questions cannot be generated at this time. Please use existing questions or contact support.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error Generating Questions', errorMessage);
        }
      } else {
        // Silently fail if we have questions to show - better UX
        console.log('⚠️ Question generation failed, but showing existing questions from database');
        console.log('Error was:', errorMessage);
      }
    }
  };



  const handleSelectAnswer = (option) => {
    const currentQuestion = questions[currentQuestionIndex];
    const questionId = currentQuestion?._id?.toString?.() || currentQuestion?._id;
    const timeTakenMs = Math.max(0, Date.now() - questionStartRef.current);

    if (questionId) {
      logTriviaAttempt({ questionId, selectedAnswer: option, timeTakenMs });
    }

    const updatedAnswers = [
      ...selectedAnswers,
      { questionId, question: currentQuestion, answer: option, timeTakenMs },
    ];
    setSelectedAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Pass category and subDomain for explanation caching
      navigation.navigate('AnswerScreen', { 
        selectedAnswers: updatedAnswers,
        questions,
        category: categories[0] || categories.join(','),
        subDomain: subDomain
      });
    }
  };

  const saveQuestionsToDatabase = async (questions) => {
    try {
      const response = await axios.post('https://cognizen-x-backend.vercel.app/api/save-questions', { questions });
      if (response.status === 200) {
        console.log('Questions successfully saved to the database');
      } else {
        console.log('Failed to save questions to the database');
      }
    } catch (error) {
      console.error('Error saving questions to the database:', error);
      Alert.alert('Error', 'Failed to save questions to the database.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.bluePure} />
      </View>
    );
  }

  return (
    <View style={[ui.screen, styles.container]}>
      {questions.length > 0 ? (
        <View style={styles.contentWrap}>
          <View style={ui.card}>
            <Text style={styles.questionText}>
              Q{currentQuestionIndex + 1}: {questions[currentQuestionIndex].question}
            </Text>
            {questions[currentQuestionIndex].options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.answerButton}
                onPress={() => handleSelectAnswer(option)}
              >
                <Text style={styles.answerText}>
                  {String.fromCharCode(65 + index)}. {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>No questions available.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
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
  },
  questionText: {
    fontSize: type.bodyLg,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  answerButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: colors.neutral200,
    marginVertical: 5,
  },
  answerText: {
    fontSize: type.body,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: type.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default RandomQuestionsScreen;
