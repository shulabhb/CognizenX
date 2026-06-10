import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import SignupScreen from "./screens/SignupScreen";
import LoginScreen from "./screens/LoginScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import HomeScreen from "./screens/HomeScreen";
import CategoriesScreen from  "./screens/CategoriesScreen";
import TriviaScreen from "./screens/TriviaScreen";
import AnswerScreen from "./screens/AnswerScreen";
import QuizScreen from "./screens/QuizScreen";
import GamesScreen from "./screens/GamesScreen";
import SnakeGameScreen from "./screens/SnakeGameScreen";
import SnakeTouch from "./screens/SnakeTouch";
import PuzzlesGameScreen from "./screens/PuzzlesGameScreen";
import MemoryMatchGame from "./screens/MemoryMatchGame";
import PatternGame from "./screens/PatternGame";
import OddOneOutGame from "./screens/OddOneOutGame";
import WordUnscrambleGame from "./screens/WordUnscrambleGame";
import SortCategoriesGame from "./screens/SortCategoriesGame";
import TrailConnectGame from "./screens/TrailConnectGame";
import SteadyFocusGame from "./screens/SteadyFocusGame";
import OrderStepsGame from "./screens/OrderStepsGame";
import AccountScreen from "./screens/AccountScreen";
import PerformanceScreen from "./screens/PerformanceScreen";
import { colors, spacing } from "./styles/theme";
import { getStoredSessionToken } from "./utils/session";

const Stack = createStackNavigator();

const LaunchScreen = () => (
  <SafeAreaView style={styles.launchScreen}>
    <View style={styles.launchCard}>
      <Text style={styles.launchEyebrow}>MindMitra</Text>
      <Text style={styles.launchTitle}>Checking sign-in</Text>
      <Text style={styles.launchSubtitle}>
        Please wait a moment.
      </Text>
      <ActivityIndicator size="large" color={colors.brandDark} style={styles.launchSpinner} />
    </View>
  </SafeAreaView>
);

const App = () => {
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const sessionToken = await getStoredSessionToken();
        if (isMounted) {
          setInitialRouteName(sessionToken ? "Home" : "Login");
        }
      } catch (error) {
        if (isMounted) {
          setInitialRouteName("Login");
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!initialRouteName) {
    return <LaunchScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRouteName}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Categories"
          component={CategoriesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Games"
          component={GamesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Account"
          component={AccountScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Performance"
          component={PerformanceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SnakeGame"
          component={SnakeGameScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SnakeTouch"
          component={SnakeTouch}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PuzzlesGame"
          component={PuzzlesGameScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MemoryMatchGame"
          component={MemoryMatchGame}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PatternGame"
          component={PatternGame}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OddOneOutGame"
          component={OddOneOutGame}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="WordUnscrambleGame"
          component={WordUnscrambleGame}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SortCategoriesGame"
          component={SortCategoriesGame}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TrailConnectGame"
          component={TrailConnectGame}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SteadyFocusGame"
          component={SteadyFocusGame}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderStepsGame"
          component={OrderStepsGame}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Trivia"
          component={TriviaScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Quiz"
          component={QuizScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AnswerScreen"
          component={AnswerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RandomQuestionsScreen"
          component={QuizScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  launchScreen: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  launchCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
  },
  launchEyebrow: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brandDark,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  launchTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
  },
  launchSubtitle: {
    marginTop: spacing.md,
    fontSize: 18,
    lineHeight: 28,
    color: colors.textMuted,
    textAlign: "center",
  },
  launchSpinner: {
    marginTop: spacing.xxl,
  },
});

export default App;
