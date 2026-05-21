"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RotateCcw,
  Send,
  Diff,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Info,
} from "lucide-react";
import {
  RuntimeTuningParams,
  RuntimeTuningProfile,
} from "@/lib/vwap-server-types";
import { vwapServerService } from "@/lib/vwap-server-service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RuntimeTuningPanelProps {
  clientId: string | undefined;
  instrumentKey: string | undefined;
  selectedTuningProfile: RuntimeTuningProfile | null;
}

type ParamKey = keyof RuntimeTuningParams;

interface ParamGroup {
  label: string;
  accent: string;
  dot: string;
  fields: ParamKey[];
}

const PARAM_GROUPS: ParamGroup[] = [
  {
    label: "Lambda",
    accent: "text-violet-400",
    dot: "bg-violet-500",
    fields: ["lambdaMultiplier", "lambdaClampLo", "lambdaClampHi"],
  },
  {
    label: "Trend",
    accent: "text-amber-400",
    dot: "bg-amber-500",
    fields: [
      "rawTrendWeightGap",
      "rawTrendWeightConsistency",
      "rawTrendWeightReturn",
      "upTrendScoreThreshold",
      "upTrendConsecBars",
      "downTrendScoreThreshold",
      "downTrendConsecBars",
      "maxTrendAccel",
      "minTrendAccel",
      "trendAccelScaleUp",
      "trendAccelScaleDown",
    ],
  },
  {
    label: "EWMA",
    accent: "text-sky-400",
    dot: "bg-sky-500",
    fields: [
      "ewmaFastOldWeight",
      "ewmaSlowOldWeight",
      "intradayAlphaEwmaOldWeight",
    ],
  },
  {
    label: "Scaling",
    accent: "text-emerald-400",
    dot: "bg-emerald-500",
    fields: [
      "adjustmentClampLo",
      "adjustmentClampHi",
      "barStructAlpha",
      "scaleFactorHi",
      "scaleFactorLo",
    ],
  },
  {
    label: "Liquidity",
    accent: "text-cyan-400",
    dot: "bg-cyan-500",
    fields: [
      "liquidityFactorBase",
      "liquidityFactorScale",
      "deficitPressureScale",
      "deficitFracClamp",
    ],
  },
  {
    label: "Execution",
    accent: "text-rose-400",
    dot: "bg-rose-500",
    fields: [
      "executionScoreHistWeight",
      "priceEdgeExponent",
      "strongSignalThreshold",
    ],
  },
  {
    label: "Refinement",
    accent: "text-orange-400",
    dot: "bg-orange-500",
    fields: ["refinementPasses", "binSmoothingWindow", "minSpacingDenominator"],
  },
];
const camelToTitle = (text: string) => {
  const result = text.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const INTEGER_FIELDS = new Set<ParamKey>([
  "upTrendConsecBars",
  "downTrendConsecBars",
  "refinementPasses",
  "binSmoothingWindow",
  "minSpacingDenominator",
]);

const PARAM_METADATA: Record<ParamKey, { desc: string; typical: string; recommended: string }> = {
  lambdaMultiplier: { desc: "Dynamically scales the urgency and aggression of trade execution to adapt to market volatility. Higher values enforce faster completion, while lower values prioritize passive spread capture.", typical: "0.5 - 5.0", recommended: "1.0 - 2.0" },
  adjustmentClampLo: { desc: "The absolute maximum percentage by which the engine is permitted to dynamically decelerate trading below the scheduled target. Acts as a safety floor.", typical: "-0.5 - 0.0", recommended: "-0.15" },
  adjustmentClampHi: { desc: "The absolute maximum percentage by which the engine is permitted to dynamically accelerate trading above the scheduled target. Prevents over-execution.", typical: "0.0 - 0.5", recommended: "0.15" },
  rawTrendWeightGap: { desc: "Defines how heavily overnight price gaps influence the engine's assessment of current trend strength. Essential for morning gap-and-go scenarios.", typical: "0.1 - 0.5", recommended: "0.33" },
  rawTrendWeightConsistency: { desc: "Determines the importance of consecutive directional movements (persistence) when calculating the overall trend score.", typical: "0.1 - 0.5", recommended: "0.33" },
  rawTrendWeightReturn: { desc: "The weighting assigned to immediate historical return magnitudes when evaluating the momentum and direction of the market.", typical: "0.1 - 0.5", recommended: "0.34" },
  ewmaFastOldWeight: { desc: "Decay factor for the short-term Exponential Weighted Moving Average (EWMA) tracking recent price volatility. Lower values adapt faster.", typical: "0.8 - 0.95", recommended: "0.9" },
  ewmaSlowOldWeight: { desc: "Decay factor for the long-term Exponential Weighted Moving Average (EWMA) tracking baseline market trends. Higher values provide stability.", typical: "0.9 - 0.99", recommended: "0.95" },
  upTrendScoreThreshold: { desc: "The minimum required trend score required for the engine to officially switch into a formalized 'UP' regime state.", typical: "0.1 - 0.5", recommended: "0.25" },
  upTrendConsecBars: { desc: "The exact number of consecutive positive trend signals required to validate and trigger an 'UP' regime transition.", typical: "2 - 5", recommended: "3" },
  downTrendScoreThreshold: { desc: "The minimum negative trend score required for the engine to officially switch into a formalized 'DOWN' regime state.", typical: "-0.5 - -0.1", recommended: "-0.25" },
  downTrendConsecBars: { desc: "The exact number of consecutive negative trend signals required to validate and trigger a 'DOWN' regime transition.", typical: "2 - 5", recommended: "3" },
  maxTrendAccel: { desc: "Caps the maximum positive execution acceleration applied during a highly favorable trend scenario to avoid market impact.", typical: "0.05 - 0.3", recommended: "0.15" },
  minTrendAccel: { desc: "Caps the maximum negative execution deceleration (slowing down) permitted during an unfavorable trend scenario.", typical: "-0.3 - -0.05", recommended: "-0.15" },
  trendAccelScaleUp: { desc: "A pure multiplier applied to calculated acceleration when scaling up execution speed in response to positive trends.", typical: "0.5 - 2.0", recommended: "1.0" },
  trendAccelScaleDown: { desc: "A pure multiplier applied to calculated deceleration when slowing down execution speed in response to negative trends.", typical: "0.5 - 2.0", recommended: "1.0" },
  intradayAlphaEwmaOldWeight: { desc: "The memory decay parameter used for calculating real-time intraday alpha generation compared to arrival price.", typical: "0.9 - 0.99", recommended: "0.95" },
  barStructAlpha: { desc: "The assumed alpha generated purely from exploiting the micro-structure and liquidity within individual trading bars.", typical: "0.1 - 1.0", recommended: "0.5" },
  scaleFactorHi: { desc: "The aggressive pacing multiplier utilized specifically when the engine detects high-confidence favorable market conditions.", typical: "1.0 - 2.0", recommended: "1.2" },
  scaleFactorLo: { desc: "The passive pacing multiplier utilized specifically when the engine detects highly unfavorable market conditions or wide spreads.", typical: "0.1 - 1.0", recommended: "0.8" },
  executionScoreHistWeight: { desc: "Balances the influence of historical backtest performance vs real-time performance in the live execution scoring.", typical: "0.1 - 0.9", recommended: "0.5" },
  lambdaClampLo: { desc: "The absolute minimum boundary for the dynamic Lambda (urgency) parameter to ensure baseline trading continues.", typical: "1.0 - 10.0", recommended: "5.0" },
  lambdaClampHi: { desc: "The absolute maximum boundary for the dynamic Lambda (urgency) parameter to prevent hyper-aggressive market sweeping.", typical: "20.0 - 100.0", recommended: "50.0" },
  priceEdgeExponent: { desc: "Determines how aggressively the engine seeks price improvement. Higher values increase sensitivity to small spread variations.", typical: "0.5 - 2.0", recommended: "1.0" },
  liquidityFactorBase: { desc: "The foundational constant used to normalize real-time order book liquidity against the historical expected baseline.", typical: "0.5 - 2.0", recommended: "1.0" },
  liquidityFactorScale: { desc: "Controls how aggressively the execution speed scales in direct response to abnormal spikes or drops in order book depth.", typical: "0.5 - 2.0", recommended: "1.0" },
  deficitPressureScale: { desc: "Determines how aggressively the engine tries to catch up when it falls behind the optimal VWAP execution schedule.", typical: "0.5 - 2.0", recommended: "1.0" },
  deficitFracClamp: { desc: "The absolute maximum fraction of the remaining unfilled quantity that can be executed in a single catch-up block.", typical: "0.1 - 0.8", recommended: "0.5" },
  binSmoothingWindow: { desc: "The moving average window size applied to smooth historical volume bins and remove anomalous volume spikes.", typical: "1 - 5", recommended: "3" },
  minSpacingDenominator: { desc: "Controls the minimum required temporal spacing between discrete child orders within a single trading bin.", typical: "2 - 10", recommended: "4" },
  strongSignalThreshold: { desc: "The confidence threshold required for the engine to classify a micro-trend signal as definitively 'strong'.", typical: "0.5 - 0.9", recommended: "0.7" },
  refinementPasses: { desc: "The number of iterative mathematical optimization passes run during pretrade calibration to finalize the volume curve.", typical: "1 - 5", recommended: "2" },
};

const FIELD_STEP = (key: ParamKey) => (INTEGER_FIELDS.has(key) ? 1 : 0.001);

const EMPTY_PARAMS: RuntimeTuningParams = {
  lambdaMultiplier: 1.0,
  adjustmentClampLo: -0.15,
  adjustmentClampHi: 0.15,
  rawTrendWeightGap: 0.33,
  rawTrendWeightConsistency: 0.33,
  rawTrendWeightReturn: 0.34,
  ewmaFastOldWeight: 0.9,
  ewmaSlowOldWeight: 0.95,
  upTrendScoreThreshold: 0.25,
  upTrendConsecBars: 3,
  downTrendScoreThreshold: -0.25,
  downTrendConsecBars: 3,
  maxTrendAccel: 0.15,
  minTrendAccel: -0.15,
  trendAccelScaleUp: 1.0,
  trendAccelScaleDown: 1.0,
  intradayAlphaEwmaOldWeight: 0.95,
  barStructAlpha: 0.5,
  scaleFactorHi: 1.2,
  scaleFactorLo: 0.8,
  executionScoreHistWeight: 0.5,
  lambdaClampLo: 5.0,
  lambdaClampHi: 50.0,
  priceEdgeExponent: 1.0,
  liquidityFactorBase: 1.0,
  liquidityFactorScale: 1.0,
  deficitPressureScale: 1.0,
  deficitFracClamp: 0.5,
  binSmoothingWindow: 3,
  minSpacingDenominator: 4,
  strongSignalThreshold: 0.7,
  refinementPasses: 2,
};

function buildKey(clientId: string, instrumentKey: string) {
  return `${clientId}::${instrumentKey}`;
}

function formatVal(key: ParamKey, val: number | undefined): string {
  if (val === undefined || val === null) return "";
  if (INTEGER_FIELDS.has(key)) return String(val);
  return String(val);
}

export default function RuntimeTuningPanel({
  clientId,
  instrumentKey,
  selectedTuningProfile,
}: RuntimeTuningPanelProps) {
  const [params, setParams] = useState<RuntimeTuningParams>({
    ...EMPTY_PARAMS,
  });
  const [serverParams, setServerParams] = useState<RuntimeTuningParams | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [diffData, setDiffData] = useState<Record<
    string,
    { current: number; default: number }
  > | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(PARAM_GROUPS.map((g) => [g.label, false])),
  );
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const tuningKey =
    clientId && instrumentKey ? buildKey(clientId, instrumentKey) : null;

  const loadTuning = useCallback(async () => {
    if (!tuningKey) return;
    setLoading(true);
    try {
      const data = await vwapServerService.getTuningKey(tuningKey);
      setParams(data);
      setServerParams(data);
      setLastSynced(new Date());
    } catch {
      // Key may not exist yet — keep defaults
    } finally {
      setLoading(false);
    }
  }, [tuningKey]);

  useEffect(() => {
    loadTuning();
  }, [loadTuning]);

  // Preload from selected tuning profile
  useEffect(() => {
    if (!selectedTuningProfile?.id) return;
    const preloaded: RuntimeTuningParams = {};
    (Object.keys(EMPTY_PARAMS) as ParamKey[]).forEach((k) => {
      const v = (selectedTuningProfile as any)[k];
      if (v !== undefined && v !== null) (preloaded as any)[k] = v;
    });
    setParams((prev) => ({ ...prev, ...preloaded }));
    toast.info(`Loaded profile: ${selectedTuningProfile.profileName}`);
  }, [selectedTuningProfile]);

  const handleParamChange = (key: ParamKey, val: string) => {
    const parsed = INTEGER_FIELDS.has(key)
      ? parseInt(val, 10)
      : parseFloat(val);
    setParams((prev) => ({
      ...prev,
      [key]: isNaN(parsed) ? prev[key] : parsed,
    }));
  };

  const handleApply = async () => {
    if (!tuningKey) return toast.error("Select a client and instrument first");
    setApplying(true);
    try {
      const updated = await vwapServerService.updateTuning(tuningKey, params);
      setParams(updated);
      setServerParams(updated);
      setLastSynced(new Date());
      toast.success("Tuning applied to live strategy");
    } catch (e: any) {
      const msg = e?.message?.includes("400")
        ? "Validation error — check param constraints"
        : "Failed to apply tuning";
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  };

  const handleReset = async () => {
    if (!tuningKey) return toast.error("Select a client and instrument first");
    setResetting(true);
    try {
      const reset = await vwapServerService.resetTuning(tuningKey);
      setParams(reset);
      setServerParams(reset);
      setLastSynced(new Date());
      toast.success("Reset to factory defaults");
    } catch {
      toast.error("Failed to reset tuning");
    } finally {
      setResetting(false);
    }
  };

  const handleShowDiff = async () => {
    if (!tuningKey) return toast.error("Select a client and instrument first");
    try {
      const res = (await vwapServerService.getTuningDiff(tuningKey)) as any;
      // Backend returns { key, overrideCount, overrides }
      const overrides = res?.overrides ?? res;
      setDiffData(overrides);
      setShowDiff(true);
    } catch {
      toast.error("Failed to fetch diff");
    }
  };

  const toggleGroup = (label: string) =>
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  // Determine if a param has been locally changed vs server
  const isDirty = (key: ParamKey): boolean => {
    if (!serverParams) return false;
    const local = (params as any)[key];
    const server = (serverParams as any)[key];
    if (local === undefined || server === undefined) return false;
    return Math.abs(local - server) > 1e-9;
  };

  const totalDirty = (Object.keys(EMPTY_PARAMS) as ParamKey[]).filter(
    isDirty,
  ).length;
  const noContext = !clientId || !instrumentKey;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Status bar */}
      <div className="px-3 pt-3 pb-2 space-y-2">
        {noContext && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/8 border border-amber-500/20 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <p className="text-[10px] text-amber-400 font-medium">
              Select a client and instrument to tune
            </p>
          </div>
        )}
        {/* Dirty indicator */}
        {totalDirty > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 border border-primary/15 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] text-primary font-medium">
              {totalDirty} unsaved change{totalDirty > 1 ? "s" : ""} — press
              Apply to push live
            </p>
          </div>
        )}
      </div>

      {/* Action toolbar */}
      <div className="flex items-center gap-1.5 px-3 pb-2.5">
        <button
          onClick={handleApply}
          disabled={noContext || applying}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40",
            totalDirty > 0
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90"
              : "bg-primary/80 text-primary-foreground hover:bg-primary/90",
          )}
        >
          {applying ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          Apply
        </button>
        <button
          onClick={handleReset}
          disabled={noContext || resetting}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-secondary/40 text-foreground/80 border border-border/60 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/70 transition-all disabled:opacity-40"
        >
          {resetting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RotateCcw className="w-3 h-3" />
          )}
          Reset
        </button>
        <button
          onClick={handleShowDiff}
          disabled={noContext}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-secondary/40 text-foreground/80 border border-border/60 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/70 transition-all disabled:opacity-40"
        >
          <Diff className="w-3 h-3" />
          Diff
        </button>
        <button
          onClick={loadTuning}
          disabled={noContext || loading}
          className="p-1.5 bg-secondary/40 border border-border/60 rounded-md hover:bg-secondary/70 transition-all disabled:opacity-40"
          title="Reload from server"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Parameter groups */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {loading && !noContext ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
              Loading params…
            </p>
          </div>
        ) : (
          PARAM_GROUPS.map((group) => {
            const dirtyCount = group.fields.filter(isDirty).length;
            return (
              <div
                key={group.label}
                className="border border-border/50 rounded-lg overflow-hidden bg-card/40 backdrop-blur-sm"
              >
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-secondary/15 hover:bg-secondary/30 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn("w-1.5 h-1.5 rounded-full", group.dot)}
                    />
                    <div className="relative group/header flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          group.accent,
                        )}
                      >
                        {group.label}
                      </span>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/40 cursor-help" />
                      
                      {/* Group Tooltip */}
                      <div className="absolute left-0 top-full mt-2 w-56 bg-slate-100 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded-lg shadow-xl p-2.5 opacity-0 invisible group-hover/header:opacity-100 group-hover/header:visible transition-all z-50 pointer-events-none">
                        <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed text-left normal-case tracking-normal">
                          {group.desc}
                        </p>
                      </div>
                    </div>
                    
                    <span className="text-[9px] text-muted-foreground/40 ml-1">
                      {group.fields.length}
                    </span>
                    {dirtyCount > 0 && (
                      <span className="px-1 py-px text-[8px] font-bold bg-primary/10 text-primary rounded-sm ml-1">
                        {dirtyCount}✦
                      </span>
                    )}
                  </div>
                  {expandedGroups[group.label] ? (
                    <ChevronUp className="w-3 h-3 text-muted-foreground/50" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                  )}
                </button>

                {expandedGroups[group.label] && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 p-2 bg-background">
                    {group.fields.map((field) => {
                      const dirty = isDirty(field);

                      return (
                        <div
                          key={field}
                          className={cn(
                            "rounded-md border transition-all min-w-0 relative group/field hover:z-50",
                            dirty
                              ? "border-primary/30 bg-primary/5"
                              : "border-border/40 bg-secondary/10 hover:bg-secondary/20",
                          )}
                        >
                          <div className="flex flex-col gap-2 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-1.5 min-w-0">
                                {dirty && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                                )}
                                <label
                                  className={cn(
                                    "text-[10px] font-bold leading-tight cursor-help",
                                    dirty
                                      ? "text-primary"
                                      : "text-foreground",
                                  )}
                                  title={field}
                                >
                                  {camelToTitle(field)}
                                </label>
                                <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help flex-shrink-0" />
                              </div>
                              <div className="text-[9px] font-mono text-muted-foreground/60 flex-shrink-0">
                                step: {FIELD_STEP(field)}
                              </div>
                            </div>

                            <input
                              type="number"
                              step={FIELD_STEP(field)}
                              value={formatVal(field, (params as any)[field])}
                              onChange={(e) =>
                                handleParamChange(field, e.target.value)
                              }
                              disabled={noContext}
                              className={cn(
                                "w-full rounded-md border px-2.5 py-1.5 bg-background text-[11px] font-bold font-mono text-right outline-none transition-all shadow-sm",
                                "focus:ring-2 focus:ring-primary/40 focus:border-primary",
                                dirty
                                  ? "border-primary/60 text-primary bg-primary/5"
                                  : "border-border/80 text-foreground",
                                "disabled:opacity-30",
                              )}
                            />

                            {/* Tooltip */}
                            <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-50 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded-lg shadow-2xl p-3 opacity-0 invisible group-hover/field:opacity-100 group-hover/field:visible transition-all z-30 pointer-events-none">
                              <p className="text-xs text-slate-900 dark:text-slate-100 font-bold mb-1 leading-tight">{camelToTitle(field)}</p>
                              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-2.5">{PARAM_METADATA[field]?.desc || "No description available."}</p>
                              <div className="flex justify-between text-[9px] mt-1 text-slate-600 dark:text-slate-400 font-semibold">
                                <span>Typical Range:</span>
                                <span className="font-mono text-slate-800 dark:text-slate-200">{PARAM_METADATA[field]?.typical || "-"}</span>
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                                <span>Recommended:</span>
                                <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">{PARAM_METADATA[field]?.recommended || "-"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Diff modal */}
      {showDiff && diffData !== null && (
        <div
          className="absolute inset-0 z-20 flex items-end justify-stretch bg-background/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowDiff(false)}
        >
          <div className="w-full bg-card border-t border-border shadow-xl animate-in slide-in-from-bottom-4 duration-200 max-h-[70%] flex flex-col rounded-t-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Diff className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Live Diff
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">
                  vs factory defaults
                </span>
                {Object.keys(diffData).length > 0 && (
                  <span className="px-1.5 py-px text-[9px] font-bold bg-primary/10 text-primary rounded-sm">
                    {Object.keys(diffData).length} override
                    {Object.keys(diffData).length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowDiff(false)}
                className="p-1.5 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {Object.keys(diffData).length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    All params at factory defaults
                  </p>
                </div>
              ) : (
                Object.entries(diffData).map(([key, val]: [string, any]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-secondary/20 rounded-md transition-colors"
                  >
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {key}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-muted-foreground/50 line-through">
                        {typeof val?.default === "number"
                          ? val.default.toFixed(4)
                          : (val?.default ?? "—")}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        {typeof val?.current === "number"
                          ? val.current.toFixed(4)
                          : (val?.current ?? val)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
