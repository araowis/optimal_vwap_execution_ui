'use client';

import { X, Activity } from 'lucide-react';
import OrderBook from './OrderBook';
import { PretradeResponse } from '@/lib/vwap-server-service';
import { useVwapWebSocket } from '@/lib/use-vwap-websocket';

interface StockDetailPanelProps {
  stock: any;
  accessToken: string | null;
  mode: 'backtest' | 'realtime';
  onClose: () => void;
  wsConnected?: boolean;
  pretradeData?: PretradeResponse | null;
}

function LiveStats({ instrumentKey }: { instrumentKey: string }) {
  const { connected, lastCalibration, lastSignal, lastRegime } = useVwapWebSocket({
    autoConnect: true,
  });

  if (!connected) {
    return (
      <div className="text-xs text-muted-foreground text-center py-3">
        <Activity className="w-4 h-4 mx-auto mb-1 animate-pulse" />
        Connecting to live feed...
      </div>
    );
  }

  if (!lastCalibration && !lastSignal) {
    return (
      <div className="text-xs text-muted-foreground text-center py-3">
        Waiting for live data...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lastCalibration && (
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bar Index</span>
            <span className="text-foreground font-medium">{lastCalibration.barIdx}/375</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trend Score</span>
            <span className={`font-medium ${lastCalibration.trendScore > 0 ? 'text-green-600' : lastCalibration.trendScore < 0 ? 'text-red-600' : 'text-foreground'}`}>
              {lastCalibration.trendScore.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current VWAP</span>
            <span className="text-foreground font-medium">₹{lastCalibration.currentVWAP.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Intraday Alpha</span>
            <span className="text-foreground font-medium">{lastCalibration.intradayAlpha.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bar Quality</span>
            <span className="text-foreground font-medium">{(lastCalibration.barQuality * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Executed</span>
            <span className="text-foreground font-medium">{(lastCalibration.executedFrac * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lambda</span>
            <span className="text-foreground font-medium">{lastCalibration.lambda.toFixed(2)}</span>
          </div>
        </div>
      )}

      {lastSignal && (
        <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded">
          <p className="text-[10px] font-medium text-primary mb-1">Latest Signal</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>
              <span className="text-muted-foreground text-[10px]">Qty</span>
              <p className="font-medium">{lastSignal.qty}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px]">LTP</span>
              <p className="font-medium">₹{lastSignal.ltp.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {lastRegime && (
        <div className="mt-1 p-1.5 bg-secondary/50 rounded">
          <p className="text-[10px] text-muted-foreground">
            Regime: <span className="text-foreground font-medium">{lastRegime.previousRegime}</span> →{' '}
            <span className={`font-medium ${
              lastRegime.newRegime === 'UP' ? 'text-green-600' :
              lastRegime.newRegime === 'DOWN' ? 'text-red-600' :
              'text-foreground'
            }`}>
              {lastRegime.newRegime}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function StockDetailPanel({ stock, accessToken, mode, onClose, wsConnected = false, pretradeData }: StockDetailPanelProps) {
  if (!stock) return null;

  return (
    <div className="bg-card border-l border-border flex flex-col overflow-hidden h-full">
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
        {/* Order Book */}
        {accessToken && (
          <OrderBook
            accessToken={accessToken}
            instrumentKey={stock.instrument_key}
            enabled={mode === 'realtime'}
            wsConnected={wsConnected}
          />
        )}

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

        {/* Live Adjustments */}
        {mode === 'realtime' && stock && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-3 h-3" />
              <span>Live Adjustments</span>
              <span className="px-1.5 py-0.5 bg-green-600/20 text-green-600 dark:text-green-400 rounded text-[10px] font-medium">WS</span>
            </h4>
            <LiveStats instrumentKey={stock.instrument_key} />
          </div>
        )}
      </div>
    </div>
  );
}
