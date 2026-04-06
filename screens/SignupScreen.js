import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import DateTimePicker from "@react-native-community/datetimepicker";

import { colors, shadow } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL, SESSION_TOKEN_KEY } from "../config/backend";

const { width } = Dimensions.get("window");

countries.registerLocale(en);
const COUNTRY_OPTIONS = Object.entries(
  countries.getNames("en", { select: "official" })
)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const GENDER_OPTIONS = [
  { label: "Select gender...", value: "" },
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Non-binary", value: "non_binary" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
];

function formatDateOnlyLocal(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnlyString(value) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [yyyy, mm, dd] = s.split("-").map((x) => Number(x));
  if (!yyyy || !mm || !dd) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobPickerDate, setDobPickerDate] = useState(new Date());
  const [yearsOfEducation, setYearsOfEducation] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const dobRef = useRef(null);
  const genderRef = useRef(null);
  const countryOfOriginRef = useRef(null);
  const yearsOfEducationRef = useRef(null);
  const passwordRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const selectedGenderLabel =
    GENDER_OPTIONS.find((g) => g.value === gender)?.label || "";

  const selectedCountryCode = countryOfOrigin ? String(countryOfOrigin).toUpperCase() : "";
  const selectedCountryLabel = selectedCountryCode
    ? countries.getName(selectedCountryCode, "en", { select: "official" })
    : "";

  const filteredCountries = COUNTRY_OPTIONS.filter((c) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

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

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/signup`,
        {
          name,
          email,
          password,
          // Expect YYYY-MM-DD (ISO date-only). Backend accepts ISO date.
          dob: dob ? String(dob).trim() : undefined,
          gender: gender || undefined,
          countryOfOrigin: countryOfOrigin ? String(countryOfOrigin).toUpperCase() : undefined,
          yearsOfEducation: yearsOfEducation ? Number(yearsOfEducation) : undefined,
        },
        {
          timeout: 10000, // 10 second timeout to avoid hanging
        }
      );

      const { sessionToken } = response.data;
      if (!sessionToken) {
        Alert.alert("Signup Failed", "No session token received from server.");
        return;
      }
      
      console.log("Received sessionToken from backend:", sessionToken.substring(0, 20) + "...");
      console.log("Full token length:", sessionToken.length);
      
      // Save token and verify it was saved before navigating
      await AsyncStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
      
      // Verify token was saved
      const savedToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      if (savedToken !== sessionToken) {
        console.error("Token mismatch! Saved:", savedToken?.substring(0, 20), "vs Received:", sessionToken.substring(0, 20));
        Alert.alert("Error", "Failed to save session token. Please try again.");
        return;
      }
      
      console.log("Token saved successfully to AsyncStorage");
      
      // Verify token is valid by making a test call to backend
      // This ensures the token was actually saved to the database
      // Optimized: Skip verification if backend already verified (faster signup)
      // Only verify if we're concerned about timing issues
      try {
        console.log("Verifying token with backend...");
        const verifyResponse = await axios.get(`${API_BASE_URL}/api/auth/get-user-id`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
          timeout: 3000, // 3 second timeout
        });
        console.log("Token verified successfully! User ID:", verifyResponse.data.userId);
      } catch (verifyError) {
        // If verification fails, it might just be timing - token should work on next request
        // Don't block the user - let them proceed and HomeScreen will handle it
        console.warn("Token verification failed (may be timing issue):", verifyError.response?.data?.message || verifyError.message);
        // Continue anyway - the token was saved, it should work
      }
      
      console.log("Navigating to Home screen...");
      navigation.replace("Home");
    } catch (error) {
      Alert.alert(
        "Signup Failed",
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
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
   <Animated.View style={[
            styles.container,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>CognizenX</Text>
              <Text style={styles.subtitle}>Create Account</Text>
              <Text style={styles.description}>Join us to begin your memory care journey</Text>
            </View>

            <View style={ui.formCard}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={nameRef}
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.gray400}
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => {
                      emailRef.current && emailRef.current.focus();
                    }}
                  />
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    onPress={() => {
                      const parsed = parseDateOnlyString(dob);
                      setDobPickerDate(parsed || new Date());
                      setDobPickerVisible(true);
                    }}
                    style={styles.selectButton}
                    accessibilityRole="button"
                    accessibilityLabel="Select date of birth"
                  >
                    <Text style={dob ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
                      {dob ? dob : "Select date..."}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    onPress={() => setGenderModalVisible(true)}
                    style={styles.selectButton}
                    accessibilityRole="button"
                    accessibilityLabel="Select gender"
                  >
                    <Text
                      style={gender ? styles.selectText : styles.selectPlaceholder}
                      numberOfLines={1}
                    >
                      {gender ? selectedGenderLabel : "Select gender..."}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Country of Origin</Text>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    onPress={() => {
                      setCountrySearch("");
                      setCountryModalVisible(true);
                    }}
                    style={styles.selectButton}
                    accessibilityRole="button"
                    accessibilityLabel="Select country of origin"
                  >
                    <Text
                      style={countryOfOrigin ? styles.selectText : styles.selectPlaceholder}
                      numberOfLines={1}
                    >
                      {countryOfOrigin
                        ? `${selectedCountryLabel} (${selectedCountryCode})`
                        : "Select country..."}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Years of Education</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter years of education"
                    placeholderTextColor={colors.gray400}
                    value={yearsOfEducation}
                    onChangeText={setYearsOfEducation}
                    keyboardType="numeric"
                  />
                </View>
              </View>


              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.gray400}
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
                <View style={[styles.inputWrapper, styles.passwordInputWrapper]}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Create a password"
                    placeholderTextColor={colors.gray400}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    returnKeyType="go"
                    onSubmitEditing={handleSignup}
                  />
                  <TouchableOpacity
                    onPress={() => setPasswordVisible((v) => !v)}
                    style={styles.passwordToggle}
                    accessibilityRole="button"
                    accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                  >
                    <Text style={styles.passwordToggleText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={colors.brand} style={styles.loader} />
              ) : (
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity 
                    style={styles.signupButton} 
                    onPress={handleSignup}
                    activeOpacity={0.9}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  >
                    <View style={ui.brandFill}>
                      <Text style={styles.signupButtonText}>Create Account</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.loginPrompt}>
                Already have an account?{" "}
                <Text
                  style={styles.loginLink}
                  onPress={() => navigation.navigate("Login")}
                >
                  Sign In
                </Text>
              </Text>
            </View>
          </Animated.View>
          </ScrollView>
       
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* Gender Modal */}
      <Modal
        visible={genderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setGenderModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBackdrop} />
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                {GENDER_OPTIONS.map((opt, idx) => (
                  <View key={opt.value || "__empty"}>
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        setGender(opt.value);
                        setGenderModalVisible(false);
                      }}
                    >
                      <Text style={styles.modalOptionText}>{opt.label}</Text>
                    </TouchableOpacity>
                    {idx < GENDER_OPTIONS.length - 1 ? (
                      <View style={styles.modalDivider} />
                    ) : null}
                  </View>
                ))}
                <View style={styles.modalSpacer} />
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setGenderModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Country Modal */}
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCountryModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBackdrop} />
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <View style={styles.modalSearchWrapper}>
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="Search country"
                    placeholderTextColor={colors.gray400}
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalList}>
                  <FlatList
                    data={filteredCountries}
                    keyExtractor={(item) => item.code}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.modalOption}
                        onPress={() => {
                          setCountryOfOrigin(item.code);
                          setCountryModalVisible(false);
                        }}
                      >
                        <Text style={styles.modalOptionText} numberOfLines={1}>
                          {item.name} ({item.code})
                        </Text>
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                  />
                </View>

                <View style={styles.modalSpacer} />
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setCountryModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* DOB Picker */}
      {Platform.OS === "ios" ? (
        <Modal
          visible={dobPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDobPickerVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setDobPickerVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalBackdrop} />
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Select Date of Birth</Text>
                  <DateTimePicker
                    value={dobPickerDate}
                    mode="date"
                    display="inline"
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      if (selectedDate) setDobPickerDate(selectedDate);
                    }}
                  />
                  <View style={styles.modalSpacer} />
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => {
                      setDob(formatDateOnlyLocal(dobPickerDate));
                      setDobPickerVisible(false);
                    }}
                  >
                    <Text style={styles.modalCancelText}>Done</Text>
                  </TouchableOpacity>
                  <View style={styles.modalSpacer} />
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => setDobPickerVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      ) : null}

      {Platform.OS === "android" && dobPickerVisible ? (
        <DateTimePicker
          value={dobPickerDate}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setDobPickerVisible(false);
            if (event?.type === "set" && selectedDate) {
              setDob(formatDateOnlyLocal(selectedDate));
            }
          }}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: colors.backgroundTint,
    opacity: 0.8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerContainer: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: colors.gray400,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    overflow: 'hidden',
  },

  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
  },

  passwordToggle: {
    paddingHorizontal: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  passwordToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  selectButton: {
    height: 56,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  selectText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  selectPlaceholder: {
    fontSize: 16,
    color: colors.gray400,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.textSecondary,
    opacity: 0.35,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 14,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.gray200,
  },
  modalSearchWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    overflow: "hidden",
    marginBottom: 12,
  },
  modalSearchInput: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalList: {
    maxHeight: 360,
  },
  modalSpacer: {
    height: 12,
  },
  modalCancel: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  signupButton: {
    height: 56,
    borderRadius: 14,
    marginTop: 12,
    overflow: 'hidden',
    ...shadow({ color: colors.brand, offsetHeight: 4, opacity: 0.3, radius: 10, elevation: 6 }),
  },
  signupButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginPrompt: {
    fontSize: 16,
    color: colors.textMuted,
  },
  loginLink: {
    color: colors.brand,
    fontWeight: "600",
  },
  loader: {
    marginTop: 16,
  },
});

export default SignupScreen;
