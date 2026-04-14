"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  EMPLOYEE_APP_ERROR_EVENT,
  type EmployeeAppErrorDetail,
} from "@/lib/employee-app-errors";
import { getErrorMessage } from "@/lib/error-utils";
import { reportClientError } from "@/lib/client-error-reporting";

const AUTO_DISMISS_MS = 8000;

export function EmployeeAppErrorCenter() {
  const [errorDetail, setErrorDetail] = useState<EmployeeAppErrorDetail | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFingerprintRef = useRef("");

  useEffect(() => {
    const scheduleDismiss = () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      dismissTimerRef.current = setTimeout(() => {
        setErrorDetail(null);
      }, AUTO_DISMISS_MS);
    };

    const pushError = (detail: EmployeeAppErrorDetail) => {
      const normalizedMessage = detail.message?.trim() || "Something went wrong. Please try again.";
      const fingerprint = `${detail.source || "unknown"}:${detail.requestId || "none"}:${normalizedMessage}`;

      if (fingerprint === lastFingerprintRef.current) {
        return;
      }

      lastFingerprintRef.current = fingerprint;
      setErrorDetail({
        ...detail,
        message: normalizedMessage,
      });
      scheduleDismiss();
    };

    const handleCustomError = (event: Event) => {
      const customEvent = event as CustomEvent<EmployeeAppErrorDetail>;
      pushError(customEvent.detail);
    };

    const handleWindowError = (event: ErrorEvent) => {
      const message = getErrorMessage(
        event.error ?? event.message,
        "Something went wrong. Please refresh and try again.",
      );

      pushError({ message, source: "window.error" });
      void reportClientError({
        error: event.error,
        message,
        source: "window.error",
        metadata: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = getErrorMessage(
        event.reason,
        "Something went wrong. Please refresh and try again.",
      );

      pushError({ message, source: "unhandledrejection" });
      void reportClientError({
        error: event.reason,
        message,
        source: "unhandledrejection",
      });
    };

    window.addEventListener(
      EMPLOYEE_APP_ERROR_EVENT,
      handleCustomError as EventListener,
    );
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      window.removeEventListener(
        EMPLOYEE_APP_ERROR_EVENT,
        handleCustomError as EventListener,
      );
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  if (!errorDetail) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-2xl rounded-xl border border-red-200 bg-red-50 shadow-lg">
        <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm text-red-900">
          <div>
            <p className="font-semibold">Action failed</p>
            <p className="mt-1">{errorDetail.message}</p>
            {errorDetail.requestId ? (
              <p className="mt-1 text-xs text-red-700">
                Reference: {errorDetail.requestId}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setErrorDetail(null)}
            className="rounded-md p-1 text-red-700 transition-colors hover:bg-red-100"
            aria-label="Dismiss error message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}