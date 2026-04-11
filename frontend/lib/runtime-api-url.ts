const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const CUSTOM_APP_HOST = process.env.NEXT_PUBLIC_CUSTOM_APP_HOST;
const CUSTOM_API_URL = process.env.NEXT_PUBLIC_CUSTOM_API_URL;

function normalizeHost(host: string | null | undefined) {
  return (host || "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveServerApiUrl(host: string | null | undefined) {
  return CUSTOM_APP_HOST &&
    CUSTOM_API_URL &&
    normalizeHost(host) === normalizeHost(CUSTOM_APP_HOST)
    ? CUSTOM_API_URL
    : DEFAULT_API_URL;
}

export function resolveClientApiUrl() {
  if (typeof window !== "undefined") {
    return resolveServerApiUrl(window.location.host);
  }

  return DEFAULT_API_URL;
}