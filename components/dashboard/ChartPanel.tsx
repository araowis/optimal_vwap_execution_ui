"use client";

import { useEffect, useMemo, useState, memo } from "react";
import {
  calculateVWAP,
  calculateVWAPBands,
  calculateDeviation,
  aggregateCandles,
  detectBuySignals,
} from "@/lib/vwap-calculator";
import { calculateVolumeBins } from "@/lib/volume-allocation";
import {
  Candle,
  ChartDatapoint,
  CustomizationPrefs,
  BackendBuySignal,
} from "@/lib/types";
import { vwapServerService, PretradeResponse } from "@/lib/vwap-server-service";
import { WSCalibrationMessage, WSRegimeMessage } from "@/lib/vwap-server-types";
import { Activity, AlertCircle, RefreshCw, SlidersHorizontal, Plus } from "lucide-react";
import PriceChart from "./charts/PriceChart";
import VolumeChart from "./charts/VolumeChart";
import PretradeCharts from "./charts/PretradeCharts";

interface ChartPanelProps {
  candles: Candle[];
  chartData: ChartDatapoint[];
  customizationPrefs: CustomizationPrefs;
  onPreferencesChange?: (prefs: CustomizationPrefs) => void;
  onChartDataChange: (data: ChartDatapoint[]) => void;
  companyLogo?: string;
  instrumentName?: string;
  sector?: string;
  instrumentKey?: string;
  timeframeMode?: "ALL" | "DAY" | "WEEK" | "MONTH" | "YEAR";
  onTimeframeChange?: (mode: "ALL" | "DAY" | "WEEK" | "MONTH" | "YEAR") => void;
  mode?: "backtest" | "realtime";
  realtimePriceUpdate?: {
    ltp: number;
    timestamp: number;
    volume?: number;
    vwap?: number;
  };
  onPretradeDataChange?: (data: PretradeResponse | null) => void;
  backendBuySignals?: BackendBuySignal[];
  liveCalibration?: WSCalibrationMessage | null;
  liveRegime?: WSRegimeMessage | null;
  vwapWsConnected?: boolean;
  vwapWsConnecting?: boolean;
}

