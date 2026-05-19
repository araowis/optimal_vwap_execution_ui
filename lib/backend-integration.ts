/**
 * Java Backend Integration Guide
 *
 * This file provides the structure for integrating with a Java backend
 * for advanced backtest execution and real-time market data.
 */

import { BacktestConfig, StrategyParams, WSMessage } from "./types";

/**
 * BackendClient - Handles all communication with Java backend
 */
export class BackendClient {
  private baseUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(
    baseUrl: string = "http://localhost:4567",
    wsUrl: string = "ws://localhost:4567",
  ) {
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
  }

  /**
   * Run strategy with custom parameters (Java backend equivalent)
   */
  async runStrategy(params: {
    date: string;
    quantity: number;
    participation: number;
    lambda: number;
    bins: number;
    sigma: number;
    blend: number;
    warmUpMinutes: number;
    vwapWindowMinutes: number;
    enableTxCosts: boolean;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/run-strategy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Strategy execution failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get summary statistics
   */
  async getSummary(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/summary`);

    if (!response.ok) {
      throw new Error(`Failed to fetch summary: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get daily results
   */
  async getDailyResults(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/daily`);

    if (!response.ok) {
      throw new Error(`Failed to fetch daily results: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get chart data for specific date
   */
  async getChartData(date: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/chart/${date}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch chart data: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get cumulative P&L
   */
  async getPnL(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/pnl`);

    if (!response.ok) {
      throw new Error(`Failed to fetch P&L: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get pretrade analysis
   */
  async getPretrade(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/pretrade`);

    if (!response.ok) {
      throw new Error(`Failed to fetch pretrade: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get execution logs for specific date
   */
  async getExecutionLogs(date: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/execution/${date}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch execution logs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get volume curve for specific date
   */
  async getVolumeCurve(date: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/volume-curve/${date}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch volume curve: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get bin allocation
   */
  async getBinAllocation(
    date: string,
    bins: number,
    quantity: number,
  ): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/bin-allocation?date=${date}&bins=${bins}&quantity=${quantity}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch bin allocation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get correction logs for specific date
   */
  async getCorrectionLogs(date: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/corrections/${date}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch correction logs: ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Connect to WebSocket for real-time updates (Java backend)
   */
  connectWebSocket(
    onMessage: (message: WSMessage) => void,
    onError: (error: Error) => void,
  ): void {
    try {
      this.ws = new WebSocket(`${this.wsUrl}/ws`);

      this.ws.onopen = () => {
        console.log("WebSocket connected to Java backend");
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          onMessage(message);
        } catch (e) {
          onError(new Error(`Failed to parse WebSocket message: ${e}`));
        }
      };

      this.ws.onerror = (event) => {
        onError(new Error("WebSocket error occurred"));
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
      };
    } catch (e) {
      onError(new Error(`Failed to connect WebSocket: ${e}`));
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/`);

    if (!response.ok) {
      throw new Error("Backend health check failed");
    }

    return { status: "ok", version: "1.0.0" };
  }
}

/**
 * Expected Java Backend API Endpoints (WebDashboard.java)
 *
 * GET /api/summary
 * - Output: Summary statistics
 *
 * GET /api/daily
 * - Output: Daily results array
 *
 * GET /api/chart/:date
 * - Output: Chart data for specific date
 *
 * GET /api/pnl
 * - Output: Cumulative P&L data
 *
 * GET /api/pretrade
 * - Output: Pretrade analysis
 *
 * GET /api/execution/:date
 * - Output: Execution logs for specific date
 *
 * POST /api/run-strategy
 * - Input: Strategy parameters
 * - Output: Execution results
 *
 * GET /api/volume-curve/:date
 * - Output: Volume curve for specific date
 *
 * GET /api/bin-allocation
 * - Input: date, bins, quantity
 * - Output: Bin allocation data
 *
 * GET /api/corrections/:date
 * - Output: Correction logs for specific date
 *
 * WS /ws
 * - Streams: Real-time updates
 *
 * GET /
 * - Output: HTML dashboard
 */

/**
 * Usage Example:
 *
 * const client = new BackendClient('http://localhost:4567');
 *
 * // Run strategy
 * const result = await client.runStrategy({
 *   date: '2026-01-02',
 *   quantity: 10000,
 *   participation: 5.0,
 *   lambda: 0.1,
 *   bins: 10,
 *   sigma: 0.0012,
 *   blend: 0.5,
 *   warmUpMinutes: 5,
 *   vwapWindowMinutes: 20,
 *   enableTxCosts: true
 * });
 *
 * // Get summary
 * const summary = await client.getSummary();
 *
 * // Get daily results
 * const daily = await client.getDailyResults();
 *
 * // Get chart data
 * const chartData = await client.getChartData('2026-01-02');
 *
 * // Connect WebSocket
 * client.connectWebSocket(
 *   (message) => {
 *     console.log('Message:', message);
 *   },
 *   (error) => console.error('WebSocket error:', error)
 * );
 */
