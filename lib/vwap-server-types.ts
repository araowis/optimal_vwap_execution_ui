/**
 * VWAP Server Types
 * TypeScript types for VWAP Server API responses and WebSocket messages
 */

// Client Types
export interface CreateClientRequest {
  clientId?: string;
  name?: string;
  riskProfileId?: string;
  defaultLambda?: number;
  defaultNBins?: number;
  capitalLimit?: number;
  metadata?: Record<string, string>;
}

export interface ChangeRiskProfileRequest {
  riskProfileId?: string;
}

export interface ClientResponse {
  clientId?: string;
  name?: string;
  riskProfileId?: string;
  riskProfileDisplayName?: string;
  profileLambda?: number;
  profileNBins?: number;
  defaultLambda?: number;
  defaultNBins?: number;
  effectiveLambda?: number;
  effectiveNBins?: number;
  capitalLimit?: number;
  metadata?: Record<string, string>;
}

// Risk Profile Types
export interface RiskProfileRequest {
  profileId?: string;
  displayName?: string;
  defaultLambda?: number;
  defaultNBins?: number;
}

export interface RiskProfileResponse {
  profileId?: string;
  displayName?: string;
  defaultLambda?: number;
  defaultNBins?: number;
  isDefault?: boolean;
}

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

export interface MarketDataCandle {
  instrumentKey: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
}

export interface MarketDataLatestResponse {
  candles: MarketDataCandle[];
  current: MarketDataCandle;
  lastIndex: number;
}

export interface MarketDataCandlesResponse {
  candles: MarketDataCandle[];
  current: MarketDataCandle;
  lastIndex: number;
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
