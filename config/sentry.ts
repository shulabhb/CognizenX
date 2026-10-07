import * as Sentry from "@sentry/react-native";
import { SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_SEND_TEST_ERROR } from "@env";
import { APP_VERSION } from "./backend";

const dsn = SENTRY_DSN;

export function initSentry() {
  if (!dsn) {
    if (__DEV__) {
      console.warn("[sentry] SENTRY_DSN missing — error reporting disabled");
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: SENTRY_ENVIRONMENT || (__DEV__ ? "development" : "production"),
    release: `mindmitra-mobile@${APP_VERSION}`,
    // Align with PostHog consent model: no default PII.
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
  });

  // Dev-only verification. Ignored in Release so a leftover flag can't spam production.
  // Use a Debug build with SENTRY_SEND_TEST_ERROR=1, then set it back to 0.
  if (__DEV__ && String(SENTRY_SEND_TEST_ERROR || "") === "1") {
    Sentry.captureException(new Error("My first Sentry error!"));
  }
}

export { Sentry };
