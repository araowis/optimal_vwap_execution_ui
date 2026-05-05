'use client';

import React, { useState, useMemo } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useVwapWebSocket } from '@/lib/use-vwap-websocket';
import { WSCalibrationMessage, WSSignalMessage, WSRegimeMessage } from '@/lib/vwap-server-types';

interface LiveAdjustmentsProps {
  instrumentKey?: string;
}

type LiveGraphType = 'eXt' | 'xStar';

const graphLabels: Record<LiveGraphType, string> = {
  eXt: 'Live Volume Curve (eXt)',
  xStar: 'Optimal Schedule (xStar)',
};

const graphColors: Record<LiveGraphType, string> = {
  eXt: '#f59e0b',
  xStar: '#10b981',
};

export default function LiveAdjustments({ instrumentKey }: LiveAdjustmentsProps) {
  const [selectedGraph, setSelectedGraph] = useState<LiveGraphType>('eXt');
  const [calibrationHistory, setCalibrationHistory] = useState<WSCalibrationMessage[]>([]);
  const [signals, setSignals] = useState<WSSignalMessage[]>([]);
  const [regimes, setRegimes] = useState<WSRegimeMessage[]>([]);

  const { connected, lastCalibration, lastSignal, lastRegime } = useVwapWebSocket({
    autoConnect: true,
    handlers: {
      onCalibration: (cal) => {
        setCalibrationHistory((prev) => [...prev.slice(-19), cal]);
      },
      onSignal: (sig) => {
        setSignals((prev) => [...prev.slice(-49), sig]);
      },
      onRegime: (reg) => {
        setRegimes((prev) => [...prev.slice(-9), reg]);
      },
    },
  });

  const latestCalibration = calibrationHistory[calibrationHistory.length - 1] || lastCalibration;

  const chartData = useMemo(() => {
    if (!latestCalibration) return [];
    const { timeLabels, eXt, xStar } = latestCalibration;
    // Use timeLabels from pretrade if available, otherwise generate indices
    const labels = timeLabels || Array.from({ length: eXt.length }, (_, i) => `${i}`);
    return labels.map((label, index) => ({
      index,
      time: label,
      eXt: eXt[index] || 0,
      xStar: xStar[index] || 0,
    }));
  }, [latestCalibration]);

  if (!connected) {
    return (
      <div className="h-32 bg-background rounded-lg border border-border overflow-hidden flex items-center justify-center">
        <div className="text-center space-y-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mx-auto animate-pulse" />
          <p className="text-xs text-muted-foreground">Connecting to live feed...</p>
        </div>
      </div>
    );
  }

  if (!latestCalibration) {
    return (
      <div className="h-32 bg-background rounded-lg border border-border overflow-hidden flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Waiting for live calibration data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Connection Status & Graph Toggle */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-[10px] text-muted-foreground">Live</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <span className="text-[10px] text-muted-foreground">
          Bar {latestCalibration.barIdx}/375
        </span>
        <div className="w-px h-3 bg-border" />
        <select
          value={selectedGraph}
          onChange={(e) => setSelectedGraph(e.target.value as LiveGraphType)}
          className="text-xs bg-background border border-border rounded px-2 py-1 flex-1"
        >
          {Object.entries(graphLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Live Chart */}
      <div className="h-32 bg-background rounded-lg border border-border overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
              tickFormatter={(value, index) => {
                const step = Math.ceil(chartData.length / 10);
                return index % step === 0 ? value : '';
              }}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
            />
            <Legend />
            <ReferenceLine
              x={latestCalibration.barIdx}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{ value: 'Current', fontSize: 10, fill: '#ef4444' }}
            />
            <Line
              type="monotone"
              dataKey={selectedGraph}
              stroke={graphColors[selectedGraph]}
              strokeWidth={2}
              dot={false}
              name={graphLabels[selectedGraph]}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-4 gap-2 px-2">
        <div className="bg-secondary/50 rounded p-2">
          <p className="text-[10px] text-muted-foreground">Trend Score</p>
          <p className={`text-xs font-medium ${latestCalibration.trendScore > 0 ? 'text-green-600' : latestCalibration.trendScore < 0 ? 'text-red-600' : 'text-foreground'}`}>
            {latestCalibration.trendScore.toFixed(4)}
          </p>
        </div>
        <div className="bg-secondary/50 rounded p-2">
          <p className="text-[10px] text-muted-foreground">Lambda</p>
          <p className="text-xs font-medium text-foreground">{latestCalibration.lambda.toFixed(2)}</p>
        </div>
        <div className="bg-secondary/50 rounded p-2">
          <p className="text-[10px] text-muted-foreground">Bar Quality</p>
          <p className="text-xs font-medium text-foreground">{(latestCalibration.barQuality * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-secondary/50 rounded p-2">
          <p className="text-[10px] text-muted-foreground">Executed</p>
          <p className="text-xs font-medium text-foreground">{(latestCalibration.executedFrac * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Latest Signal */}
      {signals.length > 0 && (
        <div className="px-2">
          <div className="bg-primary/5 border border-primary/20 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-primary">Latest Signal</span>
              <span className="text-[10px] text-muted-foreground">{signals[signals.length - 1].marketTime}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground text-[10px]">Qty</span>
                <p className="font-medium">{signals[signals.length - 1].qty}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px]">LTP</span>
                <p className="font-medium">₹{signals[signals.length - 1].ltp.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px]">Urgency</span>
                <p className="font-medium">{signals[signals.length - 1].urgency.toFixed(4)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px]">Cum Target</span>
                <p className="font-medium">{signals[signals.length - 1].cumTarget}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regime Changes */}
      {regimes.length > 0 && (
        <div className="px-2">
          <div className="bg-secondary/50 rounded p-2">
            <p className="text-[10px] text-muted-foreground mb-1">Recent Regime Changes</p>
            <div className="space-y-1">
              {regimes.slice(-3).map((reg, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[10px]">Bar {reg.barIdx}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">{reg.previousRegime}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={`font-medium ${
                      reg.newRegime === 'UP' ? 'text-green-600' :
                      reg.newRegime === 'DOWN' ? 'text-red-600' :
                      'text-foreground'
                    }`}>
                      {reg.newRegime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
