import PostHog from "posthog-react-native";
import { POSTHOG_HOST, POSTHOG_PROJECT_TOKEN } from "@env";

const projectToken = POSTHOG_PROJECT_TOKEN;
const host = POSTHOG_HOST;

if (__DEV__) {
  if (!projectToken) {
    throw new Error(
      "POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured"
    );
  }
  if (!host) {
    throw new Error(
      "POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured"
    );
  }
}

export const posthog = projectToken && host
  ? new PostHog(projectToken, {
      host,
      captureAppLifecycleEvents: true,
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
        },
      },
      debug: __DEV__,
    })
  : undefined;
