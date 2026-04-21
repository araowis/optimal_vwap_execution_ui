'use client';

import { X } from 'lucide-react';
import MarketDepth from './MarketDepth';

interface StockDetailPanelProps {
  stock: any;
  accessToken: string | null;
  mode: 'backtest' | 'realtime';
  onClose: () => void;
}

export default function StockDetailPanel({ stock, accessToken, mode, onClose }: StockDetailPanelProps) {
  console.log('StockDetailPanel rendering with stock:', stock);
  console.log('StockDetailPanel accessToken present:', !!accessToken);
  
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
        {/* Market Depth */}
        {accessToken && (
          <MarketDepth
            accessToken={accessToken}
            instrumentKey={stock.instrument_key}
            mode="full_d30"
            enabled={mode === 'realtime'}
          />
        )}

        {/* Stock Info */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Stock Information</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exchange</span>
              <span className="text-foreground">{stock.exchange}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Segment</span>
              <span className="text-foreground">{stock.segment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Instrument Type</span>
              <span className="text-foreground">{stock.instrument_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lot Size</span>
              <span className="text-foreground">{stock.lot_size}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
