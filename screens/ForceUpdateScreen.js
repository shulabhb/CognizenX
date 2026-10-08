import React from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../styles/theme";

const IOS_STORE_URL = "https://apps.apple.com/";
const ANDROID_STORE_URL = "https://play.google.com/store/apps";

export default function ForceUpdateScreen({
  message,
  minSupportedAppVersion,
}) {
  const openStore = () => {
    const url = Platform.OS === "ios" ? IOS_STORE_URL : ANDROID_STORE_URL;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>MindMitra</Text>
        <Text style={styles.title}>Please update the app</Text>
        <Text style={styles.body}>
          {message ||
            "A newer version of MindMitra is required to continue. Update from the store, then open the app again."}
        </Text>
        {minSupportedAppVersion ? (
          <Text style={styles.meta}>Required version {minSupportedAppVersion}</Text>
        ) : null}
        <Text style={styles.cta} onPress={openStore}>
          Open store
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 28,
  },
  eyebrow: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brandDark,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  body: {
    marginTop: spacing.md,
    fontSize: 18,
    lineHeight: 28,
    color: colors.textMuted,
  },
  meta: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.textMuted,
  },
  cta: {
    marginTop: spacing.xxl,
    fontSize: 18,
    fontWeight: "700",
    color: colors.brandDark,
  },
});
