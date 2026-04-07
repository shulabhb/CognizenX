import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, layout, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL, SESSION_TOKEN_KEY } from "../config/backend";

const RandomQuestionsScreen = ({ route, navigation }) => {
  console.log(route.params)
  const { categories, subDomain } = route.params; // Fetch subDomain from params
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const questionStartAtRef = useRef(Date.now());

  

  useEffect(() => {
    fetchRandomQuestions();
  }, [categories, subDomain]);

  useEffect(() => {
    questionStartAtRef.current = Date.now();
  }, [currentQuestionIndex, questions.length]);

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

    if (questionId) {
      recordAttempt({
        questionId,
        selectedAnswer: option,
        timeTakenMs,
      });
    }

    const updatedAnswers = [...selectedAnswers, { question: currentQuestion, answer: option }];
    setSelectedAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      navigation.navigate('AnswerScreen', {
        selectedAnswers: updatedAnswers,
        questions,
        category: categories[0] || categories.join(','),
        subDomain: subDomain
      });
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
