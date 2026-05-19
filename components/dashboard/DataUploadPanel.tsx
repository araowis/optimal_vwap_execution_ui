"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  AlertCircle,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { parseCSV, parseCSVStreaming } from "@/lib/data-parser";
import { Candle } from "@/lib/types";
import UpstoxConfigDialog from "./UpstoxConfigDialog";
import MarketDepth from "./MarketDepth";
import { vwapServerService } from "@/lib/vwap-server-service";

interface DataUploadPanelProps {
  onDataUpload: (data: Candle[], logo?: string, name?: string) => void;
  mode?: "backtest" | "realtime";
  onWatchlistStockSelect?: (stock: any) => void;
  onUpstoxTokenChange?: (token: string | null) => void;
  wsConnected?: boolean;
  /** Called when the import instrument/dates change in backtest mode */
  onImportContextChange?: (ctx: {
    instrumentKey: string;
    instrumentName: string;
    startDate: string;
    endDate: string;
  }) => void;
  watchlist?: any[];
  onWatchlistChange?: (watchlist: any[]) => void;
}

interface Instrument {
  instrumentKey: string;
  tradingSymbol: string;
  name: string;
  exchange: string;
  instrumentType: string;
  lotSize: string;
}

const highlightMatch = (text: string, query: string) => {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query})`, "gi");
  const parts = String(text).split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span
            key={i}
            className="text-primary bg-primary/20 rounded font-bold px-0.5 shadow-sm"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
};

export default function DataUploadPanel({
  onDataUpload,
  mode = "backtest",
  onWatchlistStockSelect,
  onUpstoxTokenChange,
  wsConnected = false,
  onImportContextChange,
  watchlist: propsWatchlist,
  onWatchlistChange,
}: DataUploadPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upstoxAccessToken, setUpstoxAccessToken] = useState<string | null>(
    null,
  );
  const [upstoxConnected, setUpstoxConnected] = useState(false);
  const [tokenValidating, setTokenValidating] = useState(false);

  // Upstox import state
  const [instrumentKey, setInstrumentKey] = useState("");
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState<any>(null);
  const [instrumentSuggestions, setInstrumentSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [interval, setIntervalValue] = useState("day");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Watchlist state for realtime mode
  const [localWatchlist, setLocalWatchlist] = useState<any[]>([]);
  const watchlist = propsWatchlist || localWatchlist;
  const setWatchlist = (newWatchlist: any[]) => {
    if (onWatchlistChange) onWatchlistChange(newWatchlist);
    else setLocalWatchlist(newWatchlist);
  };

  const [watchlistPrices, setWatchlistPrices] = useState<
    Record<string, { ltp: number; change: number; changePercent: number }>
  >({});
  const [selectedWatchlistStock, setSelectedWatchlistStock] =
    useState<any>(null);
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState("");
  const [watchlistSuggestions, setWatchlistSuggestions] = useState<any[]>([]);
  const [showWatchlistSuggestions, setShowWatchlistSuggestions] =
    useState(false);
  const watchlistSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const [calibratedInstruments, setCalibratedInstruments] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("upstox-access-token");
    if (saved) {
      validateToken(saved);
    }
  }, []);

  // Polling for watchlist prices in realtime mode
  useEffect(() => {
    if (mode !== "realtime" || !upstoxAccessToken || watchlist.length === 0) {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      return;
    }

    const fetchWatchlistPrices = async () => {
      if (!upstoxAccessToken || watchlist.length === 0) return;
      // Skip polling if WebSocket is connected (for realtime mode)
      if (mode === "realtime" && wsConnected) return;
      try {
        const keys = watchlist
          .map((item) => encodeURIComponent(item.instrument_key))
          .join(",");
        const response = await fetch(
          `/api/upstox/market-quote?instrument_key=${keys}&access_token=${encodeURIComponent(upstoxAccessToken)}`,
          { method: "GET" },
        );
        const result = await response.json();

        if (result.status === "success" && result.data) {
          const newPrices: Record<string, any> = {};
          // Map the returned data keys to the watchlist instrument keys
          watchlist.forEach((item) => {
            // Try to find matching data by checking all keys in the response
            const dataKey = Object.keys(result.data).find(
              (key) =>
                key.includes(item.trading_symbol) ||
                key.includes(item.instrument_key.split("|")[1]),
            );
            if (dataKey && result.data[dataKey]) {
              const data = result.data[dataKey];
              // Calculate percentage using net_change: Previous Close = last_price - net_change
              // % Change = (net_change / Previous Close) * 100
              const previousClose = data.last_price - data.net_change;
              const changePercent =
                previousClose !== 0
                  ? (data.net_change / previousClose) * 100
                  : 0;
              newPrices[item.instrument_key] = {
                ltp: data.last_price || 0,
                change: data.net_change || 0,
                changePercent: changePercent,
              };
            }
          });
          setWatchlistPrices(newPrices);
        } else {
        }
      } catch (e) {
        console.error("Failed to fetch watchlist prices:", e);
      }
    };

    // Initial fetch
    fetchWatchlistPrices();

    // Set up interval
    pollingIntervalRef.current = setInterval(fetchWatchlistPrices, 4000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [mode, upstoxAccessToken, watchlist, wsConnected]);

  // Fetch calibrated instruments from VWAP server
  useEffect(() => {
    const fetchCalibratedInstruments = async () => {
      try {
        const response = await vwapServerService.getInstruments();
        const instrumentKeys = new Set(
          response.instruments
            .filter((inst) => inst.sessionLive)
            .map((inst) => inst.instrumentKey),
        );
        setCalibratedInstruments(instrumentKeys);
      } catch (error) {
        console.error("Failed to fetch calibrated instruments:", error);
      }
    };

    fetchCalibratedInstruments();
    // Poll every 30 seconds for calibration status updates
    const interval = setInterval(fetchCalibratedInstruments, 30000);
    return () => clearInterval(interval);
  }, []);

  const validateToken = async (token: string) => {
    setTokenValidating(true);
    try {
      const response = await fetch("/api/upstox/health", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.ok) {
        setUpstoxAccessToken(token);
        setUpstoxConnected(true);
        localStorage.setItem("upstox-access-token", token);
        if (onUpstoxTokenChange) {
          onUpstoxTokenChange(token);
        }
      } else {
        localStorage.removeItem("upstox-access-token");
        setUpstoxAccessToken(null);
        setUpstoxConnected(false);
        if (onUpstoxTokenChange) {
          onUpstoxTokenChange(null);
        }
      }
    } catch (e) {
      localStorage.removeItem("upstox-access-token");
      setUpstoxAccessToken(null);
      setUpstoxConnected(false);
    } finally {
      setTokenValidating(false);
    }
  };

  const handleUpstoxConfigured = async (config: { accessToken: string }) => {
    setError(null);
    await validateToken(config.accessToken);
  };

  const loadInstrumentsData = async () => {
    // Not needed - we use API search
  };

  const handleSearch = async (query: string) => {
    if (!query || query.length < 2 || !upstoxAccessToken) {
      setInstrumentSuggestions([]);
      setShowSuggestions(false);
      return [];
    }

    try {
      const upstoxResponse = await fetch(
        `/api/upstox/instruments/search?query=${encodeURIComponent(query)}&exchange=NSE&segment=EQ`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${upstoxAccessToken}`,
          },
        },
      );
      const upstoxResult = await upstoxResponse.json();

      const rawItems = Array.isArray(upstoxResult.data)
        ? upstoxResult.data
        : upstoxResult.data?.data;

      if (upstoxResult.ok && rawItems && Array.isArray(rawItems)) {
        const instrumentsWithCompanyInfo = await Promise.all(
          rawItems.slice(0, 10).map(async (inst: any) => {
            try {
              let clearbitData = [];

              // Extract main brand name (first 1-2 words, removing common suffixes)
              const extractMainName = (name: string): string => {
                // Remove corporate suffixes and clean up
                const cleaned = name
                  .replace(
                    /\s+(LTD|LIMITED|LTD\.|PVT|PRIVATE|IND|INDUSTRIES|INFRA|INFRASTRUCTURE|CORP|CORPORATION|CO|COMPANY|SERVICES|HOLDINGS|INVESTMENTS|ENTERPRISES|TECHNOLOGIES|FINANCE|BANK|INSURANCE|CAPITAL|STEEL|POWER|ENERGY)$/gi,
                    "",
                  )
                  .trim();

                const words = cleaned.split(" ");
                // For long names, take first 2 words as the brand
                if (words.length > 2) {
                  return words.slice(0, 2).join(" ");
                }
                return cleaned;
              };

              const mainName = extractMainName(inst.name);
              const symbolOnly = inst.trading_symbol
                .split("-")[0]
                .split("_")[0]; // Remove segment/series suffixes
              const queries = [mainName, symbolOnly, inst.name].filter(Boolean);

              for (const query of queries) {
                try {
                  const clearbitResponse = await fetch(
                    `/api/clearbit/companies/suggest?query=${encodeURIComponent(query)}`,
                  );
                  const data = await clearbitResponse.json();

                  if (data && data.length > 0) {
                    clearbitData = data;
                    break;
                  }
                } catch (e) {}
              }

              if (clearbitData && clearbitData.length > 0) {
                return { ...inst, company: clearbitData[0] };
              } else {
                return inst;
              }
            } catch (clearbitError) {
              console.warn(
                "Clearbit search failed for",
                inst.name,
                ":",
                clearbitError,
              );
              return inst;
            }
          }),
        );
        setInstrumentSuggestions(instrumentsWithCompanyInfo);
        setShowSuggestions(true);
        return instrumentsWithCompanyInfo;
      } else {
        setInstrumentSuggestions([]);
        setShowSuggestions(false);
        return [];
      }
    } catch (e) {
      console.error("Instrument search failed:", e);
      setInstrumentSuggestions([]);
      setShowSuggestions(false);
      return [];
    }
  };

  const handleInstrumentQueryChange = (value: string) => {
    setInstrumentQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleWatchlistSearchChange = (value: string) => {
    setWatchlistSearchQuery(value);
    if (watchlistSearchTimeoutRef.current) {
      clearTimeout(watchlistSearchTimeoutRef.current);
    }
    watchlistSearchTimeoutRef.current = setTimeout(async () => {
      const results = await handleSearch(value);
      setWatchlistSuggestions(results);
      setShowWatchlistSuggestions(results.length > 0);
    }, 300);
  };

  const addToWatchlist = (instrument: any) => {
    if (
      !watchlist.find(
        (item) => item.instrument_key === instrument.instrument_key,
      )
    ) {
      setWatchlist([...watchlist, instrument]);
    }
    setWatchlistSearchQuery("");
    setWatchlistSuggestions([]);
    setShowWatchlistSuggestions(false);
  };

  const removeFromWatchlist = (instrumentKey: string) => {
    setWatchlist(
      watchlist.filter((item) => item.instrument_key !== instrumentKey),
    );
  };

  const handleSelectInstrument = (instrument: any) => {
    setInstrumentKey(instrument.instrument_key);
    setInstrumentQuery(instrument.trading_symbol);
    setSelectedInstrument(instrument);
    setShowSuggestions(false);
    // Propagate context up
    if (onImportContextChange) {
      onImportContextChange({
        instrumentKey: instrument.instrument_key,
        instrumentName: instrument.name || instrument.trading_symbol,
        startDate,
        endDate,
      });
    }
  };

  const handleImportFromUpstox = async () => {
    if (!instrumentKey || !startDate || !endDate || !upstoxAccessToken) {
      setError(
        "Please select instrument, configure Upstox, and choose date range",
      );
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setError("Start date must be before end date");
      return;
    }

    setImportModalOpen(true);
    setImportProgress(0);
    setLoading(true);
    setError(null);

    try {
      // Calculate the number of days
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      setImportProgress(5);

      // Generate array of dates
      const dates: Date[] = [];
      const currentDate = new Date(start);
      while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const allCandles: any[] = [];

      // Fetch data for each day
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const dateStr = date.toISOString().split("T")[0];
        const progress = 10 + (i / dates.length) * 70;
        setImportProgress(progress);

        try {
          const response = await fetch(
            `/api/upstox/historical-candle?instrumentKey=${encodeURIComponent(instrumentKey)}&interval=${interval}&toDate=${dateStr}&fromDate=${dateStr}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${upstoxAccessToken}`,
              },
            },
          );

          const result = await response.json();

          if (result.ok) {
            // Robust parsing for different possible Upstox response structures (v2/v3)
            const responseData = result.data || {};
            const candleList =
              responseData.data?.candles || responseData.candles || [];

            if (candleList.length > 0) {
              const dayCandles = candleList.map((candle: any) => ({
                timestamp: new Date(candle[0]),
                open: Number(candle[1]),
                high: Number(candle[2]),
                low: Number(candle[3]),
                close: Number(candle[4]),
                volume: Number(candle[5]),
                oi: Number(candle[6] || 0),
              }));
              allCandles.push(...dayCandles);
            } else {
            }
          } else {
          }
        } catch (dayError) {}
      }

      setImportProgress(85);

      if (allCandles.length === 0) {
        setError("No data found for the selected parameters");
        setImportModalOpen(false);
        return;
      }

      // Sort candles by timestamp
      allCandles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setImportProgress(95);

      const logo = selectedInstrument?.company?.domain
        ? `https://www.google.com/s2/favicons?domain=${selectedInstrument.company.domain}&sz=32`
        : "";
      const name = selectedInstrument?.name || instrumentQuery || instrumentKey;

      onDataUpload(allCandles, logo, name);
      setFileName(
        `${instrumentQuery || instrumentKey} (${startDate} to ${endDate})`,
      );

      setImportProgress(100);
      setTimeout(() => setImportModalOpen(false), 1000);
    } catch (e) {
      setError(
        "Failed to import data from Upstox: " +
          (e instanceof Error ? e.message : "Unknown error"),
      );
      setImportModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setFileName(file.name);
    setUploadProgress(0);

    try {
      // Use streaming parser for large files
      if (file.size > 5 * 1024 * 1024) {
        // If file > 5MB, use streaming
        const candles = await parseCSVStreaming(file, (progress, data) => {
          setUploadProgress(progress);
          onDataUpload(data); // Stream data as it's parsed
        });
        setUploadProgress(100);
      } else {
        // For small files, use regular parser
        const content = await file.text();
        const candles = parseCSV(content);
        setUploadProgress(100);
        onDataUpload(candles);
      }
    } catch (err) {
      console.error("DataUploadPanel error:", err);
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
      setFileName(null);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 border-b border-border">
      {/* 
        Hiding Data Upload as per requirement 
        <h2 className="text-base font-semibold text-foreground mb-3">Data Upload</h2>
      */}

      {mode === "backtest" && false && (
        <>
          <div
            className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-secondary/50 transition-all"
            onClick={() => !loading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />

            {loading ? (
              <div className="space-y-3">
                <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-foreground font-medium">
                  Processing {fileName}...
                </p>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {uploadProgress}% complete
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-foreground font-medium">
                  {fileName ? `Loaded: ${fileName}` : "Click to upload CSV"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fileName
                    ? "Click to change file"
                    : "OHLCV data format required"}
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-3 p-2 bg-destructive/10 rounded-lg flex gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* 
            Hiding CSV format description 
            <div className="mt-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">CSV Format:</p>
              <code className="block bg-background p-1.5 rounded text-xs">
                timestamp,open,high,low,close,volume,oi
              </code>
            </div>
          */}
        </>
      )}

      {/* API Integration */}
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-xs font-medium text-foreground mb-2">
          API Integration
        </p>
        {!upstoxConnected ? (
          <UpstoxConfigDialog onConfigured={handleUpstoxConfigured} />
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></span>
              {tokenValidating ? "Validating..." : "Connected to Upstox"}
            </p>
            <button
              onClick={() => {
                localStorage.removeItem("upstox-access-token");
                setUpstoxAccessToken(null);
                setUpstoxConnected(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Disconnect
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Real-time data from Upstox broker
        </p>
      </div>

      {/* Upstox Search and Import - Historical Mode */}
      {upstoxConnected && mode === "backtest" && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">
            Import from Upstox
          </p>

          <div className="space-y-3">
            {/* Instrument Search Autocomplete */}
            {!selectedInstrument ? (
              <div className="relative">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Search Instrument
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type stock name (e.g., RELIANCE, NIFTY)"
                    value={instrumentQuery}
                    onChange={(e) =>
                      handleInstrumentQueryChange(e.target.value)
                    }
                    onFocus={() => {
                      if (instrumentSuggestions.length > 0)
                        setShowSuggestions(true);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background pr-8"
                    disabled={loading}
                  />
                  {instrumentQuery && (
                    <button
                      onClick={() => {
                        setInstrumentQuery("");
                        setInstrumentKey("");
                        setInstrumentSuggestions([]);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                  {showSuggestions && instrumentSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto divide-y divide-border/50 ring-1 ring-border shadow-primary/5">
                      {instrumentSuggestions.map((inst, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectInstrument(inst);
                          }}
                          className="w-full relative px-3 py-2 text-left text-sm hover:bg-secondary/60 focus:bg-secondary/60 focus:outline-none transition-all group overflow-hidden"
                        >
                          <div className="absolute inset-y-0 left-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-3">
                            {inst.company?.logo || inst.company?.domain ? (
                              <img
                                src={
                                  inst.company.logo ||
                                  `https://www.google.com/s2/favicons?domain=${inst.company.domain}&sz=64`
                                }
                                alt={inst.name}
                                className="w-8 h-8 flex-shrink-0 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 bg-secondary flex items-center justify-center flex-shrink-0">
                                <span className="text-muted-foreground font-semibold text-lg">
                                  {inst.trading_symbol?.[0] || "?"}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex items-baseline justify-between mb-0.5">
                                <div className="font-bold text-foreground tracking-tight truncate">
                                  {highlightMatch(
                                    inst.trading_symbol,
                                    instrumentQuery,
                                  )}
                                </div>
                                {inst.lot_size && (
                                  <div className="text-[10px] text-muted-foreground ml-2">
                                    Lot: {inst.lot_size}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate opacity-90">
                                {highlightMatch(inst.name, instrumentQuery)}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] uppercase font-bold tracking-wider">
                                  {inst.exchange}
                                </span>
                                <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] uppercase font-semibold">
                                  {inst.segment}
                                </span>
                                {inst.instrument_type && (
                                  <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] uppercase font-semibold">
                                    {inst.instrument_type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-secondary/50 rounded-md border border-border">
                <div className="flex items-center gap-3">
                  {selectedInstrument.company?.domain && (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${selectedInstrument.company.domain}&sz=32`}
                      alt={selectedInstrument.name}
                      className="w-8 h-8 rounded-md flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm">
                      {selectedInstrument.trading_symbol}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {selectedInstrument.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-background rounded text-xs font-medium">
                          {selectedInstrument.exchange}
                        </span>
                        <span className="px-1.5 py-0.5 bg-background rounded text-xs font-medium">
                          {selectedInstrument.segment}
                        </span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedInstrument(null);
                      setInstrumentKey("");
                      setInstrumentQuery("");
                      setInstrumentSuggestions([]);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 border border-border rounded hover:bg-background"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Date Range Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (onImportContextChange && instrumentKey) {
                      onImportContextChange({
                        instrumentKey,
                        instrumentName:
                          selectedInstrument?.name || instrumentQuery,
                        startDate: e.target.value,
                        endDate,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (onImportContextChange && instrumentKey) {
                      onImportContextChange({
                        instrumentKey,
                        instrumentName:
                          selectedInstrument?.name || instrumentQuery,
                        startDate,
                        endDate: e.target.value,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Interval Selection */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Interval
              </label>
              <select
                value={interval}
                onChange={(e) => setIntervalValue(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                disabled={loading}
              >
                <option value="1minute">1 Minute</option>
                <option value="30minute">30 Minute</option>
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>

            {/* Import Button */}
            <button
              onClick={handleImportFromUpstox}
              disabled={loading || !instrumentKey || !startDate || !endDate}
              className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Importing..." : "Import Data"}
            </button>
          </div>
        </div>
      )}

      {/* Watchlist - Realtime Mode */}
      {upstoxConnected && mode === "realtime" && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">Watchlist</p>

          <div className="space-y-3">
            {/* Add to Watchlist Search */}
            <div className="relative">
              <label className="text-xs text-muted-foreground mb-1 block">
                Add Stock to Watchlist
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search stock (e.g., RELIANCE, HDFC)"
                  value={watchlistSearchQuery}
                  onChange={(e) => handleWatchlistSearchChange(e.target.value)}
                  onFocus={() => {
                    if (watchlistSuggestions.length > 0)
                      setShowWatchlistSuggestions(true);
                  }}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background pr-8"
                />
                {watchlistSearchQuery && (
                  <button
                    onClick={() => {
                      setWatchlistSearchQuery("");
                      setWatchlistSuggestions([]);
                      setShowWatchlistSuggestions(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                )}
                {showWatchlistSuggestions &&
                  watchlistSuggestions &&
                  watchlistSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto divide-y divide-border/50 ring-1 ring-border shadow-primary/5">
                      {watchlistSuggestions.map((inst, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToWatchlist(inst);
                          }}
                          className="w-full relative px-3 py-2 text-left text-sm hover:bg-secondary/60 focus:bg-secondary/60 focus:outline-none transition-all group overflow-hidden"
                        >
                          <div className="absolute inset-y-0 left-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-3">
                            {inst.company?.logo || inst.company?.domain ? (
                              <img
                                src={
                                  inst.company.logo ||
                                  `https://www.google.com/s2/favicons?domain=${inst.company.domain}&sz=64`
                                }
                                alt={inst.name}
                                className="w-8 h-8 flex-shrink-0 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 bg-secondary flex items-center justify-center flex-shrink-0">
                                <span className="text-muted-foreground font-semibold text-lg">
                                  {inst.trading_symbol?.[0] || "?"}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex items-baseline justify-between mb-0.5">
                                <div className="font-bold text-foreground tracking-tight truncate">
                                  {highlightMatch(
                                    inst.trading_symbol,
                                    watchlistSearchQuery,
                                  )}
                                </div>
                                {inst.lot_size && (
                                  <div className="text-[10px] text-muted-foreground ml-2">
                                    Lot: {inst.lot_size}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate opacity-90">
                                {highlightMatch(
                                  inst.name,
                                  watchlistSearchQuery,
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] uppercase font-bold tracking-wider">
                                  {inst.exchange}
                                </span>
                                <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] uppercase font-semibold">
                                  {inst.segment}
                                </span>
                                {inst.instrument_type && (
                                  <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] uppercase font-semibold">
                                    {inst.instrument_type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Watchlist Items */}
            {watchlist.length > 0 ? (
              <div className="space-y-1">
                {watchlist.map((item) => {
                  const priceData = watchlistPrices[item.instrument_key];
                  const isSelected =
                    selectedWatchlistStock?.instrument_key ===
                    item.instrument_key;
                  const priceColor =
                    priceData?.changePercent >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400";
                  const isCalibrated = calibratedInstruments.has(
                    item.instrument_key,
                  );

                  return (
                    <div
                      key={item.instrument_key}
                      className={`flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-primary/15 to-primary/5 border-primary/50 shadow-sm"
                          : "bg-secondary/10 border-border hover:bg-secondary/20 hover:border-border/50"
                      }`}
                      onClick={() => {
                        setSelectedWatchlistStock(item);
                        if (onWatchlistStockSelect) {
                          onWatchlistStockSelect(item);
                        }
                      }}
                    >
                      {item.company?.domain && (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${item.company.domain}&sz=32`}
                          alt={item.name}
                          className="w-8 h-8 rounded flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <div className="font-semibold text-xs text-foreground">
                            {item.trading_symbol}
                          </div>
                          {isCalibrated ? (
                            <div title="Calibrated">
                              <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                            </div>
                          ) : (
                            <div title="Not Calibrated">
                              <XCircle className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.name}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 min-w-[90px]">
                        {priceData ? (
                          <>
                            <div
                              className={`font-semibold text-sm ${priceColor}`}
                            >
                              ₹{priceData.ltp.toFixed(2)}
                            </div>
                            <div
                              className={`flex items-center justify-end gap-0.5 text-[10px] font-medium ${priceColor}`}
                            >
                              <span className="px-1 py-0.5 rounded bg-current/10">
                                {priceData.change >= 0 ? "+" : ""}
                                {priceData.change.toFixed(2)}
                              </span>
                              <span>
                                ({priceData.changePercent >= 0 ? "+" : ""}
                                {priceData.changePercent.toFixed(2)}%)
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px] text-muted-foreground font-medium animate-pulse">
                            Loading...
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(item.instrument_key);
                        }}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all p-1 rounded"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No stocks in watchlist. Add stocks to see realtime prices and
                market depth.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Market Depth Display - Historical Mode */}
      {upstoxConnected &&
        mode === "backtest" &&
        instrumentKey &&
        upstoxAccessToken && (
          <div className="mt-4">
            <MarketDepth
              accessToken={upstoxAccessToken}
              instrumentKey={instrumentKey}
              mode="full_d30"
              enabled={false}
            />
          </div>
        )}

      {/* Import Progress Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-4 max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold mb-3">Importing Data</h3>
            <div className="space-y-2">
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {importProgress < 30
                  ? "Connecting to Upstox..."
                  : importProgress < 70
                    ? "Fetching historical data..."
                    : importProgress < 90
                      ? "Processing data..."
                      : "Complete!"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
