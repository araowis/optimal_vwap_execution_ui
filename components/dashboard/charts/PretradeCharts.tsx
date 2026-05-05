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
} from 'recharts';
import { PretradeResponse } from '@/lib/vwap-server-service';

interface PretradeChartsProps {
  pretradeData: PretradeResponse | null;
}

type PretradeGraphType = 'eXt' | 'varXt' | 'sigma2t' | 'muT' | 'executionScore' | 'avgVolumePerBar';

const graphLabels: Record<PretradeGraphType, string> = {
  eXt: 'Expected Volume (eXt)',
  varXt: 'Variance (varXt)',
  sigma2t: 'Sigma² (sigma2t)',
  muT: 'Mean (muT)',
  executionScore: 'Execution Score',
  avgVolumePerBar: 'Avg Volume Per Bar',
};

const graphColors: Record<PretradeGraphType, string> = {
  eXt: '#f59e0b',
  varXt: '#8b5cf6',
  sigma2t: '#ec4899',
  muT: '#06b6d4',
  executionScore: '#10b981',
  avgVolumePerBar: '#3b82f6',
};

export default function PretradeCharts({ pretradeData }: PretradeChartsProps) {
  const [selectedGraph, setSelectedGraph] = useState<PretradeGraphType>('eXt');

  const chartData = useMemo(() => {
    if (!pretradeData) return [];
    const { timeLabels, eXt, varXt, sigma2t, muT, executionScore, avgVolumePerBar } = pretradeData;
    return timeLabels.map((label, index) => ({
      index,
      time: label,
      eXt: eXt[index] || 0,
      varXt: varXt[index] || 0,
      sigma2t: sigma2t[index] || 0,
      muT: muT[index] || 0,
      executionScore: executionScore[index] || 0,
      avgVolumePerBar: avgVolumePerBar[index] || 0,
    }));
  }, [pretradeData]);

  const maxValue = useMemo(() => {
    if (!pretradeData) return 0;
    const values = chartData.map((d) => d[selectedGraph]);
    return Math.max(...values);
  }, [chartData, selectedGraph, pretradeData]);

  if (!pretradeData) {
    return (
      <div className="h-32 bg-background rounded-lg border border-border overflow-hidden flex items-center justify-center">
        <p className="text-xs text-muted-foreground">No pretrade data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Graph Toggle */}
      <div className="flex items-center gap-2 px-2">
        <span className="text-xs text-muted-foreground">Show:</span>
        <select
          value={selectedGraph}
          onChange={(e) => setSelectedGraph(e.target.value as PretradeGraphType)}
          className="text-xs bg-background border border-border rounded px-2 py-1 flex-1"
        >
          {Object.entries(graphLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div className="h-32 bg-background rounded-lg border border-border overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
              interval="preserveStartEnd"
              tickFormatter={(value, index) => {
                // Show every nth label to prevent overcrowding
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
    </div>
  );
}
