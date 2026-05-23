/**
 * VWAP Server Service — Integration with VWAP Server API
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
  RuntimeTuningMapResponse,
  RuntimeTuningParams,
  RuntimeTuningDiffResponse,
  RuntimeTuningProfile,
  RuntimeTuningProfileRequest,
} from './vwap-server-types';

// Re-export types for convenience
export type { PretradeResponse };

// ── Strongly-typed diff response from GET /api/tuning/{key}/diff ─────────────
export interface TuningDiffEntry {
  current: number;
  default: number;
}

export interface TuningDiffResponse {
  key: string;
  overrideCount: number;
  overrides: Record<string, TuningDiffEntry>;
}

// ─────────────────────────────────────────────────────────────────────────────

const VWAP_SERVER_URL = "/api/vwap-server";

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
        // Attempt to forward server error text for better UX
        let errorDetail = `${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          if (text) errorDetail += `: ${text}`;
        } catch {
          // ignore
        }
        throw new Error(`VWAP Server API error: ${errorDetail}`);
      }

      return response;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  // ── Market ───────────────────────────────────────────────────────────────

  /** POST /api/market/open — Calibrate instruments before market open */
  async marketOpen(request: MarketOpenRequest): Promise<MarketOpenResponse> {
    const response = await this.fetch('/api/market/open', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /** POST /api/market/launch — Manually launch strategy workers */
  async marketLaunch(request?: { clientId?: string }): Promise<MarketLaunchResponse> {
    const response = await this.fetch('/api/market/launch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /** GET /api/market/status — Get current market status */
  async getMarketStatus(): Promise<MarketStatusResponse> {
    const response = await this.fetch('/api/market/status');
    return response.json();
  }

  // ── Analytics ────────────────────────────────────────────────────────────

  /**
 * GET /api/analytics/pretrade — Get pretrade baseline arrays.
 *
 * @param instrumentKey  Composite key in the form "clientId::NSE_EQ|ISIN"
 *                       (e.g. "TRADER_DESK::NSE_EQ|INE040A01034").
 *                       The backend requires the composite form to scope
 *                       the pretrade arrays to the correct client session.
 */
  async getPretrade(instrumentKey: string, bins: number = 375): Promise<PretradeResponse> {
    const response = await this.fetch(
      `/api/analytics/pretrade?instrumentKey=${encodeURIComponent(instrumentKey)}&bins=${bins}`
    );
    return response.json();
  }

  /** GET /api/analytics/instruments — List all registered instruments */
  async getInstruments(): Promise<InstrumentsResponse> {
    const response = await this.fetch('/api/analytics/instruments');
    return response.json();
  }

  /** GET /api/analytics/status — Health probe */
  async getAnalyticsStatus(): Promise<AnalyticsStatusResponse> {
    const response = await this.fetch('/api/analytics/status');
    return response.json();
  }

  // ── Market Data ──────────────────────────────────────────────────────────

  /** GET /api/marketdata/latest?instrumentKey= — Get latest candle and current tick */
  async getMarketDataLatest(instrumentKey: string): Promise<MarketDataLatestResponse> {
    const response = await this.fetch(
      `/api/marketdata/latest?instrumentKey=${encodeURIComponent(instrumentKey)}`
    );
    return response.json();
  }

  /** GET /api/marketdata/candles?instrumentKey=&from=&to= — Get intraday candles */
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

  /** Health check — verify VWAP Server is available */
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('/api/analytics/status');
      return true;
    } catch {
      return false;
    }
  }

  // ── Clients ──────────────────────────────────────────────────────────────

  /** POST /api/clients — Creates a new client */
  async createClient(request: CreateClientRequest): Promise<ClientResponse> {
    const response = await this.fetch('/api/clients', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /** GET /api/clients — Returns all clients with resolved profile details */
  async getClients(): Promise<ClientResponse[]> {
    const response = await this.fetch('/api/clients');
    return response.json();
  }

  /** GET /api/clients/{clientId} — Returns a single client by ID */
  async getClient(clientId: string): Promise<ClientResponse> {
    const response = await this.fetch(`/api/clients/${encodeURIComponent(clientId)}`);
    return response.json();
  }

  /** PATCH /api/clients/{clientId} — Partial update of mutable fields */
  async updateClient(clientId: string, request: Partial<CreateClientRequest>): Promise<ClientResponse> {
    const response = await this.fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /** PATCH /api/clients/{clientId}/risk-profile — Changes the active risk profile */
  async changeRiskProfile(clientId: string, request: ChangeRiskProfileRequest): Promise<ClientResponse> {
    const response = await this.fetch(`/api/clients/${encodeURIComponent(clientId)}/risk-profile`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /** DELETE /api/clients/{clientId} — Removes a client */
  async deleteClient(clientId: string): Promise<ClientResponse> {
    const response = await this.fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
      method: 'DELETE',
    });
    return response.json();
  }

  // ── Risk Profiles ────────────────────────────────────────────────────────

  /** GET /api/risk-profiles — Returns all profiles (built-in + custom) */
  async getRiskProfiles(): Promise<RiskProfileResponse[]> {
    const response = await this.fetch('/api/risk-profiles');
    return response.json();
  }

  /** GET /api/risk-profiles/{profileId} — Returns one profile by ID */
  async getRiskProfile(profileId: string): Promise<RiskProfileResponse> {
    const response = await this.fetch(`/api/risk-profiles/${encodeURIComponent(profileId)}`);
    return response.json();
  }

  /** POST /api/risk-profiles — Creates a new custom profile */
  async createRiskProfile(request: RiskProfileRequest): Promise<RiskProfileResponse> {
    const response = await this.fetch('/api/risk-profiles', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /** PATCH /api/risk-profiles/{profileId} — Partial update of a custom profile */
  async updateRiskProfile(
    profileId: string,
    request: Partial<RiskProfileRequest>
  ): Promise<RiskProfileResponse> {
    const response = await this.fetch(`/api/risk-profiles/${encodeURIComponent(profileId)}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /** DELETE /api/risk-profiles/{profileId} — Deletes a custom profile */
  async deleteRiskProfile(profileId: string): Promise<{ status: string; message: string }> {
    const response = await this.fetch(`/api/risk-profiles/${encodeURIComponent(profileId)}`, {
      method: 'DELETE',
    });
    return response.json();
  }

  // ── Runtime Tuning ───────────────────────────────────────────────────────

  /**
   * GET /api/tuning
   * Returns { count, keys } — all registered instrument keys that have tuning state.
   */
  async getTuning(): Promise<RuntimeTuningMapResponse> {
    const response = await this.fetch('/api/tuning');
    return response.json();
  }

  /**
   * GET /api/tuning/{key}
   * Returns the current RuntimeTuningParams snapshot for an instrument.
   * key format: "CLIENT_ID::NSE_EQ|ISIN" (URL-encoded by this method).
   */
  async getTuningKey(key: string): Promise<RuntimeTuningParams> {
    const response = await this.fetch(`/api/tuning/${encodeURIComponent(key)}`);
    return response.json();
  }

  /**
   * GET /api/tuning/{key}/diff
   * Returns parameters that differ from factory defaults.
   * Response shape: { key, overrideCount, overrides: { [paramName]: { current, default } } }
   */
  async getTuningDiff(key: string): Promise<TuningDiffResponse> {
    const response = await this.fetch(`/api/tuning/${encodeURIComponent(key)}/diff`);
    return response.json();
  }

  /**
   * PATCH /api/tuning/{key}
   * Applies a partial parameter update. Only supplied (non-null) fields are written.
   * Returns the full post-patch snapshot.
   * Returns 400 with plain-text validation error on constraint violation.
   */
  async updateTuning(
    key: string,
    request: Partial<RuntimeTuningParams>
  ): Promise<RuntimeTuningParams> {
    const response = await this.fetch(`/api/tuning/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * POST /api/tuning/{key}/reset
   * Resets all params to factory defaults and returns the new snapshot.
   */
  async resetTuning(key: string): Promise<RuntimeTuningParams> {
    const response = await this.fetch(`/api/tuning/${encodeURIComponent(key)}/reset`, {
      method: 'POST',
    });
    return response.json();
  }

  // ── Runtime Tuning Profiles ──────────────────────────────────────────────

  /** GET /api/runtime-tuning-profiles — List all saved profiles */
  async getRuntimeTuningProfiles(): Promise<RuntimeTuningProfile[]> {
    const response = await this.fetch('/api/runtime-tuning-profiles');
    return response.json();
  }

  /** GET /api/runtime-tuning-profiles/{id} — Get profile by numeric ID */
  async getRuntimeTuningProfile(id: number): Promise<RuntimeTuningProfile> {
    const response = await this.fetch(`/api/runtime-tuning-profiles/${id}`);
    return response.json();
  }

  /** GET /api/runtime-tuning-profiles/by-name/{profileName} — Get profile by name */
  async getRuntimeTuningProfileByName(profileName: string): Promise<RuntimeTuningProfile> {
    const response = await this.fetch(
      `/api/runtime-tuning-profiles/by-name/${encodeURIComponent(profileName)}`
    );
    return response.json();
  }

  /** POST /api/runtime-tuning-profiles — Create a new profile */
  async createRuntimeTuningProfile(request: RuntimeTuningProfileRequest): Promise<RuntimeTuningProfile> {
    const response = await this.fetch('/api/runtime-tuning-profiles', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * PUT /api/runtime-tuning-profiles/{id} — Full update of a saved profile.
   * Note: PUT (not PATCH) — the full request body replaces the entity.
   */
  async updateRuntimeTuningProfile(
    id: number,
    request: RuntimeTuningProfileRequest
  ): Promise<RuntimeTuningProfile> {
    const response = await this.fetch(`/api/runtime-tuning-profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /** DELETE /api/runtime-tuning-profiles/{id} — Delete a saved profile */
  async deleteRuntimeTuningProfile(id: number): Promise<void> {
    await this.fetch(`/api/runtime-tuning-profiles/${id}`, { method: 'DELETE' });
  }
}

// Export singleton instance
export const vwapServerService = new VWAPServerService();

// Export class for testing
export { VWAPServerService };