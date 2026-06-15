"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

function formatPhone(digits: string) {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function KioskRefillPhonePage() {
  const router = useRouter();
  const [digits, setDigits] = useState("");
  const [welcomeName] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("kiosk_name");
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formatted = useMemo(() => formatPhone(digits), [digits]);

  const onPress = (val: string) => {
    if (val === "back") {
      setDigits((p) => p.slice(0, -1));
      return;
    }
    if (!/^\d$/.test(val)) return;
    setDigits((p) => (p.length >= 10 ? p : p + val));
  };

  const canNext = digits.length === 10;

  const onNext = () => {
    if (!canNext) return;
    setError(null);
    setLoading(true);
    api
      .get(`/customers/by-phone?phone=${digits}`)
      .then((res) => {
        if (!res.data) {
          setError("Customer not found.");
          return;
        }
        localStorage.setItem("kiosk_phone", digits);
        localStorage.setItem("kiosk_customer", JSON.stringify(res.data));
        router.push("/refill/name");
      })
      .catch((err) => {
        const serverMsg = err?.response?.data?.message;
        setError(serverMsg || "Customer not found.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex h-full items-center justify-center px-2 py-2 sm:px-3 sm:py-3 md:px-4 md:py-4 lg:px-6 lg:py-6">
      <div className="flex h-full max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg md:rounded-3xl lg:max-w-5xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Logo"
              width={132}
              height={32}
              style={{ width: "auto", height: "auto" }}
            />
          </div>
          {welcomeName ? (
            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
              <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                👤
              </span>
              <div className="min-w-0 leading-tight">
                <div className="text-[11px]">Welcome</div>
                <div className="truncate font-semibold">{welcomeName}</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-5 sm:py-4 md:px-7 md:py-5 lg:px-10 lg:py-6">
          <div className="text-center">
            <h1 className="text-[clamp(2rem,4.8vw,3rem)] font-semibold text-slate-800">Water Refill</h1>
            <p className="mt-2 text-sm text-slate-500 md:text-base lg:text-lg">
              Let&apos;s refill your bottle and save the planet
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-center md:mt-4 md:rounded-2xl md:py-3.5 lg:mt-5 lg:py-4">
            <div className="text-[clamp(2rem,5.5vw,3.25rem)] font-semibold tracking-wide text-slate-800">
              {formatted || "___-___-____"}
            </div>
          </div>

          <div className="mt-3 text-base font-semibold text-slate-800 md:mt-4 md:text-lg lg:text-xl">
            Enter Phone Number
          </div>

          {/* Keypad */}
          <div className="mt-3 grid min-h-0 flex-1 auto-rows-fr grid-cols-3 grid-rows-4 gap-2 md:mt-4 lg:mt-5">
            {["1","2","3","4","5","6","7","8","9"].map((n) => (
              <button
                key={n}
                onClick={() => onPress(n)}
                className="h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-blue-50 text-[clamp(2.75rem,6.8vw,4.5rem)] font-bold leading-none text-slate-700 transition-all duration-100 hover:z-10 hover:bg-blue-100 active:scale-95 active:bg-blue-200 active:shadow-inner md:rounded-xl"
              >
                {n}
              </button>
            ))}

            <div />
            <button
              onClick={() => onPress("0")}
              className="h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-blue-50 text-[clamp(2.75rem,6.8vw,4.5rem)] font-bold leading-none text-slate-700 transition-all duration-100 hover:z-10 hover:bg-blue-100 active:scale-95 active:bg-blue-200 active:shadow-inner md:rounded-xl"
            >
              0
            </button>
            <button
              onClick={() => onPress("back")}
              className="h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-blue-50 text-[clamp(2.75rem,6.8vw,4.5rem)] font-bold leading-none text-slate-700 transition-all duration-100 hover:z-10 hover:bg-blue-100 active:scale-95 active:bg-blue-200 active:shadow-inner md:rounded-xl"
              aria-label="Backspace"
              title="Backspace"
            >
              ⌫
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base md:text-lg text-red-700 font-medium">
              {error}
            </div>
          ) : null}

          <button
            onClick={onNext}
            disabled={!canNext || loading}
            className={`mt-3 h-[clamp(5.5rem,10.5vh,7.25rem)] w-full rounded-xl text-lg font-semibold text-white transition-all md:mt-4 md:rounded-2xl md:text-xl lg:mt-5 lg:text-2xl
              ${canNext && !loading ? "bg-sky-600 hover:bg-sky-700 active:scale-98" : "bg-slate-300 cursor-not-allowed"}`}
          >
            {loading ? "Checking..." : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
