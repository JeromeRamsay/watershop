"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
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
        router.push("/kiosk/refill/name");
      })
      .catch((err) => {
        const serverMsg = err?.response?.data?.message;
        setError(serverMsg || "Customer not found.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const name = localStorage.getItem("kiosk_name");
    setWelcomeName(name || null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-3 py-4 sm:p-4 md:p-6">
      <div className="w-full max-w-xl md:max-w-2xl bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
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
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                👤
              </span>
              <div className="leading-tight">
                <div className="text-[11px]">Welcome</div>
                <div className="font-semibold">{welcomeName}</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-medium text-dark-500">Water Refill</h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1 style-regular">
              Let&apos;s refill your bottle and save the planet
            </p>
          </div>

          <div className="mt-5 md:mt-6 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl py-3 md:py-4 text-center">
            <div className="text-[22px] md:text-[30px] font-medium tracking-wide text-dark-500">
              {formatted || "___-___-____"}
            </div>
          </div>

          <div className="mt-5 md:mt-6 text-sm md:text-base text-dark-500 font-semibold">
            Enter Phone Number
          </div>

          {/* Keypad */}
          <div className="mt-3 md:mt-4 grid grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
            {["1","2","3","4","5","6","7","8","9"].map((n) => (
              <button
                key={n}
                onClick={() => onPress(n)}
                className="h-14 sm:h-16 md:h-[72px] rounded-xl bg-[#E9F7FC] border border-slate-200 text-xl md:text-2xl font-semibold text-slate-700 active:scale-[0.99]"
              >
                {n}
              </button>
            ))}

            <div className="h-16" />
            <button
              onClick={() => onPress("0")}
              className="h-14 sm:h-16 md:h-[72px] rounded-xl bg-[#E9F7FC] border border-slate-200 text-xl md:text-2xl font-semibold text-slate-700 active:scale-[0.99]"
            >
              0
            </button>
            <button
              onClick={() => onPress("back")}
              className="h-14 sm:h-16 md:h-[72px] rounded-xl bg-[#E9F7FC] border border-slate-200 text-xl md:text-2xl font-semibold text-slate-700 active:scale-[0.99]"
              aria-label="Backspace"
              title="Backspace"
            >
              ⌫
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            onClick={onNext}
            disabled={!canNext || loading}
            className={`mt-6 md:mt-7 w-full h-12 md:h-14 rounded-xl font-semibold text-white transition
              ${canNext && !loading ? "bg-sky-600 hover:bg-sky-700" : "bg-slate-300 cursor-not-allowed"}`}
          >
            {loading ? "Checking..." : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
