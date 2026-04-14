export const getErrorMessage = (error: unknown, fallback: string) => {
  const payload =
    typeof error === "object" && error !== null
      ? (error as {
          response?: {
            data?: { message?: string | string[] };
            headers?: Record<string, string | string[] | undefined>;
          };
          message?: string;
        })
      : undefined;

  const responseMessage = payload?.response?.data?.message;
  if (Array.isArray(responseMessage) && responseMessage.length > 0) {
    return responseMessage.join(", ");
  }
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }
  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
};

export const getErrorRequestId = (error: unknown) => {
  const payload =
    typeof error === "object" && error !== null
      ? (error as {
          response?: {
            headers?: Record<string, string | string[] | undefined>;
          };
        })
      : undefined;

  const requestId =
    payload?.response?.headers?.["x-request-id"] ??
    payload?.response?.headers?.["X-Request-Id"];

  if (Array.isArray(requestId)) {
    return requestId[0];
  }

  return typeof requestId === "string" ? requestId : undefined;
};