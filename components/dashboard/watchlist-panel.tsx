"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Pencil,
  Trash2
} from "lucide-react";

import {
  ChevronDown,
  ChevronRight,
  Layers3,
  CheckCircle2,
  Circle,
} from "lucide-react";

import { useWatchlistStore } from "@/stores/watchlist-store";
import { removeInstrument, createWatchlist, renameWatchlist, deleteWatchlist} from "@/lib/watchlist-service";

interface WatchlistPanelProps {
  clientId: string;

  onSelectStock: (stock: any) => void;
}

export default function WatchlistPanel({
  clientId,
  onSelectStock,
}: WatchlistPanelProps) {
  const [
  editingWatchlistId,
  setEditingWatchlistId,
] = useState<string | null>(
  null
);

const [
  editingName,
  setEditingName,
] = useState("");
  const {
    watchlists,
    loading,
    error,
    fetchWatchlists,
  } = useWatchlistStore();

  const [expandedWatchlist, setExpandedWatchlist] =
    useState<string | null>(null);

  const [
  creatingWatchlist,
  setCreatingWatchlist,
] = useState(false);

const [
  newWatchlistName,
  setNewWatchlistName,
] = useState("");

  useEffect(() => {
    if (clientId) {
      fetchWatchlists(clientId);
    }
  }, [clientId, fetchWatchlists]);

  const handleDeleteWatchlist =
  async (
    watchlistId: string
  ) => {
    try {
      await deleteWatchlist(
        clientId,
        watchlistId
      );

      if (
        expandedWatchlist ===
        watchlistId
      ) {
        setExpandedWatchlist(
          null
        );
      }

      await fetchWatchlists(
        clientId
      );

    } catch (error) {
      console.error(
        "Failed to delete watchlist",
        error
      );
    }
  };

  const handleRemoveInstrument =
  async (
    watchlistId: string,
    instrumentKey: string
  ) => {
    try {
      await removeInstrument(
        clientId,
        watchlistId,
        instrumentKey
      );

      await fetchWatchlists(clientId);
    } catch (error) {
      console.error(
        "Failed to remove instrument",
        error
      );
    }
  };

  const handleRenameWatchlist =
  async (
    watchlistId: string
  ) => {
    if (!editingName.trim())
      return;

    try {
      await renameWatchlist(
        clientId,
        watchlistId,
        {
          name:
            editingName.trim(),
        }
      );

      setEditingWatchlistId(
        null
      );

      setEditingName("");

      await fetchWatchlists(
        clientId
      );

    } catch (error) {
      console.error(
        "Failed to rename watchlist",
        error
      );
    }
  };

  const handleCreateWatchlist =
  async () => {
    if (!newWatchlistName.trim())
      return;

    try {
      await createWatchlist(
        clientId,
        {
          name:
            newWatchlistName.trim(),
        }
      );

      setNewWatchlistName("");

      setCreatingWatchlist(false);

      await fetchWatchlists(
        clientId
      );

    } catch (error) {
      console.error(
        "Failed to create watchlist",
        error
      );
    }
  };

  return (
    <div className="border-b border-border p-3">
      {/* Header */}
<div className="mb-3 space-y-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Layers3 className="w-4 h-4 text-primary" />

      <p className="text-sm font-medium">
        Watchlists
      </p>
    </div>

    <button
      type="button"
      onClick={() =>
        setCreatingWatchlist(
          !creatingWatchlist
        )
      }
      className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary/70/50 transition-colors"
    >
      + New
    </button>
  </div>

  {creatingWatchlist && (
    <div className="flex gap-2">
      <input
        type="text"
        value={newWatchlistName}
        onChange={(e) =>
          setNewWatchlistName(
            e.target.value
          )
        }
        placeholder="Watchlist name"
        className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
      />

      <button
        type="button"
        onClick={
          handleCreateWatchlist
        }
        className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
      >
        Create
      </button>
    </div>
  )}
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
              
              <div
  className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/70/50 transition-colors"
>
                <div className="flex items-center gap-2 min-w-0">
                  <button
  type="button"
  onClick={() =>
    setExpandedWatchlist(
      isExpanded
        ? null
        : watchlist.watchlistId
    )
  }
  className="flex items-center justify-center"
>
  {isExpanded ? (
    <ChevronDown className="w-4 h-4 text-muted-foreground" />
  ) : (
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  )}
</button>

                  {editingWatchlistId ===
watchlist.watchlistId ? (
  <div className="flex items-center gap-2 flex-1 pr-2 min-w-0">
    <input
      type="text"
      value={editingName}
      onChange={(e) =>
        setEditingName(
          e.target.value
        )
      }
      className="h-8 flex-1 min-w-0 px-3 text-sm border border-border rounded-md bg-background"
    />

    <button
      type="button"
      onClick={() =>
        handleRenameWatchlist(
          watchlist.watchlistId
        )
      }
      className="h-8 px-3 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
    >
      <Check className="w-4 h-4" />
    </button>
  </div>
) : (
  <div className="flex items-center flex-1 min-w-0">
<div className="flex items-center gap-2">
  <span className="font-medium">
    {watchlist.name}
  </span>

  {/* Rename */}
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();

      setEditingWatchlistId(
        watchlist.watchlistId
      );

      setEditingName(
        watchlist.name
      );
    }}
    className="text-muted-foreground hover:text-foreground transition-colors"
  >
    <Pencil className="w-3.5 h-3.5" />
  </button>

  {/* Delete */}
  <button
    type="button"
    onClick={async (e) => {
      e.stopPropagation();

      const confirmed =
        window.confirm(
          `Delete "${watchlist.name}"?`
        );

      if (!confirmed) return;

      await handleDeleteWatchlist(
        watchlist.watchlistId
      );
    }}
    className="text-muted-foreground hover:text-red-500 transition-colors"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
</div>
  </div>
)}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
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
              </div>

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
    instrument.tradingSymbol ||
    instrument.instrumentKey.split("|")[1],

  name:
    instrument.name ||
    instrument.tradingSymbol ||
    instrument.instrumentKey,
})
                          }
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/70 transition-colors text-left"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
  {
    instrument.tradingSymbol ||
    instrument.name ||
    instrument.instrumentKey.split(
      "|"
    )[1]
  }
</span>

                            <span className="text-[10px] text-muted-foreground truncate">
  {
    instrument.name &&
    instrument.name !==
      instrument.tradingSymbol
      ? instrument.name
      : instrument.instrumentKey
  }
</span>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
  {instrument.isCalibrated ? (
    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
  ) : (
    <Circle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
  )}

  <button
    type="button"
    onClick={async (e) => {
      e.stopPropagation();

      await handleRemoveInstrument(
        watchlist.watchlistId,
        instrument.instrumentKey
      );
    }}
    className="text-muted-foreground hover:text-red-500 transition-colors"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
</div>
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