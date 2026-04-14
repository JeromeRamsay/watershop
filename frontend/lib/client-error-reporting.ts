"use client";

import api from "@/lib/api";
import { getErrorMessage, getErrorRequestId } from "@/lib/error-utils";

interface ReportClientErrorInput {
  error?: unknown;
  message?: string;
  source: string;
  componentStack?: string;
  metadata?: Record<string, unknown>;
  level?: "error" | "warn";
}

let lastFingerprint = "";
let lastReportedAt = 0;

export const reportClientError = async ({
  error,
  message,
  source,
  componentStack,
  metadata,
  level = "error",
}: ReportClientErrorInput) => {
  if (typeof window === "undefined") {
    return;
  }

  const resolvedMessage = message ?? getErrorMessage(error, "Unexpected client error");
  const fingerprint = `${source}:${window.location.pathname}:${resolvedMessage}`;
  const now = Date.now();

  if (fingerprint === lastFingerprint && now - lastReportedAt < 5000) {
    return;
  }

  lastFingerprint = fingerprint;
  lastReportedAt = now;

  const maybeError = error instanceof Error ? error : undefined;

  try {
    await api.post("/client-errors", {
      message: resolvedMessage,
      source,
      level,
      route: `${window.location.pathname}${window.location.search}`,
      requestId: getErrorRequestId(error),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      stack: maybeError?.stack,
      componentStack,
      metadata,
    });
  } catch {
    // Logging failures must never block the user flow.
  }
};