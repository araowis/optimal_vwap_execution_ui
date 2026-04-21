'use client';

import { BacktestResult, StrategyParams } from '@/lib/types';
import { CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

interface ExecutionSummaryProps {
  results: BacktestResult;
  params: StrategyParams;
}

export default function ExecutionSummary({
  results,
  params,
}: ExecutionSummaryProps) {
  const isSuccessful = results.executionVsVWAPPct < 0; // Better than VWAP is positive
  const improvementStatus =
    results.vwapParticipation > 50 ? 'Above Average' : 'Below Average';

  return (
    <div className="border-t border-border bg-card px-6 py-4">
      <div className="grid grid-cols-12 gap-6 items-center">
        {/* Status */}
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

        {/* Quantity Executed */}
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Quantity Executed</p>
          <p className="text-sm font-bold text-foreground">
            {(results.executedQuantity / 1000).toFixed(0)}K / {(params.totalQuantity / 1000).toFixed(0)}K
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {((results.executedQuantity / params.totalQuantity) * 100).toFixed(1)}%
          </p>
        </div>

        {/* Price Performance */}
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Execution vs VWAP</p>
          <p
            className={`text-sm font-bold ${
              results.executionVsVWAPPct < 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {results.executionVsVWAPPct < 0 ? '-' : '+'}
            {Math.abs(results.executionVsVWAPPct).toFixed(4)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ₹{Math.abs(results.executionVsVWAP).toFixed(2)}
          </p>
        </div>

        {/* Participation Rate */}
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">VWAP Participation</p>
          <p className="text-sm font-bold text-foreground">
            {results.vwapParticipation.toFixed(2)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">{improvementStatus}</p>
        </div>

        {/* Total Cost */}
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Total Execution Cost</p>
          <p className="text-sm font-bold text-foreground">
            ₹{results.totalCost.totalCost.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {results.totalCost.totalCostBps.toFixed(2)} bps
          </p>
        </div>

        {/* Sharpe Ratio / Performance */}
        <div className="col-span-2 flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
            <p className="text-sm font-bold text-foreground">
              {results.metrics.sharpeRatio.toFixed(2)}
            </p>
          </div>
          <div className="bg-primary/10 rounded-lg p-2">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
