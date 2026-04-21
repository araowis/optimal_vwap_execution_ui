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
  timeframeMode?: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  onTimeframeChange?: (mode: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR') => void;
}

const ChartPanel = memo(function ChartPanel({
  candles,
  chartData,
  customizationPrefs,
  onChartDataChange,
  companyLogo,
  instrumentName,
  timeframeMode = 'ALL',
  onTimeframeChange,
}: ChartPanelProps) {
  console.log('ChartPanel received candles:', candles.length, 'candles');
  console.log('ChartPanel received companyLogo:', companyLogo);
  console.log('ChartPanel received instrumentName:', instrumentName);

  const [displayData, setDisplayData] = useState<ChartDatapoint[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [clickedCandle, setClickedCandle] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [visibleDataPoints, setVisibleDataPoints] = useState(2000);
  const [volumeCurveVisible, setVolumeCurveVisible] = useState(false);

  const availableKeys = useMemo(() => {
    if (candles.length === 0) return [] as string[];

    const keys = new Set<string>();

    for (const c of candles) {
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
  }, [candles, timeframeMode]);

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

  const filteredCandles = useMemo(() => {
    console.log('ChartPanel filteredCandles calculation, candles.length:', candles.length);
    if (candles.length === 0) return [] as Candle[];
    
    // Check if candles are daily (timestamp at midnight) or intraday
    const isDailyCandle = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return hours === 0 && minutes === 0;
    };
    
    // If all candles are daily, skip market hours filter
    const allDaily = candles.every((c) => isDailyCandle(c.timestamp));
    
    if (allDaily) {
      console.log('ChartPanel: All candles are daily, skipping market hours filter');
      // Filter by timeframe mode for daily candles
      if (timeframeMode === 'ALL' || !selectedKey) return candles;

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

      return candles.filter((c) => matches(c.timestamp));
    }
    
    // Filter for market hours (9:15 AM to 3:30 PM IST) for intraday candles
    const isMarketHour = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return (hours > 9 || (hours === 9 && minutes >= 15)) && 
             (hours < 15 || (hours === 15 && minutes <= 30));
    };

    // First filter by market hours
    const marketHourCandles = candles.filter((c) => isMarketHour(c.timestamp));
    console.log('ChartPanel: After market hours filter, candles:', marketHourCandles.length);
    
    // Then filter by timeframe mode
    if (timeframeMode === 'ALL' || !selectedKey) return marketHourCandles;

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

    return marketHourCandles.filter((c) => matches(c.timestamp));
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
              className="w-8 h-8 rounded-md flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div>
            <h2 className="text-lg font-semibold text-foreground">Price & VWAP Analysis</h2>
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

          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Density:</span>
            <select
              value={visibleDataPoints}
              onChange={(e) => setVisibleDataPoints(Number(e.target.value))}
              className="text-xs font-semibold bg-background border border-border rounded-md px-2 py-1 focus:ring-1 focus:ring-primary outline-none transition-all"
            >
              <option value={50}>50 (Ultra)</option>
              <option value={100}>100 (Deep)</option>
              <option value={250}>250 (Mid)</option>
              <option value={500}>500 (Detailed)</option>
              <option value={1000}>1000 (Wide)</option>
              <option value={2000}>2000 (Max)</option>
              <option value={displayData.length || 5000}>Full View</option>
            </select>
          </div>

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
