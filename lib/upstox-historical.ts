"use client";

import { Candle } from "./types";

interface FetchHistoricalCandlesProps {
  accessToken: string;
  instrumentKey: string;
  interval: "1minute" | "30minute" | "day" | "week" | "month";
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
}

export async function fetchHistoricalCandles({
  accessToken,
  instrumentKey,
  interval,
  fromDate,
  toDate,
}: FetchHistoricalCandlesProps): Promise<Candle[]> {
  try {
    const url = `/api/upstox/historical-candle?instrumentKey=${encodeURIComponent(instrumentKey)}&interval=${interval}&fromDate=${fromDate}&toDate=${toDate}`;
    console.log("[lib] Fetching from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const result = await response.json();

    if (result.ok && result.data?.data?.candles) {
      // Parse the candle data from the API response
      const candles: Candle[] = result.data.data.candles.map((candle: any) => ({
        timestamp: new Date(candle[0]),
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        oi: candle[6] || 0,
      }));

      // Sort by timestamp ascending for chart components
      return [...candles].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );
    } else {
      console.error("[lib] Data fetch error:", result);
      throw new Error(result.error || "Failed to fetch historical candles");
    }
  } catch (error) {
    console.error("Error fetching historical candles:", error);
    throw error;
  }
}

export function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}
