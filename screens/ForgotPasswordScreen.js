import React, { useState, useRef } from "react";
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
} from "react-native";
import { requestPasswordReset } from "../services/api";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const resp = await requestPasswordReset(email);
      // Backend should respond with success message
      Alert.alert("Check your email", resp.data?.message || "We sent a password reset link to your email.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>Enter your account email and we'll send a reset link.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />

            {loading ? (
              <ActivityIndicator size="large" color="#A78BFA" style={{ marginTop: 16 }} />
            ) : (
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitText}>Send Reset Link</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F3FF" },
  container: { flex: 1, padding: 24 },
  header: { marginTop: 40, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#4B5563", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B7280" },
  form: { backgroundColor: "#FFF", padding: 20, borderRadius: 12, shadowColor: "#A78BFA", shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  label: { fontSize: 14, fontWeight: "600", color: "#4B5563", marginBottom: 8 },
  input: { height: 50, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FAFAFA" },
  submitButton: { marginTop: 16, backgroundColor: "#A78BFA", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  cancel: { marginTop: 12, alignItems: "center" },
  cancelText: { color: "#6B7280" },
});

export default ForgotPasswordScreen;
