import axios from "axios";
import Cookies from "js-cookie";
import { resolveClientApiUrl } from "./runtime-api-url";

const api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add bearer token
api.interceptors.request.use(
  (config) => {
    if (!config.baseURL) {
      config.baseURL = resolveClientApiUrl();
    }

    const token = Cookies.get("auth_token_public");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const isOnAuthPage =
          window.location.pathname.startsWith("/login") ||
          window.location.pathname.startsWith("/signup");

        if (!isOnAuthPage) {
          // Redirect through the server-side logout route so that the
          // HttpOnly session_token cookie is also cleared, preventing a
          // redirect loop between /login and /dashboard.
          window.location.href = "/api/auth/logout";
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
