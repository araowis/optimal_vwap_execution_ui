'use client';

import { useState } from 'react';
import { Play, Settings, Maximize2, X, Calendar } from 'lucide-react';
import { StrategyParams } from '@/lib/types';

interface ParametersPanelProps {
  params: StrategyParams;
  onParamsChange: (params: StrategyParams) => void;
  onRunBacktest: (params: StrategyParams) => void;
  onRunRealtime?: (params: { totalQty: number; nBins: number; lambda: number }) => void;
  isRunning: boolean;
  progress: number;
  message: string;
  onModeChange?: (mode: 'backtest' | 'realtime') => void;
  selectedInstrumentKey?: string | null;
  importContext?: {
    instrumentKey: string;
    instrumentName: string;
    startDate: string;
    endDate: string;
  } | null;
}

export default function ParametersPanel({
  params,
  onParamsChange,
  onRunBacktest,
  onRunRealtime,
  isRunning,
  progress,
  message,
  onModeChange,
  selectedInstrumentKey,
  importContext,
}: ParametersPanelProps) {
  const [localParams, setLocalParams] = useState<StrategyParams>(params);
  const [runMode, setRunMode] = useState<'backtest' | 'realtime'>('backtest');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleModeChange = (newMode: 'backtest' | 'realtime') => {
    setRunMode(newMode);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const handleChange = (field: keyof StrategyParams, value: any) => {
    const updated = { ...localParams, [field]: value };

    if (field === 'totalQuantity' && localParams.numTranches > 0) {
      updated.trancheSize = Math.floor(value / localParams.numTranches);
    }

    if (field === 'numTranches' && localParams.totalQuantity > 0) {
      updated.trancheSize = Math.floor(localParams.totalQuantity / value);
    }

    setLocalParams(updated);
    onParamsChange(updated);
  };


  const handleRunBacktest = () => {
    onRunBacktest(localParams);
  };

  const handleRunRealtime = () => {
    if (!selectedInstrumentKey) {
      alert('Please select a stock from the watchlist first');
      return;
    }
    if (onRunRealtime) {
      onRunRealtime({
        totalQty: localParams.totalQuantity,
        nBins: localParams.numTranches,
        lambda: localParams.lambda ?? 17.0,
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Strategy Parameters</h2>
        <button
          onClick={() => setIsExpanded(true)}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          title="Expand to full view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {runMode === 'realtime' ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Market Open Calibration</h3>

            <div>
              <label className="text-xs text-muted-foreground">Total Quantity</label>
              <input
                type="number"
                value={localParams.totalQuantity}
                onChange={(e) => handleChange('totalQuantity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Bins</label>
                <input
                  type="number"
                  value={localParams.numTranches}
                  onChange={(e) => handleChange('numTranches', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Risk Aversion (λ)</label>
                <input
                  type="number"
                  step="0.1"
                  value={localParams.lambda ?? 17.0}
                  onChange={(e) => handleChange('lambda', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>
            </div>

            {selectedInstrumentKey && (
              <div className="p-2 bg-secondary rounded-lg">
                <span className="text-xs text-muted-foreground">Selected Instrument:</span>
                <p className="text-xs font-medium text-foreground break-all">{selectedInstrumentKey}</p>
              </div>
            )}

            {!selectedInstrumentKey && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  Please select a stock from the watchlist to calibrate
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Core Execution ─────────────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Execution</h3>

              <div>
                <label className="text-xs text-muted-foreground">Total Quantity</label>
                <input
                  type="number"
                  value={localParams.totalQuantity}
                  onChange={(e) => handleChange('totalQuantity', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Bins</label>
                  <input
                    type="number"
                    min={1}
                    value={localParams.numTranches}
                    onChange={(e) => handleChange('numTranches', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Risk Aversion (λ)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={localParams.lambda ?? 17.0}
                    onChange={(e) => handleChange('lambda', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Order Type</label>
                <select
                  value={localParams.orderType}
                  onChange={(e) => handleChange('orderType', e.target.value as 'LIMIT' | 'MARKET')}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                >
                  <option>LIMIT</option>
                  <option>MARKET</option>
                </select>
              </div>
            </div>

            {/* ── Backtest Context (from Import section) ──────────────── */}
            <div className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Backtest Target
              </h3>
              {importContext?.instrumentKey ? (
                <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg space-y-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {importContext.instrumentName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {importContext.startDate} → {importContext.endDate}
                  </p>
                  <p className="text-xs text-primary">
                    Dates are taken from the Import section above ↑
                  </p>
                </div>
              ) : (
                <div className="p-2.5 bg-secondary/50 border border-dashed border-border rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Select a stock and date range in <strong>Import from Upstox</strong> above to configure the backtest target
                  </p>
                </div>
              )}
            </div>

            {/* ── Risk Management ─────────────────────────────────────── */}
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground">Risk Management</h3>

              <div>
                <label className="text-xs text-muted-foreground">Max Slippage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localParams.maxSlippage}
                  onChange={(e) => handleChange('maxSlippage', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">VWAP Deviation Threshold (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localParams.vwapDeviation}
                  onChange={(e) => handleChange('vwapDeviation', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Min Volume Threshold</label>
                <input
                  type="number"
                  value={localParams.minVolumeThreshold}
                  onChange={(e) => handleChange('minVolumeThreshold', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>
            </div>

            {/* ── Execution Window ────────────────────────────────────── */}
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground">Execution Window</h3>
              <select
                value={localParams.executionTimeframe}
                onChange={(e) => handleChange('executionTimeframe', e.target.value as 'INTRADAY' | 'MULTI_DAY')}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
              >
                <option value="INTRADAY">Intraday</option>
                <option value="MULTI_DAY">Multi-Day</option>
              </select>
            </div>

            {/* ── Transaction Costs ───────────────────────────────────── */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Transactional Costs
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localParams.enableTxCosts || false}
                    onChange={(e) => handleChange('enableTxCosts', e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">Enable</span>
                </label>
              </div>

              {localParams.enableTxCosts && (
                <div className="space-y-2 pl-2 border-l-2 border-border">
                  {[
                    { label: 'Brokerage (%)', field: 'brokeragePercent', step: '0.01', default: 0.12 },
                    { label: 'STT (%)', field: 'sttPercent', step: '0.01', default: 0.025 },
                    { label: 'GST (%)', field: 'gstPercent', step: '0.01', default: 18 },
                    { label: 'Exchange Fee (%)', field: 'exchangeFeePercent', step: '0.00001', default: 0.00345 },
                    { label: 'Spread (bps)', field: 'spreadBps', step: '0.1', default: 5 },
                  ].map(({ label, field, step, default: def }) => (
                    <div key={field}>
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <input
                        type="number"
                        step={step}
                        value={(localParams.txCostConfig as any)?.[field] ?? def}
                        onChange={(e) => {
                          const updated = {
                            ...localParams,
                            txCostConfig: {
                              ...localParams.txCostConfig,
                              [field]: parseFloat(e.target.value) || 0,
                            },
                          };
                          setLocalParams(updated);
                          onParamsChange(updated);
                        }}
                        className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Run Button ────────────────────────────────────────────────── */}
      <div className="mt-4 pt-4 border-t border-border space-y-3">
        {isRunning ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{message}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={runMode}
              onChange={(e) => handleModeChange(e.target.value as 'backtest' | 'realtime')}
              className="px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm font-medium"
              disabled={isRunning}
            >
              <option value="backtest">Backtest</option>
              <option value="realtime">Realtime</option>
            </select>
            <button
              onClick={runMode === 'realtime' ? handleRunRealtime : handleRunBacktest}
              disabled={
                runMode === 'backtest' &&
                !importContext?.instrumentKey
              }
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${
                runMode === 'realtime'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-foreground text-background'
              }`}
            >
              <Play className="w-4 h-4" />
              Run {runMode === 'realtime' ? 'Realtime' : 'Backtest'}
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Strategy Parameters - Expanded View</h2>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Expanded view coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
