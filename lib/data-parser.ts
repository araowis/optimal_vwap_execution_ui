import { Candle } from "./types";

/**
 * Parse CSV data with expected format:
 * timestamp,open,high,low,close,volume,oi
 */
export function parseCSV(csvContent: string): Candle[] {
  const lines = csvContent.trim().split("\n");

  if (lines.length < 2) {
    throw new Error("CSV file must contain at least a header and one data row");
  }

  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim());

  // Validate header
  const requiredFields = [
    "timestamp",
    "open",
    "high",
    "low",
    "close",
    "volume",
  ];
  const hasRequiredFields = requiredFields.every((field) =>
    header.includes(field),
  );

  if (!hasRequiredFields) {
    throw new Error(`CSV must contain columns: ${requiredFields.join(", ")}`);
  }

  const indices = {
    timestamp: header.indexOf("timestamp"),
    open: header.indexOf("open"),
    high: header.indexOf("high"),
    low: header.indexOf("low"),
    close: header.indexOf("close"),
    volume: header.indexOf("volume"),
    oi: header.indexOf("oi"),
  };

  const candles: Candle[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue; // Skip empty lines

    const values = line.split(",").map((v) => v.trim());

    try {
      const timestamp = parseTimestamp(values[indices.timestamp]);
      const candle: Candle = {
        timestamp,
        open: parseFloat(values[indices.open]),
        high: parseFloat(values[indices.high]),
        low: parseFloat(values[indices.low]),
        close: parseFloat(values[indices.close]),
        volume: parseInt(values[indices.volume], 10),
        oi: indices.oi >= 0 ? parseInt(values[indices.oi], 10) : 0,
      };

      // Validate candle data
      if (!validateCandle(candle)) {
        console.warn(`Skipping invalid candle at line ${i + 1}`);
        continue;
      }

      candles.push(candle);
    } catch (error) {
      console.warn(`Error parsing line ${i + 1}: ${error}`);
      continue;
    }
  }

  if (candles.length === 0) {
    throw new Error("No valid candles found in CSV");
  }

  return candles;
}

/**
 * Streaming CSV parser for large files
 * Processes data in chunks to prevent browser hanging
 */
export async function parseCSVStreaming(
  file: File,
  onProgress: (progress: number, candles: Candle[]) => void,
  chunkSize: number = 10000,
): Promise<Candle[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const chunkSizeBytes = chunkSize * 1024; // Convert to bytes
    let offset = 0;
    let partialLine = "";
    let header = "";
    let indices: any = null;
    let allCandles: Candle[] = [];
    let totalLines = 0;
    let processedLines = 0;

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = (partialLine + text).split("\n");
      partialLine = lines.pop() || ""; // Save incomplete line for next chunk

      if (!header && lines.length > 0) {
        const headerLine = lines[0]
          .toLowerCase()
          .split(",")
          .map((h: string) => h.trim());
        header = headerLine.join(",");

        // Validate header
        const requiredFields = [
          "timestamp",
          "open",
          "high",
          "low",
          "close",
          "volume",
        ];
        const hasRequiredFields = requiredFields.every((field) =>
          header.includes(field),
        );

        if (!hasRequiredFields) {
          reject(
            new Error(`CSV must contain columns: ${requiredFields.join(", ")}`),
          );
          return;
        }

        indices = {
          timestamp: header.indexOf("timestamp"),
          open: header.indexOf("open"),
          high: header.indexOf("high"),
          low: header.indexOf("low"),
          close: header.indexOf("close"),
          volume: header.indexOf("volume"),
          oi: header.indexOf("oi"),
        };

        lines.shift(); // Remove header from processing
        totalLines = Math.ceil(file.size / chunkSizeBytes) * 100; // Estimate total lines
      }

      const chunkCandles: Candle[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (!indices) continue; // Skip if header not parsed yet

        const values = trimmedLine.split(",").map((v: string) => v.trim());

        try {
          const timestamp = parseTimestamp(values[indices.timestamp]);
          const candle: Candle = {
            timestamp,
            open: parseFloat(values[indices.open]),
            high: parseFloat(values[indices.high]),
            low: parseFloat(values[indices.low]),
            close: parseFloat(values[indices.close]),
            volume: parseInt(values[indices.volume], 10),
            oi: indices.oi >= 0 ? parseInt(values[indices.oi], 10) : 0,
          };

          if (validateCandle(candle)) {
            chunkCandles.push(candle);
            allCandles.push(candle);
          }
        } catch (error) {
          console.warn(`Error parsing line: ${error}`);
        }

        processedLines++;
      }

      // Report progress
      const progress = Math.min((offset / file.size) * 100, 99);
      onProgress(progress, [...allCandles]);

      offset += chunkSizeBytes;

      if (offset < file.size) {
        readNextChunk();
      } else {
        // Process remaining partial line
        if (partialLine.trim()) {
          const values = partialLine.split(",").map((v: string) => v.trim());
          try {
            const timestamp = parseTimestamp(values[indices.timestamp]);
            const candle: Candle = {
              timestamp,
              open: parseFloat(values[indices.open]),
              high: parseFloat(values[indices.high]),
              low: parseFloat(values[indices.low]),
              close: parseFloat(values[indices.close]),
              volume: parseInt(values[indices.volume], 10),
              oi: indices.oi >= 0 ? parseInt(values[indices.oi], 10) : 0,
            };

            if (validateCandle(candle)) {
              allCandles.push(candle);
            }
          } catch (error) {
            console.warn(`Error parsing final line: ${error}`);
          }
        }

        onProgress(100, allCandles);
        resolve(allCandles);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    function readNextChunk() {
      const slice = file.slice(offset, offset + chunkSizeBytes);
      reader.readAsText(slice);
    }

    readNextChunk();
  });
}

