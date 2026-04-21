'use client';

import { useState } from 'react';
import { Play, AlertCircle, Settings, Maximize2, X } from 'lucide-react';
import { StrategyParams } from '@/lib/types';

interface ParametersPanelProps {
  params: StrategyParams;
  onParamsChange: (params: StrategyParams) => void;
  onRunBacktest: (params: StrategyParams) => void;
  isRunning: boolean;
  progress: number;
  message: string;
  onModeChange?: (mode: 'backtest' | 'realtime') => void;
}

export default function ParametersPanel({
  params,
  onParamsChange,
  onRunBacktest,
  isRunning,
  progress,
  message,
  onModeChange,
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
    
    // Auto-calculate tranches if total quantity changes
    if (field === 'totalQuantity' && localParams.numTranches > 0) {
      updated.trancheSize = Math.floor(value / localParams.numTranches);
    }
    
    // Auto-calculate quantity if tranches change
    if (field === 'numTranches' && localParams.totalQuantity > 0) {
      updated.trancheSize = Math.floor(localParams.totalQuantity / value);
    }

    setLocalParams(updated);
    onParamsChange(updated);
  };

  const handleRunBacktest = () => {
    onRunBacktest(localParams);
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
        {/* Execution Parameters */}
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
              <label className="text-xs text-muted-foreground">Tranches</label>
              <input
                type="number"
                value={localParams.numTranches}
                onChange={(e) => handleChange('numTranches', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Per Tranche</label>
              <input
                type="number"
                value={localParams.trancheSize}
                onChange={(e) => handleChange('trancheSize', parseInt(e.target.value) || 0)}
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

        {/* Risk Parameters */}
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Risk Management</h3>

          <div>
            <label className="text-xs text-muted-foreground">
              Max Slippage (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={localParams.maxSlippage}
              onChange={(e) => handleChange('maxSlippage', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              VWAP Deviation Threshold (%)
            </label>
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

        {/* Timeframe */}
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

        {/* Transactional Costs */}
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
              <div>
                <label className="text-xs text-muted-foreground">Brokerage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localParams.txCostConfig?.brokeragePercent || 0.12}
                  onChange={(e) => {
                    const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, brokeragePercent: parseFloat(e.target.value) || 0 } };
                    setLocalParams(updated);
                    onParamsChange(updated);
                  }}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">STT (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localParams.txCostConfig?.sttPercent || 0.025}
                  onChange={(e) => {
                    const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, sttPercent: parseFloat(e.target.value) || 0 } };
                    setLocalParams(updated);
                    onParamsChange(updated);
                  }}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">GST (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localParams.txCostConfig?.gstPercent || 18}
                  onChange={(e) => {
                    const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, gstPercent: parseFloat(e.target.value) || 0 } };
                    setLocalParams(updated);
                    onParamsChange(updated);
                  }}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Exchange Fee (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={localParams.txCostConfig?.exchangeFeePercent || 0.00345}
                  onChange={(e) => {
                    const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, exchangeFeePercent: parseFloat(e.target.value) || 0 } };
                    setLocalParams(updated);
                    onParamsChange(updated);
                  }}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Spread (bps)</label>
                <input
                  type="number"
                  step="0.1"
                  value={localParams.txCostConfig?.spreadBps || 5}
                  onChange={(e) => {
                    const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, spreadBps: parseFloat(e.target.value) || 0 } };
                    setLocalParams(updated);
                    onParamsChange(updated);
                  }}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Run Button Section */}
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
              ></div>
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
              onClick={handleRunBacktest}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity ${
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

      {/* Expanded Modal */}
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
            <div className="p-6 space-y-6">
              {/* Execution Parameters */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-foreground border-b border-border pb-2">Execution</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Total Quantity</label>
                    <input
                      type="number"
                      value={localParams.totalQuantity}
                      onChange={(e) => handleChange('totalQuantity', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Order Type</label>
                    <select
                      value={localParams.orderType}
                      onChange={(e) => handleChange('orderType', e.target.value as 'LIMIT' | 'MARKET')}
                      className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                    >
                      <option>LIMIT</option>
                      <option>MARKET</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Tranches</label>
                    <input
                      type="number"
                      value={localParams.numTranches}
                      onChange={(e) => handleChange('numTranches', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Per Tranche</label>
                    <input
                      type="number"
                      value={localParams.trancheSize}
                      onChange={(e) => handleChange('trancheSize', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Max Slippage (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={localParams.maxSlippage}
                      onChange={(e) => handleChange('maxSlippage', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">VWAP Deviation (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={localParams.vwapDeviation}
                      onChange={(e) => handleChange('vwapDeviation', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Min Volume Threshold</label>
                    <input
                      type="number"
                      value={localParams.minVolumeThreshold}
                      onChange={(e) => handleChange('minVolumeThreshold', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Execution Timeframe</label>
                    <select
                      value={localParams.executionTimeframe}
                      onChange={(e) => handleChange('executionTimeframe', e.target.value as 'INTRADAY' | 'MULTI_DAY')}
                      className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                    >
                      <option>INTRADAY</option>
                      <option>MULTI_DAY</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Transaction Costs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-base font-medium text-foreground">Transaction Costs</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={localParams.enableTxCosts}
                      onChange={(e) => handleChange('enableTxCosts', e.target.checked)}
                      className="rounded"
                    />
                    <span>Enable</span>
                  </label>
                </div>
                {localParams.enableTxCosts && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Brokerage (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={localParams.txCostConfig?.brokeragePercent || 0.12}
                        onChange={(e) => {
                          const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, brokeragePercent: parseFloat(e.target.value) || 0 } };
                          setLocalParams(updated);
                          onParamsChange(updated);
                        }}
                        className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">STT (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={localParams.txCostConfig?.sttPercent || 0.025}
                        onChange={(e) => {
                          const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, sttPercent: parseFloat(e.target.value) || 0 } };
                          setLocalParams(updated);
                          onParamsChange(updated);
                        }}
                        className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">GST (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={localParams.txCostConfig?.gstPercent || 18}
                        onChange={(e) => {
                          const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, gstPercent: parseFloat(e.target.value) || 0 } };
                          setLocalParams(updated);
                          onParamsChange(updated);
                        }}
                        className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Exchange Fee (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={localParams.txCostConfig?.exchangeFeePercent || 0.00345}
                        onChange={(e) => {
                          const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, exchangeFeePercent: parseFloat(e.target.value) || 0 } };
                          setLocalParams(updated);
                          onParamsChange(updated);
                        }}
                        className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm text-muted-foreground mb-1 block">Spread (bps)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={localParams.txCostConfig?.spreadBps || 5}
                        onChange={(e) => {
                          const updated = { ...localParams, txCostConfig: { ...localParams.txCostConfig, spreadBps: parseFloat(e.target.value) || 0 } };
                          setLocalParams(updated);
                          onParamsChange(updated);
                        }}
                        className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Run Button */}
              <div className="pt-4 border-t border-border">
                {isRunning ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{message}</span>
                      <span className="text-muted-foreground">{progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={runMode}
                      onChange={(e) => setRunMode(e.target.value as 'backtest' | 'realtime')}
                      className="px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm font-medium"
                    >
                      <option value="backtest">Backtest</option>
                      <option value="realtime">Realtime</option>
                    </select>
                    <button
                      onClick={() => {
                        onRunBacktest(localParams);
                        setIsExpanded(false);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity ${
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
