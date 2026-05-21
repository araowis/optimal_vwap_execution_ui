"use client";

import { X, Activity, ChevronDown, ChevronRight } from "lucide-react";
import MarketDepth from "./MarketDepth";
import { PretradeResponse } from "@/lib/vwap-server-service";
import { useState } from "react";

interface StockDetailPanelProps {
  stock: any;
  accessToken: string | null;
  mode: "backtest" | "realtime";
  onClose: () => void;
  wsConnected?: boolean;
  pretradeData?: PretradeResponse | null;
  liveCalibration?: any | null;
}

export default function StockDetailPanel({
  stock,
  accessToken,
  mode,
  onClose,
  wsConnected = false,
  pretradeData,
  liveCalibration,
}: StockDetailPanelProps) {
  const [expanded, setExpanded] = useState({
    marketDepth: false,
    pretrade: false,
    liveStats: false,
  });

  const toggleSection = (key: keyof typeof expanded) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!stock) return null;

  return (
    <div className="flex flex-col overflow-hidden flex-1 min-h-[250px] border-b border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {(stock.logoUrl || stock.company?.domain) && (
            <div className="bg-white p-0.5 rounded border border-border/40 shadow-sm flex-shrink-0 flex items-center justify-center w-8 h-8 overflow-hidden">
              <img
                src={stock.logoUrl || `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://www.${stock.company?.domain}&size=64`}
                alt={stock.name || "Company Logo"}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              {stock.trading_symbol}
            </h3>
            <p className="text-xs text-muted-foreground">{stock.name}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <button
            onClick={() => toggleSection("marketDepth")}
            className="flex items-center justify-between w-full text-xs font-semibold text-foreground hover:text-primary transition-colors"
          >
            <span>Market Depth</span>
            {expanded.marketDepth ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          
          {expanded.marketDepth && (
            accessToken ? (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <MarketDepth
                  accessToken={accessToken}
                  instrumentKey={stock.instrument_key}
                  enabled={true}
                  wsConnected={wsConnected}
                />
              </div>
            ) : (
              <div className="bg-card/40 border border-border/60 rounded-lg p-3 text-center animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Connect to Upstox API below to stream real-time order book bids & asks.
                </p>
              </div>
            )
          )}
        </div>


        {/* Pretrade Statistics */}
        {pretradeData && (
          <div className="space-y-2">
            <button
              onClick={() => toggleSection("pretrade")}
              className="flex items-center justify-between w-full text-xs font-semibold text-foreground hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>Pretrade Statistics</span>
                <span className="px-1.5 py-0.5 bg-green-600/20 text-green-600 dark:text-green-400 rounded text-[10px] font-medium">
                  375 Bins
                </span>
              </div>
              {expanded.pretrade ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {expanded.pretrade && (
              <div className="space-y-1 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Historical Days</span>
                <span className="text-foreground font-medium">
                  {pretradeData.stats.histDayCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Daily Volume</span>
                <span className="text-foreground font-medium">
                  {(pretradeData.stats.avgDailyVolume / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">K (Lambda)</span>
                <span className="text-foreground font-medium">
                  {pretradeData.stats.K.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sigma² Hat</span>
                <span className="text-foreground font-medium">
                  {pretradeData.stats.sigma2Hat.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Avg Daily Return %
                </span>
                <span className="text-foreground font-medium">
                  {pretradeData.stats.avgDailyRetPct.toFixed(4)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Residual Risk</span>
                <span className="text-foreground font-medium">
                  {pretradeData.stats.residualRisk.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Mins</span>
                <span className="text-foreground font-medium">
                  {pretradeData.stats.totalBins}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Output Mins</span>
                <span className="text-foreground font-medium">
                  {pretradeData.stats.outputBins}
                </span>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Live Calibration Stats */}
        {liveCalibration && (
          <div className="space-y-2">
            <button
              onClick={() => toggleSection("liveStats")}
              className="flex items-center justify-between w-full text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" />
                <span>Live Engine Stats</span>
                <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded text-[10px] font-medium">
                  Bar #{liveCalibration.barIdx}
                </span>
              </div>
              {expanded.liveStats ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {expanded.liveStats && (
              <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 space-y-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trend Score</span>
                <span
                  className={`font-bold ${liveCalibration.trendScore > 0 ? "text-green-500" : liveCalibration.trendScore < 0 ? "text-red-500" : "text-foreground"}`}
                >
                  {(liveCalibration.trendScore * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trend Accel</span>
                <span className="text-foreground font-medium">
                  {liveCalibration.trendAcceleration.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Lambda</span>
                <span className="text-foreground font-medium">
                  {liveCalibration.lambda.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bar Quality</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${liveCalibration.barQuality * 100}%` }}
                    />
                  </div>
                  <span className="text-foreground font-medium">
                    {Math.round(liveCalibration.barQuality * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intraday Alpha</span>
                <span className="text-foreground font-medium">
                  {(liveCalibration.intradayAlpha * 10000).toFixed(2)} bps
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-500/10">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Execution Progress
                  </span>
                  <span className="text-foreground font-bold">
                    {Math.round(liveCalibration.executedFrac * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${liveCalibration.executedFrac * 100}%` }}
                  />
                </div>
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
