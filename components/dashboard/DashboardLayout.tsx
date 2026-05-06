'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header';
import DataUploadPanel from './DataUploadPanel';
import ParametersPanel from './ParametersPanel';
import ChartPanel from './ChartPanel';
import BenchmarkingPanel from './BenchmarkingPanel';
import ExecutionSummary from './ExecutionSummary';
import CustomizationPanel from './CustomizationPanel';
import StockDetailPanel from './StockDetailPanel';
import MarketOpenForm from './MarketOpenForm';
import LiveTradingPanel from './LiveTradingPanel';
import {
  CustomizationPrefs,
  Candle,
  ChartDatapoint,
  BacktestResult,
  StrategyParams,
  BacktestApiResponse,
  DailyBacktestResult,
  BackendBuySignal,
} from '@/lib/types';
import { BacktestService } from '@/lib/backtest-service';
import { backendService } from '@/lib/backend-service';
import { vwapServerService, PretradeResponse } from '@/lib/vwap-server-service';
import { useUpstoxWebSocket } from '@/lib/use-upstox-websocket';
import { fetchHistoricalCandles, getTodayDate, getYesterdayDate } from '@/lib/upstox-historical';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DashboardLayoutProps {
  customizationPrefs: CustomizationPrefs;
  onPreferencesChange: (prefs: CustomizationPrefs) => void;
}

