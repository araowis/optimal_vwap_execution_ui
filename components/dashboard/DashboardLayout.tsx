'use client';

import { useState, useEffect, useRef } from 'react';
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

  const handleDataUpload = (data: Candle[], logo?: string, name?: string) => {
    setCandles(data);
    setChartData([]);
    setCompanyLogo(logo || '');
    setInstrumentName(name || '');
  };

  const handleWatchlistStockSelect = async (stock: any) => {
    console.log('handleWatchlistStockSelect called with stock:', stock);
    console.log('upstoxAccessToken present:', !!upstoxAccessToken);
    console.log('rightSidebarCollapsed:', rightSidebarCollapsed);
    
    setSelectedWatchlistStock(stock);
    setRightSidebarCollapsed(false); // Auto-expand right sidebar when stock is selected
    console.log('selectedWatchlistStock set to:', stock);
    console.log('rightSidebarCollapsed set to false');
    
    if (!upstoxAccessToken) return;

    try {
      // Fetch last 30 days of historical candle data for the selected stock
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const toDate = today.toISOString().split('T')[0];
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      
      const url = `/api/upstox/historical-candle?instrumentKey=${encodeURIComponent(stock.instrument_key)}&interval=day&toDate=${toDate}&fromDate=${fromDate}`;
      console.log('Fetching from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${upstoxAccessToken}`,
        },
      });

      const result = await response.json();
      console.log('Historical candle result:', result);
      console.log('Result data structure:', JSON.stringify(result.data, null, 2));

      if (result.ok && result.data?.data?.candles) {
        const candles = result.data.data.candles.map((candle: any) => ({
          timestamp: new Date(candle[0]),
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
          volume: candle[5],
        }));

        console.log('Setting candles:', candles.length, 'candles');
        console.log('First candle:', candles[0]);
        setCandles(candles);
        setChartData([]);
        setCompanyLogo(stock.company?.domain ? `https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=64` : '');
        setInstrumentName(stock.name);
        console.log('Company logo set to:', stock.company?.domain ? `https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=64` : '');
        console.log('Instrument name set to:', stock.name);
      } else {
        console.error('No candles in result, checking alternative paths');
        console.log('result.data:', result.data);
        console.log('result.data.data:', result.data?.data);
        console.log('result.data.candles:', result.data?.candles);
      }
    } catch (error) {
      console.error('Failed to load stock data:', error);
    }
  };

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
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">Left Panel</span>
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
                <span className="text-xs font-medium text-muted-foreground">Right Panel</span>
                <button
                  onClick={() => setRightSidebarCollapsed(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {selectedWatchlistStock ? (
                <StockDetailPanel
                  stock={selectedWatchlistStock}
                  accessToken={upstoxAccessToken}
                  mode={mode}
                  onClose={() => setSelectedWatchlistStock(null)}
                />
              ) : (
                <div className="p-4 text-xs text-muted-foreground">
                  Select a stock from the watchlist to see details
                </div>
              )}
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
