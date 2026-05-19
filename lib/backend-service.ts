/**
 * Backend Service - Integration with Java VWAP Backend
 * Handles communication with the Java Spring Boot backend running on localhost:8080
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export interface SummaryStats {
  totalShares: number;
  avgFillRate: number;
  daysBelowVwap: number;
  totalDays: number;
  totalSavings: number;
  avgFillPrice: number;
  avgVwap: number;
}

export interface DailyResult {
  date: string;
  fillRate: number;
  avgFillPrice: number;
  marketVwap: number;
  vwapSlippageBps: number;
  implementationShortfallBps: number;
  implementationShortfallRupees: number;
}

export interface ChartData {
  labels: string[];
  price: number[];
  vwap: number[];
  vwapUpper: number[];
  vwapLower: number[];
  volume: number[];
}

export interface StrategyParams {
  date: string;
  quantity: number;
  participation: number;
  lambda: number;
  sigma: number;
  bins: number;
  blend: number;
  warmUpMinutes: number;
  vwapWindowMinutes: number;
  enableTxCosts: boolean;
}

export interface StrategyResult {
  success: boolean;
  fillRate?: number;
  avgFillPrice?: number;
  marketVwap?: number;
  slippageBps?: number;
  implementationShortfallBps?: number;
  error?: string;
}

export interface VolumeCurveData {
  labels: string[];
  volume: number[];
  source: string;
}

export interface BinAllocation {
  binLabels: string[];
  binQuantities: number[];
  binVolumeFractions: number[];
  totalQuantity: number;
  numBins: number;
}

export interface CorrectionLog {
  time: string;
  reason: string;
  details: string;
  barIndex: number;
  lambda: number;
  sigma: number;
  participation: number;
  trend: string;
  marketSwing: number;
  ara: number;
  rra: number;
}

export interface CorrectionLogs {
  logs: CorrectionLog[];
  count: number;
}

class BackendService {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch(
    endpoint: string,
    options?: RequestInit,
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Backend API error: ${response.status} ${response.statusText}`,
        );
      }

      return response;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  /**
   * Get summary statistics across all trading days
   */
  async getSummary(): Promise<SummaryStats> {
    const response = await this.fetch("/api/summary");
    return response.json();
  }

  /**
   * Get daily results for all trading days
   */
  async getDailyResults(): Promise<DailyResult[]> {
    const response = await this.fetch("/api/daily");
    return response.json();
  }

  /**
   * Get chart data for a specific date
   */
  async getChartData(date: string): Promise<ChartData> {
    const response = await this.fetch(`/api/chart/${date}`);
    return response.json();
  }

  /**
   * Get cumulative P&L
   */
  async getPnL(): Promise<{ labels: string[]; cumulativePnL: number[] }> {
    const response = await this.fetch("/api/pnl");
    return response.json();
  }

  /**
   * Get pretrade analysis
   */
  async getPretrade(): Promise<any> {
    const response = await this.fetch("/api/pretrade");
    return response.json();
  }

  /**
   * Get execution logs for a specific date
   */
  async getExecutionLogs(date: string): Promise<any> {
    const response = await this.fetch(`/api/execution/${date}`);
    return response.json();
  }

  /**
   * Run strategy with custom parameters
   */
  async runStrategy(params: StrategyParams): Promise<StrategyResult> {
    const response = await this.fetch("/api/run-strategy", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return response.json();
  }

  /**
   * Run multi-day backtest using the new /api/backtest endpoint
   */
  async runMultiDayBacktest(request: {
    instrumentKey: string;
    bins: number;
    lambda: number;
    totalQty: number;
    dates: string[];
  }): Promise<import("./types").BacktestApiResponse> {
    const response = await this.fetch("/api/backtest", {
      method: "POST",
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * Get volume curve for a specific date
   */
  async getVolumeCurve(date: string): Promise<VolumeCurveData> {
    const response = await this.fetch(`/api/volume-curve/${date}`);
    return response.json();
  }

  /**
   * Get bin allocation based on volume curve
   */
  async getBinAllocation(
    date: string,
    bins: number = 10,
    quantity: number = 10000,
  ): Promise<BinAllocation> {
    const response = await this.fetch(
      `/api/bin-allocation?date=${date}&bins=${bins}&quantity=${quantity}`,
    );
    return response.json();
  }

  /**
   * Get correction logs for a specific date
   */
  async getCorrectionLogs(date: string): Promise<CorrectionLogs> {
    const response = await this.fetch(`/api/corrections/${date}`);
    return response.json();
  }

  /**
   * Check if backend is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch("/api/summary");
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const backendService = new BackendService();

// Export class for testing
export { BackendService };
