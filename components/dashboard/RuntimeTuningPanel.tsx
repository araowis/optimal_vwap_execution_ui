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

const INTEGER_FIELDS = new Set<ParamKey>([
  "upTrendConsecBars",
  "downTrendConsecBars",
  "refinementPasses",
  "binSmoothingWindow",
  "minSpacingDenominator",
]);

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
        {noContext ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/8 border border-amber-500/20 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <p className="text-[10px] text-amber-400 font-medium">
              Select a client and instrument to tune
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-secondary/30 rounded-md border border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  loading ? "bg-amber-400 animate-pulse" : "bg-emerald-400",
                )}
              />
              <p
                className="text-[10px] font-mono text-muted-foreground truncate"
                title={tuningKey!}
              >
                <span className="text-foreground/60">key:</span> {tuningKey}
              </p>
            </div>
            {lastSynced && (
              <p className="text-[9px] text-muted-foreground/50 flex-shrink-0 ml-2">
                {lastSynced.toLocaleTimeString("en", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            )}
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
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        group.accent,
                      )}
                    >
                      {group.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground/40">
                      {group.fields.length}
                    </span>
                    {dirtyCount > 0 && (
                      <span className="px-1 py-px text-[8px] font-bold bg-primary/10 text-primary rounded-sm">
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
                            "rounded-md border transition-all min-w-0",
                            dirty
                              ? "border-primary/30 bg-primary/5"
                              : "border-border/40 bg-secondary/10 hover:bg-secondary/20",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3 p-2">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              {dirty && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                              )}

                              <div className="min-w-0 flex-1">
                                <label
                                  className={cn(
                                    "block text-[10px] font-mono break-all leading-tight",
                                    dirty
                                      ? "text-foreground"
                                      : "text-muted-foreground/80",
                                  )}
                                  title={field}
                                >
                                  {field}
                                </label>

                                <div className="mt-1 text-[9px] text-muted-foreground/40">
                                  step {FIELD_STEP(field)}
                                </div>
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
                                "w-24 shrink-0 rounded-md border px-2 py-1 bg-background text-[10px] font-mono text-right outline-none transition-all",
                                "focus:ring-1 focus:ring-primary/30",
                                dirty
                                  ? "border-primary/40 text-primary"
                                  : "border-border/50 text-foreground",
                                "disabled:opacity-30",
                              )}
                            />
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
