'use client';

import { useMarketDepth } from '@/lib/upstox-market-depth';

interface MarketDepthProps {
  accessToken: string;
  instrumentKey: string;
  mode?: 'full' | 'full_d30';
  enabled?: boolean;
}

export default function MarketDepth({
  accessToken,
  instrumentKey,
  mode = 'full',
  enabled = true,
}: MarketDepthProps) {
  const { depthData, isConnected, error, refresh } = useMarketDepth({
    accessToken,
    instrumentKey,
    mode,
    enabled,
  });

  // Calculate max quantity for relative bar widths
  const maxBidQty = Math.max(...(depthData?.bids.map(b => b.quantity) || [1]));
  const maxAskQty = Math.max(...(depthData?.asks.map(a => a.quantity) || [1]));
  const maxTotalQty = Math.max(maxBidQty, maxAskQty);

  if (!enabled) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header with Connectivity & Refresh */}
      <div className="p-3 bg-secondary/30 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isConnected ? 'Live Engine' : 'Engine Idle'}
          </span>
        </div>
        <button
          onClick={refresh}
          className="text-[10px] font-bold uppercase text-primary hover:text-primary/80 transition-colors"
        >
          Refresh Now
        </button>
      </div>

      {error && (
        <div className="m-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-[10px] font-medium text-destructive leading-tight">{error}</p>
        </div>
      )}

      {depthData ? (
        <div className="p-4 space-y-5">
          {/* Live Price Header */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-widest mb-1">Last Traded Price</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground tracking-tighter">
                  ₹{depthData.ltp.toFixed(2)}
                </span>
                {depthData.netChange !== undefined && (
                  <span className={`text-sm font-bold flex items-center ${depthData.netChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {depthData.netChange >= 0 ? '▲' : '▼'} {Math.abs(depthData.netChange).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Market Depth Tables */}
          <div className="grid grid-cols-2 gap-px bg-border rounded-lg border border-border overflow-hidden">
            {/* Bids */}
            <div className="bg-card p-3">
              <h4 className="text-[10px] font-black uppercase text-green-500 tracking-widest mb-3 text-center">Buy Orders</h4>
              <div className="space-y-1.5">
                {depthData.bids.slice(0, 5).map((bid, index) => {
                  const width = (bid.quantity / maxTotalQty) * 100;
                  return (
                    <div key={index} className="relative h-6 flex items-center px-2 group">
                      <div 
                        className="absolute right-0 top-0 bottom-0 bg-green-500/5 group-hover:bg-green-500/10 transition-all rounded-sm" 
                        style={{ width: `${width}%` }} 
                      />
                      <div className="relative w-full flex justify-between items-baseline z-10">
                        <span className="text-xs font-bold text-foreground tabular-nums">{bid.price.toFixed(2)}</span>
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{bid.quantity}</span>
                      </div>
                    </div>
                  );
                })}
                {depthData.bids.length === 0 && <p className="text-[10px] text-center text-muted-foreground py-2">Empty Depth</p>}
              </div>
            </div>

            {/* Asks */}
            <div className="bg-card p-3">
              <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-3 text-center">Sell Orders</h4>
              <div className="space-y-1.5">
                {depthData.asks.slice(0, 5).map((ask, index) => {
                  const width = (ask.quantity / maxTotalQty) * 100;
                  return (
                    <div key={index} className="relative h-6 flex items-center px-2 group text-right">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-red-500/5 group-hover:bg-red-500/10 transition-all rounded-sm" 
                        style={{ width: `${width}%` }} 
                      />
                      <div className="relative w-full flex justify-between items-baseline z-10">
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{ask.quantity}</span>
                        <span className="text-xs font-bold text-foreground tabular-nums">{ask.price.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
                {depthData.asks.length === 0 && <p className="text-[10px] text-center text-muted-foreground py-2">Empty Depth</p>}
              </div>
            </div>
          </div>

          {/* Trading Statistics Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-secondary/20 rounded-lg p-2 border border-border/50">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Avg Traded Price</p>
              <p className="font-bold text-sm text-foreground">
                {depthData.averagePrice ? `₹${depthData.averagePrice.toFixed(2)}` : 'N/A'}
              </p>
            </div>
            <div className="bg-secondary/20 rounded-lg p-2 border border-border/50">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Volume</p>
              <p className="font-bold text-sm text-foreground">
                {depthData.volume?.toLocaleString() || 'N/A'}
              </p>
            </div>
          </div>

          {/* Quick Stats Bar */}
          {depthData.ohlc && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase mb-1">
                <span>Low: ₹{depthData.ohlc.low.toFixed(2)}</span>
                <span>High: ₹{depthData.ohlc.high.toFixed(2)}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden relative">
                {(() => {
                  const range = depthData.ohlc.high - depthData.ohlc.low;
                  const pos = range > 0 ? ((depthData.ltp - depthData.low) / range) * 100 : 50;
                  return (
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)] z-10" 
                      style={{ left: `${Math.min(Math.max(pos, 0), 100)}%` }} 
                    />
                  );
                })()}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-yellow-500/10 to-green-500/20" />
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-[9px] font-extrabold text-muted-foreground/50 uppercase tracking-[0.2em]">
              {mode === 'full_d30' ? 'FULL L3 INTEGRATION' : 'L2 SNAPSHOT'} 
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 px-6">
          <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
             <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {isConnected ? 'Engaging Upstox Data Streams...' : 'Establishing API Connectivity...'}
          </p>
        </div>
      )}
    </div>
  );
}
