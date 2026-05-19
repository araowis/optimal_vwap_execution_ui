"use client";

import { useEffect, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  Layers3,
  CheckCircle2,
  Circle,
} from "lucide-react";

import { useWatchlistStore } from "@/stores/watchlist-store";

interface WatchlistPanelProps {
  clientId: string;

  onSelectStock: (stock: any) => void;
}

export default function WatchlistPanel({
  clientId,
  onSelectStock,
}: WatchlistPanelProps) {
  const {
    watchlists,
    loading,
    error,
    fetchWatchlists,
  } = useWatchlistStore();

  const [expandedWatchlist, setExpandedWatchlist] =
    useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      fetchWatchlists(clientId);
    }
  }, [clientId, fetchWatchlists]);

  return (
    <div className="border-b border-border p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Layers3 className="w-4 h-4 text-primary" />

        <h2 className="text-sm font-semibold text-foreground">
          Watchlists
        </h2>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-xs text-muted-foreground">
          Loading watchlists...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-500">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !error &&
        watchlists.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No watchlists found
          </div>
        )}

      {/* Watchlists */}
      <div className="space-y-2">
        {watchlists.map((watchlist) => {
          const isExpanded =
            expandedWatchlist === watchlist.watchlistId;

          return (
            <div
              key={watchlist.watchlistId}
              className="border border-border rounded-lg overflow-hidden"
            >
              {/* Watchlist Header */}
              <button
                onClick={() =>
                  setExpandedWatchlist(
                    isExpanded
                      ? null
                      : watchlist.watchlistId
                  )
                }
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}

                  <span className="text-sm font-medium truncate">
                    {watchlist.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Calibration */}
                  {watchlist.isFullyCalibrated ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-yellow-500" />
                  )}

                  {/* Count */}
                  <span className="text-xs text-muted-foreground">
                    {watchlist.size}
                  </span>
                </div>
              </button>

              {/* Instruments */}
              {isExpanded && (
                <div className="border-t border-border bg-secondary/20">
                  {watchlist.instruments.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No instruments
                    </div>
                  ) : (
                    watchlist.instruments.map(
                      (instrument) => (
                        <button
                          key={
                            instrument.instrumentKey
                          }
                          onClick={() =>
                            onSelectStock({
                              instrument_key:
                                instrument.instrumentKey,
                              trading_symbol:
                                instrument.instrumentKey.split(
                                  "|"
                                )[1],
                              name:
                                instrument.instrumentKey,
                            })
                          }
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary transition-colors text-left"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {
                                instrument.instrumentKey.split(
                                  "|"
                                )[1]
                              }
                            </span>

                            <span className="text-[10px] text-muted-foreground">
                              {
                                instrument.instrumentKey
                              }
                            </span>
                          </div>

                          {instrument.isCalibrated ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          )}
                        </button>
                      )
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}