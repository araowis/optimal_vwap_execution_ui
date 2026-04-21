// Core OHLCV Candle Data
export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number; // Open Interest
}

// VWAP Calculation Results
export interface VWAPData {
  timestamp: Date;
  vwap: number;
  upperBand: number;
  lowerBand: number;
  stdDev: number;
  cumulativeTP: number; // Typical Price * Volume
  cumulativeVolume: number;
}

// Volume Bin Allocation
export interface VolumeBin {
  priceLevel: number;
  volume: number;
  percentage: number;
}

// Complete datapoint with all calculations
export interface ChartDatapoint {
  candle: Candle;
  vwapData: VWAPData;
  volumeBins: VolumeBin[];
  buySignal?: BuySignal;
  deviationFromVWAP: number; // Close - VWAP
  deviationPercentage: number; // (Close - VWAP) / VWAP * 100
}

// Buy Signal Detection
export interface BuySignal {
  timestamp: Date;
  price: number;
  vwap: number;
  volume: number;
  signalStrength: number; // 0-100, confidence score
  reason: string;
  tranche?: number;
}

// Strategy Parameters
export interface StrategyParams {
  totalQuantity: number;
  numTranches: number;
  trancheSize: number;
  maxSlippage: number; // Percentage
  vwapDeviation: number; // Percentage threshold for buy signal
  minVolumeThreshold: number;
  orderType: 'LIMIT' | 'MARKET';
  executionTimeframe: 'INTRADAY' | 'MULTI_DAY';
  enableTxCosts: boolean;
  txCostConfig: {
    brokeragePercent: number;
    sttPercent: number;
    gstPercent: number;
    exchangeFeePercent: number;
    spreadBps: number;
  };
}

// Backtest Configuration
export interface BacktestConfig {
  strategyParams: StrategyParams;
  startDate: Date;
  endDate: Date;
  initialPrice: number; // Arrival price
  fees: FeeStructure;
}

// Fee Structure
export interface FeeStructure {
  spreadBps: number; // Spread in basis points
  brokerage: number; // Brokerage in %
  stt: number; // Securities Transaction Tax in %
  gst: number; // Goods and Services Tax in %
  exchangeFee: number; // Exchange fee in %
}

// Transaction Cost Breakdown
export interface TransactionCost {
  spreadCost: number;
  brokerage: number;
  stt: number;
  gst: number;
  exchangeFee: number;
  totalCost: number;
  totalCostBps: number; // In basis points
}

// Backtest Results
export interface BacktestResult {
  executedQuantity: number;
  avgExecutionPrice: number;
  vwapDuringExecution: number;
  vwapAtOrderEntry: number;
  executionVsVWAP: number; // Absolute
  executionVsVWAPPct: number; // Percentage
  implementationShortfall: number;
  vwapParticipation: number; // Percentage
  effectiveSpread: number; // Actual spread paid
  executionEfficiency: number;
  totalCost: TransactionCost;
  maxAdverseExcursion: number;
  drawdown: number;
  executionsByTranche: TranchExecution[];
  trades: TradeExecution[];
  metrics: PerformanceMetrics;
}

// Single Trade Execution
export interface TradeExecution {
  timestamp: Date;
  quantity: number;
  price: number;
  tranche: number;
  vwapAtExecution: number;
}

// Tranche Level Execution
export interface TranchExecution {
  tranche: number;
  quantity: number;
  avgPrice: number;
  vwapAvg: number;
  deviation: number;
  executionTime: number; // minutes
  trades: TradeExecution[];
}

// Performance Metrics
export interface PerformanceMetrics {
  sharpeRatio: number;
  captureRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
}

// Customization Preferences
export interface CustomizationPrefs {
  chartPeriod: 'MINUTE' | '5MIN' | '15MIN' | 'HOURLY' | 'DAILY';
  chartType: 'CANDLESTICK' | 'OHLC' | 'LINE';
  vwapVisible: boolean;
  bandsVisible: boolean;
  bandWidth: number; // Standard deviation multiplier
  bandColor: {
    line: string;
    upper: string;
    lower: string;
    fillOpacity: number;
  };
  volumeVisible: boolean;
  volumeBinsVisible: boolean;
  numVolumeBins: 5 | 10 | 20 | 50;
  volumeColoring: 'MONOCHROME' | 'GRADIENT' | 'BY_PRICE';
  signalsVisible: boolean;
  signalMarkerSize: number;
  signalStrengthThreshold: number;
  theme: 'LIGHT' | 'DARK';
  hoverDetailsVisible: boolean;
}

// API Integration Types
export interface UpstoxConfig {
  apiKey: string;
  accessToken?: string;
  instrumentKey?: string;
}

// WebSocket Message Types
export interface WSMessage {
  type: 'BACKTEST_PROGRESS' | 'BACKTEST_COMPLETE' | 'PRICE_UPDATE' | 'SIGNAL' | 'ERROR';
  data: any;
  timestamp: Date;
  progress?: number; // 0-100
  message?: string;
}
