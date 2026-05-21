"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Calendar,
  ChevronDown,
  ChevronRight,
  Info,
  X,
  ShoppingCart,
} from "lucide-react";
import { StrategyParams } from "@/lib/types";
import { createPortal } from "react-dom";
import { toast } from "sonner";

// ── Field info descriptions ───────────────────────────────────────────────
const FIELD_INFO: Record<string, { title: string; description: string }> = {
  totalQuantity: {
    title: "Total Quantity",
    description:
      "The total number of shares/units to buy or sell across the entire execution window. The algorithm will distribute this quantity optimally across all time bins.",
  },
  numTranches: {
    title: "Bins (Tranches)",
    description:
      "The number of equal time intervals the trading session is divided into. More bins give finer granularity. For a 375-minute session, 375 bins = 1 bin per minute.",
  },
  lambda: {
    title: "Risk Aversion (λ)",
    description:
      "Controls the trade-off between execution speed and market impact. Higher λ (e.g. 17–20) favours faster execution to reduce timing risk. Lower λ spreads orders more evenly over time. Typical range: 0.1–25.",
  },
  trancheSize: {
    title: "Tranche Size",
    description:
      "Auto-calculated as Total Quantity ÷ Bins. This is the target quantity to execute in each individual time bin. You can manually override this value.",
  },
  startDate: {
    title: "Start Date",
    description:
      "The start date of the backtest period. Historical OHLCV data from Upstox will be fetched from this date. Must be a valid market trading day.",
  },
  endDate: {
    title: "End Date",
    description:
      "The end date of the backtest period. Data will be fetched up to and including this date. Ensure end date > start date.",
  },
};

