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

  console.log('MarketDepth component - depthData:', depthData);
  console.log('MarketDepth component - isConnected:', isConnected);
  console.log('MarketDepth component - error:', error);

  if (!enabled) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Market Depth</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <button
            onClick={refresh}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-destructive/10 rounded-md">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {depthData ? (
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-lg font-bold text-foreground">₹{depthData.ltp.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-2">LTP</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Bids */}
            <div>
              <h4 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Bids</h4>
              <div className="space-y-1">
                {depthData.bids.map((bid, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-foreground">{bid.price.toFixed(2)}</span>
                    <span className="text-muted-foreground">{bid.quantity}</span>
                  </div>
                ))}
                {depthData.bids.length === 0 && (
                  <p className="text-xs text-muted-foreground">No bids</p>
                )}
              </div>
            </div>

            {/* Asks */}
            <div>
              <h4 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Asks</h4>
              <div className="space-y-1">
                {depthData.asks.map((ask, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-foreground">{ask.price.toFixed(2)}</span>
                    <span className="text-muted-foreground">{ask.quantity}</span>
                  </div>
                ))}
                {depthData.asks.length === 0 && (
                  <p className="text-xs text-muted-foreground">No asks</p>
                )}
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Mode: {mode === 'full_d30' ? 'Depth 30 (L3)' : 'Depth 5 (L2)'}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            {isConnected ? 'Waiting for market data...' : 'Connect to view market depth'}
          </p>
        </div>
      )}
    </div>
  );
}
