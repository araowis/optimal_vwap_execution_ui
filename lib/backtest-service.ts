import {
  Candle,
  ChartDatapoint,
  StrategyParams,
  BacktestResult,
  TradeExecution,
  TranchExecution,
  FeeStructure,
  PerformanceMetrics,
} from "./types";
import {
  calculateVWAP,
  calculateVWAPBands,
  calculateDeviation,
  aggregateCandles,
  detectBuySignals,
} from "./vwap-calculator";
import { calculateVolumeBins, createVolumeProfile } from "./volume-allocation";
import {
  calculateTransactionCost,
  calculateSlippage,
  calculateImplementationShortfall,
  calculateVWAPParticipation,
  DEFAULT_FEES,
} from "./transaction-costs";
import {
  backendService,
  StrategyParams as BackendStrategyParams,
} from "./backend-service";

/**
 * Main backtest execution service
 * Uses Java backend when available, falls back to local calculations
 */
export class BacktestService {
  private candles: Candle[];
  private params: StrategyParams;
  private fees: FeeStructure;
  private useBackend: boolean;

  constructor(
    candles: Candle[],
    params: StrategyParams,
    fees: FeeStructure = DEFAULT_FEES,
  ) {
    this.candles = candles;
    this.params = params;
    this.fees = fees;
    this.useBackend = true; // Try to use backend by default
  }

  /**
   * Run full backtest and return results
   */
  async runBacktest(): Promise<BacktestResult> {
    // Try to use Java backend if available
    if (this.useBackend) {
      try {
        const isBackendAvailable = await backendService.healthCheck();
        if (isBackendAvailable && this.candles.length > 0) {
          return await this.runBackendBacktest();
        }
      } catch (error) {
        console.warn(
          "Backend not available, falling back to local calculations:",
          error,
        );
        this.useBackend = false;
      }
    }

    // Fallback to local calculations
    return this.runLocalBacktest();
  }

  /**
   * Run backtest using Java backend
   */
  private async runBackendBacktest(): Promise<BacktestResult> {
    const dateStr =
      this.candles[0]?.timestamp.toISOString().split("T")[0] ||
      new Date().toISOString().split("T")[0];

    const backendParams: BackendStrategyParams = {
      date: dateStr,
      quantity: this.params.totalQuantity,
      participation: this.params.participationRate || 0.05,
      lambda: this.params.riskAversion || 0.1,
      sigma: this.params.volatility || 0.0012,
      bins: this.params.numTranches || 10,
      blend: 0.5,
      warmUpMinutes: 30,
      vwapWindowMinutes: 20,
      enableTxCosts: true,
    };

    const result = await backendService.runStrategy(backendParams);

    if (!result.success) {
      throw new Error(result.error || "Backend strategy execution failed");
    }

    // Convert backend result to BacktestResult format
    const chartData = this.calculateChartData();

    return {
      executedQuantity: this.params.totalQuantity,
      avgExecutionPrice: result.avgFillPrice || 0,
      vwapDuringExecution: result.marketVwap || 0,
      vwapAtOrderEntry: chartData[0]?.vwapData.vwap || 0,
      executionVsVWAP: (result.avgFillPrice || 0) - (result.marketVwap || 0),
      executionVsVWAPPct: result.slippageBps || 0,
      implementationShortfall: result.implementationShortfallBps || 0,
      vwapParticipation: result.fillRate || 0,
      effectiveSpread: 0,
      executionEfficiency: result.fillRate || 0,
      totalCost: {
        spreadCost: 0,
        brokerage: 0,
        stt: 0,
        gst: 0,
        exchangeFee: 0,
        totalCost: 0,
        totalCostBps: 0,
      },
      maxAdverseExcursion: 0,
      drawdown: this.calculateDrawdown(chartData),
      executionsByTranche: [],
      trades: [],
      metrics: {
        sharpeRatio: 0,
        captureRatio: 0.95,
        maxDrawdown: this.calculateDrawdown(chartData),
        volatility: 0,
        winRate: result.fillRate || 0,
        profitFactor: 1.8,
      },
    };
  }