/**
 * Parse timestamp in various formats
 */
function parseTimestamp(timestampStr: string): Date {
  const date = new Date(timestampStr);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestampStr}`);
  }

  return date;
}

/**
 * Validate candle data integrity
 */
function validateCandle(candle: Candle): boolean {
  const { open, high, low, close, volume, timestamp } = candle;

  // Check for NaN or invalid values
  if (
    isNaN(open) ||
    isNaN(high) ||
    isNaN(low) ||
    isNaN(close) ||
    isNaN(volume) ||
    isNaN(timestamp.getTime())
  ) {
    console.warn("Candle has NaN values:", candle);
    return false;
  }

  // High should be >= all other prices (relaxed to allow small rounding errors)
  if (high < Math.max(open, close, low) - 0.001) {
    console.warn("Candle high is less than max of other prices:", candle);
    return false;
  }

  // Low should be <= all other prices (relaxed to allow small rounding errors)
  if (low > Math.min(open, close, high) + 0.001) {
    console.warn("Candle low is greater than min of other prices:", candle);
    return false;
  }

  // Volume should be non-negative (relaxed from positive to allow zero volume)
  if (volume < 0) {
    console.warn("Candle has negative volume:", candle);
    return false;
  }

  return true;
}

/**
 * Format candle data for display
 */
export function formatCandle(
  candle: Candle,
  decimalPlaces: number = 2,
): {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
} {
  return {
    timestamp: candle.timestamp.toISOString(),
    open: candle.open.toFixed(decimalPlaces),
    high: candle.high.toFixed(decimalPlaces),
    low: candle.low.toFixed(decimalPlaces),
    close: candle.close.toFixed(decimalPlaces),
    volume: candle.volume.toLocaleString(),
  };
}

/**
 * Validate and normalize price data
 */
export function validatePriceData(candles: Candle[]): boolean {
  if (candles.length === 0) return false;

  // Check for monotonic timestamps
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].timestamp <= candles[i - 1].timestamp) {
      return false; // Timestamps must be in ascending order
    }
  }

  return true;
}

/**
 * Calculate basic statistics from candle data
 */
export function calculateDataStatistics(candles: Candle[]) {
  if (candles.length === 0) {
    return {
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      totalVolume: 0,
      avgVolume: 0,
      timespan: 0,
    };
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let totalValue = 0;
  let totalVolume = 0;

  candles.forEach((candle) => {
    minPrice = Math.min(minPrice, candle.low);
    maxPrice = Math.max(maxPrice, candle.high);
    totalValue += candle.close;
    totalVolume += candle.volume;
  });

  const avgPrice = totalValue / candles.length;
  const avgVolume = totalVolume / candles.length;
  const timespan =
    candles[candles.length - 1].timestamp.getTime() -
    candles[0].timestamp.getTime();

  return {
    minPrice,
    maxPrice,
    avgPrice,
    totalVolume,
    avgVolume,
    timespan,
  };
}
