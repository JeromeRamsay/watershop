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
    <div className="min-h-screen h-full flex items-center justify-center px-3 py-4 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full h-full max-w-4xl lg:max-w-5xl bg-white rounded-2xl md:rounded-3xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
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
        <div className="flex-1 px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8 lg:px-12 lg:py-10 flex flex-col">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-800">Water Refill</h1>
            <p className="text-sm md:text-base lg:text-lg text-slate-500 mt-2">
              Let&apos;s refill your bottle and save the planet
            </p>
          </div>

          <div className="mt-6 md:mt-8 lg:mt-10 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl py-4 md:py-5 lg:py-6 text-center">
            <div className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-wide text-slate-800">
              {formatted || "___-___-____"}
            </div>
          </div>

          <div className="mt-6 md:mt-8 text-base md:text-lg lg:text-xl text-slate-800 font-semibold">
            Enter Phone Number
          </div>

          {/* Keypad */}
          <div className="mt-4 md:mt-5 lg:mt-6 grid grid-cols-3 grid-rows-4 gap-x-2 gap-y-2 flex-1">
            {["1","2","3","4","5","6","7","8","9"].map((n) => (
              <button
                key={n}
                onClick={() => onPress(n)}
                className="-my-px min-h-0 rounded-lg md:rounded-xl bg-blue-50 hover:bg-blue-100 border border-slate-200 text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-700 transition-all duration-100 active:scale-95 active:bg-blue-200 active:shadow-inner relative hover:z-10"
              >
                {n}
              </button>
            ))}

            <div />
            <button
              onClick={() => onPress("0")}
              className="-my-px min-h-0 rounded-lg md:rounded-xl bg-blue-50 hover:bg-blue-100 border border-slate-200 text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-700 transition-all duration-100 active:scale-95 active:bg-blue-200 active:shadow-inner relative hover:z-10"
            >
              0
            </button>
            <button
              onClick={() => onPress("back")}
              className="-my-px min-h-0 rounded-lg md:rounded-xl bg-blue-50 hover:bg-blue-100 border border-slate-200 text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-700 transition-all duration-100 active:scale-95 active:bg-blue-200 active:shadow-inner relative hover:z-10"
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
            className={`mt-6 md:mt-8 w-full h-14 md:h-16 lg:h-20 rounded-xl md:rounded-2xl font-semibold text-lg md:text-xl lg:text-2xl text-white transition-all
              ${canNext && !loading ? "bg-sky-600 hover:bg-sky-700 active:scale-98" : "bg-slate-300 cursor-not-allowed"}`}
          >
            {loading ? "Checking..." : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