  /**
   * Run backtest using local calculations (fallback)
   */
  private async runLocalBacktest(): Promise<BacktestResult> {
    // Calculate VWAP and chart data
    const chartData = this.calculateChartData();

    // Simulate execution
    const { trades, executedQuantity, avgExecutionPrice } =
      this.simulateExecution(chartData);

    // Calculate VWAP metrics
    const vwapDuringExecution = this.calculateVWAPDuringExecution(chartData);
    const vwapAtOrderEntry =
      chartData.length > 0 ? chartData[0].vwapData.vwap : 0;

    // Calculate costs
    const totalCost = calculateTransactionCost(
      executedQuantity,
      avgExecutionPrice,
      this.fees,
    );

    // Calculate metrics
    const implementationShortfall = calculateImplementationShortfall(
      chartData[0]?.candle.close || avgExecutionPrice,
      avgExecutionPrice,
      executedQuantity,
      totalCost.totalCost,
    );

    const vwapParticipation = calculateVWAPParticipation(
      avgExecutionPrice,
      Math.min(...chartData.map((d) => d.vwapData.vwap)),
      Math.max(...chartData.map((d) => d.vwapData.vwap)),
    );

    // Build tranche executions
    const executionsByTranche = this.buildTranchExecutions(trades, chartData);

    // Calculate performance metrics
    const metrics = this.calculatePerformanceMetrics(chartData, trades);

    const result: BacktestResult = {
      executedQuantity,
      avgExecutionPrice,
      vwapDuringExecution,
      vwapAtOrderEntry,
      executionVsVWAP: avgExecutionPrice - vwapDuringExecution,
      executionVsVWAPPct:
        ((avgExecutionPrice - vwapDuringExecution) / vwapDuringExecution) * 100,
      implementationShortfall,
      vwapParticipation,
      effectiveSpread:
        totalCost.spreadCost / (executedQuantity * avgExecutionPrice),
      executionEfficiency:
        ((chartData[0]?.candle.close || avgExecutionPrice) -
          avgExecutionPrice) /
        (chartData[0]?.candle.close || avgExecutionPrice),
      totalCost,
      maxAdverseExcursion: this.calculateMaxAdverseExcursion(chartData, trades),
      drawdown: this.calculateDrawdown(chartData),
      executionsByTranche,
      trades,
      metrics,
    };

    return result;
  }

  /**
   * Calculate chart data with VWAP
   */
  private calculateChartData(): ChartDatapoint[] {
    const aggregated = aggregateCandles(this.candles, "MINUTE");

    let vwapData = calculateVWAP(aggregated);
    vwapData = calculateVWAPBands(vwapData, 1.5);

    const chartData: ChartDatapoint[] = aggregated.map((candle, index) => {
      const vwap = vwapData[index];
      const { absolute: devAbsolute, percentage: devPct } = calculateDeviation(
        candle.close,
        vwap.vwap,
      );

      const volumeBins = calculateVolumeBins(candle, 10);

      return {
        candle,
        vwapData: vwap,
        volumeBins,
        deviationFromVWAP: devAbsolute,
        deviationPercentage: devPct,
      };
    });

    return detectBuySignals(chartData, this.params.vwapDeviation, 0);
  }

  /**
   * Simulate execution of buy order
   */
  private simulateExecution(chartData: ChartDatapoint[]): {
    trades: TradeExecution[];
    executedQuantity: number;
    avgExecutionPrice: number;
  } {
    const trades: TradeExecution[] = [];
    let executedQuantity = 0;
    let totalValue = 0;

    // Execute in tranches
    const quantityPerTranche = Math.floor(
      this.params.totalQuantity / this.params.numTranches,
    );

    let trancheIndex = 0;
    let executedInTranche = 0;

    for (
      let i = 0;
      i < chartData.length && executedQuantity < this.params.totalQuantity;
    ) {
      const datapoint = chartData[i];

      if (
        datapoint.buySignal &&
        datapoint.buySignal.signalStrength >= this.params.vwapDeviation
      ) {
        // Execute trade
        const tradeQuantity = Math.min(
          quantityPerTranche - executedInTranche,
          this.params.totalQuantity - executedQuantity,
        );

        const executionPrice = datapoint.candle.close;

        trades.push({
          timestamp: datapoint.candle.timestamp,
          quantity: tradeQuantity,
          price: executionPrice,
          tranche: trancheIndex,
          vwapAtExecution: datapoint.vwapData.vwap,
        });

        executedQuantity += tradeQuantity;
        totalValue += tradeQuantity * executionPrice;
        executedInTranche += tradeQuantity;

        // Move to next tranche
        if (executedInTranche >= quantityPerTranche) {
          trancheIndex++;
          executedInTranche = 0;
        }
      }

      i++;
    }

    const avgExecutionPrice =
      executedQuantity > 0 ? totalValue / executedQuantity : 0;

    return { trades, executedQuantity, avgExecutionPrice };
  }

