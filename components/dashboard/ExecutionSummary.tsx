'use client';

import { BacktestResult, StrategyParams, DailyBacktestResult, BacktestApiResponse } from '@/lib/types';
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface ExecutionSummaryProps {
  params: StrategyParams;
  // Backend mode
  dailyResult: DailyBacktestResult | null;
  multiDayResponse: BacktestApiResponse | null;
  // Legacy mode
  legacyResults?: BacktestResult;
}

export default function ExecutionSummary({
  params,
  dailyResult,
  multiDayResponse,
  legacyResults,
}: ExecutionSummaryProps) {

  // ── Backend mode ──────────────────────────────────────────────────────────
  if (dailyResult && dailyResult.status === 'OK') {
    const r = dailyResult;
    const slippage = r.slippageBps ?? 0;
    const isBetter = r.betterThanMarket ?? slippage < 0;
    const fillPct = r.totalQty ? ((r.executedQty ?? 0) / r.totalQty) * 100 : 100;

    return (
      <div className="border-t border-border bg-card px-6 py-4">
        <div className="grid grid-cols-12 gap-4 items-center">

          {/* Status */}
          <div className="col-span-2 flex items-center gap-3">
            <div className={`rounded-lg p-2 ${isBetter ? 'bg-green-500/10' : 'bg-red-400/10'}`}>
              {isBetter
                ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                : <AlertCircle className="w-6 h-6 text-red-400" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`text-sm font-bold ${isBetter ? 'text-green-500' : 'text-red-400'}`}>
                {isBetter ? 'Beat VWAP' : 'Under VWAP'}
              </p>
            </div>
          </div>

          {/* Quantity */}
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Quantity Executed</p>
            <p className="text-sm font-bold text-foreground">
              {r.executedQty?.toLocaleString()} / {r.totalQty?.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{fillPct.toFixed(1)}% filled</p>
          </div>

          {/* Market VWAP */}
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Market VWAP</p>
            <p className="text-sm font-bold text-foreground">₹{r.marketVwap?.toFixed(2) ?? '—'}</p>
          </div>

          {/* Traded VWAP */}
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Traded VWAP</p>
            <p className={`text-sm font-bold ${isBetter ? 'text-green-500' : 'text-red-400'}`}>
              ₹{r.tradedVwap?.toFixed(2) ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {slippage < 0 ? '' : '+'}{slippage.toFixed(2)} bps
            </p>
          </div>

          {/* Residual */}
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Residual</p>
            <p className={`text-sm font-bold ${(r.residualPct ?? 0) === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
              {((r.residualPct ?? 0) * 100).toFixed(2)}%
            </p>
          </div>

          {/* Portfolio avg (if multi-day) */}
          {multiDayResponse && multiDayResponse.successfulDays > 1 ? (
            <div className="col-span-2 flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Portfolio Avg Slippage</p>
                <p className={`text-sm font-bold ${multiDayResponse.avgSlippageBps < 0 ? 'text-green-500' : 'text-red-400'}`}>
                  {multiDayResponse.avgSlippageBps.toFixed(2)} bps
                </p>
              </div>
              <div className={`rounded-lg p-2 ${multiDayResponse.avgSlippageBps < 0 ? 'bg-green-500/10' : 'bg-red-400/10'}`}>
                {multiDayResponse.avgSlippageBps < 0
                  ? <TrendingDown className="w-5 h-5 text-green-500" />
                  : <TrendingUp className="w-5 h-5 text-red-400" />}
              </div>
            </div>
          ) : (
            <div className="col-span-2 flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Slippage</p>
                <p className={`text-sm font-bold ${isBetter ? 'text-green-500' : 'text-red-400'}`}>
                  {slippage.toFixed(2)} bps
                </p>
              </div>
              <div className={`rounded-lg p-2 ${isBetter ? 'bg-green-500/10' : 'bg-red-400/10'}`}>
                {isBetter
                  ? <TrendingDown className="w-5 h-5 text-green-500" />
                  : <TrendingUp className="w-5 h-5 text-red-400" />}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Legacy mode ───────────────────────────────────────────────────────────
  if (!legacyResults) return null;
  const results = legacyResults;
  const isSuccessful = results.executionVsVWAPPct < 0;
  const improvementStatus = results.vwapParticipation > 50 ? 'Above Average' : 'Below Average';

  return (
    <div className="border-t border-border bg-card px-6 py-4">
      <div className="grid grid-cols-12 gap-6 items-center">

        <div className="col-span-2 flex items-center gap-3">
          {isSuccessful ? (
            <>
              <div className="bg-green-500/10 rounded-lg p-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-bold text-green-500">Successful</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-yellow-500/10 rounded-lg p-2">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-bold text-yellow-500">Review Needed</p>
              </div>
            </>
          )}
        </div>

        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Quantity Executed</p>
          <p className="text-sm font-bold text-foreground">
            {(results.executedQuantity / 1000).toFixed(0)}K / {(params.totalQuantity / 1000).toFixed(0)}K
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {((results.executedQuantity / params.totalQuantity) * 100).toFixed(1)}%
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Execution vs VWAP</p>
          <p className={`text-sm font-bold ${results.executionVsVWAPPct < 0 ? 'text-green-500' : 'text-red-500'}`}>
            {results.executionVsVWAPPct < 0 ? '-' : '+'}
            {Math.abs(results.executionVsVWAPPct).toFixed(4)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ₹{Math.abs(results.executionVsVWAP).toFixed(2)}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">VWAP Participation</p>
          <p className="text-sm font-bold text-foreground">{results.vwapParticipation.toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground mt-1">{improvementStatus}</p>
        </div>

        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Total Execution Cost</p>
          <p className="text-sm font-bold text-foreground">₹{results.totalCost.totalCost.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">{results.totalCost.totalCostBps.toFixed(2)} bps</p>
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
            <p className="text-sm font-bold text-foreground">{results.metrics.sharpeRatio.toFixed(2)}</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-2">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
