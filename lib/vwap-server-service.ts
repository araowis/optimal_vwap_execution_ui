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
  CreateClientRequest,
  ChangeRiskProfileRequest,
  ClientResponse,
  RiskProfileRequest,
  RiskProfileResponse,
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
   * GET /api/marketdata/latest?instrumentKey=
   * Get latest candle and current tick
   */
  async getMarketDataLatest(instrumentKey: string): Promise<MarketDataLatestResponse> {
    const response = await this.fetch(`/api/marketdata/latest?instrumentKey=${encodeURIComponent(instrumentKey)}`);
    return response.json();
  }

  /**
   * GET /api/marketdata/candles?instrumentKey=&from=&to=
   * Get intraday candles
   */
  async getMarketDataCandles(
    instrumentKey: string,
    from?: number,
    to?: number
  ): Promise<MarketDataCandlesResponse> {
    let url = `/api/marketdata/candles?instrumentKey=${encodeURIComponent(instrumentKey)}`;
    if (from !== undefined) url += `&from=${from}`;
    if (to !== undefined) url += `&to=${to}`;
    
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

  /**
   * POST /api/clients
   * Creates a new client
   */
  async createClient(request: CreateClientRequest): Promise<ClientResponse> {
    const response = await this.fetch('/api/clients', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * GET /api/clients
   * Returns all clients with resolved profile details
   */
  async getClients(): Promise<ClientResponse[]> {
    const response = await this.fetch('/api/clients');
    return response.json();
  }

  /**
   * GET /api/clients/{clientId}
   * Returns a single client by ID
   */
  async getClient(clientId: string): Promise<ClientResponse> {
    const response = await this.fetch(`/api/clients/${encodeURIComponent(clientId)}`);
    return response.json();
  }

  /**
   * PATCH /api/clients/{clientId}
   * Partial update of mutable fields
   */
  async updateClient(clientId: string, request: Partial<CreateClientRequest>): Promise<ClientResponse> {
    const response = await this.fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * PATCH /api/clients/{clientId}/risk-profile
   * Changes the active risk profile
   */
  async changeRiskProfile(clientId: string, request: ChangeRiskProfileRequest): Promise<ClientResponse> {
    const response = await this.fetch(`/api/clients/${encodeURIComponent(clientId)}/risk-profile`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * DELETE /api/clients/{clientId}
   * Removes a client
   */
  async deleteClient(clientId: string): Promise<ClientResponse> {
    const response = await this.fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
      method: 'DELETE',
    });
    return response.json();
  }

  /**
   * GET /api/risk-profiles
   * Returns all profiles (built-in + custom)
   */
  async getRiskProfiles(): Promise<RiskProfileResponse[]> {
    const response = await this.fetch('/api/risk-profiles');
    return response.json();
  }

  /**
   * GET /api/risk-profiles/{profileId}
   * Returns one profile by ID
   */
  async getRiskProfile(profileId: string): Promise<RiskProfileResponse> {
    const response = await this.fetch(`/api/risk-profiles/${encodeURIComponent(profileId)}`);
    return response.json();
  }

  /**
   * POST /api/risk-profiles
   * Creates a new custom profile
   */
  async createRiskProfile(request: RiskProfileRequest): Promise<RiskProfileResponse> {
    const response = await this.fetch('/api/risk-profiles', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * PATCH /api/risk-profiles/{profileId}
   * Partial update of a custom profile
   */
  async updateRiskProfile(profileId: string, request: Partial<RiskProfileRequest>): Promise<RiskProfileResponse> {
    const response = await this.fetch(`/api/risk-profiles/${encodeURIComponent(profileId)}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * DELETE /api/risk-profiles/{profileId}
   * Deletes a custom profile
   */
  async deleteRiskProfile(profileId: string): Promise<{ status: string; message: string }> {
    const response = await this.fetch(`/api/risk-profiles/${encodeURIComponent(profileId)}`, {
      method: 'DELETE',
    });
    return response.json();
  }
}

// Export singleton instance
export const vwapServerService = new VWAPServerService();

// Export class for testing
export { VWAPServerService };
