export interface WatchlistInstrument {
  watchlistId: string;

  instrumentKey: string;

  tradingSymbol?: string;

  name?: string;

  position: number;

  isCalibrated: boolean;
}

export interface Watchlist {
  watchlistId: string;
  clientId: string;
  name: string;
  instruments: WatchlistInstrument[];

  createdAt: string;
  lastModifiedAt: string;

  isActive: boolean;

  size: number;

  isFullyCalibrated: boolean;
}

export interface CreateWatchlistRequest {
  watchlistId?: string;
  name: string;
}

export interface UpdateWatchlistRequest {
  name?: string;
  isActive?: boolean;
}

export interface AddInstrumentRequest {
  instrumentKey: string;

  tradingSymbol: string;

  name: string;

  exchange: string;

  instrumentType: string;

  lotSize: string;

  upsertIfAbsent: boolean;
}

export interface CalibrationRequest {
  isCalibrated: boolean;
}

export interface InstrumentCalibrationResponse {
  watchlistId: string;
  instrumentKey: string;
  isCalibrated: boolean;
  position: number;
}

export interface ApiErrorResponse {
  status: string;
  message: string;
}