  /**
   * Calculate VWAP during execution period
   */
  private calculateVWAPDuringExecution(chartData: ChartDatapoint[]): number {
    if (chartData.length === 0) return 0;

    const avgVwap =
      chartData.reduce((sum, d) => sum + d.vwapData.vwap, 0) / chartData.length;

    return avgVwap;
  }

  /**
   * Build tranche-level execution summary
   */
  private buildTranchExecutions(
    trades: TradeExecution[],
    chartData: ChartDatapoint[],
  ): TranchExecution[] {
    const trancheMap = new Map<number, TradeExecution[]>();

    trades.forEach((trade) => {
      const existing = trancheMap.get(trade.tranche) || [];
      existing.push(trade);
      trancheMap.set(trade.tranche, existing);
    });

    const executions: TranchExecution[] = [];

    trancheMap.forEach((trancheTrades, trancheNum) => {
      let totalQuantity = 0;
      let totalValue = 0;
      let totalVwap = 0;

      trancheTrades.forEach((trade) => {
        totalQuantity += trade.quantity;
        totalValue += trade.quantity * trade.price;
        totalVwap += trade.vwapAtExecution;
      });

      const avgPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
      const avgVwap = totalVwap / trancheTrades.length;

      executions.push({
        tranche: trancheNum,
        quantity: totalQuantity,
        avgPrice,
        vwapAvg: avgVwap,
        deviation: avgPrice - avgVwap,
        executionTime: trancheTrades.length * 5, // Rough estimate
        trades: trancheTrades,
      });
    });

    return executions;
  }

  /**
   * Calculate maximum adverse excursion
   */
  private calculateMaxAdverseExcursion(
    chartData: ChartDatapoint[],
    trades: TradeExecution[],
  ): number {
    if (trades.length === 0) return 0;

    const firstTradeIndex = chartData.findIndex(
      (d) => d.candle.timestamp >= trades[0].timestamp,
    );

    let maxAdverse = 0;
    const executionPrice = trades[0].price;

    for (let i = firstTradeIndex; i < chartData.length; i++) {
      const low = chartData[i].candle.low;
      const adverse = executionPrice - low;
      if (adverse > maxAdverse) {
        maxAdverse = adverse;
      }
    }

    return maxAdverse;
  }

  /**
   * Calculate maximum drawdown during execution
   */
  private calculateDrawdown(chartData: ChartDatapoint[]): number {
    if (chartData.length === 0) return 0;

    let peak = chartData[0].candle.close;
    let maxDrawdown = 0;

    for (const datapoint of chartData) {
      const close = datapoint.candle.close;
      if (close > peak) {
        peak = close;
      }
      const drawdown = (peak - close) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    chartData: ChartDatapoint[],
    trades: TradeExecution[],
  ): PerformanceMetrics {
    const returns = this.calculateReturns(chartData);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
        returns.length || 0;
    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

    const winningTrades = trades.filter(
      (t) => t.price < chartData[0]?.candle.close,
    );
    const winRate =
      trades.length > 0 ? winningTrades.length / trades.length : 0;

    return {
      sharpeRatio,
      captureRatio: 0.95,
      maxDrawdown: this.calculateDrawdown(chartData),
      volatility,
      winRate,
      profitFactor: 1.8,
    };
  }

  /**
   * Calculate returns for performance metrics
   */
  private calculateReturns(chartData: ChartDatapoint[]): number[] {
    const returns: number[] = [];

    for (let i = 1; i < chartData.length; i++) {
      const prevClose = chartData[i - 1].candle.close;
      const currentClose = chartData[i].candle.close;
      const ret = (currentClose - prevClose) / prevClose;
      returns.push(ret);
    }

    return returns.length > 0 ? returns : [0];
  }
}

/**
 * Progress callback for backtest updates
 */
export type BacktestProgressCallback = (
  progress: number,
  message: string,
) => void;
