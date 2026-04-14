import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
import { resolveClientApiUrl } from "./runtime-api-url";
import { emitEmployeeAppError } from "./employee-app-errors";
import { getErrorMessage, getErrorRequestId } from "./error-utils";

export type WatershopApiRequestConfig<D = unknown> = AxiosRequestConfig<D> & {
  watershopHandledError?: boolean;
};

type WatershopInternalApiRequestConfig<D = unknown> =
  InternalAxiosRequestConfig<D> & {
    watershopHandledError?: boolean;
  };

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

    if (typeof window !== "undefined") {
      const requestConfig = error.config as
        | WatershopInternalApiRequestConfig
        | undefined;
      const requestUrl = String(requestConfig?.url || "");
      const isClientErrorReportRequest = requestUrl.includes("/client-errors");

      if (!requestConfig?.watershopHandledError && !isClientErrorReportRequest) {
        emitEmployeeAppError({
          message: getErrorMessage(
            error,
            "Something went wrong. Please try again.",
          ),
          requestId: getErrorRequestId(error),
          source: "request",
        });
      }
    }

    return Promise.reject(error);
  },
);

export default api;
