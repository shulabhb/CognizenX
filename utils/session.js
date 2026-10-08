import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL, SESSION_TOKEN_KEY } from "../config/backend";
import { posthog } from "../config/posthog";

const LEGACY_SESSION_TOKEN_KEY = "sessionToken";
const ANALYTICS_USER_ID_KEY = `analyticsUserId:${API_BASE_URL}`;
const ANALYTICS_CONSENT_KEY = `analyticsConsent:${API_BASE_URL}`;

export async function getStoredSessionToken() {
  const currentToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (currentToken) {
    return currentToken.trim();
  }

  const legacyToken = await AsyncStorage.getItem(LEGACY_SESSION_TOKEN_KEY);
  if (!legacyToken) {
    return null;
  }

  const normalizedToken = legacyToken.trim();
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, normalizedToken);
  await AsyncStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
  return normalizedToken;
}

export async function saveSessionToken(token) {
  const normalizedToken = String(token || "").trim();
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, normalizedToken);
  await AsyncStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
  return normalizedToken;
}

export async function clearStoredSessionToken() {
  posthog?.reset();
  await AsyncStorage.multiRemove([
    SESSION_TOKEN_KEY,
    LEGACY_SESSION_TOKEN_KEY,
    ANALYTICS_USER_ID_KEY,
    ANALYTICS_CONSENT_KEY,
  ]);
}
