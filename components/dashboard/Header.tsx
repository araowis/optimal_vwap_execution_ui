'use client';

import { BarChart3, Settings } from 'lucide-react';
import StatusIndicator from './StatusIndicator';

interface HeaderProps {
  chartTimeframeMode?: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  onTimeframeChange?: (mode: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR') => void;
}

export default function Header({ chartTimeframeMode = 'ALL', onTimeframeChange }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-foreground rounded-lg p-2">
          <BarChart3 className="w-6 h-6 text-background" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">VWAP Trading Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Institutional Strategy Execution &amp; Analytics
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Timeframe:</span>
          <select
            value={chartTimeframeMode}
            onChange={(e) => onTimeframeChange?.(e.target.value as any)}
            className="text-sm bg-background border border-border rounded px-3 py-1.5 hover:bg-secondary transition-colors"
          >
            <option value="ALL">All</option>
            <option value="DAY">Day</option>
            <option value="WEEK">Week</option>
            <option value="MONTH">Month</option>
            <option value="YEAR">Year</option>
          </select>
        </div>
        <StatusIndicator />
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Settings className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </header>
  );
}
