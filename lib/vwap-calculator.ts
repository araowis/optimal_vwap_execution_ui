import { Candle, VWAPData, ChartDatapoint } from './types';

/**
 * Calculate VWAP (Volume Weighted Average Price)
 * VWAP = Cumulative(Typical Price × Volume) / Cumulative(Volume)
 */
export function calculateVWAP(candles: Candle[]): VWAPData[] {
  const vwapResults: VWAPData[] = [];
  let cumulativeTP = 0; // Cumulative Typical Price * Volume
  let cumulativeVolume = 0;
  
  // Calculate running sum of typical prices and volumes
  candles.forEach((candle, index) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTP += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
    
    const vwap = cumulativeVolume > 0 ? cumulativeTP / cumulativeVolume : candle.close;
    
    vwapResults.push({
      timestamp: candle.timestamp,
      vwap,
      cumulativeTP,
      cumulativeVolume,
      upperBand: 0, // Will be calculated in second pass
      lowerBand: 0,
      stdDev: 0,
    });
  });
  
  // Calculate standard deviation and bands in second pass
  vwapResults.forEach((result, index) => {
    // Calculate variance for standard deviation
    let sumSquaredDev = 0;
    let count = 0;
    
    // Use last 20 periods or all available (rolling window)
    const windowStart = Math.max(0, index - 19);
    
    for (let i = windowStart; i <= index; i++) {
      const typicalPrice =
        (candles[i].high + candles[i].low + candles[i].close) / 3;
      const deviation = typicalPrice - result.vwap;
      sumSquaredDev += deviation * deviation;
      count++;
    }
    
    const variance = sumSquaredDev / count;
    const stdDev = Math.sqrt(variance);
    
    result.stdDev = stdDev;
  });
  
  return vwapResults;
}

/**
 * Calculate VWAP bands with configurable standard deviation multiplier
 */
export function calculateVWAPBands(
  vwapData: VWAPData[],
  bandWidth: number = 1 // Standard deviation multiplier (typically 1 or 2)
): VWAPData[] {
  return vwapData.map((data) => ({
    ...data,
    upperBand: data.vwap + data.stdDev * bandWidth,
    lowerBand: data.vwap - data.stdDev * bandWidth,
  }));
}

/**
 * Calculate deviation of price from VWAP
 */
export function calculateDeviation(price: number, vwap: number): {
  absolute: number;
  percentage: number;
} {
  const absolute = price - vwap;
  const percentage = (absolute / vwap) * 100;
  
  return { absolute, percentage };
}

/**
 * Detect buy signals based on VWAP strategy
 */
export function detectBuySignals(
  chartData: ChartDatapoint[],
  priceDeviationThreshold: number = 0.5, // Percentage
  volumeThreshold: number = 0
): ChartDatapoint[] {
  return chartData.map((datapoint, index) => {
    const { deviationPercentage } = datapoint;
    const candle = datapoint.candle;
    
    // Signal when price is below VWAP by threshold amount
    const isBelowVWAP =
      deviationPercentage < -Math.abs(priceDeviationThreshold);
    const volumeCondition =
      volumeThreshold === 0 || candle.volume >= volumeThreshold;
    
    let buySignal = undefined;
    
    if (isBelowVWAP && volumeCondition) {
      // Calculate signal strength based on how far below VWAP
      const signalStrength = Math.min(
        100,
        (Math.abs(deviationPercentage) / 2) * 100
      );
      
      buySignal = {
        timestamp: candle.timestamp,
        price: candle.close,
        vwap: datapoint.vwapData.vwap,
        volume: candle.volume,
        signalStrength,
        reason: `Price ${Math.abs(deviationPercentage).toFixed(2)}% below VWAP`,
        tranche: Math.floor(index / (chartData.length / 5)), // Rough tranche assignment
      };
    }
    
    return {
      ...datapoint,
      buySignal,
    };
  });
}

/**
 * Aggregate candles to different time periods
 */
export function aggregateCandles(
  candles: Candle[],
  period: 'MINUTE' | '5MIN' | '15MIN' | 'HOURLY' | 'DAILY'
): Candle[] {
  if (period === 'MINUTE') return candles;
  
  const intervalMs = getIntervalMs(period);
  const aggregated: { [key: number]: Candle } = {};
  
  candles.forEach((candle) => {
    const timeKey = Math.floor(candle.timestamp.getTime() / intervalMs) * intervalMs;
    
    if (!aggregated[timeKey]) {
      aggregated[timeKey] = {
        timestamp: new Date(timeKey),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        oi: candle.oi || 0,
      };
    } else {
      const existing = aggregated[timeKey];
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
      existing.volume += candle.volume;
      if (candle.oi) existing.oi = (existing.oi || 0) + candle.oi;
    }
  });
  
  return Object.values(aggregated).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
}

function getIntervalMs(period: string): number {
  switch (period) {
    case '5MIN':
      return 5 * 60 * 1000;
    case '15MIN':
      return 15 * 60 * 1000;
    case 'HOURLY':
      return 60 * 60 * 1000;
    case 'DAILY':
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 1000; // MINUTE
  }
}
