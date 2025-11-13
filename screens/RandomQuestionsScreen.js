import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Switch to local backend for testing (change to false for production)
const USE_LOCAL_BACKEND = false;
const API_BASE_URL = USE_LOCAL_BACKEND 
  ? `http://127.0.0.1:6000`  // Local backend (127.0.0.1 works better for iOS Simulator)
  : `https://cognizen-x-backend.vercel.app`;  // Production backend

const RandomQuestionsScreen = ({ route, navigation }) => {
  console.log(route.params)
  const { categories, subDomain } = route.params; // Fetch subDomain from params
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const questionsGeneratedRef = useRef(false); // Track if we've attempted generation

  

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
    const updatedAnswers = [...selectedAnswers, { question: questions[currentQuestionIndex], answer: option }];
    setSelectedAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Pass category and subDomain for explanation caching
      navigation.navigate('AnswerScreen', { 
        selectedAnswers, 
        questions,
        category: categories[0] || categories.join(','),
        subDomain: subDomain
      });
    }
  };

  const saveQuestionsToDatabase = async (questions) => {
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/add-questions`,
        { questions },
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );
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
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {questions.length > 0 ? (
        <View>
          <Text style={styles.questionText}>
            Q{currentQuestionIndex + 1}: {questions[currentQuestionIndex].question}
          </Text>
          {questions[currentQuestionIndex].options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.answerButton}
              onPress={() => handleSelectAnswer(option)}
            >
              <Text style={styles.answerText}>{String.fromCharCode(65 + index)}. {option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text>No questions available.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  answerButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    marginVertical: 5,
  },
  answerText: {
    fontSize: 16,
  },
});

export default RandomQuestionsScreen;
