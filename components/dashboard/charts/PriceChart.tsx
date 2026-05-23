"use client";

import React, { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  Brush,
  Legend,
  Bar,
  Cell,
} from "recharts";
import {
  ChartDatapoint,
  CustomizationPrefs,
  BackendBuySignal,
} from "@/lib/types";


// ── IST timestamp formatter ───────────────────────────────────────────────────
// Backend candle timestamps are NSE market times (Asia/Kolkata / IST).
// Always format in IST so XAxis, Tooltip, and Brush reflect backend time
// regardless of the browser's local timezone.
function fmtIST(ts: number, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    ...opts,
  }).format(ts);
}
function fmtISTTime(ts: number): string {
  return fmtIST(ts, { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtISTDate(ts: number): string {
  return fmtIST(ts, { month: "short", day: "numeric" });
}

// ── Custom green "pin" dot for backend buy signals ────────────────────────────
function BackendSignalDot(props: any) {
  const { cx, cy, payload, markerType = "PIN", markerSize = 8 } = props;
  if (!payload?.backendSignalPrice) return null;

  const r = markerSize;

  if (markerType === "DOT") {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r + 4} fill="#22c55e" fillOpacity={0.15} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#22c55e"
          stroke="#ffffff"
          strokeWidth={2}
        />
      </g>
    );
  }

  if (markerType === "ARROW") {
    return (
      <g>
        <path
          d={`M ${cx} ${cy} L ${cx - r} ${cy + r * 1.5} L ${cx + r} ${cy + r * 1.5} Z`}
          fill="#22c55e"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      </g>
    );
  }

  // Default: PIN
  return (
    <g style={{ cursor: "pointer" }}>
      {/* Upward pin triangle — tip pointing at price (cy) */}
      <polygon
        points={`${cx - 5},${cy + r + 8} ${cx + 5},${cy + r + 8} ${cx},${cy}`}
        fill="#22c55e"
      />
      {/* Outer glow ring */}
      <circle
        cx={cx}
        cy={cy + r + 8}
        r={r + 4}
        fill="#22c55e"
        fillOpacity={0.15}
      />
      {/* Main green circle */}
      <circle
        cx={cx}
        cy={cy + r + 8}
        r={r}
        fill="#22c55e"
        stroke="#ffffff"
        strokeWidth={2.5}
      />
      {/* "B" label inside the circle */}
      <text
        x={cx}
        y={cy + r + 9}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={9}
        fontWeight={800}
      >
        B
      </text>
    </g>
  );
}
// ── Tooltip ───────────────────────────────────────────────────────────────────
function PriceTooltip({ active, payload, label, coordinate }: any) {
  if (!active || !payload || !payload.length) return null;

  // Smart positioning: If we're on the right side of the chart, flip the tooltip left
  const isRightSide = coordinate && coordinate.x > 800; // Rough estimate or use relative %
  const transform = isRightSide
    ? "translateX(-100%) translateX(-20px)"
    : "translateX(20px)";

  const row = payload[0]?.payload;
  if (!row) return null;

  // Use raw epoch ms from the candle — format in IST (backend's timezone)
  const tsMs =
    typeof row.timestamp === "number"
      ? row.timestamp
      : new Date(label).getTime();
  const isUp = row.close >= row.open;
  const priceColor = isUp ? "#10b981" : "#f43f5e";
  const signals: BackendBuySignal[] = row.backendSignalMetaList ?? [];
  const hasSignals = signals.length > 0;

  return (
    <div
      style={{
        backgroundColor: "var(--card)",
        border: `1.5px solid ${hasSignals ? "#22c55e" : "var(--border)"}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: hasSignals
          ? "0 0 0 3px rgba(34,197,94,0.12), 0 12px 24px -10px rgba(0,0,0,0.3)"
          : "0 10px 20px -10px rgba(0,0,0,0.25)",
        minWidth: 210,
        transform,
        transition: "transform 0.1s ease-out",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {/* Time header */}
      <div
        style={{
          color: "var(--foreground)",
          fontWeight: 700,
          fontSize: 12,
          marginBottom: 6,
        }}
      >
        {fmtISTTime(tsMs)}
      </div>

      {/* Buy signal detail panel(s) */}
      {signals.map((sig, idx) => (
        <div
          key={`${sig.binIdx}-${sig.time}-${idx}`}
          style={{
            marginBottom: idx === signals.length - 1 ? 8 : 4,
            padding: "9px 10px",
            background: "rgba(34,197,94,0.08)",
            borderRadius: 8,
            border: "1px solid rgba(34,197,94,0.25)",
          }}
        >
          <div
            style={{
              color: "#22c55e",
              fontWeight: 800,
              fontSize: 13,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 14 }}>🟢</span> Buy Signal
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11.5,
            }}
          >
            <tbody>
              {[
                ["Exec Price", `₹${sig.execPrice.toFixed(2)}`, "#22c55e"],
                [
                  "Executed Qty",
                  sig.executedQty.toLocaleString(),
                  "var(--foreground)",
                ],
                [
                  "Cum Target",
                  sig.cumTarget.toLocaleString(),
                  "var(--foreground)",
                ],
                ["x*", sig.xStar.toFixed(4), "#94a3b8"],
              ].map(([label, val, color]) => (
                <tr key={String(label)}>
                  <td
                    style={{
                      color: "var(--muted-foreground)",
                      paddingBottom: 3,
                      paddingRight: 12,
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      color: String(color),
                      fontWeight: 700,
                      textAlign: "right",
                      paddingBottom: 3,
                    }}
                  >
                    {val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Standard OHLCV section */}
      <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
        <div
          style={{
            color: "#ef4444",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span>VWAP</span>
          <span style={{ fontWeight: 700 }}>{Number(row.vwap).toFixed(2)}</span>
        </div>
        <div
          style={{
            color: "#3b82f6",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span>Price</span>
          <span style={{ fontWeight: 700 }}>
            {Number(row.close).toFixed(2)}
          </span>
        </div>
        <div
          style={{
            color: priceColor,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 4,
          }}
        >
          <div>O: {Number(row.open).toFixed(2)}</div>
          <div>H: {Number(row.high).toFixed(2)}</div>
          <div>L: {Number(row.low).toFixed(2)}</div>
          <div>C: {Number(row.close).toFixed(2)}</div>
        </div>
        <div
          style={{
            color: "var(--muted-foreground)",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 4,
            borderTop: "1px solid var(--border)",
            paddingTop: 4,
          }}
        >
          <span>Volume</span>
          <span style={{ fontWeight: 700, color: "var(--foreground)" }}>
            {row.volume.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function CandlestickShape(props: any) {
  const { x, width, y, height, payload } = props;
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isUp = close >= open;

  // Premium Color Palette
  const upColor = "#22c55e"; // Vibrant Green
  const upBorder = "#166534"; // Dark Green Border
  const downColor = "#ef4444"; // Vibrant Red
  const downBorder = "#991b1b"; // Dark Red Border

  const bodyColor = isUp ? upColor : downColor;
  const borderColor = isUp ? upBorder : downBorder;
  const wickColor = isUp ? upColor : downColor;

  // y is the coordinate of the higher value in the range [low, high]
  // height is the pixel distance between low and high
  const range = Math.max(0.00001, high - low);
  const pixelPerUnit = height / range;

  const yOpen = y + (high - open) * pixelPerUnit;
  const yClose = y + (high - close) * pixelPerUnit;
  const yHigh = y;
  const yLow = y + height;

  const centerX = x + width / 2;
  const candleWidth = Math.max(3, width * 0.75); // Slightly wider
  const candleX = x + (width - candleWidth) / 2;

  return (
    <g className="candlestick-group">
      {/* Wick (High to Low) */}
      <line
        x1={centerX}
        y1={yHigh}
        x2={centerX}
        y2={yLow}
        stroke={wickColor}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Body (Open to Close) */}
      <rect
        x={candleX}
        y={Math.min(yOpen, yClose)}
        width={candleWidth}
        height={Math.max(1.5, Math.abs(yOpen - yClose))}
        fill={bodyColor}
        stroke={borderColor}
        strokeWidth={0.5}
        rx={1} // Slightly rounded corners for "premium" feel
        className="transition-all duration-200"
      />
    </g>
  );
}

function OHLCWebShape(props: any) {
  const { x, width, y, height, payload } = props;
  if (!payload) return null;

  const { open, close, high, low, wickColor } = payload;

  const range = high - low;
  const pixelPerUnit = range === 0 ? 0 : height / range;

  const yOpen = y + (high - open) * pixelPerUnit;
  const yClose = y + (high - close) * pixelPerUnit;
  const yHigh = y;
  const yLow = y + height;

  const centerX = x + width / 2;
  const tickWidth = width * 0.35;

  return (
    <g>
      {/* Main vertical line */}
      <line
        x1={centerX}
        y1={yHigh}
        x2={centerX}
        y2={yLow}
        stroke={wickColor}
        strokeWidth={1.5}
      />
      {/* Open tick (left) */}
      <line
        x1={centerX - tickWidth}
        y1={yOpen}
        x2={centerX}
        y2={yOpen}
        stroke={wickColor}
        strokeWidth={1.5}
      />
      {/* Close tick (right) */}
      <line
        x1={centerX}
        y1={yClose}
        x2={centerX + tickWidth}
        y2={yClose}
        stroke={wickColor}
        strokeWidth={1.5}
      />
    </g>
  );
}
interface PriceChartProps {
  data: ChartDatapoint[];
  prefs: CustomizationPrefs;
  hoveredCandle: number | null;
  onCandleHover: (index: number | null) => void;
  volumeCurveVisible: boolean;
  volumeCurveData?: number[];
  timeLabels?: string[];
  onClickedCandle: (index: number | null) => void;
  pretradeVolumeCurve?: number[];
  showPretradeInMain?: boolean;
  backendBuySignals?: BackendBuySignal[];
  horizontalLines?: number[];
}

// ── Component ─────────────────────────────────────────────────────────────────
const PriceChart = React.memo(function PriceChart({
  data,
  prefs,
  hoveredCandle,
  onCandleHover,
  volumeCurveVisible,
  volumeCurveData = [],
  timeLabels = [],
  onClickedCandle,
  pretradeVolumeCurve = [],
  showPretradeInMain = false,
  backendBuySignals = [],
  horizontalLines = [],
}: PriceChartProps) {
  const defaultPalette = {
    price: "#3b82f6",
    vwap: "#ef4444",
    band: "#a855f7",
    signal: "#06b6d4",
    neutral: "#64748b",
  };

  const bandColor = prefs.bandColor || {
    line: defaultPalette.vwap,
    upper: defaultPalette.band,
    lower: defaultPalette.band,
    fillOpacity: 0.12,
  };

  const buySignalColor = defaultPalette.signal;

  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
    return String(vol);
  };

  // Base chart data
  const chartData = useMemo(() => {
    const mapped = data.map((d, index) => {
      const isUp = d.candle.close >= d.candle.open;
      const isDaily =
        d.candle.timestamp.getHours() === 0 &&
        d.candle.timestamp.getMinutes() === 0;
      return {
        index,
        id: `candle-${index}-${d.candle.timestamp.getTime()}-${d.candle.close}`,
        timestamp: d.candle.timestamp.getTime(),
        timestampStr: isDaily
          ? fmtIST(d.candle.timestamp.getTime(), { year: "numeric", month: "short", day: "numeric" })
          : fmtISTTime(d.candle.timestamp.getTime()),
        isDaily,
        open: d.candle.open,
        high: d.candle.high,
        low: d.candle.low,
        close: d.candle.close,
        vwap: d.vwapData.vwap,
        upperBand: d.vwapData.upperBand,
        lowerBand: d.vwapData.lowerBand,
        volume: d.candle.volume,
        volumeUp: isUp ? d.candle.volume : 0,
        volumeDown: !isUp ? d.candle.volume : 0,
        bodyColor: isUp ? "#10b981" : "#f43f5e",
        wickColor: isUp ? "#10b981" : "#f43f5e",
        // OHLC range for Recharts range bar
        ohlcRange: [d.candle.low, d.candle.high],
      };
    });

    const seen = new Set<string>();
    return mapped.filter((d) => {
      const key = `${d.index}-${d.timestamp}-${d.close}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);

  // We need to calculate scaled Y coordinates for the custom shapes.
  // We can do this in the chart by using the YAxis scale, but Recharts doesn't expose it easily.
  // Instead, we'll use a dummy Bar and let Recharts pass the coordinates if we use multiple bars,
  // or we can just use the raw values and a "trick" with the ComposedChart.

  // Actually, the most reliable way in Recharts is to use a Bar with a custom shape
  // where we pass the scale through props if we can, or we calculate it.
  // But wait, Recharts' Bar component passes `x`, `y`, `width`, `height`.
  // If we want multiple Y coordinates, we have a problem.

  // WORKAROUND: In Recharts, if you have a Bar with dataKey="high" and another with dataKey="low",
  // you get those coordinates. But we want one component to draw everything.

  // Let's use the payload and the YAxis scale.
  // Since we don't have the scale here, we'll use the "Bar" trick:
  // We'll pass the OHLC values and use them in the shape.
  // Recharts passes the payload to the shape.

  // Add volume SMA + pretrade overlay
  const chartDataWithVolume = useMemo(() => {
    const period = 20;
    const vols = data.map((d) => d.candle.volume);
    const sma = vols.map((_, i) => {
      const start = Math.max(0, i - period + 1);
      let sum = 0;
      for (let j = start; j <= i; j++) sum += vols[j];
      return sum / (i - start + 1);
    });

    const pretradeValue =
      pretradeVolumeCurve.length > 0
        ? chartData.map((_, i) => {
            const idx = Math.floor(
              (i / data.length) * pretradeVolumeCurve.length,
            );
            return pretradeVolumeCurve[idx] || 0;
          })
        : [];

    return chartData.map((d, i) => ({
      ...d,
      volumeSma: sma[i],
      pretradeVolume: pretradeValue[i] || 0,
    }));
  }, [data, chartData, pretradeVolumeCurve]);

  // Merge backend buy signals into chart data points by HH:mm match
  const chartDataWithSignals = useMemo(() => {
    if (!backendBuySignals.length) {
      return chartDataWithVolume.map((d) => ({
        ...d,
        backendSignalPrice: null as number | null,
        backendSignalMetaList: [] as BackendBuySignal[],
      }));
    }

    const signalByTime = new Map<string, BackendBuySignal[]>();
    backendBuySignals.forEach((sig) => {
      const existing = signalByTime.get(sig.time) || [];
      signalByTime.set(sig.time, [...existing, sig]);
    });

    return chartDataWithVolume.map((d) => {
      // Match signals using IST HH:mm — backend signal times are always IST
      const hhmm = fmtISTTime(d.timestamp);
      const sigs = [...(signalByTime.get(hhmm) || [])];

      const dedupedSigs = sigs.filter((sig, idx, arr) => {
        return (
          idx ===
          arr.findIndex(
            (s) =>
              s.time === sig.time &&
              s.binIdx === sig.binIdx &&
              Math.abs(s.execPrice - sig.execPrice) < 0.0001,
          )
        );
      });

      return {
        ...d,
        // average execPrice for the dot position if multiple exist
        backendSignalPrice: dedupedSigs.length
          ? dedupedSigs[dedupedSigs.length - 1].execPrice
          : null,
        backendSignalMetaList: dedupedSigs,
      };
    });
  }, [chartDataWithVolume, backendBuySignals]);

  const maxVolume = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map((d) => d.candle.volume));
  }, [data]);

  const priceDomain = useMemo(() => {
    if (!data.length) return ["auto", "auto"] as any;

    // 1. Get base price range from valid candles only
    // We ignore candles that are extreme outliers (more than 50% away from the last candle)
    const lastPrice = data[data.length - 1].candle.close;
    const candleHighs = data
      .map((d) => d.candle.high)
      .filter((v) => v > 0 && Math.abs(v - lastPrice) < lastPrice * 0.5);
    const candleLows = data
      .map((d) => d.candle.low)
      .filter((v) => v > 0 && Math.abs(v - lastPrice) < lastPrice * 0.5);

    if (candleHighs.length === 0) return ["auto", "auto"] as any;

    let min = Math.min(...candleLows);
    let max = Math.max(...candleHighs);

    // 2. Expand domain for VWAP bands, but ONLY if they are close to the price
    if (prefs.bandsVisible) {
      data.forEach((d) => {
        const currentP = d.candle.close;
        const threshold = currentP * 0.2; // 20% threshold for bands

        if (
          d.vwapData.upperBand > 0 &&
          Math.abs(d.vwapData.upperBand - currentP) < threshold
        ) {
          max = Math.max(max, d.vwapData.upperBand);
        }
        if (
          d.vwapData.lowerBand > 0 &&
          Math.abs(d.vwapData.lowerBand - currentP) < threshold
        ) {
          min = Math.min(min, d.vwapData.lowerBand);
        }
      });
    }

    const range = max - min;
    const padding = range * 0.02; // 2% padding

    if (range === 0) {
      const pad = Math.max(0.1, Math.abs(min) * 0.01);
      return [min - pad, max + pad] as [number, number];
    }

    return [min - padding, max + padding] as [number, number];
  }, [data, prefs.bandsVisible]);

  const isMultiDay = useMemo(() => {
    if (chartData.length < 2) return false;
    const first = chartData[0].timestamp;
    const last = chartData[chartData.length - 1].timestamp;
    return last - first > 20 * 60 * 60 * 1000;
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 bg-background relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartDataWithSignals}
          margin={{ top: 10, right: 30, left: 60, bottom: 30 }}
          syncId="main-sync"
          syncMethod="index"
          onMouseMove={(e) => {
            if (e.activeTooltipIndex !== undefined) {
              onCandleHover(e.activeTooltipIndex);
            }
          }}
          onMouseLeave={() => onCandleHover(null)}
          onClick={(e) => {
            if (e.activeTooltipIndex !== undefined) {
              onClickedCandle(e.activeTooltipIndex);
            }
          }}
        >
          <CartesianGrid
            vertical
            horizontal
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.25}
          />

          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={defaultPalette.price}
                stopOpacity={0.35}
              />
              <stop
                offset="70%"
                stopColor={defaultPalette.price}
                stopOpacity={0.1}
              />
              <stop
                offset="100%"
                stopColor={defaultPalette.price}
                stopOpacity={0.02}
              />
            </linearGradient>
            <linearGradient id="brushGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="index"
            type="category"
            tickFormatter={(value) => {
              const candle = chartDataWithSignals[value];
              if (!candle) return "";
              const timeStr = fmtISTTime(candle.timestamp);
              if (isMultiDay) {
                return `${fmtISTDate(candle.timestamp)} ${timeStr}`;
              }
              return timeStr;
            }}
            stroke="var(--foreground)"
            fontSize={12}
            tick={{ fill: "var(--foreground)" }}
            interval="equidistantPreserveStart"
            minTickGap={60}
          />

          <YAxis
            domain={priceDomain}
            tickFormatter={(value) => value.toFixed(2)}
            stroke="var(--foreground)"
            fontSize={12}
            tick={{ fill: "var(--foreground)" }}
          />

          {(volumeCurveVisible || showPretradeInMain) && (
            <YAxis
              yAxisId="volume"
              orientation="right"
              tickFormatter={(v) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                return String(v);
              }}
              domain={[0, Math.max(1, Math.ceil(maxVolume * 4))]} // Multiplied by 4 to keep bars at bottom 25%
              stroke="var(--foreground)"
              fontSize={11}
              width={40}
            />
          )}

          <Tooltip
            content={<PriceTooltip />}
            cursor={{
              stroke: "var(--primary)",
              strokeWidth: 1,
              strokeDasharray: "3 3",
              opacity: 0.4,
            }}
            allowEscapeViewBox={{ x: true, y: true }}
            position={{ y: 0 }}
            isAnimationActive={false}
          />

          {/* Dynamic X-Axis Crosshair Tag */}
          {hoveredCandle !== null && data[hoveredCandle] && (
            <ReferenceLine
              x={hoveredCandle}
              stroke="var(--primary)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
          )}

          {/* Dynamic Y-Axis Crosshair Tag (Price) */}
          {hoveredCandle !== null && data[hoveredCandle] && (
            <ReferenceLine
              y={data[hoveredCandle].candle.close}
              stroke="var(--primary)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
              label={{
                value: `₹${data[hoveredCandle].candle.close.toFixed(2)}`,
                position: "left",
                fill: "white",
                fontSize: 10,
                fontWeight: 700,
              }}
            />
          )}

          {/* Latest Price Line & Tag */}
          {data.length > 0 && (
            <ReferenceLine
              y={data[data.length - 1].candle.close}
              stroke={
                data[data.length - 1].candle.close >=
                data[data.length - 1].candle.open
                  ? "#10b981"
                  : "#ef4444"
              }
              strokeWidth={1.2}
              strokeDasharray="2 2"
              label={{
                value: `LAST: ₹${data[data.length - 1].candle.close.toFixed(2)}`,
                position: "insideRight",
                fill: "white",
                fontSize: 10,
                fontWeight: 800,
                dx: -10,
                dy: -10,
              }}
            />
          )}

          {/* Horizontal Drawing Lines */}
          {horizontalLines.map((price, idx) => (
            <ReferenceLine
              key={`h-line-${idx}`}
              y={price}
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              label={{
                value: `₹${price.toFixed(2)}`,
                position: "right",
                fill: "#3b82f6",
                fontSize: 10,
                fontWeight: "bold",
              }}
            />
          ))}

          {/* Hover price reference line */}
          {hoveredCandle !== null && data[hoveredCandle] && (
            <ReferenceLine
              y={data[hoveredCandle].candle.close}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
              label={{
                value: data[hoveredCandle].candle.close.toFixed(2),
                position: "left",
                fill: "var(--foreground)",
                fontSize: 11,
                offset: 5,
              }}
            />
          )}

          {/* Hover volume reference line */}
          {hoveredCandle !== null &&
            data[hoveredCandle] &&
            volumeCurveVisible && (
              <ReferenceLine
                y={data[hoveredCandle].candle.volume}
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
                yAxisId="volume"
                label={{
                  value: formatVolume(data[hoveredCandle].candle.volume),
                  position: "right",
                  fill: "var(--foreground)",
                  fontSize: 11,
                  offset: 5,
                }}
              />
            )}

          <Legend
            verticalAlign="top"
            height={36}
            iconType="line"
            wrapperStyle={{ paddingTop: "10px", fontSize: "13px" }}
          />

          {/* VWAP Line */}
          {prefs.vwapVisible && (
            <Line
              type="monotone"
              dataKey="vwap"
              stroke={bandColor.line}
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              name="VWAP"
            />
          )}

          {/* VWAP Bands */}
          {prefs.bandsVisible && (
            <>
              <Area
                type="monotone"
                dataKey="upperBand"
                stroke={bandColor.upper}
                fill={bandColor.upper}
                fillOpacity={bandColor.fillOpacity}
                connectNulls={false}
                name="Upper Band"
              />
              <Area
                type="monotone"
                dataKey="lowerBand"
                stroke={bandColor.lower}
                fill={bandColor.lower}
                fillOpacity={bandColor.fillOpacity}
                connectNulls={false}
                name="Lower Band"
              />
              <Line
                type="monotone"
                dataKey="upperBand"
                stroke={bandColor.upper}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
                name="Upper Band"
              />
              <Line
                type="monotone"
                dataKey="lowerBand"
                stroke={bandColor.lower}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
                name="Lower Band"
              />
            </>
          )}

          {/* Price chart based on type */}
          {prefs.chartType === "LINE" ? (
            <Line
              type="monotone"
              dataKey="close"
              stroke={defaultPalette.price}
              strokeWidth={2}
              dot={false}
              name="Price"
              isAnimationActive={false}
            />
          ) : prefs.chartType === "OHLC" ? (
            <Bar
              dataKey="ohlcRange"
              name="Price (OHLC)"
              isAnimationActive={false}
              shape={<OHLCWebShape />}
            />
          ) : prefs.chartType === "CANDLESTICK" ? (
            <Bar
              dataKey="ohlcRange"
              name="Price (Candle)"
              isAnimationActive={false}
              shape={<CandlestickShape />}
            />
          ) : (
            <Area
              dataKey="close"
              stroke={defaultPalette.price}
              strokeWidth={2}
              fill="url(#priceGradient)"
              fillOpacity={1}
              name="Price"
              isAnimationActive={false}
            />
          )}

          {/* Backend Buy Signal markers (green pins/dots) */}
          {backendBuySignals.length > 0 && (
            <Line
              type="monotone"
              dataKey="backendSignalPrice"
              stroke="#22c55e"
              strokeWidth={0}
              dot={
                <BackendSignalDot
                  markerType={prefs.signalMarkerType}
                  markerSize={prefs.signalMarkerSize}
                />
              }
              activeDot={
                <BackendSignalDot
                  markerType={prefs.signalMarkerType}
                  markerSize={prefs.signalMarkerSize}
                />
              }
              isAnimationActive={false}
              name="Buy Signal"
              legendType="circle"
              connectNulls={false}
            />
          )}

          {/* Vertical Signal Lines Overlay */}
          {backendBuySignals.length > 0 && prefs.showSignalLines && (
            <Line
              type="monotone"
              dataKey="backendSignalPrice"
              stroke="#22c55e"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              name="Signal Execution"
              legendType="none"
              connectNulls={false}
              // This creates a vertical-ish line by drawing from 0 to price if we had a specific vertical line component,
              // but in ComposedChart we'll use ReferenceLine for better vertical coverage.
            />
          )}

          {/* Vertical lines for signals using ReferenceLine for full height */}
          {prefs.showSignalLines &&
            backendBuySignals.length > 0 &&
            chartDataWithSignals.map((d, i) =>
              d.backendSignalPrice ? (
                <ReferenceLine
                  key={`sig-line-${i}`}
                  x={i}
                  stroke="#22c55e"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.3}
                />
              ) : null,
            )}

          {/* Hidden High/Low for OHLC completeness */}
          <Line
            type="monotone"
            dataKey="high"
            stroke="#64748b"
            strokeWidth={1}
            dot={false}
            name="High"
            hide
          />
          <Line
            type="monotone"
            dataKey="low"
            stroke="#64748b"
            strokeWidth={1}
            dot={false}
            name="Low"
            hide
          />

          {/* Volume curves */}
          {volumeCurveVisible && (
            <>
              <Bar
                dataKey="volume"
                name="Volume"
                yAxisId="volume"
                isAnimationActive={false}
              >
                {chartDataWithSignals.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.close >= entry.open ? "#22c55e" : "#ef4444"}
                    fillOpacity={0.4}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="volumeSma"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                dot={false}
                name="Volume SMA(20)"
                yAxisId="volume"
                isAnimationActive={false}
                opacity={0.6}
              />
            </>
          )}

          {/* Pretrade Volume Curve Overlay */}
          {showPretradeInMain && pretradeVolumeCurve.length > 0 && (
            <Line
              type="monotone"
              dataKey="pretradeVolume"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              name="Pretrade Volume"
              strokeDasharray="5 5"
              yAxisId="volume"
            />
          )}

          {/* Brush */}
          <Brush
            dataKey="timestamp"
            height={30}
            stroke="#3b82f6"
            fill="url(#brushGradient)"
            fillOpacity={0.15}
            travellerWidth={10}
            tickFormatter={(value) => {
              const timeStr = fmtISTTime(value);
              if (isMultiDay) {
                return `${fmtISTDate(value)} ${timeStr}`;
              }
              return timeStr;
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

export default PriceChart;