import axios from "axios";

import { AUTH_BASE_URL } from "../config/backend";

const API = axios.create({
	baseURL: AUTH_BASE_URL,
	timeout: 20000,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

API.interceptors.response.use(
	(response) => response,
	async (error) => {
		const config = error?.config;
		if (!config) return Promise.reject(error);

		const isNetworkStyleError =
			!error?.response &&
			(error?.code === "ECONNABORTED" ||
				error?.message === "Network Error" ||
				/timeout/i.test(String(error?.message || "")));

		if (!isNetworkStyleError) return Promise.reject(error);

		config.__retryCount = config.__retryCount || 0;
		if (config.__retryCount >= 1) return Promise.reject(error);

		config.__retryCount += 1;
		await sleep(500);
		return API.request(config);
	}
);


export const signup = (data) => API.post("/signup", data);
export const login = (data) => API.post("/login", data);
export const getUserId = (data) => API.post("/get-user-id", data);

// Password recovery
// Request a password reset link to be sent to `email`.
export const requestPasswordReset = (email) => API.post("/request-password-reset", { email });

// Reset password using token received via email (backend should accept token and newPassword)
export const resetPassword = (token, newPassword) => API.post("/reset-password", { token, password: newPassword });

