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
import { CustomizationPrefs, Candle, ChartDatapoint, BacktestResult, StrategyParams } from '@/lib/types';
import { BacktestService } from '@/lib/backtest-service';
import { useUpstoxWebSocket } from '@/lib/use-upstox-websocket';
import { fetchHistoricalCandles, getTodayDate, getYesterdayDate } from '@/lib/upstox-historical';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [instrumentName, setInstrumentName] = useState<string>('');
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [mode, setMode] = useState<'backtest' | 'realtime'>('backtest');
  const [chartTimeframeMode, setChartTimeframeMode] = useState<'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
  const [selectedWatchlistStock, setSelectedWatchlistStock] = useState<any>(null);
  const [upstoxAccessToken, setUpstoxAccessToken] = useState<string | null>(null);
  const [backTestProgress, setBackTestProgress] = useState(0);
  const [realtimePriceUpdate, setRealtimePriceUpdate] = useState<{ ltp: number; timestamp: number; volume?: number } | undefined>(undefined);

  const [strategyParams, setStrategyParams] = useState<StrategyParams>({
    totalQuantity: 100000,
    numTranches: 5,
    trancheSize: 20000,
    maxSlippage: 0.1,
    vwapDeviation: 0.5,
    minVolumeThreshold: 0,
    orderType: 'LIMIT',
    executionTimeframe: 'INTRADAY',
    enableTxCosts: false,
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

  const handleRunBacktest = async (params: StrategyParams) => {
    if (candles.length === 0) {
      alert('Please upload data first');
      return;
    }

    setStrategyParams(params);
    setIsBacktesting(true);
    setBackTestProgress(0);
    setBackTestMessage('Initializing backtest...');

    try {
      // Progress simulation with verbose messages
      const steps = [
        { progress: 5, message: 'Validating input data...' },
        { progress: 15, message: 'Parsing market data and timestamps...' },
        { progress: 25, message: 'Calculating VWAP for all candles...' },
        { progress: 35, message: 'Computing VWAP bands and deviations...' },
        { progress: 45, message: 'Detecting buy signals based on parameters...' },
        { progress: 55, message: 'Allocating volumes across price bins...' },
        { progress: 65, message: 'Simulating tranche execution...' },
        { progress: 75, message: 'Computing transaction costs and fees...' },
        { progress: 85, message: 'Benchmarking performance vs VWAP...' },
        { progress: 95, message: 'Finalizing results and metrics...' },
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setBackTestProgress(step.progress);
        setBackTestMessage(step.message);
      }

      // Run actual backtest
      const service = new BacktestService(candles, params);
      const results = await service.runBacktest();

      setBackTestProgress(100);
      setBackTestMessage('Backtest complete!');
      setBacktestResults(results);
    } catch (error) {
      console.error('Backtest failed:', error);
      setBackTestMessage('Backtest failed. Please try again.');
    } finally {
      setIsBacktesting(false);
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
              <DataUploadPanel 
                onDataUpload={handleDataUpload} 
                mode={mode} 
                onWatchlistStockSelect={handleWatchlistStockSelect}
                onUpstoxTokenChange={setUpstoxAccessToken}
                wsConnected={wsConnected}
              />
              <ParametersPanel
                params={strategyParams}
                onParamsChange={setStrategyParams}
                onRunBacktest={handleRunBacktest}
                isRunning={isBacktesting}
                progress={backTestProgress}
                message={backTestMessage}
                onModeChange={setMode}
              />
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
          <ChartPanel
            candles={candles}
            chartData={chartData}
            customizationPrefs={customizationPrefs}
            onChartDataChange={setChartData}
            companyLogo={companyLogo}
            instrumentName={instrumentName}
            timeframeMode={chartTimeframeMode}
            onTimeframeChange={setChartTimeframeMode}
            mode={mode}
            realtimePriceUpdate={realtimePriceUpdate}
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
              <div className="flex items-center justify-end px-3 py-2 border-b border-border">
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
                mode={mode}
                wsConnected={wsConnected}
                onClose={() => setSelectedWatchlistStock(null)}
              />
              <CustomizationPanel
                preferences={customizationPrefs}
                onPreferencesChange={onPreferencesChange}
              />
              {backtestResults && (
                <div className="border-t border-border">
                  <button
                    onClick={() => setResultsCollapsed(!resultsCollapsed)}
                    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <span>Backtest Results</span>
                    {resultsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!resultsCollapsed && (
                    <BenchmarkingPanel results={backtestResults} candles={candles} />
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

      {/* Footer - Execution Summary */}
      {backtestResults && (
        <div className="bg-card border-t border-border">
          <button
            onClick={() => setSummaryCollapsed(!summaryCollapsed)}
            className="w-full px-6 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <span>Execution Summary</span>
            {summaryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {!summaryCollapsed && (
            <ExecutionSummary results={backtestResults} params={strategyParams} />
          )}
        </div>
      )}
    </div>
  );
}
