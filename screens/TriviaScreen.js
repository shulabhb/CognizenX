import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Dimensions,
  useWindowDimensions,
  StatusBar,
  Animated,
  TouchableWithoutFeedback,
  Alert
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Menu, { getMenuWidth } from './Menu';

import { colors, spacing } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL } from "../config/backend";

const { width, height } = Dimensions.get('window');
const MENU_ICON = '≡';
const CLOSE_ICON = '✕';

const TriviaScreen = ({ route }) => {
  const { width: screenWidth } = useWindowDimensions();
  const menuWidth = getMenuWidth(screenWidth);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const menuAnimation = useRef(new Animated.Value(-menuWidth)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!menuOpen) {
      menuAnimation.setValue(-menuWidth);
    }
  }, [menuWidth, menuOpen, menuAnimation]);

  const navigation = useNavigation();

  const { category, subDomain } = route.params;

  const QUESTIONS_API_URL = `${API_BASE_URL}/api/questions?category=${category}&subDomain=${subDomain}`;

  // Toggle menu function
  const toggleMenu = () => {
    if (menuOpen) {
      // Close menu
      Animated.parallel([
        Animated.timing(menuAnimation, {
          toValue: -menuWidth,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(screenOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Open menu
      Animated.parallel([
        Animated.timing(menuAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(screenOpacity, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        console.log(QUESTIONS_API_URL);
        const response = await axios.get(QUESTIONS_API_URL);
       
        console.log('API Response:', response);

        const allQuestions = response.data.questions;

        // Select 10 random questions
        const shuffledQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);

        setQuestions(shuffledQuestions);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching questions:', error);
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [category, subDomain]);

  const handleSelectAnswer = (option, index) => {
    const scaleDown = Animated.spring(buttonScale, {
      toValue: 0.95,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    });
    
    const scaleUp = Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    });
    
    scaleDown.start(() => {
      setSelectedOption(index);
      const updatedAnswers = [...selectedAnswers, { question: questions[currentQuestionIndex].question, answer: option }];
      setSelectedAnswers(updatedAnswers);
      
      scaleUp.start();
      
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setSelectedOption(null);
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          
          // Animate question transition
          fadeAnim.setValue(0);
          slideAnim.setValue(30);
          
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          // Navigate to the results/answer screen
          navigation.navigate('AnswerScreen', { 
            selectedAnswers, 
            questions,
            category: category,
            subDomain: subDomain
          });
        }
      }, 500);
    });
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("sessionToken");
      Alert.alert("Logout Successful", "You have been logged out.");
      navigation.replace("Login");
    } catch (error) {
      console.error("Logout Error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={ui.screen}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Loading Questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={ui.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Drawer Menu */}
      <Menu
        navigation={navigation}
        isOpen={menuOpen}
        closeMenu={toggleMenu}
        menuAnimation={menuAnimation}
        handleLogout={handleLogout}
      />
      
      {/* Main Content */}
      <Animated.View
        style={[
          styles.container,
          {
            opacity: screenOpacity,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={() => menuOpen && toggleMenu()}>
          <View style={ui.header}>
            <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
              <Text style={styles.menuIcon}>{menuOpen ? CLOSE_ICON : MENU_ICON}</Text>
            </TouchableOpacity>
            <Text style={ui.screenTitle}>{category}: {subDomain}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </TouchableWithoutFeedback>

        {questions.length > 0 ? (
          <Animated.View 
            style={[
              styles.questionContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={ui.card}>
              <Text style={styles.questionCounter}>Question {currentQuestionIndex + 1} of {questions.length}</Text>
              <Text style={styles.questionText}>{questions[currentQuestionIndex].question}</Text>
              
              <View style={styles.optionsContainer}>
                {questions[currentQuestionIndex].options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSelectAnswer(option, index)}
                    style={[
                      styles.answerButton,
                      selectedOption === index && styles.selectedAnswerButton,
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionLabelContainer}>
                      <Text style={styles.optionLabel}>{String.fromCharCode(65 + index)}</Text>
                    </View>
                    <Text style={[
                      styles.answerText,
                      selectedOption === index && styles.selectedAnswerText
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.noQuestionsContainer}>
            <Text style={styles.noQuestionsText}>No questions available.</Text>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: colors.textHint,
  },
  menuButton: {
    padding: 5,
  },
  menuIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
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
  questionContainer: {
    flex: 1,
    padding: spacing.xl,
  },
  questionCounter: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 10,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 25,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  optionsContainer: {
    marginTop: 10,
  },
  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  selectedAnswerButton: {
    backgroundColor: colors.brandSelectedBg,
    borderColor: colors.brand,
  },
  optionLabelContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  answerText: {
    fontSize: 16,
    color: colors.textSecondary,
    flex: 1,
  },
  selectedAnswerText: {
    color: colors.brandSelectedText,
    fontWeight: '500',
  },
  noQuestionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noQuestionsText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default TriviaScreen;
