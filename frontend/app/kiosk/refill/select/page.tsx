"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

function formatPhone(digits: string) {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

type RefillItem = {
  id: string;
  name: string;
  remaining: number;
};

export default function KioskRefillSelectPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("John King");
  const [items, setItems] = useState<RefillItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedQty, setConfirmedQty] = useState(0);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const p = localStorage.getItem("kiosk_phone") || "";
    const n = localStorage.getItem("kiosk_name") || "John King";
    const c = localStorage.getItem("kiosk_customer");
    if (!p) {
      router.replace("/kiosk/refill");
      return;
    }
    setPhone(p);
    setName(n);
    if (c) {
      const customer = JSON.parse(c);
      const walletItems = customer?.wallet?.prepaidItems || [];

      setLoading(true);
      api
        .get("/inventory")
        .then((res) => {
          const refillable = (res.data || []).filter(
            (i: any) => i.isRefillable,
          );
          const mapped = refillable.map((i: any) => {
            const wallet = walletItems.find(
              (w: any) => w.itemId?.toString() === i._id?.toString(),
            );
            return {
              id: i._id,
              name: i.name,
              remaining: wallet?.quantityRemaining || 0,
            };
          });
          setItems(mapped);
          const initialCounts: Record<string, number> = {};
          mapped.forEach((m: RefillItem) => {
            initialCounts[m.id] = 0;
          });
          setCounts(initialCounts);
        })
        .catch(() => setError("Failed to load refill items."))
        .finally(() => setLoading(false));
    }
  }, [router]);

  const formatted = useMemo(() => formatPhone(phone), [phone]);

  const inc = (id: string) =>
    setCounts((s) => ({ ...s, [id]: (s[id] || 0) + 1 }));
  const dec = (id: string) =>
    setCounts((s) => ({ ...s, [id]: Math.max(0, (s[id] || 0) - 1) }));

  const onConfirm = () => {
    setError(null);
    const selectedItems = items
      .filter((i) => (counts[i.id] || 0) > 0)
      .map((i) => ({ itemId: i.id, quantity: counts[i.id] || 0 }));
    if (selectedItems.length === 0) {
      setError("Please select at least one refill.");
      return;
    }

    const totalQty = selectedItems.reduce((s, i) => s + i.quantity, 0);
    setLoading(true);
    api
      .post("/refills", {
        phone,
        memberName: name,
        items: selectedItems,
      })
      .then(() => {
        setConfirmedQty(totalQty);
        setConfirmed(true);
        redirectTimer.current = setTimeout(() => {
          onNew();
        }, 3000);
      })
      .catch((err) => {
        const serverMsg = err?.response?.data?.message;
        setError(serverMsg || "Failed to confirm refill.");
      })
      .finally(() => setLoading(false));
  };

  const onNew = () => {
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
    localStorage.removeItem("kiosk_phone");
    localStorage.removeItem("kiosk_initials");
    localStorage.removeItem("kiosk_name");
    localStorage.removeItem("kiosk_customer");
    router.push("/kiosk/refill");
  };

  const Row = ({
    label,
    id,
    remaining,
  }: {
    label: string;
    id: string;
    remaining: number;
  }) => (
    <div
      className="rounded-xl md:rounded-2xl px-5 py-5 sm:px-6 sm:py-5 md:px-8 md:py-6 lg:px-10 lg:py-8 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 md:gap-5 lg:gap-6"
      style={{ backgroundColor: "#DDEEF7" }}
    >
      <div
        className="text-base md:text-lg lg:text-xl font-semibold break-words"
        style={{ color: "#545454" }}
      >
        {label}
      </div>

      <div className="flex items-center justify-center md:justify-start">
        <div className="grid grid-cols-3 overflow-hidden rounded-lg md:rounded-xl border-2 border-[#D0DFE8] bg-white min-w-[200px] md:min-w-[240px] lg:min-w-[280px] h-[56px] md:h-[64px] lg:h-[72px]">
          <button
            onClick={() => dec(id)}
            className="flex items-center justify-center text-3xl md:text-4xl lg:text-5xl font-light border-r-2 border-[#DCE6ED] leading-none hover:bg-blue-50 transition-all"
            style={{ color: "#189CD2" }}
          >
            −
          </button>
          <div
            className="flex items-center justify-center text-2xl md:text-3xl lg:text-4xl font-semibold border-r-2 border-[#DCE6ED] leading-none"
            style={{ color: "#1D6788" }}
          >
            {String(counts[id] || 0).padStart(2, "0")}
          </div>
          <button
            onClick={() => inc(id)}
            className="flex items-center justify-center text-3xl md:text-4xl lg:text-5xl font-light leading-none hover:bg-blue-50 transition-all"
            style={{ color: "#189CD2" }}
          >
            +
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4 md:justify-end">
        <div className="text-right leading-tight">
          <div
            className="text-xs md:text-sm lg:text-base whitespace-nowrap"
            style={{ color: "#545454" }}
          >
            Refills Remaining
          </div>
          <div
            className="text-2xl md:text-3xl lg:text-4xl font-bold mt-1"
            style={{ color: "#545454" }}
          >
            {remaining}
          </div>
        </div>

        <button
          type="button"
          className="pointer-events-none"
          tabIndex={-1}
          aria-label="Bottle Icon"
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14"
          >
            <path
              d="M15.2969 1.55469L15.0391 1.78125L15.0156 2.78906C14.9922 3.72656 15 3.80469 15.1641 4.01562C15.5078 4.45312 15.4922 4.45312 20 4.45312C24.5 4.45312 24.4922 4.45312 24.8281 4.02344C24.9844 3.82812 25 3.71094 25 2.91406C25 1.96094 24.9219 1.67969 24.5938 1.45312C24.4375 1.34375 23.875 1.32812 19.9844 1.32812H15.5469L15.2969 1.55469Z"
              fill="#189CD2"
            />
            <path
              d="M17.1094 6.40625V7.5H20H22.8906V6.40625V5.3125H20H17.1094V6.40625Z"
              fill="#189CD2"
            />
            <path
              d="M16.2501 8.40635C14.4688 8.70322 13.336 9.24229 12.2735 10.336C11.6563 10.961 11.3907 11.3438 11.0157 12.1485C10.5548 13.1173 10.4376 13.6407 10.4376 14.8048C10.4298 15.7657 10.4454 15.8438 10.6407 16.2188C10.7579 16.4454 11.0001 16.7501 11.1798 16.8985C11.8204 17.4454 11.3594 17.422 20.0001 17.422C28.6407 17.422 28.1798 17.4454 28.8204 16.8985C29.0001 16.7501 29.2423 16.4454 29.3594 16.2188C29.5548 15.8438 29.5704 15.7657 29.5626 14.8048C29.5626 13.6407 29.4454 13.1173 28.9844 12.1485C28.6094 11.3517 28.3438 10.9688 27.7657 10.3751C26.8907 9.48447 25.9219 8.91416 24.6954 8.57041C24.1329 8.41416 23.9063 8.40635 20.2735 8.39072C18.1719 8.38291 16.3594 8.39072 16.2501 8.40635Z"
              fill="#189CD2"
            />
            <path
              d="M11.7188 18.3516C11.1406 18.4688 10.7266 18.8047 10.5078 19.3125C10.336 19.7422 10.336 23.1562 10.5156 23.5781C10.6719 23.9609 10.9844 24.2812 11.3672 24.4609C11.6641 24.6016 12.0625 24.6094 20 24.6094C27.9375 24.6094 28.336 24.6016 28.6328 24.4609C29.0156 24.2812 29.3281 23.9609 29.4844 23.5781C29.6641 23.1562 29.6641 19.7422 29.4922 19.3125C29.336 18.9453 29.1016 18.7031 28.711 18.4922L28.3985 18.3203L20.1953 18.3125C15.6875 18.3047 11.8672 18.3203 11.7188 18.3516Z"
              fill="#189CD2"
            />
            <path
              d="M12.5312 25.5391C11.7422 25.7344 10.9844 26.3516 10.6406 27.0938L10.4297 27.5391L10.4062 31.0312L10.3828 34.5312H20H29.6172L29.5938 31.0312L29.5703 27.5391L29.3594 27.0938C29.0938 26.5234 28.5938 26.0234 28 25.7344L27.5391 25.5078L20.1562 25.4922C16.0938 25.4922 12.6641 25.5078 12.5312 25.5391Z"
              fill="#189CD2"
            />
            <path
              d="M10.3906 36.2578C10.3906 37.2891 10.4766 37.625 10.8516 38.0547C11.4141 38.7188 10.7031 38.6719 20 38.6719C29.2969 38.6719 28.5859 38.7188 29.1484 38.0547C29.5234 37.625 29.6094 37.2891 29.6094 36.2578V35.3906H20H10.3906V36.2578Z"
              fill="#189CD2"
            />
          </svg>
        </button>
      </div>
    </div>
  );

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
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
              👤
            </span>
            <div className="leading-tight">
              <div className="text-[11px]">Welcome</div>
              <div className="font-semibold">{name}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8 lg:px-12 lg:py-10 overflow-auto">
          {confirmed ? (
            /* ── Success Confirmation ── */
            <div className="flex flex-col items-center justify-center py-10 md:py-16 lg:py-20 space-y-6 md:space-y-8 text-center h-full">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#D1FAE5" }}>
                <svg className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20" fill="none" stroke="#059669" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold" style={{ color: "#059669" }}>
                  Refill Confirmed!
                </h2>
                <p className="text-lg md:text-xl lg:text-2xl mt-3 md:mt-4" style={{ color: "#545454" }}>
                  {confirmedQty} bottle{confirmedQty !== 1 ? "s" : ""} refilled for{" "}
                  <span className="font-semibold">{name}</span>
                </p>
              </div>
              <p className="text-base md:text-lg lg:text-xl" style={{ color: "#8E8E8E" }}>
                Returning to home screen in a moment…
              </p>
              <button
                onClick={onNew}
                className="mt-4 px-10 md:px-12 lg:px-16 h-14 md:h-16 lg:h-20 rounded-xl md:rounded-2xl font-semibold text-white text-lg md:text-xl lg:text-2xl transition-all active:scale-95"
                style={{ backgroundColor: "#189CD2" }}
              >
                Done
              </button>
            </div>
          ) : (
            /* ── Normal selection view ── */
            <>
          <div className="text-center">
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-semibold"
              style={{ color: "#545454" }}
            >
              Water Refill
            </h1>
            <p className="text-sm md:text-base lg:text-lg mt-2" style={{ color: "#8E8E8E" }}>
              Let&apos;s refill your bottle and save the planet
            </p>

            <div className="mt-5 md:mt-6 lg:mt-8 space-y-2">
              <div
                className="text-lg md:text-xl lg:text-2xl font-bold"
                style={{ color: "#545454" }}
              >
                Name: {name}
              </div>
              <div
                className="text-lg md:text-xl lg:text-2xl font-bold"
                style={{ color: "#545454" }}
              >
                Phone Number: {formatted}
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-8 lg:mt-10 space-y-4 md:space-y-5">
            {loading ? (
              <div className="text-center py-12 md:py-16 lg:py-20 space-y-4 md:space-y-5">
                <svg className="animate-spin h-12 w-12 md:h-16 md:w-16 lg:h-20 lg:w-20 mx-auto" fill="none" viewBox="0 0 24 24"
                  style={{ color: "#189CD2" }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-base md:text-lg lg:text-xl font-medium" style={{ color: "#8E8E8E" }}>
                  Processing refill…
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 md:py-16 lg:py-20 text-base md:text-lg lg:text-xl" style={{ color: "#8E8E8E" }}>
                No refill items available.
              </div>
            ) : (
              items.map((item) => (
                <Row
                  key={item.id}
                  label={item.name}
                  id={item.id}
                  remaining={item.remaining}
                />
              ))
            )}
          </div>

          {error ? (
            <div className="mt-4 md:mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base md:text-lg text-red-700 font-medium">
              {error}
            </div>
          ) : null}

          <div className="mt-6 md:mt-8 lg:mt-10 space-y-4 md:space-y-5">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="w-full h-14 md:h-16 lg:h-20 rounded-xl md:rounded-2xl font-semibold text-white text-lg md:text-xl lg:text-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-98"
              style={{ backgroundColor: "#189CD2" }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-6 w-6 md:h-7 md:w-7" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing…
                </>
              ) : (
                "Confirm Refill"
              )}
            </button>

            <button
              onClick={onNew}
              disabled={loading}
              className="w-full h-14 md:h-16 lg:h-20 rounded-xl md:rounded-2xl font-semibold text-lg md:text-xl lg:text-2xl bg-white border-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-98"
              style={{ color: "#189CD2", borderColor: "#189CD2" }}
            >
              New
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
