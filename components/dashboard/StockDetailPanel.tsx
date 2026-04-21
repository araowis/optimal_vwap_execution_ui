import { X, TrendingUp, Shield, Activity, Globe, Info } from 'lucide-react';
import MarketDepth from './MarketDepth';

interface StockDetailPanelProps {
  stock: any;
  accessToken: string | null;
  mode: 'backtest' | 'realtime';
  onClose: () => void;
}

export default function StockDetailPanel({ stock, accessToken, mode, onClose }: StockDetailPanelProps) {
  if (!stock) return null;

  return (
    <div className="bg-background border-l border-border flex flex-col overflow-hidden h-full shadow-2xl">
      {/* Header */}
      <div className="p-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          {stock.company?.domain ? (
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-border p-2 flex items-center justify-center">
              <img
                src={`https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=64`}
                alt={stock.name}
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
               <Activity className="w-6 h-6 text-primary" />
            </div>
          )}
          <div>
            <h3 className="font-black text-foreground text-lg tracking-tight leading-tight">{stock.trading_symbol}</h3>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{stock.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-secondary rounded-full transition-all text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-border">
        {/* Market Depth Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Realtime Liquidity</span>
          </div>
          {accessToken ? (
            <MarketDepth
              accessToken={accessToken}
              instrumentKey={stock.instrument_key}
              mode="full_d30"
              enabled={mode === 'realtime'}
            />
          ) : (
             <div className="p-8 border-2 border-dashed border-border rounded-xl text-center">
                <Info className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-xs font-medium text-muted-foreground">API Connection Required</p>
             </div>
          )}
        </section>

        {/* Global Identity Card */}
        <section className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Globe className="w-4 h-4" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Asset Profiler</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Exchange</p>
                <p className="text-sm font-black text-foreground">{stock.exchange}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Segment</p>
                <p className="text-sm font-black text-foreground">{stock.segment}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Type</p>
                <p className="text-sm font-black text-foreground">{stock.instrument_type}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Lot Size</p>
                <p className="text-sm font-black text-foreground">{stock.lot_size}</p>
             </div>
          </div>
        </section>

        {/* Risk & Exposure Section */}
        <section className="bg-secondary/20 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <Shield className="w-4 h-4" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Safety Limits</h4>
          </div>
          
          <div className="space-y-3">
             <div className="flex justify-between items-center p-2 rounded-lg bg-card/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Upper Circuit</span>
                <span className="text-xs font-black text-green-600">--</span>
             </div>
             <div className="flex justify-between items-center p-2 rounded-lg bg-card/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Lower Circuit</span>
                <span className="text-xs font-black text-red-600">--</span>
             </div>
          </div>
          <p className="mt-3 text-[9px] text-muted-foreground/60 italic leading-tight">
             Circuit limits are calculated by the exchange based on volatility thresholds.
          </p>
        </section>

        {/* Momentum Indicator Placeholder */}
        <section className="p-4 border border-primary/20 rounded-xl bg-primary/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <div>
                 <p className="text-[10px] font-black text-primary uppercase">Alpha Signal</p>
                 <p className="text-[9px] text-primary/70">Trend Strength Monitoring</p>
              </div>
           </div>
           <div className="px-2 py-1 rounded bg-primary text-[10px] font-black text-white">
              ACTIVE
           </div>
        </section>
      </div>

      <div className="p-5 bg-card border-t border-border">
         <button className="w-full py-3 bg-foreground text-background rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
            Execute Position
         </button>
      </div>
    </div>
  );
}
