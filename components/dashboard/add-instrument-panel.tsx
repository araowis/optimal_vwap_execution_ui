"use client";

import { useEffect, useRef, useState } from "react";

import {
  Plus,
  Search,
} from "lucide-react";

import { addInstrument } from "@/lib/watchlist-service";

import { Watchlist } from "@/lib/watchlist-types";

interface AddInstrumentPanelProps {
  clientId: string;

  watchlists: Watchlist[];

  onInstrumentAdded?: () => void;
}

export default function AddInstrumentPanel({
  clientId,
  watchlists,
  onInstrumentAdded,
}: AddInstrumentPanelProps) {
  const [query, setQuery] = useState("");

  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [showSuggestions, setShowSuggestions] =
    useState(false);

  const [selectedWatchlistId, setSelectedWatchlistId] =
    useState("");

  const [loading, setLoading] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(
    null
  );

  useEffect(() => {
    if (
      !selectedWatchlistId &&
      watchlists.length > 0
    ) {
      setSelectedWatchlistId(
        watchlists[0].watchlistId
      );
    }
  }, [watchlists, selectedWatchlistId]);

  const searchInstrument = async (
    value: string
  ) => {
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/upstox/instruments/search?query=${encodeURIComponent(
          value
        )}&exchange=NSE&segment=EQ`
      );

      const result = await response.json();

      const rawItems = Array.isArray(result.data)
        ? result.data
        : result.data?.data;

      if (rawItems && Array.isArray(rawItems)) {
        setSuggestions(rawItems.slice(0, 10));
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error(
        "Instrument search failed",
        error
      );
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      searchInstrument(value);
    }, 300);
  };

  const handleAddInstrument = async (
    instrument: any
  ) => {
    if (!selectedWatchlistId) return;

    try {
      setLoading(true);

      await addInstrument(
        clientId,
        selectedWatchlistId,
        {
          instrumentKey:
            instrument.instrument_key,

          tradingSymbol:
            instrument.trading_symbol,

          name: instrument.name,

          exchange: instrument.exchange,

          instrumentType:
            instrument.instrument_type,

          lotSize: String(
            instrument.lot_size || "1"
          ),

          upsertIfAbsent: true,
        }
      );

      setQuery("");

      setSuggestions([]);

      setShowSuggestions(false);

      if (onInstrumentAdded) {
        onInstrumentAdded();
      }
    } catch (error) {
      console.error(
        "Failed to add instrument",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-border p-3">
      <h2 className="text-sm font-semibold mb-3">
        Add Instrument
      </h2>

      {/* Watchlist Select */}
      <div className="mb-3">
        <label className="text-xs text-muted-foreground block mb-1">
          Target Watchlist
        </label>

        <select
          value={selectedWatchlistId}
          onChange={(e) =>
            setSelectedWatchlistId(
              e.target.value
            )
          }
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
        >
          {watchlists.map((watchlist) => (
            <option
              key={watchlist.watchlistId}
              value={watchlist.watchlistId}
            >
              {watchlist.name}
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <label className="text-xs text-muted-foreground block mb-1">
          Search Instrument
        </label>

        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />

          <input
            type="text"
            value={query}
            onChange={(e) =>
              handleQueryChange(
                e.target.value
              )
            }
            placeholder="RELIANCE, HDFC..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-border rounded-md bg-background"
          />
        </div>

        {/* Suggestions */}
        {showSuggestions &&
          suggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {suggestions.map(
                (instrument, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      handleAddInstrument(
                        instrument
                      )
                    }
                    disabled={loading}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary text-left transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {
                          instrument.trading_symbol
                        }
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {instrument.name}
                      </span>
                    </div>

                    <Plus className="w-4 h-4 text-primary" />
                  </button>
                )
              )}
            </div>
          )}
      </div>
    </div>
  );
}