'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartDatapoint, CustomizationPrefs } from '@/lib/types';

function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const up = payload.find((p: any) => p.dataKey === 'volumeUp');
  const down = payload.find((p: any) => p.dataKey === 'volumeDown');
  // In this chart the XAxis uses `index`, so `label` is not a timestamp.
  // Use the data payload's timestamp instead.
  const tsRaw = payload?.[0]?.payload?.timestamp;
  const ts = new Date(typeof tsRaw === 'number' ? tsRaw : Number(label));

  const upVal = Number(up?.value || 0);
  const downVal = Number(down?.value || 0);
  const total = upVal + downVal;

  const fmt = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(v);
  };

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
      <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 12 }}>{ts.toLocaleString()}</div>
      <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: '#10b981' }}>
          <span>Bullish</span>
          <span style={{ fontWeight: 700 }}>{fmt(upVal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: '#f43f5e' }}>
          <span>Bearish</span>
          <span style={{ fontWeight: 700 }}>{fmt(downVal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--muted-foreground)' }}>
          <span>Total</span>
          <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

interface VolumeChartProps {
  data: ChartDatapoint[];
  prefs: CustomizationPrefs;
  hoveredCandle: number | null;
  onCandleHover: (index: number | null) => void;
}

const VolumeChart = React.memo(function VolumeChart({
  data,
  prefs,
  hoveredCandle,
  onCandleHover,
}: VolumeChartProps) {
  const chartData = useMemo(() => {
    const period = 20;

    const vols = data.map((d) => {
      const v = Number((d as any)?.candle?.volume ?? 0);
      return Number.isFinite(v) ? v : 0;
    });
    const sma = vols.map((_, i) => {
      const start = Math.max(0, i - period + 1);
      let sum = 0;
      for (let j = start; j <= i; j++) sum += vols[j];
      return sum / (i - start + 1);
    });

    const mapped = data.map((d, index) => {
      const isUp = d.candle.close >= d.candle.open;
      const vol = vols[index] ?? 0;
      return {
        index,
        id: `volume-${index}-${d.candle.timestamp.getTime()}-${vol}`, // unique key to prevent React errors
        timestamp: d.candle.timestamp.getTime(),
        volumeUp: isUp ? vol : 0,
        volumeDown: !isUp ? vol : 0,
        volume: vol,
        volumeSma20: sma[index],
      };
    });

    // Filter out any duplicate entries to prevent Recharts key errors
    const seen = new Set<string>();
    return mapped.filter((d) => {
      const key = `${d.index}-${d.timestamp}-${d.volume}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);

  const maxVol = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.max(...chartData.map((d) => d.volume));
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">No volume data</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2 bg-background">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 60, bottom: 0 }}
          syncId="main-sync"
          syncMethod="index"
          onMouseMove={(e) => {
            if (e.activeTooltipIndex !== undefined) {
              onCandleHover(e.activeTooltipIndex);
            }
          }}
          onMouseLeave={() => onCandleHover(null)}
        >
          <CartesianGrid vertical horizontal strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
          <XAxis
            dataKey="index"
            type="category"
            tickFormatter={(value) => {
              const item = chartData[value];
              if (item) {
                return new Date(item.timestamp).toLocaleTimeString();
              }
              return '';
            }}
            stroke="var(--foreground)"
            fontSize={11}
            hide
          />
          <YAxis
            tickFormatter={(v) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
              return String(v);
            }}
            domain={[0, Math.ceil(maxVol * 1.1)]}
            stroke="var(--foreground)"
            fontSize={11}
            width={40}
          />
          <Tooltip
            content={<VolumeTooltip />}
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.6 }}
            allowEscapeViewBox={{ x: true, y: true }}
            position={{ y: 0 }}
          />
          <Legend
            verticalAlign="top"
            height={20}
            wrapperStyle={{ fontSize: '13px' }}
          />

          <Bar
            key="volumeUp"
            dataKey="volumeUp"
            name="Bullish Volume"
            stackId="vol"
            fill="#10b981"
            isAnimationActive={false}
            opacity={0.9}
          />
          <Bar
            key="volumeDown"
            dataKey="volumeDown"
            name="Bearish Volume"
            stackId="vol"
            fill="#f43f5e"
            isAnimationActive={false}
            opacity={0.9}
          />

          {/* Interactive volume curve overlays */}
          <Line
            key="volume"
            type="monotone"
            dataKey="volume"
            name="Volume Curve"
            stroke="#64748b"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            key="volumeSma20"
            type="monotone"
            dataKey="volumeSma20"
            name="Volume SMA(20)"
            stroke="#8b5cf6"
            strokeWidth={2.2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default VolumeChart;
