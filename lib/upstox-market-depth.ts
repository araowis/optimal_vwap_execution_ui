"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useUpstoxFeedStream } from "./use-upstox-feed-stream";

interface MarketDepthData {
  instrumentKey: string;
  bids: Array<{ price: number; quantity: number; orders?: number }>;
  asks: Array<{ price: number; quantity: number; orders?: number }>;
  ltp: number;
  timestamp: number;
  ohlc?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  volume?: number;
  averagePrice?: number;
  netChange?: number;
  totalBuyQuantity?: number;
  totalSellQuantity?: number;
}

interface UseMarketDepthProps {
  accessToken: string | null;
  instrumentKey: string;
  mode?: "full" | "full_d30";
  enabled?: boolean;
  pollInterval?: number;
  wsConnected?: boolean;
}

export function useMarketDepth({
  accessToken,
  instrumentKey,
  mode = "full",
  enabled = true,
  pollInterval = 2500,
  wsConnected = false,
}: UseMarketDepthProps) {
  const [depthData, setDepthData] = useState<MarketDepthData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const useStream = enabled && !!accessToken && !!instrumentKey && wsConnected;

  const { isConnected: streamConnected, error: streamError } =
    useUpstoxFeedStream({
      accessToken,
      instrumentKey,
      enabled: useStream,
      mode: mode === "full_d30" ? "full_d30" : "full",
      onUpdate: (update) => {
        setDepthData((prev) => {
          const bids = update.bids || prev?.bids || [];
          const asks = update.asks || prev?.asks || [];
          const next: MarketDepthData = {
            instrumentKey,
            bids,
            asks,
            ltp: update.ltp,
            timestamp: update.timestamp,
            volume: update.volume,
            ohlc: prev?.ohlc,
            averagePrice: prev?.averagePrice,
            netChange: prev?.netChange,
            totalBuyQuantity: prev?.totalBuyQuantity,
            totalSellQuantity: prev?.totalSellQuantity,
          };
          return next;
        });
      },
    });

  const fetchMarketDepth = useCallback(async () => {
    if (!accessToken || !instrumentKey || !enabled) return;
    if (useStream) return;

    try {
      setError(null);
      setIsConnected(true);
      setIsRefreshing(true);
      localStorage.setItem("websocket-connected", "true");

      const response = await fetch(
        `/api/upstox/market-quote?instrument_key=${encodeURIComponent(instrumentKey)}&access_token=${encodeURIComponent(accessToken)}`,
        {
          method: "GET",
        },
      );

      const result = await response.json();
      // console.log('Market quote result:', result);

      if (result.status === "success" && result.data) {
        // The API returns data keyed by symbol (e.g. NSE_EQ:RELIANCE)
        // while we might be searching by token (e.g. NSE_EQ|INE002A01018).
        // Iterate through values to find the one with the matching instrument_token.
        let instrumentData = result.data[instrumentKey];

        if (!instrumentData) {
          instrumentData = Object.values(result.data).find(
            (item: any) => item.instrument_token === instrumentKey,
          );
        }

        if (!instrumentData) {
          // console.error(`No instrument data found for key: ${instrumentKey}`);
          setIsRefreshing(false);
          return;
        }

        if (instrumentData) {
          const bids: Array<{
            price: number;
            quantity: number;
            orders: number;
          }> = [];
          const asks: Array<{
            price: number;
            quantity: number;
            orders: number;
          }> = [];

          // Parse depth data from REST API response
          if (instrumentData.depth) {
            // Buy orders (bids) - first 5 levels
            if (instrumentData.depth.buy) {
              instrumentData.depth.buy.forEach((bid: any) => {
                if (bid.price > 0 || bid.quantity > 0) {
                  bids.push({
                    price: bid.price,
                    quantity: bid.quantity,
                    orders: bid.orders || 0,
                  });
                }
              });
            }

            // Sell orders (asks) - first 5 levels
            if (instrumentData.depth.sell) {
              instrumentData.depth.sell.forEach((ask: any) => {
                if (ask.price > 0 || ask.quantity > 0) {
                  asks.push({
                    price: ask.price,
                    quantity: ask.quantity,
                    orders: ask.orders || 0,
                  });
                }
              });
            }
          }

          const newData: MarketDepthData = {
            instrumentKey,
            bids,
            asks,
            ltp: instrumentData.last_price || 0,
            timestamp: Date.now(),
            ohlc: instrumentData.ohlc
              ? {
                  open: instrumentData.ohlc.open,
                  high: instrumentData.ohlc.high,
                  low: instrumentData.ohlc.low,
                  close: instrumentData.ohlc.close,
                }
              : undefined,
            volume: instrumentData.volume,
            averagePrice: instrumentData.average_price,
            netChange: instrumentData.net_change,
            totalBuyQuantity: instrumentData.total_buy_quantity,
            totalSellQuantity: instrumentData.total_sell_quantity,
          };

          setDepthData(newData);
        }
      } else {
        throw new Error(result.message || "Failed to fetch market quote");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch market quote";
      console.error("Error fetching market quote:", err);
      setError(errorMsg);
      toast.error("Connection Error", {
        description: errorMsg,
      });
      setIsConnected(false);
      localStorage.setItem("websocket-connected", "false");
    } finally {
      setIsRefreshing(false);
    }
  }, [accessToken, instrumentKey, enabled, useStream]);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      localStorage.setItem("websocket-connected", "false");
      return;
    }

    if (useStream) {
      setError(streamError || null);
      setIsConnected(streamConnected);
      return;
    }

    // Initial fetch
    fetchMarketDepth();

    // Set up polling
    const interval = setInterval(() => {
      fetchMarketDepth();
    }, pollInterval);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
      localStorage.setItem("websocket-connected", "false");
    };
  }, [
    fetchMarketDepth,
    pollInterval,
    enabled,
    useStream,
    streamConnected,
    streamError,
  ]);

  return {
    depthData,
    isConnected,
    error,
    refresh: fetchMarketDepth,
    isRefreshing,
  };
}
