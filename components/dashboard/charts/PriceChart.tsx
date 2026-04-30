'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  Brush,
  Legend,
} from 'recharts';
import { ChartDatapoint, CustomizationPrefs } from '@/lib/types';

function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const ts = typeof row.timestamp === 'number' ? new Date(row.timestamp) : new Date(label);
  const isUp = row.close >= row.open;
  const priceColor = isUp ? '#10b981' : '#f43f5e';

  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '10px 12px',
        boxShadow: '0 10px 20px -10px rgba(0,0,0,0.25)',
        minWidth: 180,
      }}
    >
      <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 12 }}>
        {ts.toLocaleString()}
      </div>
      <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 12 }}>
        <div style={{ color: '#ef4444', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>VWAP</span>
          <span style={{ fontWeight: 700 }}>{Number(row.vwap).toFixed(2)}</span>
        </div>

        <div style={{ color: '#3b82f6', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>Price</span>
          <span style={{ fontWeight: 700 }}>{Number(row.close).toFixed(2)}</span>
        </div>

        <div style={{ color: priceColor, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>O: {Number(row.open).toFixed(2)}</div>
          <div>H: {Number(row.high).toFixed(2)}</div>
          <div>L: {Number(row.low).toFixed(2)}</div>
          <div>C: {Number(row.close).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

interface PriceChartProps {
  data: ChartDatapoint[];
  prefs: CustomizationPrefs;
  hoveredCandle: number | null;
  onCandleHover: (index: number | null) => void;
  volumeCurveVisible: boolean;
  onClickedCandle: (index: number | null) => void;
}

const PriceChart = React.memo(function PriceChart({
  data,
  prefs,
  hoveredCandle,
  onCandleHover,
  volumeCurveVisible,
  onClickedCandle,
}: PriceChartProps) {
  const defaultPalette = {
    price: '#3b82f6',
    vwap: '#ef4444',
    band: '#a855f7',
    signal: '#06b6d4',
    neutral: '#64748b',
  };

  const bandColor = prefs.bandColor || {
    line: defaultPalette.vwap,
    upper: defaultPalette.band,
    lower: defaultPalette.band,
    fillOpacity: 0.12,
  };

  const buySignalColor = defaultPalette.signal;

  // Helper function to format volume in human-readable way
  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
    return String(vol);
  };

  // Transform data for Recharts with candlestick representation
  const chartData = useMemo(() => {
    const mapped = data.map((d, index) => {
      const isUp = d.candle.close >= d.candle.open;
      // Check if this is a daily candle (timestamp at midnight)
      const isDaily = d.candle.timestamp.getHours() === 0 && d.candle.timestamp.getMinutes() === 0;
      return {
        index,
        id: `candle-${index}-${d.candle.timestamp.getTime()}-${d.candle.close}`, // unique key to prevent React errors
        timestamp: d.candle.timestamp.getTime(),
        timestampStr: isDaily ? d.candle.timestamp.toLocaleDateString() : d.candle.timestamp.toLocaleTimeString(),
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
        buySignal: d.buySignal ? d.buySignal.price : null,
        bodyColor: isUp ? '#10b981' : '#f43f5e', // Emerald green and rose red
        wickColor: isUp ? '#10b981' : '#f43f5e',
      };
    });

    // Filter out any duplicate entries to prevent Recharts key errors
    const seen = new Set<string>();
    return mapped.filter((d) => {
      const key = `${d.index}-${d.timestamp}-${d.close}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);

  // Calculate volume SMA for the curve overlay and add to chartData
  const chartDataWithVolume = useMemo(() => {
    const period = 20;
    const vols = data.map((d) => d.candle.volume);
    const sma = vols.map((_, i) => {
      const start = Math.max(0, i - period + 1);
      let sum = 0;
      for (let j = start; j <= i; j++) sum += vols[j];
      return sum / (i - start + 1);
    });

    return chartData.map((d, i) => ({
      ...d,
      volumeSma: sma[i],
    }));
  }, [data, chartData]);

  const maxVolume = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map((d) => d.candle.volume));
  }, [data]);

  const priceDomain = useMemo(() => {
    if (!data.length) return ['auto', 'auto'] as any;
    const lows = data.map((d) => Number(d.candle.low));
    const highs = data.map((d) => Number(d.candle.high));
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return ['auto', 'auto'] as any;
    if (min === max) {
      const pad = Math.max(0.01, Math.abs(min) * 0.001);
      return [min - pad, max + pad] as [number, number];
    }
    return [min, max] as [number, number];
  }, [data]);

  // Check if the data spans multiple days
  const isMultiDay = useMemo(() => {
    if (chartData.length < 2) return false;
    const first = chartData[0].timestamp;
    const last = chartData[chartData.length - 1].timestamp;
    // Over 20 hours is usually enough to consider it "multi-day" for trading data
    return (last - first) > 20 * 60 * 60 * 1000;
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
          data={chartDataWithVolume}
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
          <CartesianGrid vertical horizontal strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />

          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={defaultPalette.price} stopOpacity={0.35} />
              <stop offset="70%" stopColor={defaultPalette.price} stopOpacity={0.10} />
              <stop offset="100%" stopColor={defaultPalette.price} stopOpacity={0.02} />
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
              const candle = chartDataWithVolume[value];
              if (!candle) return '';
              
              const date = new Date(candle.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              
              if (isMultiDay) {
                const dayStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                return `${dayStr} ${timeStr}`;
              }
              
              return timeStr;
            }}
            stroke="var(--foreground)"
            fontSize={12}
            tick={{ fill: 'var(--foreground)' }}
            interval="equidistantPreserveStart"
            minTickGap={60}
          />
          
          <YAxis
            domain={priceDomain}
            tickFormatter={(value) => value.toFixed(2)}
            stroke="var(--foreground)"
            fontSize={12}
            tick={{ fill: 'var(--foreground)' }}
          />

          {volumeCurveVisible && (
            <YAxis
              yAxisId="volume"
              orientation="right"
              tickFormatter={(v) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                return String(v);
              }}
              domain={[0, Math.max(1, Math.ceil(maxVolume * 1.1))]}
              stroke="var(--foreground)"
              fontSize={11}
              width={40}
            />
          )}
          
          <Tooltip
            content={<PriceTooltip />}
            cursor={{ 
              stroke: 'var(--muted-foreground)', 
              strokeWidth: 1, 
              strokeDasharray: '3 3', 
              opacity: 0.8 
            }}
            allowEscapeViewBox={{ x: true, y: true }}
            position={{ y: 0 }}
          />

          {/* Reference line to highlight price on Y-axis when hovering */}
          {hoveredCandle !== null && data[hoveredCandle] && (
            <ReferenceLine
              y={data[hoveredCandle].candle.close}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
              label={{
                value: data[hoveredCandle].candle.close.toFixed(2),
                position: 'left',
                fill: 'var(--foreground)',
                fontSize: 11,
                offset: 5,
              }}
            />
          )}

          {/* Reference line to show volume on right when hovering and volume curve is visible */}
          {hoveredCandle !== null && data[hoveredCandle] && volumeCurveVisible && (
            <ReferenceLine
              y={data[hoveredCandle].candle.volume}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
              yAxisId="volume"
              label={{
                value: formatVolume(data[hoveredCandle].candle.volume),
                position: 'right',
                fill: 'var(--foreground)',
                fontSize: 11,
                offset: 5,
              }}
            />
          )}

          <Legend
            verticalAlign="top"
            height={36}
            iconType="line"
            wrapperStyle={{
              paddingTop: '10px',
              fontSize: '13px',
            }}
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

          {/* Buy Signals */}
          {prefs.signalsVisible && (
            <Line
              type="monotone"
              dataKey="buySignal"
              stroke={buySignalColor}
              strokeWidth={2}
              dot={{ r: prefs.signalMarkerSize, fill: buySignalColor, strokeWidth: 2 }}
              name="Buy Signal"
            />
          )}

          {/* Candlestick representation - High/Low wicks */}
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

          {prefs.chartType === 'LINE' ? (
            <Line
              type="monotone"
              dataKey="close"
              stroke={defaultPalette.price}
              strokeWidth={2}
              dot={false}
              name="Price"
            />
          ) : (
            <Area
              dataKey="close"
              stroke={defaultPalette.price}
              strokeWidth={2}
              fill="url(#priceGradient)"
              fillOpacity={1}
              name="Price"
            />
          )}

          {/* Volume Curve Overlay - rendered after price to appear on top */}
          {volumeCurveVisible && (
            <>
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Volume"
                yAxisId="volume"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="volumeSma"
                stroke="#8b5cf6"
                strokeWidth={2.2}
                dot={false}
                name="Volume SMA(20)"
                yAxisId="volume"
                isAnimationActive={false}
              />
            </>
          )}

          {/* Brush for zoom/pan functionality */}
          <Brush
            dataKey="timestamp"
            height={30}
            stroke="#3b82f6"
            fill="url(#brushGradient)"
            fillOpacity={0.15}
            travellerWidth={10}
            tickFormatter={(value) => {
              const date = new Date(value);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              if (isMultiDay) {
                return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
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
