import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { API_BASE_URL } from "../config/backend";
import { posthog } from "../config/posthog";
import { getStoredSessionToken } from "./session";

const USER_ID_KEY = `analyticsUserId:${API_BASE_URL}`;
const CONSENT_KEY = `analyticsConsent:${API_BASE_URL}`;
const LAST_OPEN_KEY = `analyticsLastOpenAt:${API_BASE_URL}`;
const OPENED_THIS_PROCESS_KEY = "__mindmitra_app_opened_this_process";

/** Process-local flag so warm resumes in the same JS runtime don't look like cold opens. */
let openedThisProcess = false;

function toBool(value) {
  return value === true || value === "true";
}

export async function getCachedUserId() {
  return AsyncStorage.getItem(USER_ID_KEY);
}

export async function setCachedUserId(userId) {
  if (!userId) {
    await AsyncStorage.removeItem(USER_ID_KEY);
    return;
  }
  await AsyncStorage.setItem(USER_ID_KEY, String(userId));
}

export async function getCachedAnalyticsConsent() {
  const raw = await AsyncStorage.getItem(CONSENT_KEY);
  return toBool(raw);
}

export async function setCachedAnalyticsConsent(consent) {
  await AsyncStorage.setItem(CONSENT_KEY, consent ? "true" : "false");
}

export async function clearAnalyticsIdentityCache() {
  await AsyncStorage.multiRemove([USER_ID_KEY, CONSENT_KEY]);
}

export async function applyAnalyticsConsent(consent) {
  const enabled = Boolean(consent);
  await setCachedAnalyticsConsent(enabled);
  if (!posthog) return enabled;

  if (enabled) {
    posthog.optIn();
  } else {
    posthog.optOut();
  }
  return enabled;
}

export function buildPersonProperties(user = {}, extras = {}) {
  const props = {
    platform: Platform.OS,
    analyticsConsent: Boolean(user.analyticsConsent),
  };

  if (typeof user.isInternal === "boolean") {
    props.isInternal = user.isInternal;
  }
  if (user.highestEducationLevel) {
    props.highestEducationLevel = user.highestEducationLevel;
  }
  if (user.countryOfOrigin) {
    props.countryOfOrigin = user.countryOfOrigin;
  }
  if (Array.isArray(extras.selected_categories)) {
    props.selected_categories = extras.selected_categories;
  }

  return props;
}

/**
 * Identify the current user and sync consent. Safe to call repeatedly.
 */
export async function identifyAnalyticsUser(user, extras = {}) {
  if (!posthog || !user?.id) return;

  const userId = String(user.id);
  await setCachedUserId(userId);
  await applyAnalyticsConsent(Boolean(user.analyticsConsent));

  const personProps = buildPersonProperties(user, extras);
  const setOnce = {};
  if (user.createdAt || user.signup_date) {
    setOnce.signup_date = user.signup_date || user.createdAt;
  } else {
    setOnce.signup_date = new Date().toISOString().slice(0, 10);
  }

  posthog.identify(userId, {
    $set: personProps,
    $set_once: setOnce,
  });
}

export async function fetchCurrentUser(sessionToken) {
  const token = sessionToken || (await getStoredSessionToken());
  if (!token) return null;

  const resp = await axios.get(`${API_BASE_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 8000,
  });
  return resp?.data?.user || null;
}

/**
 * On cold start with a stored session: load /me, apply consent, identify.
 * Without a session: restore local consent (default opt-out).
 */
export async function restoreAnalyticsSession() {
  const token = await getStoredSessionToken();
  if (!token) {
    const localConsent = await getCachedAnalyticsConsent();
    await applyAnalyticsConsent(localConsent);
    return null;
  }

  try {
    const cachedId = await getCachedUserId();
    const cachedConsent = await getCachedAnalyticsConsent();
    if (cachedId) {
      await applyAnalyticsConsent(cachedConsent);
      if (posthog && cachedConsent) {
        posthog.identify(String(cachedId), {
          $set: { platform: Platform.OS, analyticsConsent: cachedConsent },
        });
      }
    }

    const user = await fetchCurrentUser(token);
    if (user) {
      await identifyAnalyticsUser(user);
    }
    return user;
  } catch (error) {
    console.warn(
      "Analytics session restore failed:",
      error?.response?.data?.message || error?.message || error
    );
    const localConsent = await getCachedAnalyticsConsent();
    await applyAnalyticsConsent(localConsent);
    return null;
  }
}

export async function trackAppOpened(explicitLaunchType) {
  if (!posthog) return;

  const launchType =
    explicitLaunchType || (openedThisProcess ? "warm" : "cold");
  openedThisProcess = true;

  let daysSinceLastOpen = null;
  try {
    const raw = await AsyncStorage.getItem(LAST_OPEN_KEY);
    if (raw) {
      const last = new Date(raw).getTime();
      if (!Number.isNaN(last)) {
        daysSinceLastOpen = Math.max(
          0,
          Math.floor((Date.now() - last) / (24 * 60 * 60 * 1000))
        );
      }
    }
  } catch (_) {
    // ignore storage errors
  }

  await AsyncStorage.setItem(LAST_OPEN_KEY, new Date().toISOString());

  posthog.capture("app_opened", {
    launch_type: launchType,
    days_since_last_open: daysSinceLastOpen,
  });
}

export function captureEvent(event, properties = {}) {
  posthog?.capture(event, properties);
}

export { OPENED_THIS_PROCESS_KEY };
