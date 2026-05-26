import AsyncStorage from "@react-native-async-storage/async-storage";

import { SESSION_TOKEN_KEY } from "../config/backend";

const LEGACY_SESSION_TOKEN_KEY = "sessionToken";

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
  await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
  await AsyncStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
}
