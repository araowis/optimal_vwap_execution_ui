"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UpstoxFeedStreamPriceUpdate {
  ltp: number;
  timestamp: number;
  volume?: number;
  bids?: Array<{ price: number; quantity: number }>;
  asks?: Array<{ price: number; quantity: number }>;
}

interface UseUpstoxFeedStreamProps {
  accessToken: string | null;
  instrumentKey: string | null;
  mode?: "ltpc" | "full" | "option_greeks" | "full_d30";
  enabled: boolean;
  onUpdate?: (data: UpstoxFeedStreamPriceUpdate) => void;
}

type Subscriber = {
  id: string;
  onUpdate?: (data: UpstoxFeedStreamPriceUpdate) => void;
  onStatus?: (status: { isConnected: boolean; error: string | null }) => void;
};

type StreamEntry = {
  key: string;
  subscribers: Map<string, Subscriber>;
  abortController: AbortController | null;
  running: boolean;
  isConnected: boolean;
  error: string | null;
};

const streamCache = new Map<string, StreamEntry>();

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `sub_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function getStreamKey(
  accessToken: string,
  instrumentKey: string,
  mode: string,
) {
  return `${accessToken}::${instrumentKey}::${mode}`;
}

function getOrCreateEntry(key: string): StreamEntry {
  const existing = streamCache.get(key);
  if (existing) return existing;
  const entry: StreamEntry = {
    key,
    subscribers: new Map(),
    abortController: null,
    running: false,
    isConnected: false,
    error: null,
  };
  streamCache.set(key, entry);
  return entry;
}

function broadcastStatus(entry: StreamEntry) {
  for (const sub of entry.subscribers.values()) {
    sub.onStatus?.({ isConnected: entry.isConnected, error: entry.error });
  }
}

async function ensureStreamRunning(params: {
  entry: StreamEntry;
  accessToken: string;
  instrumentKey: string;
  mode: "ltpc" | "full" | "option_greeks" | "full_d30";
}) {
  const { entry, accessToken, instrumentKey, mode } = params;
  if (entry.running) return;

  entry.running = true;
  entry.error = null;
  entry.isConnected = false;
  broadcastStatus(entry);

  const ac = new AbortController();
  entry.abortController = ac;

  try {
    const url = `/api/upstox/market-data-feed/stream?instrument_key=${encodeURIComponent(instrumentKey)}&mode=${encodeURIComponent(mode)}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/x-ndjson",
        Authorization: `Bearer ${accessToken}`,
      },
      signal: ac.signal,
      cache: "no-store",
    });

    if (!resp.ok || !resp.body) {
      const text = await resp.text().catch(() => "");
      throw new Error(text || `Stream request failed (${resp.status})`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;

        let obj: any;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }

        if (obj?.type === "connection_status") {
          if (obj.status === "open") {
            entry.isConnected = true;
            entry.error = null;
            broadcastStatus(entry);
          }
          if (obj.status === "error") {
            entry.error = String(obj.error || "Connection error");
            entry.isConnected = false;
            broadcastStatus(entry);
          }
          continue;
        }

        const update = mapDecodedToUpdate(obj, instrumentKey);
        if (update) {
          for (const sub of entry.subscribers.values()) {
            sub.onUpdate?.(update);
          }
        }
      }
    }
  } catch (e) {
    if (ac.signal.aborted) return;
    entry.error =
      e instanceof Error ? e.message : "Failed to connect to feed stream";
    entry.isConnected = false;
    broadcastStatus(entry);
  } finally {
    entry.running = false;
    entry.abortController = null;
    if (entry.subscribers.size === 0) {
      streamCache.delete(entry.key);
    }
  }
}

function stopStreamIfUnused(entry: StreamEntry) {
  if (entry.subscribers.size > 0) return;
  try {
    entry.abortController?.abort();
  } catch {
    // ignore
  }
  streamCache.delete(entry.key);
}

function mapDecodedToUpdate(
  decoded: any,
  instrumentKey: string,
): UpstoxFeedStreamPriceUpdate | null {
  if (!decoded || typeof decoded !== "object") return null;

  if (
    decoded.type &&
    String(decoded.type).toLowerCase().includes("market_info")
  ) {
    return null;
  }

  const feeds = decoded.feeds;
  if (!feeds || typeof feeds !== "object") return null;

  const feed =
    feeds[instrumentKey] ??
    (Object.keys(feeds).length === 1
      ? feeds[Object.keys(feeds)[0]]
      : undefined);
  if (!feed) return null;

  const ff = feed.fullFeed?.marketFF || feed.fullFeed?.indexFF;
  const ltpc = ff?.ltpc || feed.ltpc || feed.firstLevelWithGreeks?.ltpc;

  const ltp = Number(ltpc?.ltp ?? 0);
  if (!Number.isFinite(ltp) || ltp <= 0) return null;

  const vtt = ff?.vtt != null ? Number(ff.vtt) : undefined;

  const quotes: any[] | undefined = ff?.marketLevel?.bidAskQuote;
  const bids = Array.isArray(quotes)
    ? quotes
        .map((q) => ({
          price: Number(q.bidP ?? 0),
          quantity: Number(q.bidQ ?? 0),
        }))
        .filter(
          (b) =>
            Number.isFinite(b.price) &&
            b.price > 0 &&
            Number.isFinite(b.quantity) &&
            b.quantity > 0,
        )
    : undefined;

  const asks = Array.isArray(quotes)
    ? quotes
        .map((q) => ({
          price: Number(q.askP ?? 0),
          quantity: Number(q.askQ ?? 0),
        }))
        .filter(
          (a) =>
            Number.isFinite(a.price) &&
            a.price > 0 &&
            Number.isFinite(a.quantity) &&
            a.quantity > 0,
        )
    : undefined;

  return {
    ltp,
    timestamp: Date.now(),
    volume: vtt,
    bids,
    asks,
  };
}

export function useUpstoxFeedStream({
  accessToken,
  instrumentKey,
  mode = "full",
  enabled,
  onUpdate,
}: UseUpstoxFeedStreamProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriberIdRef = useRef<string>(makeId());
  const entryKeyRef = useRef<string | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Update callback ref on every render
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const disconnect = useCallback(() => {
    if (!entryKeyRef.current) return;
    const entry = streamCache.get(entryKeyRef.current);
    if (!entry) {
      entryKeyRef.current = null;
      setIsConnected(false);
      return;
    }
    entry.subscribers.delete(subscriberIdRef.current);
    stopStreamIfUnused(entry);
    entryKeyRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!enabled || !accessToken || !instrumentKey) {
      disconnect();
      return;
    }

    const key = getStreamKey(accessToken, instrumentKey, mode);
    entryKeyRef.current = key;
    const entry = getOrCreateEntry(key);

    entry.subscribers.set(subscriberIdRef.current, {
      id: subscriberIdRef.current,
      onUpdate: (data) => onUpdateRef.current?.(data),
      onStatus: ({ isConnected: nextConnected, error: nextError }) => {
        setIsConnected(nextConnected);
        setError(nextError);
      },
    });

    setIsConnected(entry.isConnected);
    setError(entry.error);

    void ensureStreamRunning({
      entry,
      accessToken,
      instrumentKey,
      mode,
    });

    return () => {
      entry.subscribers.delete(subscriberIdRef.current);
      stopStreamIfUnused(entry);
      if (entryKeyRef.current === key) entryKeyRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, accessToken, instrumentKey, mode, disconnect]);

  return {
    isConnected,
    error,
    disconnect,
  };
}
