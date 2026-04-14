"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error-reporting";
import { getErrorMessage } from "@/lib/error-utils";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError({
      error,
      message: getErrorMessage(error, "Unexpected application error"),
      source: "app.error-boundary",
      componentStack: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-100 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-dark-900">Something went wrong</h1>
        <p className="mt-3 text-sm text-dark-500">
          The employee app hit an unexpected error. Try again, and if it keeps happening use the reference in the error banner or contact an admin.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={reset}>Try Again</Button>
        </div>
      </div>
    </div>
  );
}