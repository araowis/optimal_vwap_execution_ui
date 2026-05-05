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
import { vwapServerService, PretradeResponse } from '@/lib/vwap-server-service';
import PriceChart from './charts/PriceChart';
import VolumeChart from './charts/VolumeChart';
import PretradeCharts from './charts/PretradeCharts';
import LiveAdjustments from './charts/LiveAdjustments';

interface ChartPanelProps {
  candles: Candle[];
  chartData: ChartDatapoint[];
  customizationPrefs: CustomizationPrefs;
  onChartDataChange: (data: ChartDatapoint[]) => void;
  companyLogo?: string;
  instrumentName?: string;
  instrumentKey?: string;
  timeframeMode?: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  onTimeframeChange?: (mode: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR') => void;
  mode?: 'backtest' | 'realtime';
  realtimePriceUpdate?: { ltp: number; timestamp: number; volume?: number };
  onPretradeDataChange?: (data: PretradeResponse | null) => void;
}

const ChartPanel = memo(function ChartPanel({
  candles,
  chartData,
  customizationPrefs,
  instrumentKey,
  onChartDataChange,
  companyLogo,
  instrumentName,
  timeframeMode = 'ALL',
  onPretradeDataChange,
  onTimeframeChange,
  mode = 'backtest',
  realtimePriceUpdate,
}: ChartPanelProps) {
  const [displayData, setDisplayData] = useState<ChartDatapoint[]>([]);
  const [pretradeData, setPretradeData] = useState<PretradeResponse | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [clickedCandle, setClickedCandle] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [visibleDataPoints, setVisibleDataPoints] = useState(2000);
  const [volumeCurveVisible, setVolumeCurveVisible] = useState(true);
  const [showPretradeInMain, setShowPretradeInMain] = useState(false);
  const [showLiveAdjustments, setShowLiveAdjustments] = useState(false);

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
        const tmp = new Date(d);
        tmp.setHours(0, 0, 0, 0);
        const day = (tmp.getDay() + 6) % 7;
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

    setSelectedKey((prev) => (prev && availableKeys.includes(prev) ? prev : availableKeys[availableKeys.length - 1]));
  }, [availableKeys, timeframeMode]);

