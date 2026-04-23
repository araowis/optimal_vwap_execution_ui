'use client';

import { useEffect, useMemo, useState, memo } from 'react';
import {
  calculateVWAP,
  calculateVWAPBands,
  calculateDeviation,
  aggregateCandles,
  detectBuySignals,
} from '@/lib/vwap-calculator';
import { calculateVolumeBins } from '@/lib/volume-allocation';
import { Candle, ChartDatapoint, CustomizationPrefs } from '@/lib/types';
import PriceChart from './charts/PriceChart';
import VolumeChart from './charts/VolumeChart';

interface ChartPanelProps {
  candles: Candle[];
  chartData: ChartDatapoint[];
  customizationPrefs: CustomizationPrefs;
  onChartDataChange: (data: ChartDatapoint[]) => void;
  companyLogo?: string;
  instrumentName?: string;
  mode?: 'backtest' | 'realtime';
  timeframeMode?: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  onTimeframeChange?: (mode: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR') => void;
  upstoxAccessToken?: string;
  upstoxInstrumentKey?: string;
}

const ChartPanel = memo(function ChartPanel({
  candles,
  chartData,
  customizationPrefs,
  onChartDataChange,
  companyLogo,
  instrumentName,
  mode = 'backtest',
  timeframeMode = 'ALL',
  onTimeframeChange,
  upstoxAccessToken,
  upstoxInstrumentKey,
}: ChartPanelProps) {
  console.log('ChartPanel render - candles.length:', candles.length, 'timeframeMode:', timeframeMode);
  console.log('ChartPanel received companyLogo:', companyLogo);
  console.log('ChartPanel received instrumentName:', instrumentName);
  if (candles.length > 0) {
    console.log('ChartPanel first candle:', candles[0]);
    console.log('ChartPanel last candle:', candles[candles.length - 1]);
  }

  const [displayData, setDisplayData] = useState<ChartDatapoint[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [clickedCandle, setClickedCandle] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [visibleDataPoints, setVisibleDataPoints] = useState(2000);
  const [volumeCurveVisible, setVolumeCurveVisible] = useState(false);
  const [realtimeCandles, setRealtimeCandles] = useState<Candle[]>([]);

  // Default to DAY timeframe in realtime mode
  useEffect(() => {
    if (mode === 'realtime' && timeframeMode === 'ALL') {
      onTimeframeChange?.('DAY');
    }
  }, [mode, timeframeMode, onTimeframeChange]);

  // Fetch historical data from Upstox based on timeframe in realtime mode
  useEffect(() => {
    if (mode !== 'realtime' || !upstoxAccessToken || !upstoxInstrumentKey) return;

    const fetchHistoricalData = async () => {
      try {
        // Calculate date range based on timeframe
        const now = new Date();
        let fromDate = new Date();

        switch (timeframeMode) {
          case 'DAY':
            fromDate = new Date(now);
            fromDate.setHours(0, 0, 0, 0);
            break;
          case 'WEEK':
            fromDate = new Date(now);
            fromDate.setDate(now.getDate() - 7);
            break;
          case 'MONTH':
            fromDate = new Date(now);
            fromDate.setMonth(now.getMonth() - 1);
            break;
          case 'YEAR':
            fromDate = new Date(now);
            fromDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            fromDate = new Date(now);
            fromDate.setDate(now.getDate() - 30);
        }

        const toDate = now;
        const fromDateStr = fromDate.toISOString().split('T')[0];
        const toDateStr = toDate.toISOString().split('T')[0];

        const response = await fetch(
          `/api/upstox/historical-candle?instrumentKey=${encodeURIComponent(upstoxInstrumentKey)}&interval=day&toDate=${toDateStr}&fromDate=${fromDateStr}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${upstoxAccessToken}`,
            },
          }
        );

        const result = await response.json();
        if (result.ok && result.data && result.data.candles) {
          // Convert Upstox candles to our Candle format
          const historicalCandles: Candle[] = result.data.candles.map((candle: any) => ({
            timestamp: new Date(candle[0]),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
          }));

          setRealtimeCandles(historicalCandles);
        }
      } catch (error) {
        console.error('Failed to fetch historical data:', error);
      }
    };

    fetchHistoricalData();
  }, [mode, timeframeMode, upstoxAccessToken, upstoxInstrumentKey]);

  // Poll for realtime updates in realtime mode
  useEffect(() => {
    if (mode !== 'realtime' || !upstoxAccessToken || !upstoxInstrumentKey) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/upstox/market-quote?instrument_key=${encodeURIComponent(upstoxInstrumentKey)}&access_token=${encodeURIComponent(upstoxAccessToken)}`,
          { method: 'GET' }
        );

        const result = await response.json();
        if (result.status === 'success' && result.data) {
          const dataKey = Object.keys(result.data)[0];
          const data = result.data[dataKey];

          if (data) {
            // Create a new candle from the latest data
            const latestCandle: Candle = {
              timestamp: new Date(),
              open: data.ohlc?.open || data.last_price,
              high: data.ohlc?.high || data.last_price,
              low: data.ohlc?.low || data.last_price,
              close: data.last_price,
              volume: data.volume || 0,
            };

            setRealtimeCandles((prev) => {
              // Check if we already have a candle for today
              const today = new Date().toDateString();
              const existingIndex = prev.findIndex((c) => c.timestamp.toDateString() === today);

              if (existingIndex >= 0) {
                // Update existing candle
                const updated = [...prev];
                updated[existingIndex] = latestCandle;
                return updated;
              } else {
                // Add new candle
                return [...prev, latestCandle];
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch realtime data:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [mode, upstoxAccessToken, upstoxInstrumentKey]);

  const availableKeys = useMemo(() => {
    const dataToUse = mode === 'realtime' && realtimeCandles.length > 0 ? realtimeCandles : candles;
    if (dataToUse.length === 0) return [] as string[];

    const keys = new Set<string>();

    for (const c of dataToUse) {
      const d = c.timestamp;
      if (timeframeMode === 'DAY') {
        keys.add(d.toISOString().slice(0, 10));
      } else if (timeframeMode === 'MONTH') {
        keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      } else if (timeframeMode === 'YEAR') {
        keys.add(String(d.getFullYear()));
      } else if (timeframeMode === 'WEEK') {
        // ISO-like week key: YYYY-Www (approx, based on local time)
        const tmp = new Date(d);
        tmp.setHours(0, 0, 0, 0);
        const day = (tmp.getDay() + 6) % 7; // Mon=0
        tmp.setDate(tmp.getDate() - day + 3);
        const firstThursday = new Date(tmp.getFullYear(), 0, 4);
        const firstDay = (firstThursday.getDay() + 6) % 7;
        firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
        const week = 1 + Math.round((tmp.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
        keys.add(`${tmp.getFullYear()}-W${String(week).padStart(2, '0')}`);
      }
    }

    return Array.from(keys).sort();
  }, [candles, realtimeCandles, mode, timeframeMode]);

  useEffect(() => {
    if (timeframeMode === 'ALL') {
      setSelectedKey('');
      return;
    }

    if (!availableKeys.length) {
      setSelectedKey('');
      return;
    }

    // Default to the latest available key
    setSelectedKey((prev) => (prev && availableKeys.includes(prev) ? prev : availableKeys[availableKeys.length - 1]));
  }, [availableKeys, timeframeMode]);

  // Combine candles with realtime candles in realtime mode
  const combinedCandles = useMemo(() => {
    if (mode === 'realtime' && realtimeCandles.length > 0) {
      return realtimeCandles;
    }
    return candles;
  }, [mode, realtimeCandles, candles]);

  const filteredCandles = useMemo(() => {
    console.log('ChartPanel filteredCandles calculation, combinedCandles.length:', combinedCandles.length);
    if (combinedCandles.length === 0) return [] as Candle[];
    
    // Check if candles are daily (timestamp at midnight) or intraday
    const isDailyCandle = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return hours === 0 && minutes === 0;
    };
    
    // If all candles are daily, skip market hours filter
    const allDaily = combinedCandles.every((c) => isDailyCandle(c.timestamp));
    
    if (allDaily) {
      console.log('ChartPanel: All candles are daily, skipping market hours filter');
      // Filter by timeframe mode for daily candles
      if (timeframeMode === 'ALL' || !selectedKey) return combinedCandles;

      const matches = (d: Date) => {
        if (timeframeMode === 'DAY') return d.toISOString().slice(0, 10) === selectedKey;
        if (timeframeMode === 'MONTH') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedKey;
        if (timeframeMode === 'YEAR') return String(d.getFullYear()) === selectedKey;
        if (timeframeMode === 'WEEK') {
          const tmp = new Date(d);
          tmp.setHours(0, 0, 0, 0);
          const day = (tmp.getDay() + 6) % 7;
          tmp.setDate(tmp.getDate() - day + 3);
          const firstThursday = new Date(tmp.getFullYear(), 0, 4);
          const firstDay = (firstThursday.getDay() + 6) % 7;
          firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
          const week = 1 + Math.round((tmp.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
          return `${tmp.getFullYear()}-W${String(week).padStart(2, '0')}` === selectedKey;
        }
        return true;
      };

      return combinedCandles.filter((c) => matches(c.timestamp));
    }
    
    // Filter for market hours (9:15 AM to 3:30 PM IST) for intraday candles
    const isMarketHour = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      // If timeframe is ALL, we want to see everything
      if (timeframeMode === 'ALL') return true;
      
      // Otherwise filter for standard Indian market hours
      return (hours > 9 || (hours === 9 && minutes >= 15)) && 
             (hours < 15 || (hours === 15 && minutes <= 30));
    };

    // First filter by market hours
    const marketHourCandles = combinedCandles.filter((c) => isMarketHour(c.timestamp));
    console.log('ChartPanel: After market hours filter, candles:', marketHourCandles.length);

    // If we filtered out EVERYTHING but have raw candles, fallback to raw candles to ensure visibility
    const baseCandles = marketHourCandles.length > 0 ? marketHourCandles : combinedCandles;
    
    // Then filter by timeframe mode
    if (timeframeMode === 'ALL' || !selectedKey) return baseCandles;

    const matches = (d: Date) => {
      const dateStr = d.toISOString().slice(0, 10);
      if (timeframeMode === 'DAY') return dateStr === selectedKey;
      if (timeframeMode === 'MONTH') return dateStr.slice(0, 7) === selectedKey;
      if (timeframeMode === 'YEAR') return dateStr.slice(0, 4) === selectedKey;
      if (timeframeMode === 'WEEK') {
        const tmp = new Date(d);
        tmp.setHours(0, 0, 0, 0);
        const day = (tmp.getDay() + 6) % 7;
        tmp.setDate(tmp.getDate() - day + 3);
        const firstThursday = new Date(tmp.getFullYear(), 0, 4);
        const firstDay = (firstThursday.getDay() + 6) % 7;
        firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
        const week = 1 + Math.round((tmp.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
        return `${tmp.getFullYear()}-W${String(week).padStart(2, '0')}` === selectedKey;
      }
      return true;
    };

    return baseCandles.filter((c) => matches(c.timestamp));
  }, [candles, selectedKey, timeframeMode]);

  useEffect(() => {
    console.log('ChartPanel useEffect triggered, filteredCandles.length:', filteredCandles.length);
    if (filteredCandles.length === 0) {
      console.log('ChartPanel useEffect: no candles to process');
      setDisplayData([]);
      return;
    }

    // Aggregate candles based on selected period
    const aggregated = aggregateCandles(filteredCandles, customizationPrefs.chartPeriod);
    console.log('ChartPanel aggregated candles:', aggregated.length);

    // Calculate VWAP
    let vwapData = calculateVWAP(aggregated);
    console.log('ChartPanel vwapData calculated:', vwapData.length);

    // Apply band width
    vwapData = calculateVWAPBands(vwapData, customizationPrefs.bandWidth);

    // Build complete chart data
    let newChartData: ChartDatapoint[] = aggregated.map((candle, index) => {
      const vwap = vwapData[index];
      const { absolute: devAbsolute, percentage: devPct } = calculateDeviation(
        candle.close,
        vwap.vwap
      );

      const volumeBins = calculateVolumeBins(candle, customizationPrefs.numVolumeBins);

      return {
        candle,
        vwapData: vwap,
        volumeBins,
        deviationFromVWAP: devAbsolute,
        deviationPercentage: devPct,
      };
    });

    // Detect buy signals based on VWAP deviation
    newChartData = detectBuySignals(newChartData, 0.5, 0);

    setDisplayData(newChartData);
    onChartDataChange(newChartData);
  }, [filteredCandles, customizationPrefs, onChartDataChange]);

  const sampledDisplayData = useMemo(() => {
    if (displayData.length <= visibleDataPoints) return displayData;
    const step = Math.ceil(displayData.length / visibleDataPoints);
    return displayData.filter((_, idx) => idx % step === 0);
  }, [displayData, visibleDataPoints]);

  if (candles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background rounded-lg">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Upload stock data to start analyzing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 h-full overflow-hidden">
      {/* Chart Title + Timeframe Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {companyLogo && (
            <img
              src={companyLogo}
              alt={instrumentName || 'Company Logo'}
              className="w-10 h-10 rounded-lg flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div>
            <h2 className="text-lg font-bold text-foreground">{instrumentName || 'Price & VWAP Analysis'}</h2>
            <span className="text-xs text-muted-foreground">
              {filteredCandles.length} candles ({sampledDisplayData.length} displayed) • {customizationPrefs.chartPeriod}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeframeMode}
            onChange={(e) => onTimeframeChange?.(e.target.value as any)}
            className="text-xs bg-background border border-border rounded px-2 py-1"
            title="Timeframe"
          >
            <option value="ALL">All</option>
            <option value="DAY">Trading Day</option>
            <option value="WEEK">Week</option>
            <option value="MONTH">Month</option>
            <option value="YEAR">Year</option>
          </select>

          {timeframeMode !== 'ALL' && (
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1 max-w-48"
              title="Select period"
            >
              {availableKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}

          {displayData.length > 200 && (
            <select
              value={visibleDataPoints}
              onChange={(e) => setVisibleDataPoints(Number(e.target.value))}
              className="text-xs bg-background border border-border rounded px-2 py-1"
              title="Data Points"
            >
              <option value={50}>50 (Fast)</option>
              <option value={100}>100</option>
              <option value={200}>200 (Default)</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={displayData.length}>All ({displayData.length})</option>
            </select>
          )}

          <button
            onClick={() => setVolumeCurveVisible(!volumeCurveVisible)}
            className={`text-xs px-2 py-1 rounded border ${
              volumeCurveVisible
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border'
            }`}
            title="Toggle Volume Curve"
          >
            {volumeCurveVisible ? 'Hide Volume' : 'Show Volume'}
          </button>
        </div>
      </div>

      {/* Price Chart */}
      <div className="flex-1 bg-background rounded-lg border border-border overflow-hidden">
        <PriceChart
          data={sampledDisplayData}
          prefs={customizationPrefs}
          hoveredCandle={hoveredCandle}
          onCandleHover={setHoveredCandle}
          volumeCurveVisible={volumeCurveVisible}
          onClickedCandle={setClickedCandle}
        />
      </div>

      {/* Volume Chart - hidden when volume curve is shown on price chart */}
      {!volumeCurveVisible && (
        <div className="h-32 bg-background rounded-lg border border-border overflow-hidden">
          <VolumeChart
            data={sampledDisplayData}
            prefs={customizationPrefs}
            hoveredCandle={hoveredCandle}
            onCandleHover={setHoveredCandle}
          />
        </div>
      )}

      {/* Hover Info (fixed height to prevent chart resize jitter) */}
      <div className="bg-secondary/50 rounded-lg p-3 border border-border h-20 overflow-hidden">
        {(hoveredCandle !== null && displayData[hoveredCandle]) || (clickedCandle !== null && displayData[clickedCandle]) ? (
          <DatapointInfo datapoint={displayData[hoveredCandle !== null ? hoveredCandle : clickedCandle!]} showVolume={clickedCandle !== null} />
        ) : (
          <div className="h-full flex items-center">
            <p className="text-xs text-muted-foreground">Hover on the chart to see candle details, click to see volume</p>
          </div>
        )}
      </div>
    </div>
  );
});

function DatapointInfo({ datapoint, showVolume }: { datapoint: ChartDatapoint; showVolume?: boolean }) {
  const { candle, vwapData, deviationPercentage } = datapoint;

  return (
    <div className="grid grid-cols-5 gap-4 text-xs">
      <div>
        <p className="text-muted-foreground">Time</p>
        <p className="text-foreground font-medium">
          {candle.timestamp.toLocaleTimeString()}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Price (O/C)</p>
        <p className="text-foreground font-medium">
          {candle.open.toFixed(2)} / {candle.close.toFixed(2)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">VWAP</p>
        <p className="text-foreground font-medium">{vwapData.vwap.toFixed(2)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Deviation</p>
        <p
          className={`font-medium ${
            deviationPercentage < 0 ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {deviationPercentage.toFixed(3)}%
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">{showVolume ? 'Volume' : 'Volume'}</p>
        <p className="text-foreground font-medium">{(candle.volume / 1000).toFixed(0)}K</p>
      </div>
    </div>
  );
}

export default ChartPanel;
