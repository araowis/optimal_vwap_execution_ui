'use client';

import { BacktestResult, Candle } from '@/lib/types';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Gauge,
} from 'lucide-react';

interface BenchmarkingPanelProps {
  results: BacktestResult;
  candles: Candle[];
}

export default function BenchmarkingPanel({
  results,
  candles,
}: BenchmarkingPanelProps) {
  const metrics = [
    {
      label: 'Execution Price',
      value: results.avgExecutionPrice.toFixed(2),
      subtext: `vs VWAP: ${results.vwapDuringExecution.toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      label: 'Price Improvement',
      value: `${results.executionVsVWAPPct.toFixed(4)}%`,
      subtext: `Absolute: ₹${results.executionVsVWAP.toFixed(2)}`,
      icon: BarChart3,
    },
    {
      label: 'Total Cost',
      value: `₹${results.totalCost.totalCost.toFixed(0)}`,
      subtext: `${results.totalCost.totalCostBps.toFixed(2)} bps`,
      icon: DollarSign,
    },
    {
      label: 'VWAP Participation',
      value: `${results.vwapParticipation.toFixed(2)}%`,
      subtext: 'Execution efficiency',
      icon: Gauge,
    },
  ];

  const costs = [
    { label: 'Spread', value: results.totalCost.spreadCost },
    { label: 'Brokerage', value: results.totalCost.brokerage },
    { label: 'STT', value: results.totalCost.stt },
    { label: 'GST', value: results.totalCost.gst },
    { label: 'Exchange', value: results.totalCost.exchangeFee },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 border-t border-border">
      <h2 className="text-lg font-semibold text-foreground sticky top-0 bg-card">
        Backtest Results
      </h2>

      {/* Key Metrics Grid */}
      <div className="space-y-3">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} className="bg-background rounded-lg p-3 border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.subtext}</p>
                </div>
                <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Cost Breakdown */}
      <div className="bg-background rounded-lg p-3 border border-border">
        <p className="text-sm font-semibold text-foreground mb-3">Cost Breakdown</p>
        <div className="space-y-2">
          {costs.map((cost, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{cost.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${(cost.value / results.totalCost.totalCost) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="text-foreground font-medium w-12 text-right">
                  ₹{cost.value.toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-background rounded-lg p-3 border border-border">
        <p className="text-sm font-semibold text-foreground mb-3">Performance</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Sharpe Ratio</p>
            <p className="text-foreground font-bold">
              {results.metrics.sharpeRatio.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Win Rate</p>
            <p className="text-foreground font-bold">
              {(results.metrics.winRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Max Drawdown</p>
            <p className="text-foreground font-bold">
              {(results.metrics.maxDrawdown * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Volatility</p>
            <p className="text-foreground font-bold">
              {(results.metrics.volatility * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Execution Summary */}
      <div className="bg-background rounded-lg p-3 border border-border">
        <p className="text-sm font-semibold text-foreground mb-3">Execution Summary</p>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Filled Quantity</span>
            <span className="text-foreground font-medium">
              {(results.executedQuantity / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max Adverse Excursion</span>
            <span className="text-foreground font-medium">
              {results.maxAdverseExcursion.toFixed(3)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Implementation Shortfall</span>
            <span className="text-red-500 font-medium">
              {results.implementationShortfall.toFixed(4)} bps
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
