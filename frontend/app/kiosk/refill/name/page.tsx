"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type KioskMember = { id?: string; name: string; initials: string };

function formatPhone(digits: string) {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function KioskRefillNamePage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [initials, setInitials] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [members, setMembers] = useState<KioskMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  const toInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  useEffect(() => {
    const p = localStorage.getItem("kiosk_phone") || "";
    const c = localStorage.getItem("kiosk_customer");
    if (!p) {
      router.replace("/kiosk/refill");
      return;
    }
    setPhone(p);
    setWelcomeName(localStorage.getItem("kiosk_name"));
    if (c) {
      const customer = JSON.parse(c);
      const list: KioskMember[] = [];
      if (customer?.firstName || customer?.lastName) {
        const name =
          `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
        list.push({
          id: customer._id,
          name,
          initials: toInitials(name),
        });
      }
      (customer?.familyMembers || []).forEach((fm: any, idx: number) => {
        const name = fm?.name || "";
        if (!name) return;
        list.push({
          id: fm?._id || `${customer._id}-fm-${idx}`,
          name,
          initials: toInitials(name),
        });
      });
      setMembers(list);
    }
  }, [router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        setInitials((prev) => prev.slice(0, -1));
        return;
      }

      if (!/^[a-zA-Z]$/.test(e.key)) return;
      setInitials((prev) => (prev + e.key.toUpperCase()).slice(0, 3));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const match = members.find(
      (m) => m.initials.toUpperCase() === initials.toUpperCase(),
    );
    if (match) {
      setSelectedName(match.name);
      setError(null);
    } else {
      setSelectedName("");
    }
  }, [initials, members]);

  const formatted = useMemo(() => formatPhone(phone), [phone]);

  const onNext = () => {
    const clean = initials.trim();
    if (!clean) return;
    setError(null);
    const match = members.find(
      (m) => m.initials.toUpperCase() === clean.toUpperCase(),
    );
    if (!match) {
      setError("Initials not found. Please try again.");
      return;
    }
    setSelectedName(match.name);
    localStorage.setItem("kiosk_initials", match.initials);
    localStorage.setItem("kiosk_name", match.name);
    router.push("/kiosk/refill/select");
  };

  const onPrev = () => router.push("/kiosk/refill");

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

        <div className="px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-800">
              Water Refill
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Let&apos;s refill your bottle and save the planet
            </p>
            <p className="text-sm md:text-base text-slate-600 mt-4">
              <span className="font-semibold">Phone Number:</span> {formatted}
            </p>
          </div>

          <div className="mt-5 md:mt-6">
            <div className="text-lg md:text-xl font-semibold text-slate-700">
              Enter your Initials
            </div>

            <div className="mt-3 border border-slate-200 bg-slate-50 rounded-xl md:rounded-2xl p-6 md:p-8 flex items-center justify-center">
              <div className="text-5xl md:text-6xl font-semibold text-slate-700">
                {initials || "--"}
              </div>
            </div>

            <div className="mt-4 text-xs md:text-sm text-slate-500">
              Example (John Smith)
            </div>
            <div className="mt-2 h-12 md:h-14 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold flex items-center justify-center">
              JS
            </div>

            {error ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              onClick={onNext}
              className="mt-6 md:mt-7 w-full h-12 md:h-14 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700"
            >
              Next
            </button>

            <button
              onClick={onPrev}
              className="mt-3 w-full h-12 md:h-14 rounded-xl font-semibold text-sky-700 bg-white border border-slate-200 hover:bg-slate-50"
            >
              Previous
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