  const filteredCandles = useMemo(() => {
    if (candles.length === 0) return [] as Candle[];
    
    const isDailyCandle = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return hours === 0 && minutes === 0;
    };
    
    const allDaily = candles.every((c) => isDailyCandle(c.timestamp));
    
    if (allDaily) {
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
    
    const isMarketHour = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      if (timeframeMode === 'ALL') return true;
      
      return (hours > 9 || (hours === 9 && minutes >= 15)) && 
             (hours < 15 || (hours === 15 && minutes <= 30));
    };

    const marketHourCandles = candles.filter((c) => isMarketHour(c.timestamp));
    const baseCandles = marketHourCandles.length > 0 ? marketHourCandles : candles;
    
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
    if (filteredCandles.length === 0) {
      setDisplayData([]);
      return;
    }

    const aggregated = aggregateCandles(filteredCandles, customizationPrefs.chartPeriod);
    let vwapData = calculateVWAP(aggregated);
    vwapData = calculateVWAPBands(vwapData, customizationPrefs.bandWidth);

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

    newChartData = detectBuySignals(newChartData, 0.5, 0);

    setDisplayData(newChartData);
    onChartDataChange(newChartData);
  }, [filteredCandles, customizationPrefs, onChartDataChange]);

  useEffect(() => {
    if (mode !== 'realtime' || !realtimePriceUpdate) {
      return;
    }
    setDisplayData((prev) => {
      if (prev.length === 0) {
        const initialCandle: Candle = {
          timestamp: new Date(realtimePriceUpdate.timestamp),
          open: realtimePriceUpdate.ltp,
          high: realtimePriceUpdate.ltp,
          low: realtimePriceUpdate.ltp,
          close: realtimePriceUpdate.ltp,
          volume: realtimePriceUpdate.volume || 0,
          oi: 0,
        };

        const initialDatapoint: ChartDatapoint = {
          candle: initialCandle,
          vwapData: {
            timestamp: initialCandle.timestamp,
            vwap: initialCandle.close,
            upperBand: initialCandle.close,
            lowerBand: initialCandle.close,
            stdDev: 0,
            cumulativeTP: initialCandle.close * initialCandle.volume,
            cumulativeVolume: initialCandle.volume,
          },
          volumeBins: calculateVolumeBins(initialCandle, customizationPrefs.numVolumeBins),
          deviationFromVWAP: 0,
          deviationPercentage: 0,
        };

        return [initialDatapoint];
      }

      const lastCandleIndex = prev.length - 1;
      const lastDatapoint = prev[lastCandleIndex];
      if (!lastDatapoint) return prev;

      const currentTickTime = new Date(realtimePriceUpdate.timestamp);

      const updatedCandle: Candle = {
        ...lastDatapoint.candle,
        close: realtimePriceUpdate.ltp,
        high: Math.max(lastDatapoint.candle.high, realtimePriceUpdate.ltp),
        low: Math.min(lastDatapoint.candle.low, realtimePriceUpdate.ltp),
        volume:
          typeof realtimePriceUpdate.volume === 'number' && realtimePriceUpdate.volume > 0
            ? realtimePriceUpdate.volume
            : lastDatapoint.candle.volume,
        timestamp: currentTickTime,
      };

      const prevVwap = lastCandleIndex > 0 ? prev[lastCandleIndex - 1].vwapData : null;
      const prevVolume = lastDatapoint.candle.volume || 0;
      const newVolume = updatedCandle.volume || 0;
      const deltaVolume = newVolume - prevVolume;

      const cumVolume = (prevVwap?.cumulativeVolume || 0) + deltaVolume;
      const currentVwap = cumVolume > 0 ? (prevVwap?.vwap || 0) : updatedCandle.close;

      const updatedDatapoint: ChartDatapoint = {
        candle: updatedCandle,
        vwapData: {
          timestamp: updatedCandle.timestamp,
          vwap: currentVwap,
          stdDev: prevVwap?.stdDev || 0,
          cumulativeTP: (prevVwap?.cumulativeTP || 0) + updatedCandle.close * deltaVolume,
          upperBand: currentVwap * (1 + customizationPrefs.bandWidth / 100),
          lowerBand: currentVwap * (1 - customizationPrefs.bandWidth / 100),
          cumulativeVolume: cumVolume,
        },
        volumeBins: calculateVolumeBins(updatedCandle, customizationPrefs.numVolumeBins),
        deviationFromVWAP: calculateDeviation(updatedCandle.close, currentVwap).absolute,
        deviationPercentage: calculateDeviation(updatedCandle.close, currentVwap).percentage,
      };

      return [...prev.slice(0, -1), updatedDatapoint];
    });
  }, [realtimePriceUpdate, mode, customizationPrefs]);

  // Fetch pretrade data when instrument key changes
  useEffect(() => {
    console.log('Pretrade fetch triggered. instrumentKey:', instrumentKey);
    if (!instrumentKey) {
      console.log('No instrumentKey, clearing pretrade data');
      setPretradeData(null);
      onPretradeDataChange?.(null);
      return;
    }

    const fetchPretrade = async () => {
      try {
        console.log('Fetching pretrade data for:', instrumentKey);
        // First check if VWAP server is available
        const isHealthy = await vwapServerService.healthCheck();
        if (!isHealthy) {
          console.error('VWAP Server is not available');
          return;
        }
        console.log('VWAP Server is healthy, fetching pretrade data');
        const data = await vwapServerService.getPretrade(instrumentKey, 375);
        console.log('Pretrade data received:', data);
        setPretradeData(data);
        onPretradeDataChange?.(data);
      } catch (error) {
        console.error('Failed to fetch pretrade data:', error);
        setPretradeData(null);
        onPretradeDataChange?.(null);
      }
    };

    fetchPretrade();
  }, [instrumentKey, onPretradeDataChange]);

  const sampledDisplayData = useMemo(() => {
    if (displayData.length <= visibleDataPoints) return displayData;
    const step = Math.ceil(displayData.length / visibleDataPoints);
    return displayData.filter((_, idx) => idx % step === 0);
  }, [displayData, visibleDataPoints]);

  if (candles.length === 0 && mode === 'backtest') {
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {filteredCandles.length} candles ({sampledDisplayData.length} displayed) • {customizationPrefs.chartPeriod}
              </span>
              {pretradeData ? (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></span>
                  Pretrade loaded
                </span>
              ) : instrumentKey ? (
                <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-600 dark:bg-yellow-400 rounded-full"></span>
                  No pretrade data
                </span>
              ) : null}
            </div>
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

          {pretradeData && (
            <button
              onClick={() => setShowPretradeInMain(!showPretradeInMain)}
              className="text-xs bg-primary/10 text-primary border border-primary/20 rounded px-2 py-1 hover:bg-primary/20"
              title="Toggle pretrade volume curve location"
            >
              {showPretradeInMain ? 'Pretrade: Main' : 'Pretrade: Below'}
            </button>
          )}
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
          volumeCurveData={pretradeData?.eXt || []}
          timeLabels={pretradeData?.timeLabels || []}
          onClickedCandle={setClickedCandle}
          pretradeVolumeCurve={pretradeData?.eXt || []}
          showPretradeInMain={showPretradeInMain}
        />
      </div>

      {/* Pretrade / Live Toggle */}
      <div className="flex items-center gap-2 px-1">
        <button
          onClick={() => setShowLiveAdjustments(false)}
          className={`text-xs px-2 py-1 rounded border transition-colors ${
            !showLiveAdjustments
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-background text-muted-foreground border-border hover:bg-secondary/50'
          }`}
        >
          Pretrade
        </button>
        <button
          onClick={() => setShowLiveAdjustments(true)}
          className={`text-xs px-2 py-1 rounded border transition-colors ${
            showLiveAdjustments
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-background text-muted-foreground border-border hover:bg-secondary/50'
          }`}
        >
          Live Adjustments
        </button>
      </div>

      {/* Bottom Charts */}
      {showLiveAdjustments ? (
        <LiveAdjustments instrumentKey={instrumentKey} />
      ) : (
        <PretradeCharts pretradeData={pretradeData} />
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
  const isUp = candle.close >= candle.open;

  return (
    <div className="grid grid-cols-6 gap-3 text-xs">
      <div>
        <p className="text-muted-foreground">Time</p>
        <p className="text-foreground font-medium">
          {candle.timestamp.toLocaleTimeString()}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Open</p>
        <p className={`font-medium ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {candle.open.toFixed(2)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">High</p>
        <p className="text-foreground font-medium">{candle.high.toFixed(2)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Low</p>
        <p className="text-foreground font-medium">{candle.low.toFixed(2)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Close</p>
        <p className={`font-medium ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {candle.close.toFixed(2)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">VWAP</p>
        <p className="text-foreground font-medium">{vwapData.vwap.toFixed(2)}</p>
      </div>
      {showVolume && (
        <>
          <div>
            <p className="text-muted-foreground">Volume</p>
            <p className="text-foreground font-medium">
              {candle.volume >= 1000000 ? `${(candle.volume / 1000000).toFixed(2)}M` : `${(candle.volume / 1000).toFixed(0)}K`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Deviation</p>
            <p className={`font-medium ${deviationPercentage < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {deviationPercentage.toFixed(3)}%
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default ChartPanel;
