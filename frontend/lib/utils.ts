import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Auto-formats a Canadian postal code into A1A 1A1, enforcing L-D-L D-L-D */
export function formatCanadianPostalCode(value: string): string {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let clean = "";
  for (const ch of raw) {
    const pos = clean.length;
    if (pos >= 6) break;
    const expectLetter = pos === 0 || pos === 2 || pos === 4;
    if (expectLetter && /[A-Z]/.test(ch)) clean += ch;
    else if (!expectLetter && /[0-9]/.test(ch)) clean += ch;
    // Wrong type — skip
  }
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)} ${clean.slice(3)}`;
}

/** Auto-formats a phone number as (xxx) xxx-xxxx for NA, or preserves intl (+) */
export function formatPhoneNumber(raw: string): string {
  if (raw.startsWith("+")) {
    return raw.replace(/[^\d\s+.\-()]/g, "");
  }
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** Returns a full date string like "Tuesday, April 7th, 2026" */
export function formatFullDate(
  date: string | Date | null | undefined
): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);

  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";

  const base = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);

  // "Tuesday, April 7, 2026" → "Tuesday, April 7th, 2026"
  return base.replace(/(\d+),/, `$1${suffix},`);
}
