"use client";

import { useEffect, useRef } from "react";

interface DashboardRealtimeEvent {
  type: "dashboard:update";
  reason: string;
  at: string;
}

export function useDashboardRealtime(
  onUpdate: () => void,
  debounceMs = 250,
) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let retry = 0;
    let closedManually = false;

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000")
      .replace(/\/$/, "");
    const wsUrl = apiUrl.startsWith("https://")
      ? `${apiUrl.replace(/^https/, "wss")}/ws/dashboard`
      : `${apiUrl.replace(/^http/, "ws")}/ws/dashboard`;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        retry = 0;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as DashboardRealtimeEvent;
          if (payload.type !== "dashboard:update") return;
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            onUpdateRef.current();
          }, debounceMs);
        } catch {
          // Ignore malformed payloads
        }
      };

      ws.onclose = () => {
        if (closedManually) return;
        const delay = Math.min(1000 * 2 ** retry, 10000);
        retry += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // Let onclose handle reconnect scheduling
      };
    };

    connect();

    return () => {
      closedManually = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      ws?.close();
    };
  }, [debounceMs]);
}
