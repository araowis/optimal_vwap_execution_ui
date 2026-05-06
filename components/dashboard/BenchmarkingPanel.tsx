'use client';

import { BacktestResult, Candle, DailyBacktestResult, BacktestApiResponse } from '@/lib/types';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Gauge,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface BenchmarkingPanelProps {
  // Backend mode
  dailyResult: DailyBacktestResult | null;
  multiDayResponse: BacktestApiResponse | null;
  // Legacy mode (local backtest)
  legacyResults?: BacktestResult;
  legacyCandles?: Candle[];
}

export default function BenchmarkingPanel({
  dailyResult,
  multiDayResponse,
  legacyResults,
  legacyCandles,
}: BenchmarkingPanelProps) {

  // ── Backend mode ──────────────────────────────────────────────────────────
  if (dailyResult && dailyResult.status === 'OK') {
    const r = dailyResult;
    const slippage = r.slippageBps ?? 0;
    const isBetter = r.betterThanMarket ?? slippage < 0;
    const fillPct = r.totalQty ? ((r.executedQty ?? 0) / r.totalQty) * 100 : 100;

    const metrics = [
      {
        label: 'Market VWAP',
        value: r.marketVwap?.toFixed(2) ?? '—',
        subtext: 'Volume-weighted avg price',
        icon: Gauge,
        color: 'text-foreground',
      },
      {
        label: 'Traded VWAP',
        value: r.tradedVwap?.toFixed(2) ?? '—',
        subtext: `vs Market: ₹${((r.tradedVwap ?? 0) - (r.marketVwap ?? 0)).toFixed(2)}`,
        icon: TrendingUp,
        color: isBetter ? 'text-green-500' : 'text-red-400',
      },
      {
        label: 'Slippage',
        value: `${slippage.toFixed(2)} bps`,
        subtext: isBetter ? 'Better than market ✓' : 'Worse than market ✗',
        icon: isBetter ? TrendingDown : TrendingUp,
        color: isBetter ? 'text-green-500' : 'text-red-400',
      },
      {
        label: 'Fill Rate',
        value: `${fillPct.toFixed(1)}%`,
        subtext: `${r.executedQty?.toLocaleString()} / ${r.totalQty?.toLocaleString()} shares`,
        icon: CheckCircle2,
        color: fillPct === 100 ? 'text-green-500' : 'text-yellow-500',
      },
    ];

    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 border-t border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Results — {r.date}</h2>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              isBetter ? 'bg-green-500/10 text-green-500' : 'bg-red-400/10 text-red-400'
            }`}
          >
            {isBetter ? '▲ Better than VWAP' : '▼ Worse than VWAP'}
          </span>
        </div>

        {/* Key Metrics */}
        <div className="space-y-2.5">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div key={idx} className="bg-background rounded-lg p-3 border border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className={`text-lg font-bold mt-0.5 ${metric.color}`}>{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{metric.subtext}</p>
                  </div>
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-1 ${metric.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Buy Signals Table */}
        {r.buySignals && r.buySignals.length > 0 && (
          <div className="bg-background rounded-lg p-3 border border-border">
            <p className="text-sm font-semibold text-foreground mb-3">
              Buy Signals ({r.buySignals.length})
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-4 gap-1 text-xs text-muted-foreground font-medium mb-1 border-b border-border pb-1">
                <span>Bin</span>
                <span>Time</span>
                <span>Price</span>
                <span>Qty</span>
              </div>
              {r.buySignals.map((sig) => (
                <div
                  key={sig.binIdx}
                  className="grid grid-cols-4 gap-1 text-xs text-foreground py-0.5 hover:bg-secondary/50 rounded px-1"
                >
                  <span className="font-medium text-primary">#{sig.binIdx}</span>
                  <span>{sig.time}</span>
                  <span>₹{sig.execPrice.toFixed(1)}</span>
                  <span>
                    {sig.executedQty}
                    <span className="text-muted-foreground">/{sig.qtyToBuy}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio-wide stats if multi-day */}
        {multiDayResponse && multiDayResponse.successfulDays > 1 && (
          <div className="bg-background rounded-lg p-3 border border-border">
            <p className="text-sm font-semibold text-foreground mb-2">Portfolio Average</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Avg Slippage</p>
                <p
                  className={`font-bold ${
                    multiDayResponse.avgSlippageBps < 0 ? 'text-green-500' : 'text-red-400'
                  }`}
                >
                  {multiDayResponse.avgSlippageBps.toFixed(2)} bps
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Successful Days</p>
                <p className="text-foreground font-bold">
                  {multiDayResponse.successfulDays}/{multiDayResponse.totalRequested}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Legacy mode ───────────────────────────────────────────────────────────
  if (!legacyResults) return null;
  const results = legacyResults;

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

      <div className="space-y-3">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} className="bg-background rounded-lg p-3 border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.subtext}</p>
                </div>
                <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              </div>
            </div>
          );
        })}
      </div>

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
                    style={{ width: `${(cost.value / results.totalCost.totalCost) * 100}%` }}
                  />
                </div>
                <span className="text-foreground font-medium w-12 text-right">
                  ₹{cost.value.toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-background rounded-lg p-3 border border-border">
        <p className="text-sm font-semibold text-foreground mb-3">Performance</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Sharpe Ratio</p>
            <p className="text-foreground font-bold">{results.metrics.sharpeRatio.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Win Rate</p>
            <p className="text-foreground font-bold">{(results.metrics.winRate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Max Drawdown</p>
            <p className="text-foreground font-bold">{(results.metrics.maxDrawdown * 100).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Volatility</p>
            <p className="text-foreground font-bold">{(results.metrics.volatility * 100).toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
