/**
 * VWAP Server Types
 * TypeScript types for VWAP Server API responses and WebSocket messages
 */

// Market Open Types
export interface MarketOpenInstrument {
  instrumentKey: string;
  totalQty: number;
  nBins: number;
  lambda: number;
  timezone?: string;
}

export interface MarketOpenRequest {
  instruments: MarketOpenInstrument[];
}

export interface MarketOpenResponse {
  status: 'calibrated' | 'error';
  instrumentsCalibrated: number;
  instruments: string[];
  message: string;
}

export interface MarketLaunchResponse {
  status: 'launched' | 'already_launched' | 'error';
  message: string;
}

export interface MarketStatusResponse {
  phase: 'IDLE' | 'CALIBRATED' | 'LAUNCHED';
  calibrated: boolean;
  launched: boolean;
  serverTimeIST: string;
}

// Analytics Types
export interface PretradeStats {
  histDayCount: number;
  avgDailyVolume: number;
  K: number;
  sigma2Hat: number;
  avgDailyRetPct: number;
  residualRisk: number;
  residualRiskFormula: number;
  totalBins: number;
  outputBins: number;
}

export interface PretradeResponse {
  instrumentKey: string;
  stats: {
    histDayCount: number;
    avgDailyVolume: number;
    K: number;
    sigma2Hat: number;
    avgDailyRetPct: number;
    residualRisk: number;
    residualRiskFormula: number;
    totalBins: number;
    outputBins: number;
  };
  timeLabels: string[];
  tNormGrid: number[];
  eXt: number[];
  varXt: number[];
  varXtScaled: number[];
  sigma2t: number[];
  muT: number[];
  executionScore: number[];
  avgVolumePerBar: number[];
}

export interface InstrumentInfo {
  instrumentKey: string;
  histDayCount: number;
  avgDailyVolume: number;
  sigma2Hat: number;
  sessionLive: boolean;
  dataStalenessMs: number;
}

export interface InstrumentsResponse {
  registeredCount: number;
  instruments: InstrumentInfo[];
}

export interface AnalyticsStatusResponse {
  status: string;
  registeredInstruments: number;
  liveInstruments: number;
}

// Market Data Types
export interface CurrentTick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataLatestResponse {
  symbol: string;
  candles: any[];
  current: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
  lastIndex: number;
}

export interface MarketDataCandlesResponse {
  symbol: string;
  candles: any[];
}

// WebSocket Types
export interface WSMessage {
  type: 'connected' | 'signal' | 'calibration' | 'regime';
}

export interface WSConnectedMessage extends WSMessage {
  type: 'connected';
}

export interface WSSignalMessage extends WSMessage {
  type: 'signal';
  instrument: string;
  marketTime: string;
  binIdx: number;
  frac: number;
  qty: number;
  cumTarget: number;
  executedBefore: number;
  totalQty: number;
  ltp: number;
  atp: number;
  trendingUp: boolean;
  trendingDown: boolean;
  xStar: number;
  urgency: number;
}

export interface WSCalibrationMessage extends WSMessage {
  type: 'calibration';
  instrument: string;
  marketTime: string;
  barIdx: number;
  trendScore: number;
  trendAcceleration: number;
  trendingUp: boolean;
  trendingDown: boolean;
  lambda: number;
  currentVWAP: number;
  intradayAlpha: number;
  barQuality: number;
  executedFrac: number;
  eXt: number[];
  xStar: number[];
}

export interface WSRegimeMessage extends WSMessage {
  type: 'regime';
  instrument: string;
  barIdx: number;
  previousRegime: 'UP' | 'DOWN' | 'NEUTRAL';
  newRegime: 'UP' | 'DOWN' | 'NEUTRAL';
  trendScore: number;
}

export type WSParsedMessage =
  | WSConnectedMessage
  | WSSignalMessage
  | WSCalibrationMessage
  | WSRegimeMessage;

// WebSocket Event Handlers
export interface VWAPWebSocketHandlers {
  onConnected?: () => void;
  onSignal?: (signal: WSSignalMessage) => void;
  onCalibration?: (calibration: WSCalibrationMessage) => void;
  onRegime?: (regime: WSRegimeMessage) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}
