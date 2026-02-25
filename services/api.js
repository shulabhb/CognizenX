import axios from "axios";

import { AUTH_BASE_URL } from "../config/backend";

const API = axios.create({ baseURL: AUTH_BASE_URL });


export const signup = (data) => API.post("/signup", data);
export const login = (data) => API.post("/login", data);
export const getUserId = (data) => API.post("/get-user-id", data);

// Password recovery
// Request a password reset link to be sent to `email`.
export const requestPasswordReset = (email) => API.post("/request-password-reset", { email });

// Reset password using token received via email (backend should accept token and newPassword)
export const resetPassword = (token, newPassword) => API.post("/reset-password", { token, password: newPassword });