// ── Tooltip component ──────────────────────────────────────────────────────
function InfoTooltip({ field }: { field: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; offsetPercent?: number } | null>(null);
  const info = FIELD_INFO[field];

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const buttonCenter = rect.left + rect.width / 2;
      const tooltipHalfWidth = 128; // 256 / 2
      let left = buttonCenter;
      let caretOffset = 50; // default 50% center

      // Check if it goes off-screen to the left
      if (buttonCenter - tooltipHalfWidth < 8) {
        left = tooltipHalfWidth + 8;
        const delta = left - buttonCenter;
        caretOffset = 50 - (delta / tooltipHalfWidth) * 50;
      } else {
        // Check if it goes off-screen to the right
        const viewportWidth = window.innerWidth;
        if (buttonCenter + tooltipHalfWidth > viewportWidth - 8) {
          left = viewportWidth - 8 - tooltipHalfWidth;
          const delta = left - buttonCenter;
          caretOffset = 50 - (delta / tooltipHalfWidth) * 50;
        }
      }

      setCoords({
        top: rect.top + window.scrollY,
        left: left,
        offsetPercent: caretOffset,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!info) return null;

  return (
    <div className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="ml-1 text-muted-foreground/60 hover:text-primary transition-colors focus:outline-none"
        title={info.title}
      >
        <Info className="w-3 h-3" />
      </button>

      {open && mounted && coords && createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
          className="z-[9999] w-64 bg-popover border border-border rounded-lg shadow-xl p-3"
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-xs font-semibold text-foreground">{info.title}</p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {info.description}
          </p>
          {/* Caret */}
          <div
            style={{ left: `${coords.offsetPercent ?? 50}%` }}
            className="absolute top-full -translate-x-1/2 w-2 h-2 bg-popover border-r border-b border-border rotate-45 -mt-1"
          />
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Field label with info ──────────────────────────────────────────────────
function FieldLabel({
  htmlFor,
  label,
  field,
}: {
  htmlFor?: string;
  label: string;
  field: string;
}) {
  return (
    <div className="flex items-center gap-0.5 mb-1">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-medium text-muted-foreground cursor-default"
      >
        {label}
      </label>
      <InfoTooltip field={field} />
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────
interface ParametersPanelProps {
  params: StrategyParams;
  onParamsChange: (params: StrategyParams) => void;
  onRunBacktest: (params: StrategyParams) => void;
  onRunRealtime?: (params: {
    totalQty: number;
    nBins: number;
    lambda: number;
  }) => void;
  isRunning: boolean;
  progress: number;
  message: string;
  onModeChange?: (mode: "backtest" | "realtime") => void;
  selectedInstrumentKey?: string | null;
  importContext?: {
    instrumentKey: string;
    instrumentName: string;
    startDate: string;
    endDate: string;
  } | null;
  clientId?: string;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ParametersPanel({
  params,
  onParamsChange,
  onRunBacktest,
  onRunRealtime,
  isRunning,
  progress,
  message,
  onModeChange,
  selectedInstrumentKey,
  importContext,
  clientId,
}: ParametersPanelProps) {
  const [localParams, setLocalParams] = useState<StrategyParams>(params);
  const [runMode, setRunMode] = useState<"backtest" | "realtime">("backtest");
  const [collapsed, setCollapsed] = useState(true); // collapsed by default

  const handleModeChange = (newMode: "backtest" | "realtime") => {
    setRunMode(newMode);
    onModeChange?.(newMode);
  };

  const handleChange = (field: keyof StrategyParams, value: any) => {
    const updated = { ...localParams, [field]: value };
    if (field === "totalQuantity" && localParams.numTranches > 0) {
      updated.trancheSize = Math.floor(value / localParams.numTranches);
    }
    if (field === "numTranches" && localParams.totalQuantity > 0) {
      updated.trancheSize = Math.floor(localParams.totalQuantity / value);
    }
    setLocalParams(updated);
    onParamsChange(updated);
  };

  const handleRunBacktest = () => onRunBacktest(localParams);

  const handleRunRealtime = () => {
    if (!clientId) {
      toast.error(
        <div className="space-y-1 text-left font-sans">
          <p className="font-bold text-xs">⚠️ CLIENT DEPENDENCY ERROR</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Realtime market execution and stock calibration require an active client account. 
            Risk profile parameters, capital allocations, and desk identifiers must be bound to a selected client before launching any live orders.
          </p>
          <p className="text-[10px] text-primary font-semibold">
            Action: Please select an existing client or click "Add New Client" in the top dashboard header.
          </p>
        </div>,
        { duration: 6000 }
      );
      return;
    }
    if (!selectedInstrumentKey) {
      toast.error(
        <div className="space-y-1 text-left font-sans">
          <p className="font-bold text-xs">⚠️ NO INSTRUMENT SELECTED</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Please click on a stock inside your watchlist group to target it for calibration and live trading.
          </p>
        </div>,
        { duration: 4000 }
      );
      return;
    }
    onRunRealtime?.({
      totalQty: localParams.totalQuantity,
      nBins: localParams.numTranches,
      lambda: localParams.lambda ?? 17.0,
    });
  };

  return (
    <div className="border-t border-border flex flex-col bg-card">
      {/* ── Section header (always visible) ───────────────────────────── */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground tracking-wide uppercase">
            Order Entry
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {/* ── Collapsible body ────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-3">


          {/* ── Realtime mode fields ───────────────────────────────────── */}
          {runMode === "realtime" ? (
            <div className="space-y-2.5">
              <div>
                <FieldLabel
                  htmlFor="rt-qty"
                  label="Total Quantity"
                  field="totalQuantity"
                />
                <input
                  id="rt-qty"
                  type="number"
                  value={localParams.totalQuantity}
                  onChange={(e) =>
                    handleChange("totalQuantity", parseInt(e.target.value) || 0)
                  }
                  className="w-full px-2.5 py-1.5 bg-background text-foreground border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel htmlFor="rt-bins" label="Bins" field="numTranches" />
                  <input
                    id="rt-bins"
                    type="number"
                    value={localParams.numTranches}
                    onChange={(e) =>
                      handleChange("numTranches", parseInt(e.target.value) || 1)
                    }
                    className="w-full px-2.5 py-1.5 bg-background text-foreground border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="rt-lambda" label="Risk Aversion (λ)" field="lambda" />
                  <input
                    id="rt-lambda"
                    type="number"
                    step="0.1"
                    value={localParams.lambda ?? 17.0}
                    onChange={(e) =>
                      handleChange("lambda", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-2.5 py-1.5 bg-background text-foreground border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {selectedInstrumentKey ? (
                <div className="p-2 bg-primary/5 border border-primary/20 rounded-md">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Selected</p>
                  <p className="text-xs font-semibold text-foreground break-all">
                    {selectedInstrumentKey}
                  </p>
                </div>
              ) : (
                <div className="p-2 bg-amber-500/5 border border-amber-500/25 rounded-md">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Select a stock from the watchlist to enable realtime execution
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ── Backtest mode fields ─────────────────────────────────── */
            <div className="space-y-2.5">
              {/* Execution group */}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Execution
              </p>

              <div>
                <FieldLabel htmlFor="bt-qty" label="Total Quantity" field="totalQuantity" />
                <input
                  id="bt-qty"
                  type="number"
                  value={localParams.totalQuantity}
                  onChange={(e) =>
                    handleChange("totalQuantity", parseInt(e.target.value) || 0)
                  }
                  className="w-full px-2.5 py-1.5 bg-background text-foreground border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel htmlFor="bt-bins" label="Bins" field="numTranches" />
                  <input
                    id="bt-bins"
                    type="number"
                    min={1}
                    value={localParams.numTranches}
                    onChange={(e) =>
                      handleChange("numTranches", parseInt(e.target.value) || 1)
                    }
                    className="w-full px-2.5 py-1.5 bg-background text-foreground border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="bt-lambda" label="Risk Aversion (λ)" field="lambda" />
                  <input
                    id="bt-lambda"
                    type="number"
                    step="0.1"
                    min={0}
                    value={localParams.lambda ?? 17.0}
                    onChange={(e) =>
                      handleChange("lambda", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-2.5 py-1.5 bg-background text-foreground border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <FieldLabel
                  htmlFor="bt-tranche"
                  label="Tranche Size"
                  field="trancheSize"
                />
                <input
                  id="bt-tranche"
                  type="number"
                  value={localParams.trancheSize}
                  onChange={(e) =>
                    handleChange("trancheSize", parseInt(e.target.value) || 0)
                  }
                  className="w-full px-2.5 py-1.5 bg-background text-foreground border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Backtest target */}
              <div className="pt-1 border-t border-border/60">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Backtest Target
                  </p>
                </div>
                {importContext?.instrumentKey ? (
                  <div className="p-2 bg-primary/5 border border-primary/20 rounded-md space-y-0.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {importContext.instrumentName}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {importContext.startDate} → {importContext.endDate}
                    </p>
                    <p className="text-[10px] text-primary font-medium">
                      From Import section ↑
                    </p>
                  </div>
                ) : (
                  <div className="p-2 bg-secondary/50 border border-dashed border-border rounded-md">
                    <p className="text-[11px] text-muted-foreground">
                      Select a stock and date range in{" "}
                      <strong className="text-foreground">Import from Upstox</strong>{" "}
                      above
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mode selector + Run button — always visible ─────────────────── */}
      <div className="px-3 py-3 border-t border-border mt-auto">
        {isRunning ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{message}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={runMode}
              onChange={(e) =>
                handleModeChange(e.target.value as "backtest" | "realtime")
              }
              className="px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm font-medium"
              disabled={isRunning}
            >
              <option value="backtest">Backtest</option>
              <option value="realtime">Realtime</option>
            </select>
            <button
              onClick={runMode === "realtime" ? handleRunRealtime : handleRunBacktest}
              disabled={runMode === "backtest" && !importContext?.instrumentKey}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${
                runMode === "realtime"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-foreground text-background"
              }`}
            >
              <Play className="w-4 h-4" />
              Run {runMode === "realtime" ? "Realtime" : "Backtest"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
