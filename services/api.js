import axios from "axios";

// Production (Hosted) Backend
const API = axios.create({ baseURL: "https://cognizen-x-backend.vercel.app/api/auth" });

export const signup = (data) => API.post("/signup", data);
export const login = (data) => API.post("/login", data);
export const getUserId = (data) => API.post("/get-user-id", data);