const ChartPanel = memo(function ChartPanel({
  candles,
  chartData,
  customizationPrefs,
  onPreferencesChange,
  instrumentKey,
  onChartDataChange,
  companyLogo,
  instrumentName,
  sector,
  timeframeMode = "ALL",
  onPretradeDataChange,
  onTimeframeChange,
  mode = "backtest",
  realtimePriceUpdate,
  backendBuySignals = [],
  liveCalibration = null,
  liveRegime = null,
  vwapWsConnected = false,
  vwapWsConnecting = false,
}: ChartPanelProps) {
  const [displayData, setDisplayData] = useState<ChartDatapoint[]>([]);
  const [pretradeData, setPretradeData] = useState<PretradeResponse | null>(
    null,
  );
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [clickedCandle, setClickedCandle] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [visibleDataPoints, setVisibleDataPoints] = useState(2000);
  const [volumeCurveVisible, setVolumeCurveVisible] = useState(true);
  const [showPretradeInMain, setShowPretradeInMain] = useState(false);
  const [horizontalLines, setHorizontalLines] = useState<number[]>([]);
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [showSignalSettings, setShowSignalSettings] = useState(false);

  const availableKeys = useMemo(() => {
    if (candles.length === 0) return [] as string[];

    const keys = new Set<string>();

    for (const c of candles) {
      const d = c.timestamp;
      if (timeframeMode === "DAY") {
        keys.add(d.toISOString().slice(0, 10));
      } else if (timeframeMode === "MONTH") {
        keys.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        );
      } else if (timeframeMode === "YEAR") {
        keys.add(String(d.getFullYear()));
      } else if (timeframeMode === "WEEK") {
        const tmp = new Date(d);
        tmp.setHours(0, 0, 0, 0);
        const day = (tmp.getDay() + 6) % 7;
        tmp.setDate(tmp.getDate() - day + 3);
        const firstThursday = new Date(tmp.getFullYear(), 0, 4);
        const firstDay = (firstThursday.getDay() + 6) % 7;
        firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
        const week =
          1 +
          Math.round(
            (tmp.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000),
          );
        keys.add(`${tmp.getFullYear()}-W${String(week).padStart(2, "0")}`);
      }
    }

    return Array.from(keys).sort();
  }, [candles, timeframeMode]);

  useEffect(() => {
    if (timeframeMode === "ALL") {
      setSelectedKey("");
      return;
    }

    if (!availableKeys.length) {
      setSelectedKey("");
      return;
    }

    setSelectedKey((prev) =>
      prev && availableKeys.includes(prev)
        ? prev
        : availableKeys[availableKeys.length - 1],
    );
  }, [availableKeys, timeframeMode]);

  const filteredCandles = useMemo(() => {
    if (candles.length === 0) return [] as Candle[];

    const isDailyCandle = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return hours === 0 && minutes === 0;
    };

    const allDaily = candles.every((c) => isDailyCandle(c.timestamp));

    if (allDaily) {
      if (timeframeMode === "ALL" || !selectedKey) return candles;

      const matches = (d: Date) => {
        if (timeframeMode === "DAY")
          return d.toISOString().slice(0, 10) === selectedKey;
        if (timeframeMode === "MONTH")
          return (
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` ===
            selectedKey
          );
        if (timeframeMode === "YEAR")
          return String(d.getFullYear()) === selectedKey;
        if (timeframeMode === "WEEK") {
          const tmp = new Date(d);
          tmp.setHours(0, 0, 0, 0);
          const day = (tmp.getDay() + 6) % 7;
          tmp.setDate(tmp.getDate() - day + 3);
          const firstThursday = new Date(tmp.getFullYear(), 0, 4);
          const firstDay = (firstThursday.getDay() + 6) % 7;
          firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
          const week =
            1 +
            Math.round(
              (tmp.getTime() - firstThursday.getTime()) /
              (7 * 24 * 3600 * 1000),
            );
          return (
            `${tmp.getFullYear()}-W${String(week).padStart(2, "0")}` ===
            selectedKey
          );
        }
        return true;
      };

      return candles.filter((c) => matches(c.timestamp));
    }

    const isMarketHour = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();

      if (timeframeMode === "ALL") return true;

      return (
        (hours > 9 || (hours === 9 && minutes >= 15)) &&
        (hours < 15 || (hours === 15 && minutes <= 30))
      );
    };

    const marketHourCandles = candles.filter((c) => isMarketHour(c.timestamp));
    const baseCandles =
      marketHourCandles.length > 0 ? marketHourCandles : candles;

    if (timeframeMode === "ALL" || !selectedKey) return baseCandles;

    const matches = (d: Date) => {
      const dateStr = d.toISOString().slice(0, 10);
      if (timeframeMode === "DAY") return dateStr === selectedKey;
      if (timeframeMode === "MONTH") return dateStr.slice(0, 7) === selectedKey;
      if (timeframeMode === "YEAR") return dateStr.slice(0, 4) === selectedKey;
      if (timeframeMode === "WEEK") {
        const tmp = new Date(d);
        tmp.setHours(0, 0, 0, 0);
        const day = (tmp.getDay() + 6) % 7;
        tmp.setDate(tmp.getDate() - day + 3);
        const firstThursday = new Date(tmp.getFullYear(), 0, 4);
        const firstDay = (firstThursday.getDay() + 6) % 7;
        firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
        const week =
          1 +
          Math.round(
            (tmp.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000),
          );
        return (
          `${tmp.getFullYear()}-W${String(week).padStart(2, "0")}` ===
          selectedKey
        );
      }
      return true;
    };

    return baseCandles.filter((c) => matches(c.timestamp));
  }, [candles, selectedKey, timeframeMode]);

  useEffect(() => {
    if (filteredCandles.length === 0) {
      setDisplayData([]);
      return;
    }

    const aggregated = aggregateCandles(
      filteredCandles,
      customizationPrefs.chartPeriod,
    );
    let vwapData = calculateVWAP(aggregated);
    vwapData = calculateVWAPBands(vwapData, customizationPrefs.bandWidth);

    let newChartData: ChartDatapoint[] = aggregated.map((candle, index) => {
      const vwap = vwapData[index];
      const { absolute: devAbsolute, percentage: devPct } = calculateDeviation(
        candle.close,
        vwap.vwap,
      );

      const volumeBins = calculateVolumeBins(
        candle,
        customizationPrefs.numVolumeBins,
      );

      return {
        candle,
        vwapData: vwap,
        volumeBins,
        deviationFromVWAP: devAbsolute,
        deviationPercentage: devPct,
      };
    });

    const signaledData = detectBuySignals(
      newChartData,
      customizationPrefs.buyThreshold,
      customizationPrefs.minVolumeThreshold,
    );

    setDisplayData(signaledData);
    onChartDataChange(signaledData);
  }, [filteredCandles, customizationPrefs, onChartDataChange]);

  useEffect(() => {
    if (mode !== "realtime" || !realtimePriceUpdate) {
      return;
    }
    setDisplayData((prev) => {
      const currentTickTime = new Date(realtimePriceUpdate.timestamp);

      const getPeriodStart = (date: Date, period: string) => {
        const d = new Date(date);
        d.setSeconds(0, 0);
        d.setMilliseconds(0);
        if (period === "5MIN") {
          d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
        } else if (period === "15MIN") {
          d.setMinutes(Math.floor(d.getMinutes() / 15) * 15);
        } else if (period === "HOURLY") {
          d.setMinutes(0);
        } else if (period === "DAILY") {
          d.setHours(0, 0, 0, 0);
        }
        return d.getTime();
      };

      const periodStart = getPeriodStart(
        currentTickTime,
        customizationPrefs.chartPeriod,
      );

      if (prev.length === 0) {
        const initialCandle: Candle = {
          timestamp: new Date(periodStart),
          open: realtimePriceUpdate.ltp,
          high: realtimePriceUpdate.ltp,
          low: realtimePriceUpdate.ltp,
          close: realtimePriceUpdate.ltp,
          volume: realtimePriceUpdate.volume || 0,
          vwap: realtimePriceUpdate.vwap,
          oi: 0,
        };

        const initialDatapoint: ChartDatapoint = {
          candle: initialCandle,
          vwapData: {
            timestamp: initialCandle.timestamp,
            vwap: realtimePriceUpdate.vwap ?? initialCandle.close,
            upperBand:
              (realtimePriceUpdate.vwap ?? initialCandle.close) *
              (1 + customizationPrefs.bandWidth / 100),
            lowerBand:
              (realtimePriceUpdate.vwap ?? initialCandle.close) *
              (1 - customizationPrefs.bandWidth / 100),
            stdDev: 0,
            cumulativeTP:
              (realtimePriceUpdate.vwap ?? initialCandle.close) *
              (initialCandle.volume || 1),
            cumulativeVolume: initialCandle.volume || 1,
          },
          volumeBins: calculateVolumeBins(
            initialCandle,
            customizationPrefs.numVolumeBins,
          ),
          deviationFromVWAP: realtimePriceUpdate.vwap
            ? realtimePriceUpdate.ltp - realtimePriceUpdate.vwap
            : 0,
          deviationPercentage: realtimePriceUpdate.vwap
            ? ((realtimePriceUpdate.ltp - realtimePriceUpdate.vwap) /
              realtimePriceUpdate.vwap) *
            100
            : 0,
        };

        return [initialDatapoint];
      }

      const lastCandleIndex = prev.length - 1;
      const lastDatapoint = prev[lastCandleIndex];
      const lastPeriodStart = getPeriodStart(
        lastDatapoint.candle.timestamp,
        customizationPrefs.chartPeriod,
      );

      const isNewBar = periodStart > lastPeriodStart;

      if (isNewBar) {
        // Create a new candle
        const newCandle: Candle = {
          timestamp: new Date(periodStart),
          open: realtimePriceUpdate.ltp,
          high: realtimePriceUpdate.ltp,
          low: realtimePriceUpdate.ltp,
          close: realtimePriceUpdate.ltp,
          volume: realtimePriceUpdate.volume || 0,
          vwap: realtimePriceUpdate.vwap,
          oi: 0,
        };

        const prevVwap = lastDatapoint.vwapData;
        const currentVwap = realtimePriceUpdate.vwap ?? prevVwap.vwap;

        const newDatapoint: ChartDatapoint = {
          candle: newCandle,
          vwapData: {
            timestamp: newCandle.timestamp,
            vwap: currentVwap,
            stdDev: prevVwap.stdDev,
            cumulativeTP:
              (prevVwap.cumulativeTP || 0) +
              newCandle.close * (newCandle.volume || 0),
            upperBand: currentVwap * (1 + customizationPrefs.bandWidth / 100),
            lowerBand: currentVwap * (1 - customizationPrefs.bandWidth / 100),
            cumulativeVolume:
              (prevVwap.cumulativeVolume || 0) + (newCandle.volume || 0),
          },
          volumeBins: calculateVolumeBins(
            newCandle,
            customizationPrefs.numVolumeBins,
          ),
          deviationFromVWAP: calculateDeviation(newCandle.close, currentVwap)
            .absolute,
          deviationPercentage: calculateDeviation(newCandle.close, currentVwap)
            .percentage,
        };

        return [...prev, newDatapoint];
      } else {
        // Update existing candle
        const updatedCandle: Candle = {
          ...lastDatapoint.candle,
          close: realtimePriceUpdate.ltp,
          high: Math.max(lastDatapoint.candle.high, realtimePriceUpdate.ltp),
          low: Math.min(lastDatapoint.candle.low, realtimePriceUpdate.ltp),
          volume:
            realtimePriceUpdate.volume !== undefined
              ? realtimePriceUpdate.volume
              : lastDatapoint.candle.volume,
          vwap:
            realtimePriceUpdate.vwap !== undefined
              ? realtimePriceUpdate.vwap
              : lastDatapoint.candle.vwap,
        };

        const prevVwap =
          lastCandleIndex > 0 ? prev[lastCandleIndex - 1].vwapData : null;
        const currentVwap =
          realtimePriceUpdate.vwap ?? lastDatapoint.vwapData.vwap;

        const updatedDatapoint: ChartDatapoint = {
          candle: updatedCandle,
          vwapData: {
            ...lastDatapoint.vwapData,
            timestamp: updatedCandle.timestamp,
            vwap: currentVwap,
            upperBand: currentVwap * (1 + customizationPrefs.bandWidth / 100),
            lowerBand: currentVwap * (1 - customizationPrefs.bandWidth / 100),
          },
          volumeBins: calculateVolumeBins(
            updatedCandle,
            customizationPrefs.numVolumeBins,
          ),
          deviationFromVWAP: calculateDeviation(
            updatedCandle.close,
            currentVwap,
          ).absolute,
          deviationPercentage: calculateDeviation(
            updatedCandle.close,
            currentVwap,
          ).percentage,
        };

        return [...prev.slice(0, -1), updatedDatapoint];
      }
    });
  }, [realtimePriceUpdate, mode, customizationPrefs]);

  // Fetch pretrade data when instrument key changes
  useEffect(() => {
    if (!instrumentKey || mode === 'backtest') {
      setPretradeData(null);
      onPretradeDataChange?.(null);
      return;
    }

    const fetchPretrade = async () => {
      try {
        const isHealthy = await vwapServerService.healthCheck();
        if (!isHealthy) return;
        const data = await vwapServerService.getPretrade(instrumentKey, 375);
        setPretradeData(data);
        onPretradeDataChange?.(data);
      } catch {
        // Pretrade not yet available (instrument not calibrated) — silently ignore
        setPretradeData(null);
        onPretradeDataChange?.(null);
      }
    };

    fetchPretrade();
  }, [instrumentKey, mode, onPretradeDataChange]);

  const sampledDisplayData = useMemo(() => {
    if (displayData.length <= visibleDataPoints) return displayData;

    const step = Math.ceil(displayData.length / visibleDataPoints);

    // Identify indices that HAVE backend signals
    const signalIndices = new Set<number>();
    if (backendBuySignals.length > 0) {
      const signalTimes = new Set(backendBuySignals.map((s) => s.time));
      displayData.forEach((d, idx) => {
        const timeStr = d.candle.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        if (signalTimes.has(timeStr)) {
          signalIndices.add(idx);
        }
      });
    }

    return displayData.filter(
      (_, idx) => idx % step === 0 || signalIndices.has(idx),
    );
  }, [displayData, visibleDataPoints, backendBuySignals]);

  if (candles.length === 0 && mode === "backtest") {
    return (
      <div className="flex items-center justify-center h-full bg-background rounded-lg">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Upload stock data to start analyzing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 h-full overflow-hidden">
      {/* Chart Title + Timeframe Controls */}
      <div className="flex items-center justify-between gap-3 group">
        <div className="flex items-center gap-3">
          {companyLogo && (
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 overflow-hidden">
              <img
                src={companyLogo}
                alt={instrumentName || "Company Logo"}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
          <div className="flex flex-col justify-center gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-foreground uppercase tracking-tight leading-none">
                {instrumentName || "Price & VWAP Analysis"}
              </h2>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {vwapWsConnected ? (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                    <Activity className="w-3 h-3" />
                    Live Engine Connected
                  </span>
                ) : vwapWsConnecting ? (
                  <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                    <AlertCircle className="w-3 h-3" />
                    Engine Disconnected
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {sector && (
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">
                  {sector}
                </span>
              )}
              {liveRegime && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase leading-none ${liveRegime.newRegime === "UP"
                    ? "bg-green-500/20 text-green-500"
                    : liveRegime.newRegime === "DOWN"
                      ? "bg-red-500/20 text-red-500"
                      : "bg-gray-500/20 text-gray-400"
                    }`}
                >
                  Regime: {liveRegime.newRegime}
                </span>
              )}
              {liveCalibration && (
                <span className="text-[10px] text-muted-foreground leading-none">
                  Bar {liveCalibration.barIdx}/375
                </span>
              )}
              {pretradeData && !liveCalibration && (
                <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 leading-none">
                  <span className="w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full"></span>
                  Pretrade loaded
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode !== "realtime" && (
            <div className="bg-secondary rounded-md border border-border hover:border-primary/50 transition-colors">
              <select
                value={timeframeMode}
                onChange={(e) => onTimeframeChange?.(e.target.value as any)}
                className="text-[11px] bg-transparent pl-3 pr-2 py-1.5 cursor-pointer outline-none min-w-[100px] text-foreground font-medium"
                title="Timeframe"
              >
                <option value="ALL" className="bg-background text-foreground">
                  All Periods
                </option>
                <option value="DAY" className="bg-background text-foreground">
                  Trading Day
                </option>
                <option value="WEEK" className="bg-background text-foreground">
                  Week
                </option>
                <option value="MONTH" className="bg-background text-foreground">
                  Month
                </option>
                <option value="YEAR" className="bg-background text-foreground">
                  Year
                </option>
              </select>
            </div>
          )}

          {mode !== "realtime" && timeframeMode !== "ALL" && (
            <div className="bg-secondary rounded-md border border-border hover:border-primary/50 transition-colors">
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="text-[11px] bg-transparent pl-3 pr-2 py-1.5 cursor-pointer outline-none max-w-48 text-foreground font-medium"
                title="Select period"
              >
                {availableKeys.map((k) => (
                  <option
                    key={k}
                    value={k}
                    className="bg-background text-foreground"
                  >
                    {k}
                  </option>
                ))}
              </select>
            </div>
          )}

          {displayData.length > 200 && (
            <div className="bg-secondary rounded-md border border-border hover:border-primary/50 transition-colors">
              <select
                value={visibleDataPoints}
                onChange={(e) => setVisibleDataPoints(Number(e.target.value))}
                className="text-[11px] bg-transparent pl-3 pr-2 py-1.5 cursor-pointer outline-none text-foreground font-medium"
                title="Data Points"
              >
                <option value={50} className="bg-background text-foreground">
                  50 (Fast)
                </option>
                <option value={100} className="bg-background text-foreground">
                  100
                </option>
                <option value={200} className="bg-background text-foreground">
                  200 (Default)
                </option>
                <option value={500} className="bg-background text-foreground">
                  500
                </option>
                <option value={1000} className="bg-background text-foreground">
                  1000
                </option>
                <option
                  value={displayData.length}
                  className="bg-background text-foreground"
                >
                  All ({displayData.length})
                </option>
              </select>
            </div>
          )}

          {pretradeData && (
            <button
              onClick={() => setShowPretradeInMain(!showPretradeInMain)}
              className="text-xs bg-primary/10 text-primary border border-primary/20 rounded px-2 py-1 hover:bg-primary/20"
              title="Toggle pretrade volume curve location"
            >
              {showPretradeInMain ? "Pretrade: Main" : "Pretrade: Below"}
            </button>
          )}

          <div className="bg-secondary rounded-md border border-border hover:border-primary/50 transition-colors">
            <select
              value={customizationPrefs.chartType}
              onChange={(e) =>
                onPreferencesChange?.({
                  ...customizationPrefs,
                  chartType: e.target.value as any,
                })
              }
              className="text-[11px] bg-transparent pl-3 pr-2 py-1.5 cursor-pointer outline-none text-foreground font-medium"
              title="Chart Type"
            >
              <option value="CANDLESTICK" className="bg-background text-foreground">
                Candlestick
              </option>
              <option value="OHLC" className="bg-background text-foreground">
                OHLC
              </option>
              <option value="LINE" className="bg-background text-foreground">
                Line
              </option>
              <option value="AREA" className="bg-background text-foreground">
                Area
              </option>
            </select>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSignalSettings(!showSignalSettings)}
              className={`text-[11px] px-2.5 py-1.5 rounded-md border transition-all flex items-center gap-1.5 font-medium ${showSignalSettings
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-border text-foreground hover:bg-secondary/80 hover:border-primary/50"
                }`}
              title="Buy Signal Styling & Filters"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Signals</span>
            </button>

            {showSignalSettings && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-4 flex flex-col gap-3.5 text-foreground ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="font-bold text-xs tracking-tight">Signals</span>
                  <button
                    onClick={() => setShowSignalSettings(false)}
                    className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                  >
                    Close
                  </button>
                </div>

                {/* Show Signals Switch */}
                <div className="flex items-center justify-between gap-4">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border bg-secondary text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer"
                      checked={customizationPrefs.signalsVisible}
                      onChange={(e) =>
                        onPreferencesChange?.({
                          ...customizationPrefs,
                          signalsVisible: e.target.checked,
                        })
                      }
                    />
                    Show Signals
                  </label>

                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border bg-secondary text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer"
                      checked={customizationPrefs.showSignalLines}
                      onChange={(e) =>
                        onPreferencesChange?.({
                          ...customizationPrefs,
                          showSignalLines: e.target.checked,
                        })
                      }
                    />
                    Vertical Lines
                  </label>
                </div>

                {/* Marker Style */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Marker Style
                  </label>
                  <select
                    value={customizationPrefs.signalMarkerType}
                    onChange={(e) =>
                      onPreferencesChange?.({
                        ...customizationPrefs,
                        signalMarkerType: e.target.value as any,
                      })
                    }
                    className="w-full text-xs bg-secondary border border-border rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  >
                    <option value="PIN" className="bg-background text-foreground">Location Pin</option>
                    <option value="DOT" className="bg-background text-foreground">Simple Dot</option>
                    <option value="ARROW" className="bg-background text-foreground">Upward Arrow</option>
                  </select>
                </div>

                {/* Marker Size */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      Marker Size
                    </label>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {customizationPrefs.signalMarkerSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="16"
                    step="2"
                    value={customizationPrefs.signalMarkerSize}
                    onChange={(e) =>
                      onPreferencesChange?.({
                        ...customizationPrefs,
                        signalMarkerSize: parseInt(e.target.value),
                      })
                    }
                    className="w-full accent-primary bg-secondary h-1 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Buy Threshold Dev % */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Buy Threshold (Dev %)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={customizationPrefs.buyThreshold}
                    onChange={(e) =>
                      onPreferencesChange?.({
                        ...customizationPrefs,
                        buyThreshold: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs bg-secondary border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  />
                </div>

                {/* Min Volume */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Min Volume
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={customizationPrefs.minVolumeThreshold}
                    onChange={(e) =>
                      onPreferencesChange?.({
                        ...customizationPrefs,
                        minVolumeThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs bg-secondary border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  />
                </div>

                {/* Strength Threshold */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      Strength Threshold
                    </label>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {customizationPrefs.signalStrengthThreshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={customizationPrefs.signalStrengthThreshold}
                    onChange={(e) =>
                      onPreferencesChange?.({
                        ...customizationPrefs,
                        signalStrengthThreshold: parseInt(e.target.value),
                      })
                    }
                    className="w-full accent-primary bg-secondary h-1 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsAddingLine(!isAddingLine)}
            className={`group text-[11px] px-2.5 py-1.5 rounded-md border transition-all flex items-center justify-center gap-0 hover:gap-1.5 ${isAddingLine
              ? "bg-blue-500 text-white border-blue-600 animate-pulse"
              : "bg-secondary border-border text-foreground hover:bg-secondary/80 hover:border-primary/50"
              }`}
            title="Click on chart to add a horizontal price line"
          >
            {isAddingLine ? (
              <span className="animate-in fade-in duration-300">Click Chart...</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap">
                  Add Line
                </span>
              </>
            )}
          </button>

          {horizontalLines.length > 0 && (
            <button
              onClick={() => setHorizontalLines([])}
              className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 rounded px-2 py-1 hover:bg-red-500/20"
            >
              Clear Lines
            </button>
          )}
        </div>
      </div>

      {/* Price Chart */}
      <div className="flex-1 bg-background rounded-lg border border-border overflow-hidden">
        <PriceChart
          data={sampledDisplayData}
          prefs={customizationPrefs}
          hoveredCandle={hoveredCandle}
          onCandleHover={setHoveredCandle}
          volumeCurveVisible={volumeCurveVisible}
          volumeCurveData={liveCalibration?.eXt || pretradeData?.eXt || []}
          timeLabels={pretradeData?.timeLabels || []}
          onClickedCandle={(idx) => {
            if (isAddingLine && idx !== null && sampledDisplayData[idx]) {
              setHorizontalLines((prev) => [
                ...prev,
                sampledDisplayData[idx].candle.close,
              ]);
              setIsAddingLine(false);
            }
            setClickedCandle(idx);
          }}
          pretradeVolumeCurve={
            liveCalibration?.xStar || pretradeData?.eXt || []
          } // Using xStar as main guide if live
          showPretradeInMain={showPretradeInMain}
          backendBuySignals={backendBuySignals}
          horizontalLines={horizontalLines}
        />
      </div>

      {/* Pretrade Charts */}
      {!showPretradeInMain && (
        <PretradeCharts
          pretradeData={pretradeData}
          liveCalibration={liveCalibration}
        />
      )}

      {/* Hover Info (Responsive container) */}
      <div className="bg-secondary/30 backdrop-blur-sm rounded-xl p-3 border border-border/50 min-h-[5rem] flex items-center shadow-inner">
        {(hoveredCandle !== null && sampledDisplayData[hoveredCandle]) ||
          (clickedCandle !== null && sampledDisplayData[clickedCandle]) ? (
          <DatapointInfo
            datapoint={
              sampledDisplayData[
              hoveredCandle !== null ? hoveredCandle : clickedCandle!
              ]
            }
            showVolume={true}
            backendSignals={backendBuySignals}
          />
        ) : (
          <div className="w-full flex items-center justify-center py-2">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse"></span>
              Hover on the chart to see candle details, click to see volume and
              metrics
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

function DatapointInfo({
  datapoint,
  showVolume,
  backendSignals = [],
}: {
  datapoint: ChartDatapoint;
  showVolume?: boolean;
  backendSignals?: BackendBuySignal[];
}) {
  const { candle, vwapData, deviationPercentage } = datapoint;
  const isUp = candle.close >= candle.open;

  const timeStr = candle.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const sig = backendSignals.find((s) => s.time === timeStr);

  return (
    <div className="w-full flex flex-wrap items-center gap-x-8 gap-y-3">
      {/* Time & Basic Price */}
      <div className="flex items-center gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Time
          </p>
          <p className="text-sm font-bold text-foreground">
            {candle.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>

        <div className="flex gap-4 border-l border-border/40 pl-6">
          {[
            { label: "O", val: candle.open },
            { label: "H", val: candle.high },
            { label: "L", val: candle.low },
            { label: "C", val: candle.close, highlight: true },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] text-muted-foreground font-medium">
                {item.label}
              </p>
              <p
                className={`text-xs font-bold ${item.highlight ? (isUp ? "text-green-500" : "text-red-500") : "text-foreground"}`}
              >
                {item.val.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* VWAP & Analytics */}
      <div className="flex items-center gap-6 border-l border-border/40 pl-6">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            VWAP
          </p>
          <p className="text-sm font-bold text-red-500">
            {vwapData.vwap.toFixed(2)}
          </p>
        </div>

        <div className="flex gap-6">
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Volume
            </p>
            <p className="text-xs font-bold text-foreground">
              {candle.volume >= 1000000
                ? `${(candle.volume / 1000000).toFixed(2)}M`
                : `${(candle.volume / 1000).toFixed(1)}K`}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Deviation
            </p>
            <p
              className={`text-xs font-bold ${deviationPercentage < 0 ? "text-green-500" : "text-red-500"}`}
            >
              {deviationPercentage.toFixed(3)}%
            </p>
          </div>
        </div>
      </div>

      {/* Buy Signal Indicator */}
      {sig && (
        <div className="ml-auto flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 animate-in fade-in zoom-in duration-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div className="flex flex-col">
            <p className="text-[10px] text-green-600 dark:text-green-400 font-bold leading-none uppercase tracking-tighter">
              Buy Signal
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 font-black">
              Bin #{sig.binIdx} @ ₹{sig.execPrice.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChartPanel;
