'use client';

import { useMarketDepth } from '@/lib/upstox-market-depth';

interface OrderBookProps {
  accessToken: string;
  instrumentKey: string;
  enabled?: boolean;
  wsConnected?: boolean;
}

export default function OrderBook({ accessToken, instrumentKey, enabled = true, wsConnected = false }: OrderBookProps) {
  const { depthData, isConnected, error } = useMarketDepth({
    accessToken,
    instrumentKey,
    mode: 'full',
    enabled,
    pollInterval: 1000,
    wsConnected,
  });

  if (!enabled) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Order Book</h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      {error && (
        <div className="mb-4 p-2 bg-destructive/10 rounded-md">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {depthData ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Bids</h4>
            <div className="space-y-1">
              {depthData.bids.map((bid, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-foreground tabular-nums">{bid.price.toFixed(2)}</span>
                  <span className="text-muted-foreground tabular-nums">{bid.quantity}</span>
                </div>
              ))}
              {depthData.bids.length === 0 && <p className="text-xs text-muted-foreground">No bids</p>}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Asks</h4>
            <div className="space-y-1">
              {depthData.asks.map((ask, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-foreground tabular-nums">{ask.price.toFixed(2)}</span>
                  <span className="text-muted-foreground tabular-nums">{ask.quantity}</span>
                </div>
              ))}
              {depthData.asks.length === 0 && <p className="text-xs text-muted-foreground">No asks</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">{isConnected ? 'Waiting for order book...' : 'Connect to view order book'}</p>
        </div>
      )}
    </div>
  );
}
