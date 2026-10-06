import axios from "axios";
import { APP_VERSION } from "../config/backend";

let forceUpdateHandler = null;
let forceUpdateActive = false;

export function isForceUpdateActive() {
  return forceUpdateActive;
}

export function setForceUpdateHandler(handler) {
  forceUpdateHandler = typeof handler === "function" ? handler : null;
}

function triggerForceUpdate(payload) {
  if (forceUpdateActive) return;
  forceUpdateActive = true;
  if (forceUpdateHandler) {
    forceUpdateHandler(payload || {});
  }
}

export function isForceUpdateError(error) {
  return (
    error?.response?.status === 426 ||
    error?.response?.data?.code === "FORCE_UPDATE"
  );
}

export function configureAxiosInstance(instance) {
  instance.defaults.headers.common["X-App-Version"] = APP_VERSION;
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (isForceUpdateError(error)) {
        triggerForceUpdate({
          message: error?.response?.data?.message,
          minSupportedAppVersion: error?.response?.data?.minSupportedAppVersion,
        });
      }
      return Promise.reject(error);
    }
  );
  return instance;
}

configureAxiosInstance(axios);

export default axios;
