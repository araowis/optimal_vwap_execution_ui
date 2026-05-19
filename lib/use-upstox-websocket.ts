"use client";

import { useCallback } from "react";
import { useUpstoxFeedStream } from "./use-upstox-feed-stream";

interface RealtimePriceData {
  ltp: number;
  timestamp: number;
  volume?: number;
  ohlc?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
}

interface UseUpstoxWebSocketProps {
  accessToken: string | null;
  instrumentKey: string | null;
  enabled: boolean;
  onPriceUpdate?: (data: RealtimePriceData) => void;
}

export function useUpstoxWebSocket({
  accessToken,
  instrumentKey,
  enabled,
  onPriceUpdate,
}: UseUpstoxWebSocketProps) {
  const disconnect = useCallback(() => {
    // no-op: connection lifecycle is managed by the stream hook
  }, []);

  const { isConnected, error } = useUpstoxFeedStream({
    accessToken,
    instrumentKey,
    enabled,
    mode: "full_d30",
    onUpdate: (update) => {
      const priceData: RealtimePriceData = {
        ltp: update.ltp,
        timestamp: update.timestamp,
        volume: update.volume,
      };
      onPriceUpdate?.(priceData);
    },
  });

  if (isConnected) {
    localStorage.setItem("websocket-connected", "true");
  } else {
    localStorage.setItem("websocket-connected", "false");
  }

  return {
    isConnected,
    error,
    disconnect,
  };
}
