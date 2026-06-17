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
  Pressable,
  ScrollView,
} from "react-native";
import axios from "axios";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import DateTimePicker from "@react-native-community/datetimepicker";

import { colors, shadow } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL } from "../config/backend";
import { signup as signupRequest } from "../services/api";
import { getStoredSessionToken, saveSessionToken } from "../utils/session";
import { EDUCATION_LEVEL_OPTIONS, getEducationLevelLabel } from "../constants/educationLevels";

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

function validateSignupForm({ name, email, password, dob, gender, countryOfOrigin, highestEducationLevel }) {
  if (!name?.trim()) return "Name is required.";
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    return "Name can only contain letters, spaces, hyphens, and apostrophes.";
  }
  if (!email?.trim()) return "Email is required.";
  if (!password || password.length < 6) return "Password must be at least 6 characters.";
  if (!dob?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
    return "Please select your date of birth.";
  }
  if (!gender) return "Please select your gender.";
  if (!countryOfOrigin) return "Please select your country of origin.";
  if (!highestEducationLevel) return "Please select your highest education level.";
  return null;
}

function formatSignupError(error) {
  const data = error?.response?.data;
  if (!data) return error?.message || "Something went wrong.";
  if (Array.isArray(data.details) && data.details.length > 0) {
    const labels = {
      dob: "Date of birth",
      age: "Age",
      gender: "Gender",
      countryOfOrigin: "Country of origin",
      highestEducationLevel: "Highest education level",
      yearsOfEducation: "Years of education",
      name: "Name",
      email: "Email",
      password: "Password",
    };
    return data.details
      .map((detail) => {
        const label = labels[detail.field] || detail.field || "Field";
        const message = String(detail.message || "Invalid value")
          .replace(/^"[^"]*"\s+/, "")
          .replace(/^value\s+/i, "");
        return `• ${label}: ${message}`;
      })
      .join("\n");
  }
  return data.message || "Something went wrong.";
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
  const [educationModalVisible, setEducationModalVisible] = useState(false);
  const [highestEducationLevel, setHighestEducationLevel] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const dobRef = useRef(null);
  const genderRef = useRef(null);
  const countryOfOriginRef = useRef(null);
  const passwordRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const selectedGenderLabel =
    GENDER_OPTIONS.find((g) => g.value === gender)?.label || "";

  const selectedEducationLabel = getEducationLevelLabel(highestEducationLevel);

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
    const validationError = validateSignupForm({
      name,
      email,
      password,
      dob,
      gender,
      countryOfOrigin,
      highestEducationLevel,
    });
    if (validationError) {
      Alert.alert("Missing information", validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await signupRequest({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        dob: String(dob).trim(),
        gender,
        countryOfOrigin: String(countryOfOrigin).toUpperCase(),
        highestEducationLevel,
      });

      const { sessionToken } = response.data;
      if (!sessionToken) {
        Alert.alert("Signup Failed", "No session token received from server.");
        return;
      }
      
      console.log("Received sessionToken from backend:", sessionToken.substring(0, 20) + "...");
      console.log("Full token length:", sessionToken.length);
      
      // Save token and verify it was saved before navigating
      await saveSessionToken(sessionToken);
      
      // Verify token was saved
      const savedToken = await getStoredSessionToken();
      if (savedToken !== sessionToken.trim()) {
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
      Alert.alert("Signup Failed", formatSignupError(error));
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
              <Text style={styles.title}>MindMitra</Text>
              <Text style={styles.subtitle}>Create Account</Text>
              <Text style={styles.description}>Create your account to get started.</Text>
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
                <Text style={styles.label}>Highest Education Level</Text>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    onPress={() => setEducationModalVisible(true)}
                    style={styles.selectButton}
                    accessibilityRole="button"
                    accessibilityLabel="Select highest education level"
                  >
                    <Text
                      style={highestEducationLevel ? styles.selectText : styles.selectPlaceholder}
                      numberOfLines={2}
                    >
                      {highestEducationLevel ? selectedEducationLabel : "Select education level..."}
                    </Text>
                  </TouchableOpacity>
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
        <Pressable style={styles.modalOverlay} onPress={() => setGenderModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {GENDER_OPTIONS.filter((opt) => opt.value).map((opt, idx, arr) => (
              <View key={opt.value}>
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    gender === opt.value ? styles.modalOptionSelected : null,
                  ]}
                  onPress={() => {
                    setGender(opt.value);
                    setGenderModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      gender === opt.value ? styles.modalOptionTextSelected : null,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
                {idx < arr.length - 1 ? <View style={styles.modalDivider} /> : null}
              </View>
            ))}
            <View style={styles.modalSpacer} />
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => setGenderModalVisible(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Education Level Modal */}
      <Modal
        visible={educationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEducationModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEducationModalVisible(false)}>
          <Pressable style={[styles.modalCard, styles.modalCardTall]} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Highest Education Level</Text>
            <View style={styles.modalList}>
              <FlatList
                data={EDUCATION_LEVEL_OPTIONS}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item, index }) => {
                  const isSelected = highestEducationLevel === item.value;
                  return (
                    <View>
                      <TouchableOpacity
                        style={[styles.modalOption, isSelected ? styles.modalOptionSelected : null]}
                        onPress={() => {
                          setHighestEducationLevel(item.value);
                          setEducationModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected ? styles.modalOptionTextSelected : null,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                      {index < EDUCATION_LEVEL_OPTIONS.length - 1 ? (
                        <View style={styles.modalDivider} />
                      ) : null}
                    </View>
                  );
                }}
              />
            </View>
            <View style={styles.modalSpacer} />
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => setEducationModalVisible(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Country Modal */}
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCountryModalVisible(false)}>
          <Pressable style={[styles.modalCard, styles.modalCardTall]} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Country of Origin</Text>
            <View style={styles.modalSearchWrapper}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search country"
                placeholderTextColor={colors.gray400}
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoCorrect={false}
                autoCapitalize="none"
                keyboardAppearance="light"
              />
            </View>

            <View style={styles.modalList}>
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                renderItem={({ item }) => {
                  const isSelected = countryOfOrigin === item.code;
                  return (
                    <TouchableOpacity
                      style={[styles.modalOption, isSelected ? styles.modalOptionSelected : null]}
                      onPress={() => {
                        setCountryOfOrigin(item.code);
                        setCountryModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          isSelected ? styles.modalOptionTextSelected : null,
                        ]}
                        numberOfLines={1}
                      >
                        {item.name} ({item.code})
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
              />
            </View>

            <View style={styles.modalSpacer} />
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => setCountryModalVisible(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* DOB Picker */}
      {Platform.OS === "ios" ? (
        <Modal
          visible={dobPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDobPickerVisible(false)}
        >
          <Pressable style={styles.dobModalOverlay} onPress={() => setDobPickerVisible(false)}>
            <Pressable style={styles.dobModalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <Text style={styles.dobPreviewText}>{formatDateOnlyLocal(dobPickerDate)}</Text>
              <View style={styles.dobPickerShell}>
                <DateTimePicker
                  value={dobPickerDate}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  textColor={colors.textPrimary}
                  accentColor={colors.brandDark}
                  maximumDate={new Date()}
                  style={styles.dobPicker}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setDobPickerDate(selectedDate);
                  }}
                />
              </View>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => {
                  setDob(formatDateOnlyLocal(dobPickerDate));
                  setDobPickerVisible(false);
                }}
              >
                <View style={ui.brandFill}>
                  <Text style={styles.modalPrimaryButtonText}>Done</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSecondaryButton, styles.modalSecondaryButtonSpaced]}
                onPress={() => setDobPickerVisible(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
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
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 18,
    color: colors.gray400,
    textAlign: "center",
    lineHeight: 28,
    maxWidth: 330,
  },
  inputContainer: {
    marginBottom: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 10,
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
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  passwordToggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand,
  },
  input: {
    height: 60,
    paddingHorizontal: 18,
    fontSize: 18,
    color: colors.textSecondary,
  },
  selectButton: {
    height: 60,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  selectText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  selectPlaceholder: {
    fontSize: 18,
    color: colors.gray400,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: colors.slate200,
  },
  modalCardTall: {
    maxHeight: "82%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modalOptionSelected: {
    backgroundColor: colors.brandTint,
  },
  modalOptionText: {
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  modalOptionTextSelected: {
    color: colors.brandSelectedText,
    fontWeight: "700",
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.slate200,
  },
  modalSearchWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
    overflow: "hidden",
    marginBottom: 12,
  },
  modalSearchInput: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 17,
    color: colors.textPrimary,
    backgroundColor: colors.slate50,
  },
  modalList: {
    maxHeight: 360,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
    overflow: "hidden",
  },
  modalSpacer: {
    height: 12,
  },
  dobModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    paddingHorizontal: 24,
  },
  dobModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.slate200,
    ...shadow({ color: colors.black, offsetHeight: 4, opacity: 0.18, radius: 12, elevation: 8 }),
  },
  dobPreviewText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.brandSelectedText,
    textAlign: "center",
    marginBottom: 12,
  },
  dobPickerShell: {
    backgroundColor: colors.slate100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: "hidden",
    marginBottom: 16,
  },
  dobPicker: {
    height: 216,
    width: "100%",
    backgroundColor: colors.slate100,
  },
  modalPrimaryButton: {
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
  },
  modalPrimaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
  },
  modalSecondaryButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryButtonSpaced: {
    marginTop: 10,
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  signupButton: {
    height: 62,
    borderRadius: 18,
    marginTop: 12,
    overflow: 'hidden',
    ...shadow({ color: colors.brand, offsetHeight: 4, opacity: 0.3, radius: 10, elevation: 6 }),
  },
  signupButtonText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginPrompt: {
    fontSize: 17,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 26,
  },
  loginLink: {
    color: colors.brand,
    fontWeight: "700",
  },
  loader: {
    marginTop: 16,
  },
});

export default SignupScreen;
