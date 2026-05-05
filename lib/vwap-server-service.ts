/**
 * VWAP Server Service - Integration with VWAP Server API
 * Handles communication with the VWAP Server running on localhost:5000
 */

import {
  MarketOpenRequest,
  MarketOpenResponse,
  MarketLaunchResponse,
  MarketStatusResponse,
  PretradeResponse,
  InstrumentsResponse,
  AnalyticsStatusResponse,
  MarketDataLatestResponse,
  MarketDataCandlesResponse,
} from './vwap-server-types';

// Re-export types for convenience
export type { PretradeResponse };

const VWAP_SERVER_URL = process.env.NEXT_PUBLIC_VWAP_SERVER_URL || 'http://localhost:5000';

class VWAPServerService {
  private baseUrl: string;

  constructor(baseUrl: string = VWAP_SERVER_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`VWAP Server API error: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  /**
   * POST /api/market/open
   * Calibrate instruments before market open
   */
  async marketOpen(request: MarketOpenRequest): Promise<MarketOpenResponse> {
    const response = await this.fetch('/api/market/open', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * POST /api/market/launch
   * Manually launch strategy workers
   */
  async marketLaunch(): Promise<MarketLaunchResponse> {
    const response = await this.fetch('/api/market/launch', {
      method: 'POST',
    });
    return response.json();
  }

  /**
   * GET /api/market/status
   * Get current market status
   */
  async getMarketStatus(): Promise<MarketStatusResponse> {
    const response = await this.fetch('/api/market/status');
    return response.json();
  }

  /**
   * GET /api/analytics/pretrade
   * Get pretrade baseline arrays
   */
  async getPretrade(instrumentKey: string, bins: number = 375): Promise<PretradeResponse> {
    const response = await this.fetch(
      `/api/analytics/pretrade?instrumentKey=${encodeURIComponent(instrumentKey)}&bins=${bins}`
    );
    return response.json();
  }

  /**
   * GET /api/analytics/instruments
   * List all registered instruments
   */
  async getInstruments(): Promise<InstrumentsResponse> {
    const response = await this.fetch('/api/analytics/instruments');
    return response.json();
  }

  /**
   * GET /api/analytics/status
   * Health probe
   */
  async getAnalyticsStatus(): Promise<AnalyticsStatusResponse> {
    const response = await this.fetch('/api/analytics/status');
    return response.json();
  }

  /**
   * GET /api/marketdata/{instrumentId}/{symbol}/latest
   * Get latest candle and current tick
   */
  async getMarketDataLatest(instrumentId: number, symbol: string): Promise<MarketDataLatestResponse> {
    const response = await this.fetch(`/api/marketdata/${instrumentId}/${encodeURIComponent(symbol)}/latest`);
    return response.json();
  }

  /**
   * GET /api/marketdata/{instrumentId}/{symbol}/candles
   * Get intraday candles
   */
  async getMarketDataCandles(
    instrumentId: number,
    symbol: string,
    from?: number,
    to?: number
  ): Promise<MarketDataCandlesResponse> {
    let url = `/api/marketdata/${instrumentId}/${encodeURIComponent(symbol)}/candles`;
    const params = new URLSearchParams();
    if (from !== undefined) params.append('from', from.toString());
    if (to !== undefined) params.append('to', to.toString());
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await this.fetch(url);
    return response.json();
  }

  /**
   * Health check - verify VWAP Server is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('/api/analytics/status');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const vwapServerService = new VWAPServerService();

// Export class for testing
export { VWAPServerService };