export default function DashboardLayout({
  customizationPrefs,
  onPreferencesChange,
}: DashboardLayoutProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartData, setChartData] = useState<ChartDatapoint[]>([]);
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
  // Multi-day backend results
  const [multiDayResults, setMultiDayResults] = useState<BacktestApiResponse | null>(null);
  const [activeDate, setActiveDate] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [instrumentName, setInstrumentName] = useState<string>('');
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [mode, setMode] = useState<'backtest' | 'realtime' | 'vwap-live'>('backtest');
  const [chartTimeframeMode, setChartTimeframeMode] = useState<'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
  const [selectedWatchlistStock, setSelectedWatchlistStock] = useState<any>(null);
  const [upstoxAccessToken, setUpstoxAccessToken] = useState<string | null>(null);
  const [backTestProgress, setBackTestProgress] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationMessage, setCalibrationMessage] = useState('');
  const [realtimePriceUpdate, setRealtimePriceUpdate] = useState<{ ltp: number; timestamp: number; volume?: number } | undefined>(undefined);
  const [pretradeData, setPretradeData] = useState<PretradeResponse | null>(null);

  // Import context: instrument + date range from DataUploadPanel
  const [importContext, setImportContext] = useState<{
    instrumentKey: string;
    instrumentName: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  const [strategyParams, setStrategyParams] = useState<StrategyParams>({
    totalQuantity: 1000,
    numTranches: 30,
    trancheSize: 0,
    maxSlippage: 0.1,
    vwapDeviation: 0.5,
    minVolumeThreshold: 0,
    orderType: 'LIMIT',
    executionTimeframe: 'INTRADAY',
    enableTxCosts: false,
    lambda: 17.5,
    dates: [],
    txCostConfig: {
      brokeragePercent: 0.12,
      sttPercent: 0.025,
      gstPercent: 18,
      exchangeFeePercent: 0.00345,
      spreadBps: 5,
    },
  });
  
  // Sidebar state
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(320);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(384);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [backTestMessage, setBackTestMessage] = useState('');
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [customizationCollapsed, setCustomizationCollapsed] = useState(mode === 'realtime');

  const handlePriceUpdate = useCallback((data: any) => {
    // console.log('Real-time price update:', data);
    setRealtimePriceUpdate({
      ltp: data.ltp,
      timestamp: data.timestamp,
      volume: data.volume,
    });
  }, []);

  // WebSocket for real-time price streaming
  const { isConnected: wsConnected } = useUpstoxWebSocket({
    accessToken: upstoxAccessToken,
    instrumentKey: selectedWatchlistStock?.instrument_key || null,
    enabled: mode === 'realtime' && !!selectedWatchlistStock && !!upstoxAccessToken,
    onPriceUpdate: handlePriceUpdate,
  });

  // REST polling fallback for realtime price updates (keeps chart updating even if WS doesn't stream)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Don't poll if WebSocket is connected or not in realtime mode
    if (mode !== 'realtime' || !upstoxAccessToken || !selectedWatchlistStock?.instrument_key || wsConnected) {
      return;
    }

    let cancelled = false;

    const fetchQuote = async () => {
      // Skip polling if WebSocket is connected
      if (wsConnected) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/upstox/market-quote?instrument_key=${encodeURIComponent(selectedWatchlistStock.instrument_key)}&access_token=${encodeURIComponent(upstoxAccessToken)}`,
          { method: 'GET' }
        );
        const result = await response.json();

        if (cancelled) return;

        if (result?.status !== 'success' || !result?.data) return;

        const instrumentData =
          result.data[selectedWatchlistStock.instrument_key] ||
          (Object.values(result.data).length === 1 ? Object.values(result.data)[0] : undefined);

        if (!instrumentData) return;

        const ltp = Number(instrumentData.last_price ?? instrumentData.ltp ?? 0);
        const volume = Number(instrumentData.volume ?? 0);

        if (Number.isFinite(ltp) && ltp > 0) {
          setRealtimePriceUpdate({
            ltp,
            timestamp: Date.now(),
            volume,
          });
        }
      } catch {
        // ignore polling errors; WS can still work
      }
    };

    // Fetch immediately, then poll
    fetchQuote();
    pollingIntervalRef.current = setInterval(fetchQuote, 2500);

    return () => {
      cancelled = true;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [mode, upstoxAccessToken, selectedWatchlistStock, wsConnected]);

  const handleDataUpload = (data: Candle[], logo?: string, name?: string) => {
    setCandles(data);
    setChartData([]);
    setCompanyLogo(logo || '');
    setInstrumentName(name || '');
  };

  const handleWatchlistStockSelect = useCallback(async (stock: any) => {
    // console.log('handleWatchlistStockSelect called with stock:', stock, 'Mode:', mode);
    
    setSelectedWatchlistStock(stock);
    setRightSidebarCollapsed(false);
    
    // Immediately clear current chart to avoid showing previous stock
    setCandles([]);
    setChartData([]);
    setRealtimePriceUpdate(undefined);

    if (!upstoxAccessToken) {
      setInstrumentName(stock.name);
      setCompanyLogo(stock.company?.domain ? `https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=64` : '');
      return;
    }

    try {
      // Determine date range and interval based on mode
      let fromDate: string;
      let toDate: string;
      let interval: 'day' | '1minute';

      if (mode === 'realtime') {
        toDate = getTodayDate();
        fromDate = getTodayDate();
        interval = '1minute';
      } else {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        toDate = today.toISOString().split('T')[0];
        fromDate = thirtyDaysAgo.toISOString().split('T')[0];
        interval = 'day';
      }

      let fetchedCandles = await fetchHistoricalCandles({
        accessToken: upstoxAccessToken,
        instrumentKey: stock.instrument_key,
        interval,
        fromDate,
        toDate,
      });

      // In realtime mode, Upstox can return empty candles for today early in the session.
      // Fallback to include yesterday->today to ensure the intraday chart is visible.
      if (mode === 'realtime' && fetchedCandles.length === 0) {
        fetchedCandles = await fetchHistoricalCandles({
          accessToken: upstoxAccessToken,
          instrumentKey: stock.instrument_key,
          interval: '1minute',
          fromDate: getYesterdayDate(),
          toDate: getTodayDate(),
        });
      }

      // If still empty, try last 7 days for intraday data
      if (mode === 'realtime' && fetchedCandles.length === 0) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        fetchedCandles = await fetchHistoricalCandles({
          accessToken: upstoxAccessToken,
          instrumentKey: stock.instrument_key,
          interval: '1minute',
          fromDate: sevenDaysAgo.toISOString().split('T')[0],
          toDate: getTodayDate(),
        });
      }

      setCandles(fetchedCandles);
      setCompanyLogo(stock.company?.domain ? `https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=64` : '');
      setInstrumentName(stock.name);
    } catch (error) {
      console.error('Failed to load stock data:', error);
      // Fallback UI state
      setInstrumentName(stock.name);
      setCompanyLogo(stock.company?.domain ? `https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=64` : '');
    }
  }, [mode, upstoxAccessToken]);

  // Handle mode switches and auto-refresh data
  useEffect(() => {
    // console.log('Mode changed to:', mode);
    
    // Clear backtest specific results when switching
    setBacktestResults(null);
    setBackTestProgress(0);
    setBackTestMessage('');
    
    // If we have a stock selected, refresh its data for the new mode
    if (selectedWatchlistStock) {
      handleWatchlistStockSelect(selectedWatchlistStock);
    } else {
      setCandles([]);
      setChartData([]);
    }
  }, [mode, selectedWatchlistStock, handleWatchlistStockSelect]);

  // Reset real-time update when stock changes
  useEffect(() => {
    setRealtimePriceUpdate(undefined);
  }, [selectedWatchlistStock]);

  const handleResizeLeft = (e: React.MouseEvent) => {
    setIsResizingLeft(true);
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth >= 200 && newWidth <= 600) {
        setLeftSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeRight = (e: React.MouseEvent) => {
    setIsResizingRight(true);
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth - (moveEvent.clientX - startX);
      if (newWidth >= 200 && newWidth <= 600) {
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingRight(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  /** Generate weekday dates between two YYYY-MM-DD strings */
  const generateTradingDates = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const cur = new Date(start);
    const endD = new Date(end);
    while (cur <= endD) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        dates.push(cur.toISOString().slice(0, 10));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const handleRunBacktest = async (params: StrategyParams) => {
    if (!importContext?.instrumentKey) {
      alert('Please select an instrument in the "Import from Upstox" section first');
      return;
    }
    if (!importContext.startDate || !importContext.endDate) {
      alert('Please choose a Start Date and End Date in the Import section');
      return;
    }

    const dates = generateTradingDates(importContext.startDate, importContext.endDate);
    if (dates.length === 0) {
      alert('No trading days found in the selected date range');
      return;
    }

    setStrategyParams(params);
    setIsBacktesting(true);
    setBackTestProgress(10);
    setBackTestMessage('Connecting to backend...');
    setMultiDayResults(null);
    setBacktestResults(null);

    try {
      setBackTestProgress(30);
      setBackTestMessage(`Running backtest for ${dates.length} trading day(s)...`);

      const response = await backendService.runMultiDayBacktest({
        instrumentKey: importContext.instrumentKey,
        bins: params.numTranches,
        lambda: params.lambda ?? 17.0,
        totalQty: params.totalQuantity,
        dates,
      });

      setBackTestProgress(80);
      setBackTestMessage('Processing results...');

      setMultiDayResults(response);

      // Auto-select the first successful day
      const firstOk = response.results.find((r) => r.status === 'OK');
      const initialDate = firstOk?.date || response.results[0]?.date || '';
      setActiveDate(initialDate);

      // Load candles for the initial active date
      if (initialDate) {
        await loadCandlesForDate(initialDate);
      }

      setBackTestProgress(100);
      setBackTestMessage('Backtest complete!');
    } catch (error: any) {
      console.error('Backtest failed:', error);
      setBackTestMessage(`Backtest failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsBacktesting(false);
    }
  };

  /** Fetch 1-minute historical candles for a specific date */
  const loadCandlesForDate = useCallback(async (date: string) => {
    const key = importContext?.instrumentKey || selectedWatchlistStock?.instrument_key;
    if (!key || !upstoxAccessToken) return;
    try {
      const fetched = await fetchHistoricalCandles({
        accessToken: upstoxAccessToken,
        instrumentKey: key,
        interval: '1minute',
        fromDate: date,
        toDate: date,
      });
      setCandles(fetched);
      setChartData([]);
    } catch (err) {
      console.error('Failed to load candles for date', date, err);
    }
  }, [importContext, selectedWatchlistStock, upstoxAccessToken]);

  /** When the user picks a different day in the dropdown */
  const handleActiveDateChange = useCallback(async (date: string) => {
    setActiveDate(date);
    await loadCandlesForDate(date);
  }, [loadCandlesForDate]);

  /** Get signals for the currently active day */
  const activeDayResult: DailyBacktestResult | undefined = multiDayResults?.results.find(
    (r) => r.date === activeDate
  );
  const activeBuySignals: BackendBuySignal[] = activeDayResult?.buySignals ?? [];

  const handleRunRealtime = async (params: { totalQty: number; nBins: number; lambda: number }) => {
    if (!selectedWatchlistStock?.instrument_key) {
      alert('Please select a stock from the watchlist first');
      return;
    }

    setIsCalibrating(true);
    setCalibrationMessage('Calibrating instrument...');

    try {
      const response = await vwapServerService.marketOpen({
        instruments: [
          {
            instrumentKey: selectedWatchlistStock.instrument_key,
            totalQty: params.totalQty,
            nBins: params.nBins,
            lambda: params.lambda,
            timezone: 'Asia/Kolkata',
          },
        ],
      });

      if (response.status === 'calibrated') {
        setCalibrationMessage(`Calibrated ${response.instrumentsCalibrated} instrument(s) successfully`);
        alert(`Instrument calibrated successfully. You can add more stocks if needed.`);
      } else {
        setCalibrationMessage(response.message || 'Calibration failed');
        alert(response.message || 'Calibration failed');
      }
    } catch (error) {
      console.error('Market open calibration failed:', error);
      setCalibrationMessage('Failed to calibrate. Please try again.');
      alert(error instanceof Error ? error.message : 'Failed to calibrate');
    } finally {
      setIsCalibrating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <Header 
        chartTimeframeMode={chartTimeframeMode}
        onTimeframeChange={setChartTimeframeMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-2 p-2">
        {/* Left Panel - Data Upload & Parameters */}
        {!leftSidebarCollapsed ? (
          <>
            <div 
              className="bg-card rounded-l-lg border border-border flex flex-col overflow-hidden"
              style={{ width: `${leftSidebarWidth}px` }}
            >
              <div className="flex items-center justify-end px-3 py-2 border-b border-border">
                <button
                  onClick={() => setLeftSidebarCollapsed(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              {mode === 'vwap-live' ? (
                <>
                  <MarketOpenForm />
                  <LiveTradingPanel />
                </>
              ) : (
                <>
                  <DataUploadPanel
                    onDataUpload={handleDataUpload}
                    mode={mode as 'backtest' | 'realtime'}
                    onWatchlistStockSelect={handleWatchlistStockSelect}
                    onUpstoxTokenChange={setUpstoxAccessToken}
                    wsConnected={wsConnected}
                    onImportContextChange={(ctx) => {
                      setImportContext(ctx);
                      // Mirror the selected instrument name/logo for the chart header
                      if (ctx.instrumentKey) {
                        setInstrumentName(ctx.instrumentName);
                        // Use selectedWatchlistStock logo if available, otherwise leave blank
                      }
                    }}
                  />
                  <ParametersPanel
                    params={strategyParams}
                    onParamsChange={setStrategyParams}
                    onRunBacktest={handleRunBacktest}
                    onRunRealtime={handleRunRealtime}
                    isRunning={isBacktesting || isCalibrating}
                    progress={isCalibrating ? 50 : backTestProgress}
                    message={isCalibrating ? calibrationMessage : backTestMessage}
                    onModeChange={(newMode: 'backtest' | 'realtime') => setMode(newMode as 'backtest' | 'realtime')}
                    selectedInstrumentKey={selectedWatchlistStock?.instrument_key || importContext?.instrumentKey}
                    importContext={importContext}
                  />
                </>
              )}
            </div>
            {/* Resize Handle */}
            <div
              className="w-1 bg-border hover:bg-primary cursor-col-resize"
              onMouseDown={handleResizeLeft}
            />
          </>
        ) : (
          <button
            onClick={() => setLeftSidebarCollapsed(false)}
            className="bg-card border border-border rounded-l-lg px-2 hover:bg-secondary"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {/* Center Panel - Chart */}
        <div className="flex-1 bg-card rounded-lg border border-border flex flex-col overflow-hidden">
          {/* Multi-day date selector */}
          {multiDayResults && multiDayResults.results.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-secondary/30">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">Trading Day:</span>
              <div className="flex gap-1.5 flex-wrap">
                {multiDayResults.results.map((r) => (
                  <button
                    key={r.date}
                    onClick={() => handleActiveDateChange(r.date)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      r.date === activeDate
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : r.status === 'OK'
                        ? 'bg-background border border-border text-foreground hover:bg-secondary'
                        : 'bg-background border border-dashed border-border text-muted-foreground'
                    }`}
                    title={r.status !== 'OK' ? r.errorMessage || r.status : undefined}
                  >
                    {r.date}
                    {r.status === 'OK' && r.betterThanMarket && (
                      <span className="ml-1 text-green-500">▲</span>
                    )}
                    {r.status === 'OK' && !r.betterThanMarket && (
                      <span className="ml-1 text-red-400">▼</span>
                    )}
                    {r.status !== 'OK' && (
                      <span className="ml-1 text-yellow-500">!</span>
                    )}
                  </button>
                ))}
              </div>
              {multiDayResults.successfulDays > 1 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Avg slippage: <span className={multiDayResults.avgSlippageBps < 0 ? 'text-green-500' : 'text-red-400'}>
                    {multiDayResults.avgSlippageBps.toFixed(2)} bps
                  </span>
                </span>
              )}
            </div>
          )}
          <ChartPanel
            candles={candles}
            chartData={chartData}
            customizationPrefs={customizationPrefs}
            onChartDataChange={setChartData}
            companyLogo={companyLogo}
            instrumentName={instrumentName}
            instrumentKey={selectedWatchlistStock?.instrument_key}
            timeframeMode={chartTimeframeMode}
            onTimeframeChange={setChartTimeframeMode}
            mode={mode as 'backtest' | 'realtime'}
            realtimePriceUpdate={realtimePriceUpdate}
            onPretradeDataChange={setPretradeData}
            backendBuySignals={activeBuySignals}
          />
        </div>

        {/* Right Panel - Stock Detail & Customization */}
        {!rightSidebarCollapsed ? (
          <>
            {/* Resize Handle */}
            <div
              className="w-1 bg-border hover:bg-primary cursor-col-resize"
              onMouseDown={handleResizeRight}
            />
            <div
              className="bg-card rounded-r-lg border border-border flex flex-col overflow-hidden"
              style={{ width: `${rightSidebarWidth}px` }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                {mode === 'realtime' && (
                  <button
                    onClick={() => setCustomizationCollapsed(!customizationCollapsed)}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    {customizationCollapsed ? 'Show Settings' : 'Hide Settings'}
                  </button>
                )}
                <button
                  onClick={() => setRightSidebarCollapsed(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <StockDetailPanel
                stock={selectedWatchlistStock}
                accessToken={upstoxAccessToken}
                mode={mode as 'backtest' | 'realtime'}
                wsConnected={wsConnected}
                onClose={() => setSelectedWatchlistStock(null)}
                pretradeData={pretradeData}
              />
              {!customizationCollapsed && (
                <CustomizationPanel
                  preferences={customizationPrefs}
                  onPreferencesChange={onPreferencesChange}
                />
              )}
              {/* Backend multi-day results */}
              {activeDayResult && activeDayResult.status === 'OK' && (
                <div className="border-t border-border">
                  <button
                    onClick={() => setResultsCollapsed(!resultsCollapsed)}
                    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <span>Backtest Results — {activeDate}</span>
                    {resultsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!resultsCollapsed && (
                    <BenchmarkingPanel
                      dailyResult={activeDayResult}
                      multiDayResponse={multiDayResults!}
                    />
                  )}
                </div>
              )}
              {/* Legacy local results (fallback) */}
              {backtestResults && !multiDayResults && (
                <div className="border-t border-border">
                  <button
                    onClick={() => setResultsCollapsed(!resultsCollapsed)}
                    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <span>Backtest Results</span>
                    {resultsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!resultsCollapsed && (
                    <BenchmarkingPanel
                      dailyResult={null}
                      multiDayResponse={null}
                      legacyResults={backtestResults}
                      legacyCandles={candles}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => setRightSidebarCollapsed(false)}
            className="bg-card border border-border rounded-r-lg px-2 hover:bg-secondary"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Footer - Execution Summary (backend) */}
      {activeDayResult && activeDayResult.status === 'OK' && (
        <div className="bg-card border-t border-border">
          <button
            onClick={() => setSummaryCollapsed(!summaryCollapsed)}
            className="w-full px-6 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <span>Execution Summary — {activeDate}</span>
            {summaryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {!summaryCollapsed && (
            <ExecutionSummary
              dailyResult={activeDayResult}
              multiDayResponse={multiDayResults!}
              params={strategyParams}
            />
          )}
        </div>
      )}
      {/* Legacy local results footer */}
      {backtestResults && !multiDayResults && (
        <div className="bg-card border-t border-border">
          <button
            onClick={() => setSummaryCollapsed(!summaryCollapsed)}
            className="w-full px-6 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <span>Execution Summary</span>
            {summaryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {!summaryCollapsed && (
            <ExecutionSummary
              dailyResult={null}
              multiDayResponse={null}
              legacyResults={backtestResults}
              params={strategyParams}
            />
          )}
        </div>
      )}
    </div>
  );
}
