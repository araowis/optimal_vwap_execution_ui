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
  /** tailwind text color for the group label */
  accent: string;
  /** tailwind bg color for the left-bar accent */
  bar: string;
  fields: ParamKey[];
}

const PARAM_GROUPS: ParamGroup[] = [
  {
    label: "Lambda",
    accent: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
    fields: ["lambdaMultiplier", "lambdaClampLo", "lambdaClampHi"],
  },
  {
    label: "Trend",
    accent: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
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
    accent: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
    fields: [
      "ewmaFastOldWeight",
      "ewmaSlowOldWeight",
      "intradayAlphaEwmaOldWeight",
    ],
  },
  {
    label: "Scaling",
    accent: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
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
    accent: "text-cyan-600 dark:text-cyan-400",
    bar: "bg-cyan-500",
    fields: [
      "liquidityFactorBase",
      "liquidityFactorScale",
      "deficitPressureScale",
      "deficitFracClamp",
    ],
  },
  {
    label: "Execution",
    accent: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    fields: [
      "executionScoreHistWeight",
      "priceEdgeExponent",
      "strongSignalThreshold",
    ],
  },
  {
    label: "Refinement",
    accent: "text-orange-600 dark:text-orange-400",
    bar: "bg-orange-500",
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

const PARAM_METADATA: Record<
  ParamKey,
  { desc: string; typical: string; recommended: string }
> = {
  lambdaMultiplier: { desc: "Dynamically scales urgency/aggression of trade execution to adapt to market volatility.", typical: "0.5 – 5.0", recommended: "1.0 – 2.0" },
  adjustmentClampLo: { desc: "Max % the engine can decelerate below the scheduled target. Safety floor.", typical: "-0.5 – 0.0", recommended: "-0.15" },
  adjustmentClampHi: { desc: "Max % the engine can accelerate above the scheduled target. Prevents over-execution.", typical: "0.0 – 0.5", recommended: "0.15" },
  rawTrendWeightGap: { desc: "How heavily overnight price gaps influence trend strength assessment.", typical: "0.1 – 0.5", recommended: "0.33" },
  rawTrendWeightConsistency: { desc: "Importance of consecutive directional movements when calculating trend score.", typical: "0.1 – 0.5", recommended: "0.33" },
  rawTrendWeightReturn: { desc: "Weighting for immediate historical return magnitudes when evaluating momentum.", typical: "0.1 – 0.5", recommended: "0.34" },
  ewmaFastOldWeight: { desc: "Decay factor for short-term EWMA tracking recent price volatility.", typical: "0.8 – 0.95", recommended: "0.9" },
  ewmaSlowOldWeight: { desc: "Decay factor for long-term EWMA tracking baseline market trends.", typical: "0.9 – 0.99", recommended: "0.95" },
  upTrendScoreThreshold: { desc: "Minimum trend score to officially switch into an UP regime.", typical: "0.1 – 0.5", recommended: "0.25" },
  upTrendConsecBars: { desc: "Consecutive positive signals required to validate an UP regime transition.", typical: "2 – 5", recommended: "3" },
  downTrendScoreThreshold: { desc: "Minimum negative trend score to switch into a DOWN regime.", typical: "-0.5 – -0.1", recommended: "-0.25" },
  downTrendConsecBars: { desc: "Consecutive negative signals required to validate a DOWN regime transition.", typical: "2 – 5", recommended: "3" },
  maxTrendAccel: { desc: "Caps positive execution acceleration during a favorable trend scenario.", typical: "0.05 – 0.3", recommended: "0.15" },
  minTrendAccel: { desc: "Caps negative execution deceleration during an unfavorable trend scenario.", typical: "-0.3 – -0.05", recommended: "-0.15" },
  trendAccelScaleUp: { desc: "Multiplier applied when scaling up execution speed on positive trends.", typical: "0.5 – 2.0", recommended: "1.0" },
  trendAccelScaleDown: { desc: "Multiplier applied when slowing execution speed on negative trends.", typical: "0.5 – 2.0", recommended: "1.0" },
  intradayAlphaEwmaOldWeight: { desc: "Memory decay for real-time intraday alpha vs arrival price.", typical: "0.9 – 0.99", recommended: "0.95" },
  barStructAlpha: { desc: "Assumed alpha from exploiting micro-structure within individual trading bars.", typical: "0.1 – 1.0", recommended: "0.5" },
  scaleFactorHi: { desc: "Aggressive pacing multiplier during high-confidence favorable conditions.", typical: "1.0 – 2.0", recommended: "1.2" },
  scaleFactorLo: { desc: "Passive pacing multiplier during unfavorable conditions or wide spreads.", typical: "0.1 – 1.0", recommended: "0.8" },
  executionScoreHistWeight: { desc: "Balance between historical backtest and real-time performance in scoring.", typical: "0.1 – 0.9", recommended: "0.5" },
  lambdaClampLo: { desc: "Absolute minimum boundary for dynamic Lambda to ensure baseline trading.", typical: "1.0 – 10.0", recommended: "5.0" },
  lambdaClampHi: { desc: "Absolute maximum boundary for dynamic Lambda to prevent hyper-aggressive sweeping.", typical: "20.0 – 100.0", recommended: "50.0" },
  priceEdgeExponent: { desc: "How aggressively the engine seeks price improvement over spread variations.", typical: "0.5 – 2.0", recommended: "1.0" },
  liquidityFactorBase: { desc: "Foundational constant normalizing real-time order book liquidity vs historical baseline.", typical: "0.5 – 2.0", recommended: "1.0" },
  liquidityFactorScale: { desc: "How aggressively execution speed scales in response to order book depth changes.", typical: "0.5 – 2.0", recommended: "1.0" },
  deficitPressureScale: { desc: "Aggressiveness of catch-up when falling behind the optimal VWAP schedule.", typical: "0.5 – 2.0", recommended: "1.0" },
  deficitFracClamp: { desc: "Max fraction of remaining quantity executable in a single catch-up block.", typical: "0.1 – 0.8", recommended: "0.5" },
  binSmoothingWindow: { desc: "Moving average window to smooth historical volume bins and remove spikes.", typical: "1 – 5", recommended: "3" },
  minSpacingDenominator: { desc: "Minimum temporal spacing between child orders within a single trading bin.", typical: "2 – 10", recommended: "4" },
  strongSignalThreshold: { desc: "Confidence threshold to classify a micro-trend signal as definitively strong.", typical: "0.5 – 0.9", recommended: "0.7" },
  refinementPasses: { desc: "Iterative optimization passes during pretrade calibration to finalize the volume curve.", typical: "1 – 5", recommended: "2" },
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
  return String(val);
}

export default function RuntimeTuningPanel({
  clientId,
  instrumentKey,
  selectedTuningProfile,
}: RuntimeTuningPanelProps) {
  const [params, setParams] = useState<RuntimeTuningParams>({ ...EMPTY_PARAMS });
  const [serverParams, setServerParams] = useState<RuntimeTuningParams | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [diffData, setDiffData] = useState<Record<string, { current: number; default: number }> | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(PARAM_GROUPS.map((g) => [g.label, false])),
  );
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const tuningKey = clientId && instrumentKey ? buildKey(clientId, instrumentKey) : null;

  const loadTuning = useCallback(async () => {
    if (!tuningKey) return;
    setLoading(true);
    try {
      const data = await vwapServerService.getTuningKey(tuningKey);
      setParams(data);
      setServerParams(data);
      setLastSynced(new Date());
    } catch {
      // Key may not exist — keep defaults
    } finally {
      setLoading(false);
    }
  }, [tuningKey]);

  useEffect(() => { loadTuning(); }, [loadTuning]);

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
    const parsed = INTEGER_FIELDS.has(key) ? parseInt(val, 10) : parseFloat(val);
    setParams((prev) => ({ ...prev, [key]: isNaN(parsed) ? prev[key] : parsed }));
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
      toast.error(e?.message?.includes("400") ? "Validation error — check param constraints" : "Failed to apply tuning");
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
      setDiffData(res?.overrides ?? res);
      setShowDiff(true);
    } catch {
      toast.error("Failed to fetch diff");
    }
  };

  const toggleGroup = (label: string) =>
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isDirty = (key: ParamKey): boolean => {
    if (!serverParams) return false;
    const local = (params as any)[key];
    const server = (serverParams as any)[key];
    if (local === undefined || server === undefined) return false;
    return Math.abs(local - server) > 1e-9;
  };

  const totalDirty = (Object.keys(EMPTY_PARAMS) as ParamKey[]).filter(isDirty).length;
  const noContext = !clientId || !instrumentKey;

  // Light-mode Kite palette via Tailwind semantic classes:
  // bg-white / bg-gray-50 / bg-gray-100  →  surfaces
  // border-gray-200 / border-gray-300    →  dividers
  // text-gray-900 / text-gray-600 / text-gray-400  →  text hierarchy
  // blue-600 for primary action (Kite's blue)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0e0f11] font-mono text-xs">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-[#1e2029] bg-white dark:bg-[#0e0f11]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 dark:text-[#5d6470]">
            Runtime Tuning
          </span>
          {lastSynced && (
            <span className="text-[9px] text-gray-400 dark:text-[#3d4250] tabular-nums">
              {lastSynced.toLocaleTimeString("en-IN", {
                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {totalDirty > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 tabular-nums">
              {totalDirty} pending
            </span>
          )}
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            noContext
              ? "bg-gray-300 dark:bg-[#3d4250]"
              : loading
              ? "bg-amber-400 animate-pulse"
              : "bg-emerald-500"
          )} />
        </div>
      </div>

      {/* ── No-context alert ── */}
      {noContext && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border-b border-amber-200 dark:bg-amber-500/5 dark:border-amber-500/15">
          <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <p className="text-[10px] text-amber-700 dark:text-amber-500/70 tracking-wide">
            Select client + instrument to activate
          </p>
        </div>
      )}

      {/* ── Dirty banner ── */}
      {totalDirty > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border-b border-blue-100 dark:bg-blue-500/5 dark:border-blue-500/10">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
          <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
            {totalDirty} unsaved change{totalDirty !== 1 ? "s" : ""} — press Apply to push live
          </p>
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 dark:border-[#1e2029]">
        {/* Apply */}
        <button
          onClick={handleApply}
          disabled={noContext || applying}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase transition-all disabled:opacity-40",
            totalDirty > 0
              ? "bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
              : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 dark:bg-[#1a1c22] dark:text-[#5d6470] dark:border-[#1e2029] dark:hover:border-[#2a2d38]"
          )}
        >
          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Apply
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          disabled={noContext || resetting}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-semibold tracking-[0.1em] uppercase hover:bg-gray-200 transition-all disabled:opacity-40 dark:bg-[#1a1c22] dark:text-[#5d6470] dark:border-[#1e2029] dark:hover:border-[#2a2d38] dark:hover:text-[#8892a0]"
        >
          {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          Reset
        </button>

        {/* Diff */}
        <button
          onClick={handleShowDiff}
          disabled={noContext}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-semibold tracking-[0.1em] uppercase hover:bg-gray-200 transition-all disabled:opacity-40 dark:bg-[#1a1c22] dark:text-[#5d6470] dark:border-[#1e2029] dark:hover:border-[#2a2d38] dark:hover:text-[#8892a0]"
        >
          <Diff className="w-3 h-3" />
          Diff
        </button>

        {/* Reload */}
        <button
          onClick={loadTuning}
          disabled={noContext || loading}
          title="Reload from server"
          className="p-1.5 bg-gray-100 border border-gray-200 text-gray-500 hover:bg-gray-200 transition-all disabled:opacity-40 dark:bg-[#1a1c22] dark:border-[#1e2029] dark:text-[#5d6470] dark:hover:border-[#2a2d38] dark:hover:text-[#8892a0]"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* ── Param groups ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0e0f11]">
        {loading && !noContext ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-[#3d4250]" />
            <p className="text-[9px] tracking-[0.15em] uppercase text-gray-400 dark:text-[#3d4250]">
              Fetching params…
            </p>
          </div>
        ) : (
          PARAM_GROUPS.map((group, gi) => {
            const dirtyCount = group.fields.filter(isDirty).length;
            const isOpen = expandedGroups[group.label];

            return (
              <div
                key={group.label}
                className={cn(
                  "border-b border-gray-200 dark:border-[#1e2029]",
                  gi === 0 && "border-t border-gray-200 dark:border-[#1e2029]"
                )}
              >
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 transition-colors text-left",
                    isOpen
                      ? "bg-gray-100 dark:bg-[#13151a]"
                      : "bg-white hover:bg-gray-50 dark:bg-[#0e0f11] dark:hover:bg-[#13151a]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-0.5 h-3.5 flex-shrink-0 rounded-full", group.bar)} />
                    <span className={cn("text-[10px] font-semibold tracking-[0.12em] uppercase", group.accent)}>
                      {group.label}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-[#3d4250] tabular-nums">
                      {group.fields.length}p
                    </span>
                    {dirtyCount > 0 && (
                      <span className="px-1 py-0.5 text-[8px] font-bold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 tabular-nums">
                        {dirtyCount}✦
                      </span>
                    )}
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-3 h-3 text-gray-400 dark:text-[#3d4250]" />
                    : <ChevronDown className="w-3 h-3 text-gray-400 dark:text-[#3d4250]" />
                  }
                </button>

                {/* Fields grid */}
                {isOpen && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 divide-y divide-gray-100 dark:divide-[#1a1c22] border-t border-gray-200 dark:border-[#1e2029] xl:divide-y-0 xl:gap-px xl:bg-gray-200 xl:dark:bg-[#1a1c22]">
                    {group.fields.map((field) => {
                      const dirty = isDirty(field);
                      const meta = PARAM_METADATA[field];

                      return (
                        <div
                          key={field}
                          className={cn(
                            "relative group/field p-2 transition-colors",
                            dirty
                              ? "bg-blue-50 dark:bg-[#0f1117]"
                              : "bg-white hover:bg-gray-50 dark:bg-[#0e0f11] dark:hover:bg-[#13151a]"
                          )}
                        >
                          {/* Dirty left bar */}
                          {dirty && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                          )}

                          {/* Label row */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1 min-w-0">
                              <label
                                className={cn(
                                  "text-[10px] leading-tight truncate cursor-default",
                                  dirty
                                    ? "text-blue-700 dark:text-blue-400"
                                    : "text-gray-700 dark:text-[#8892a0]"
                                )}
                                title={field}
                              >
                                {camelToTitle(field)}
                              </label>
                              <Info className="w-3 h-3 text-gray-300 dark:text-[#2a2d38] flex-shrink-0 cursor-help" />
                            </div>
                            <span className="text-[9px] text-gray-400 dark:text-[#3d4250] flex-shrink-0 tabular-nums">
                              ±{FIELD_STEP(field)}
                            </span>
                          </div>

                          {/* Number input */}
                          <input
                            type="number"
                            step={FIELD_STEP(field)}
                            value={formatVal(field, (params as any)[field])}
                            onChange={(e) => handleParamChange(field, e.target.value)}
                            disabled={noContext}
                            className={cn(
                              "w-full px-2 py-1 text-[11px] font-mono font-semibold text-right tabular-nums outline-none transition-all",
                              "border rounded-none",
                              dirty
                                ? "bg-blue-50 border-blue-300 text-blue-800 focus:border-blue-500 dark:bg-transparent dark:border-blue-500/40 dark:text-blue-300 dark:focus:border-blue-400"
                                : "bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300 focus:border-gray-400 dark:bg-[#1a1c22] dark:border-[#1e2029] dark:text-[#c9d1d9] dark:hover:border-[#2a2d38] dark:focus:border-[#3d4250]",
                              "disabled:opacity-30 disabled:cursor-not-allowed",
                              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            )}
                          />

                          {/* Tooltip — renders BELOW the field so it never clips at top */}
                          <div className="absolute left-0 top-full mt-1 w-64 z-50 opacity-0 invisible group-hover/field:opacity-100 group-hover/field:visible transition-all pointer-events-none">
                            <div className="bg-white border border-gray-200 shadow-lg p-3 dark:bg-[#1a1c22] dark:border-[#2a2d38] dark:shadow-2xl">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <div className={cn("w-0.5 h-3 flex-shrink-0 rounded-full", group.bar)} />
                                <p className="text-[10px] font-semibold text-gray-900 dark:text-[#c9d1d9] leading-tight">
                                  {camelToTitle(field)}
                                </p>
                              </div>
                              <p className="text-[9px] text-gray-500 dark:text-[#5d6470] leading-relaxed mb-2">
                                {meta?.desc ?? "No description."}
                              </p>
                              <div className="border-t border-gray-100 dark:border-[#1e2029] pt-1.5 space-y-0.5">
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-gray-400 dark:text-[#3d4250] uppercase tracking-wide">Typical</span>
                                  <span className="font-mono text-gray-600 dark:text-[#5d6470]">{meta?.typical ?? "—"}</span>
                                </div>
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-gray-400 dark:text-[#3d4250] uppercase tracking-wide">Rec.</span>
                                  <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{meta?.recommended ?? "—"}</span>
                                </div>
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

      {/* ── Diff modal ── */}
      {showDiff && diffData !== null && (
        <div
          className="absolute inset-0 z-20 flex items-end bg-black/30 dark:bg-black/70"
          onClick={(e) => e.target === e.currentTarget && setShowDiff(false)}
        >
          <div className="w-full bg-white dark:bg-[#0e0f11] border-t border-gray-200 dark:border-[#2a2d38] shadow-2xl max-h-[70%] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-[#1e2029]">
              <div className="flex items-center gap-2">
                <Diff className="w-3 h-3 text-gray-500 dark:text-[#5d6470]" />
                <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-700 dark:text-[#8892a0]">
                  Live Diff
                </span>
                <span className="text-[9px] text-gray-400 dark:text-[#3d4250]">vs factory defaults</span>
                {Object.keys(diffData).length > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 tabular-nums">
                    {Object.keys(diffData).length} override{Object.keys(diffData).length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowDiff(false)}
                className="text-gray-400 hover:text-gray-700 dark:text-[#3d4250] dark:hover:text-[#8892a0] transition-colors text-xs px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-[#1a1c22]"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto">
              {Object.keys(diffData).length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <Wifi className="w-4 h-4 text-emerald-500/50" />
                  <p className="text-[9px] tracking-[0.12em] uppercase text-gray-400 dark:text-[#3d4250]">
                    All params at factory defaults
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-[#1e2029]">
                      <th className="px-3 py-1.5 text-left text-[9px] tracking-[0.12em] uppercase text-gray-400 dark:text-[#3d4250] font-normal">Param</th>
                      <th className="px-3 py-1.5 text-right text-[9px] tracking-[0.12em] uppercase text-gray-400 dark:text-[#3d4250] font-normal">Default</th>
                      <th className="px-3 py-1.5 text-right text-[9px] tracking-[0.12em] uppercase text-gray-400 dark:text-[#3d4250] font-normal">Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(diffData).map(([key, val]: [string, any]) => (
                      <tr
                        key={key}
                        className="border-b border-gray-50 hover:bg-gray-50 dark:border-[#1a1c22] dark:hover:bg-[#13151a] transition-colors"
                      >
                        <td className="px-3 py-1.5 text-[10px] font-mono text-gray-600 dark:text-[#5d6470]">{key}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono text-gray-400 dark:text-[#3d4250] line-through text-right tabular-nums">
                          {typeof val?.default === "number" ? val.default.toFixed(4) : (val?.default ?? "—")}
                        </td>
                        <td className="px-3 py-1.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right tabular-nums">
                          {typeof val?.current === "number" ? val.current.toFixed(4) : (val?.current ?? val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}