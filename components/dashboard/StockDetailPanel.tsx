'use client';

import { X } from 'lucide-react';
import OrderBook from './OrderBook';
import { PretradeResponse } from '@/lib/vwap-server-service';

interface StockDetailPanelProps {
  stock: any;
  accessToken: string | null;
  mode: 'backtest' | 'realtime';
  onClose: () => void;
  wsConnected?: boolean;
  pretradeData?: PretradeResponse | null;
}

export default function StockDetailPanel({ stock, accessToken, mode, onClose, wsConnected = false, pretradeData }: StockDetailPanelProps) {
  if (!stock) return null;

  return (
    <div className="flex flex-col overflow-hidden flex-1 min-h-0 border-b border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {stock.company?.domain && (
            <img
              src={`https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=32`}
              alt={stock.name}
              className="w-6 h-6 rounded flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div>
            <h3 className="font-semibold text-foreground text-sm">{stock.trading_symbol}</h3>
            <p className="text-xs text-muted-foreground">{stock.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Order Book disabled for now to stop calling depth APIs
        {accessToken && (
          <OrderBook
            accessToken={accessToken}
            instrumentKey={stock.instrument_key}
            enabled={mode === 'realtime'}
            wsConnected={wsConnected}
          />
        )}
        */}

        {/* Stock Info */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Stock Information</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exchange</span>
              <span className="text-foreground font-medium">{stock.exchange}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Segment</span>
              <span className="text-foreground font-medium">{stock.segment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Instrument Type</span>
              <span className="text-foreground font-medium">{stock.instrument_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lot Size</span>
              <span className="text-foreground font-medium">{stock.lot_size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Instrument Key</span>
              <span className="text-foreground font-medium text-[10px] truncate max-w-[150px]" title={stock.instrument_key}>{stock.instrument_key}</span>
            </div>
          </div>
        </div>

        {/* Pretrade Statistics */}
        {pretradeData && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span>Pretrade Statistics</span>
              <span className="px-1.5 py-0.5 bg-green-600/20 text-green-600 dark:text-green-400 rounded text-[10px] font-medium">375 Bins</span>
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Historical Days</span>
                <span className="text-foreground font-medium">{pretradeData.stats.histDayCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Daily Volume</span>
                <span className="text-foreground font-medium">{(pretradeData.stats.avgDailyVolume / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">K (Lambda)</span>
                <span className="text-foreground font-medium">{pretradeData.stats.K.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sigma² Hat</span>
                <span className="text-foreground font-medium">{pretradeData.stats.sigma2Hat.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Daily Return %</span>
                <span className="text-foreground font-medium">{pretradeData.stats.avgDailyRetPct.toFixed(4)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Residual Risk</span>
                <span className="text-foreground font-medium">{pretradeData.stats.residualRisk.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Bins</span>
                <span className="text-foreground font-medium">{pretradeData.stats.totalBins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Output Bins</span>
                <span className="text-foreground font-medium">{pretradeData.stats.outputBins}</span>
              </div>
            </div>
          </div>
        )}

        {!pretradeData && stock && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Pretrade Statistics</h4>
            <div className="text-xs text-muted-foreground text-center py-3">
              No pretrade data available. Select a calibrated stock to see volume curve predictions.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
