import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView, StatusBar } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Switch to local backend for testing (change to false for production)
const USE_LOCAL_BACKEND = false;
const API_BASE_URL = USE_LOCAL_BACKEND 
  ? `http://127.0.0.1:6000`  // Local backend
  : `https://cognizen-x-backend.vercel.app`;  // Production backend

const AnswerScreen = ({ route, navigation }) => {
  const { selectedAnswers = [], questions = [], category, subDomain } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Results</Text>
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
            <View style={styles.questionCard}>
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
                    <ActivityIndicator size="small" color="#A78BFA" />
                    <Text style={styles.loaderText}>Loading explanation...</Text>
                  </View>
                ) : (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>Explanation:</Text>
                    <Text style={styles.descriptionText}>{description}</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.noQuestionsText}>No questions available.</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginTop: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A78BFA',
    borderRadius: 3,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionCounter: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
    textAlign: 'center',
  },
  answerSection: {
    width: '100%',
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#4B5563',
  },
  correctAnswerContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  userAnswerContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  correctBg: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  incorrectBg: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  correctAnswerText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
  },
  userAnswerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  correctText: {
    color: '#10B981',
  },
  incorrectText: {
    color: '#EF4444',
  },
  loaderContainer: {
    alignItems: 'center',
    padding: 15,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  descriptionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#4B5563',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    textAlign: 'left',
  },
  nextButton: {
    backgroundColor: '#A78BFA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noQuestionsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default AnswerScreen;
