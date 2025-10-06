import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { CHATGPT_API_KEY } from '@env';


const RandomQuestionsScreen = ({ route, navigation }) => {
  console.log(route.params)
  const { categories, subDomain } = route.params; // Fetch subDomain from params
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);

  

  useEffect(() => {
    if (categories && categories.length > 0) {
      generateAndSaveGPTQuestions(); // Only generate if categories are selected
    }
    fetchRandomQuestions();
  }, [categories]);

  // Function to fetch random questions from your API
  const fetchRandomQuestions = async () => {
    console.log(categories?.join(','));
    try {
      const response = await axios.get('https://cognizen-x-backend.vercel.app/api/random-questions', {
      
        params: { categories: categories.join(',') },
      });
      setQuestions(response.data.questions);
    } catch (error) {
      console.error('Error fetching random questions:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to fetch questions.');
    } finally {
      setLoading(false);
    }
  };

// Function to generate and save questions using GPT-4
const generateAndSaveGPTQuestions = async () => {
  try {
    if (categories.length === 0) {
      Alert.alert('No Categories Selected', 'Please select at least one category.');
      return;
    }

    const prompt = `
      Generate 10 trivia questions related to ${subDomain}.
      Each question should have four multiple-choice options and the correct answer.
      Return *valid* JSON array only. No comments, no markdown, no explanations.

      Example format:
      [
        {
          "question": "What is the capital of France?",
          "options": ["Paris", "Berlin", "Madrid", "Rome"],
          "correct_answer": "Paris"
        }
      ]
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHATGPT_API_KEY}`,
        },
      }
    );

    let rawContent = response.data.choices[0]?.message?.content?.trim();

    // OPTIONAL: Strip markdown if GPT replies in code block
    if (rawContent.startsWith("```json")) {
      rawContent = rawContent.replace(/```json|```/g, "").trim();
    }

    let generatedQuestions;

    try {
      generatedQuestions = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError, '\nRaw content:\n', rawContent);
      Alert.alert('Parsing Error', 'Failed to parse GPT response. Check formatting.');
      return;
    }

    if (Array.isArray(generatedQuestions) && generatedQuestions.length > 0) {
      const formattedQuestions = generatedQuestions.map(q => ({
        "question": q.question,
        "options": q.options,
        "correct_answer": q.correct_answer,
        "subDomain": subDomain
      }));

      // Double-check the backend URL is set
      await axios.post('https://cognizen-x-backend.vercel.app/api/add-questions', {
        category: categories.join(','),
        domain: subDomain,
        questions: formattedQuestions,
      });

      Alert.alert('Success', 'Questions generated and saved successfully!');
    } else {
      console.log('❌ No questions generated or invalid format:', generatedQuestions);
      Alert.alert('Error', 'Failed to generate valid questions.');
    }
  } catch (error) {
    console.error('❌ Error generating questions:', error);
    Alert.alert('Error', `Failed to generate questions: ${error.response?.data?.error?.message || error.message}`);
  }
};



  const handleSelectAnswer = (option) => {
    const updatedAnswers = [...selectedAnswers, { question: questions[currentQuestionIndex], answer: option }];
    setSelectedAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      navigation.navigate('AnswerScreen', { selectedAnswers, questions }); // Redirect to AnswerScreen
    }
  };

  const saveQuestionsToDatabase = async (questions) => {
    try {
      const response = await axios.post('https://dementia-backend-gamma.vercel.app/api/save-questions', { questions });
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
