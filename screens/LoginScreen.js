import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  Animated,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE_URL = `https://cognizen-x-backend.vercel.app`;
const { width } = Dimensions.get("window");

// Back button icon
const BACK_ICON = "←";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const { sessionToken } = response.data;
      await AsyncStorage.setItem("sessionToken", sessionToken);
      navigation.replace("Home");
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundGradient} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.backButtonText}>{BACK_ICON}</Text>
          </TouchableOpacity>

          <Animated.View style={[
            styles.container,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>CognizenX</Text>
              <Text style={styles.subtitle}>Welcome Back</Text>
              <Text style={styles.description}>Sign in to continue your journey</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => {
                      passwordRef.current && passwordRef.current.focus();
                    }}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                </View>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color="#A78BFA" style={styles.loader} />
              ) : (
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity 
                    style={styles.loginButton} 
                    onPress={handleLogin}
                    activeOpacity={0.9}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  >
                    <View style={styles.buttonGradient}>
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}

              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.signupPrompt}>
                Don't have an account?{" "}
                <Text
                  style={styles.signupLink}
                  onPress={() => navigation.navigate("SignUp")}
                >
                  Sign Up
                </Text>
              </Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F3FF",
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#F5F3FF',
    opacity: 0.8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16, 
    zIndex: 10,
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: "#4B5563",
  },
  headerContainer: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: "#A78BFA",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    overflow: 'hidden',
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#4B5563",
  },
  loginButton: {
    height: 56,
    borderRadius: 14,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: "#A78BFA",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonGradient: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A78BFA',
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  forgotPassword: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: "#A78BFA",
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupPrompt: {
    fontSize: 16,
    color: "#6B7280",
  },
  signupLink: {
    color: "#A78BFA",
    fontWeight: "600",
  },
  loader: {
    marginTop: 16,
  },
});

export default LoginScreen;
