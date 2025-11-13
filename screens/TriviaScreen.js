import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Dimensions,
  StatusBar,
  Animated,
  TouchableWithoutFeedback
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Menu from './Menu';

const { width, height } = Dimensions.get('window');
const MENU_ICON = '≡';
const CLOSE_ICON = '✕';

const TriviaScreen = ({ route }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const menuAnimation = useRef(new Animated.Value(-width * 0.7)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const navigation = useNavigation();

  const { category, subDomain } = route.params;

  // Switch to local backend for testing (change to false for production)
  const USE_LOCAL_BACKEND = false;
  const API_BASE_URL = USE_LOCAL_BACKEND 
    ? `http://127.0.0.1:6000`  // Local backend
    : `https://cognizen-x-backend.vercel.app`;  // Production backend
  const QUESTIONS_API_URL = `${API_BASE_URL}/api/questions?category=${category}&subDomain=${subDomain}`;

  // Toggle menu function
  const toggleMenu = () => {
    if (menuOpen) {
      // Close menu
      Animated.parallel([
        Animated.timing(menuAnimation, {
          toValue: -width * 0.7,
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#A78BFA" />
          <Text style={styles.loadingText}>Loading Questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      
      {/* Menu */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            transform: [{ translateX: menuAnimation }],
          },
        ]}
      >
        <Menu onClose={toggleMenu} onLogout={handleLogout} navigation={navigation} />
      </Animated.View>
      
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
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
              <Text style={styles.menuIcon}>{menuOpen ? CLOSE_ICON : MENU_ICON}</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>{category}: {subDomain}</Text>
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
            <View style={styles.questionCard}>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
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
  menuButton: {
    padding: 5,
  },
  menuIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 10,
    textTransform: 'capitalize',
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
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
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
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#1F2937',
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
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedAnswerButton: {
    backgroundColor: '#EDE9FE',
    borderColor: '#A78BFA',
  },
  optionLabelContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  answerText: {
    fontSize: 16,
    color: '#4B5563',
    flex: 1,
  },
  selectedAnswerText: {
    color: '#6D28D9',
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
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default TriviaScreen;
