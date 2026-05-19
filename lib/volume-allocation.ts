import { Candle, VolumeBin } from "./types";

/**
 * Calculate volume allocation across price bins within a candle
 * Distributes volume proportionally based on price ranges
 */
export function calculateVolumeBins(
  candle: Candle,
  numBins: 5 | 10 | 20 | 50 = 10,
): VolumeBin[] {
  const { high, low, volume } = candle;
  const priceRange = high - low;

  if (priceRange === 0) {
    // If all prices are the same, put all volume in one bin
    return [
      {
        priceLevel: low,
        volume: volume,
        percentage: 100,
      },
    ];
  }

  const binSize = priceRange / numBins;
  const bins: VolumeBin[] = [];

  // Create bins from low to high
  for (let i = 0; i < numBins; i++) {
    const binLow = low + i * binSize;
    const binHigh = binLow + binSize;
    const binCenter = (binLow + binHigh) / 2;

    // Distribute volume proportionally based on price range
    // Simplified: assume uniform distribution
    const binVolume = volume / numBins;

    bins.push({
      priceLevel: binCenter,
      volume: binVolume,
      percentage: (binVolume / volume) * 100,
    });
  }

  return bins;
}

/**
 * Calculate volume-weighted price for a set of candles
 */
export function calculateVolumeWeightedPrice(candles: Candle[]): number {
  let totalValue = 0;
  let totalVolume = 0;

  candles.forEach((candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    totalValue += typicalPrice * candle.volume;
    totalVolume += candle.volume;
  });

  return totalVolume > 0 ? totalValue / totalVolume : 0;
}

/**
 * Create a volume profile (price levels vs accumulated volume)
 */
export function createVolumeProfile(
  candles: Candle[],
  numLevels: number = 20,
): VolumeBin[] {
  if (candles.length === 0) return [];

  // Find global min and max prices
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  candles.forEach((candle) => {
    minPrice = Math.min(minPrice, candle.low);
    maxPrice = Math.max(maxPrice, candle.high);
  });

  const priceRange = maxPrice - minPrice;
  const levelSize = priceRange / numLevels;

  const volumeByLevel: Map<number, number> = new Map();

  // Accumulate volume at each price level
  candles.forEach((candle) => {
    const { high, low, volume } = candle;
    const candleRange = high - low;

    if (candleRange === 0) {
      // All volume at this price level
      const levelKey = Math.floor((candle.close - minPrice) / levelSize);
      volumeByLevel.set(levelKey, (volumeByLevel.get(levelKey) || 0) + volume);
    } else {
      // Distribute volume across price levels
      const volumePerLevel = volume / numLevels;
      for (let i = 0; i < numLevels; i++) {
        const levelKey = Math.floor(
          (low + (i * candleRange) / numLevels - minPrice) / levelSize,
        );
        if (levelKey >= 0 && levelKey < numLevels) {
          volumeByLevel.set(
            levelKey,
            (volumeByLevel.get(levelKey) || 0) + volumePerLevel,
          );
        }
      }
    }
  });

  // Convert map to bins
  const totalVolume = candles.reduce((sum, c) => sum + c.volume, 0);
  const bins: VolumeBin[] = [];

  for (let i = 0; i < numLevels; i++) {
    const volume = volumeByLevel.get(i) || 0;
    const priceLevel = minPrice + i * levelSize + levelSize / 2;

    bins.push({
      priceLevel,
      volume,
      percentage: totalVolume > 0 ? (volume / totalVolume) * 100 : 0,
    });
  }

  return bins;
}

/**
 * Find volume clusters (high-volume price areas)
 */
export function findVolumeClusters(
  bins: VolumeBin[],
  threshold: number = 50,
): VolumeBin[] {
  const avgVolume = bins.reduce((sum, b) => sum + b.volume, 0) / bins.length;

  return bins.filter((bin) => bin.volume > avgVolume * (threshold / 100));
}

/**
 * Calculate volume at price (VAP) - cumulative volume at or above/below a price
 */
export function getVolumeAtPrice(
  bins: VolumeBin[],
  price: number,
  above: boolean = true,
): number {
  return bins
    .filter((bin) =>
      above ? bin.priceLevel >= price : bin.priceLevel <= price,
    )
    .reduce((sum, bin) => sum + bin.volume, 0);
}

/**
 * Calculate average trade size
 */
export function calculateAvgTradeSize(
  candles: Candle[],
  estimatedTradesPerCandle: number = 10,
): number {
  const totalVolume = candles.reduce((sum, c) => sum + c.volume, 0);
  const totalTrades = candles.length * estimatedTradesPerCandle;

  return totalTrades > 0 ? totalVolume / totalTrades : 0;
}

/**
 * Detect volume spikes
 */
export function detectVolumeSpikes(
  candles: Candle[],
  threshold: number = 1.5, // 1.5x average volume
): boolean[] {
  const avgVolume =
    candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;

  return candles.map((candle) => candle.volume > avgVolume * threshold);
}
