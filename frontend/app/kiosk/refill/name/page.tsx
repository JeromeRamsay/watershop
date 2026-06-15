"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type KioskMember = { id?: string; name: string; initials: string };
type KioskStoredFamilyMember = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
};
type KioskStoredCustomer = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  familyMembers?: KioskStoredFamilyMember[];
};

function formatPhone(digits: string) {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function KioskRefillNamePage() {
  const router = useRouter();

  function toInitials(fullName: string) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  const [phone] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem("kiosk_phone") || "";
  });
  const [initials, setInitials] = useState("");
  const [members] = useState<KioskMember[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const storedCustomer = localStorage.getItem("kiosk_customer");
    if (!storedCustomer) {
      return [];
    }

    try {
      const customer = JSON.parse(storedCustomer) as KioskStoredCustomer;
      const list: KioskMember[] = [];

      if (customer?.firstName || customer?.lastName) {
        const name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
        list.push({
          id: customer._id,
          name,
          initials: toInitials(name),
        });
      }

      (customer.familyMembers || []).forEach((familyMember, index) => {
        const name = familyMember.firstName
          ? `${familyMember.firstName || ""} ${familyMember.lastName || ""}`.trim()
          : (familyMember.name || "");

        if (!name) {
          return;
        }

        list.push({
          id: familyMember._id || `${customer._id}-fm-${index}`,
          name,
          initials: toInitials(name),
        });
      });

      return list;
    } catch {
      return [];
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [welcomeName] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("kiosk_name");
  });

  useEffect(() => {
    if (!phone) {
      router.replace("/refill");
    }
  }, [phone, router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        setError(null);
        setInitials((prev) => prev.slice(0, -1));
        return;
      }

      if (!/^[a-zA-Z]$/.test(e.key)) return;
      setError(null);
      setInitials((prev) => (prev + e.key.toUpperCase()).slice(0, 3));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const formatted = useMemo(() => formatPhone(phone), [phone]);
  const selectedMember = useMemo(
    () =>
      members.find(
        (member) => member.initials.toUpperCase() === initials.toUpperCase(),
      ) || null,
    [initials, members],
  );

  const onNext = () => {
    const clean = initials.trim();
    if (!clean) return;
    setError(null);
    if (!selectedMember) {
      setError("Initials not found. Please try again.");
      return;
    }
    localStorage.setItem("kiosk_initials", selectedMember.initials);
    localStorage.setItem("kiosk_name", selectedMember.name);
    router.push("/refill/select");
  };

  const onPrev = () => router.push("/refill");

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

        <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-5 sm:py-4 md:px-7 md:py-5 lg:px-10 lg:py-6">
          <div className="text-center">
            <h1 className="text-[clamp(2rem,4.8vw,3rem)] font-semibold text-slate-800">
              Water Refill
            </h1>
            <p className="mt-2 text-sm text-slate-500 md:text-base lg:text-lg">
              Let&apos;s refill your bottle and save the planet
            </p>
            <p className="mt-2 text-base text-slate-700 md:mt-4 md:text-lg lg:text-xl">
              <span className="font-semibold">Phone Number:</span> {formatted}
            </p>
          </div>

          <div className="mt-3 flex flex-1 flex-col md:mt-4 lg:mt-5">
            <div className="text-xl font-semibold text-slate-800 md:text-2xl lg:text-3xl">
              Enter your Initials
            </div>

            <div className="mt-3 flex min-h-[100px] flex-1 items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50 p-5 md:mt-4 md:min-h-[130px] md:rounded-2xl md:p-7 lg:min-h-[160px] lg:p-9">
              <div className="text-[clamp(3rem,12vw,5rem)] font-bold text-slate-800">
                {initials || "--"}
              </div>
            </div>

            <div className="mt-3 text-sm text-slate-500 md:mt-4 md:text-base lg:text-lg">
              Example (John Smith)
            </div>
            <div className="mt-2 flex h-14 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-800 md:h-16 md:rounded-2xl md:text-2xl lg:h-20 lg:text-3xl">
              JS
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base md:text-lg text-red-700 font-medium">
                {error}
              </div>
            ) : null}

            <button
              onClick={onNext}
              className="mt-3 h-[clamp(5.5rem,10.5vh,7.25rem)] w-full rounded-xl bg-sky-600 text-lg font-semibold text-white transition-all active:scale-98 hover:bg-sky-700 md:mt-4 md:rounded-2xl md:text-xl lg:mt-5 lg:text-2xl"
            >
              Next
            </button>

            <button
              onClick={onPrev}
              className="mt-3 h-14 w-full rounded-xl border-2 border-slate-200 bg-white text-lg font-semibold text-sky-700 transition-all active:scale-98 hover:bg-slate-50 md:mt-4 md:h-16 md:rounded-2xl md:text-xl lg:h-18 lg:text-2xl"
            >
              Previous
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
