import { FeeStructure, TransactionCost, TradeExecution } from './types';

// Default fee structure (typical Indian stock market)
export const DEFAULT_FEES: FeeStructure = {
  spreadBps: 2, // 0.02% spread
  brokerage: 0.03, // 0.03% brokerage
  stt: 0.025, // 0.025% Securities Transaction Tax
  gst: 18, // 18% GST on brokerage
  exchangeFee: 0.00325, // 0.00325% exchange fee
};

/**
 * Calculate transaction costs for a single trade
 */
export function calculateTransactionCost(
  quantity: number,
  price: number,
  fees: FeeStructure = DEFAULT_FEES
): TransactionCost {
  const tradeValue = quantity * price;
  
  // Spread cost (assuming half-spread on each side)
  const spreadCost = (tradeValue * fees.spreadBps) / 10000;
  
  // Brokerage
  const brokerageCost = (tradeValue * fees.brokerage) / 100;
  
  // STT (Securities Transaction Tax)
  const sttCost = (tradeValue * fees.stt) / 100;
  
  // GST on brokerage
  const gstCost = (brokerageCost * fees.gst) / 100;
  
  // Exchange fee
  const exchangeFeeCost = (tradeValue * fees.exchangeFee) / 100;
  
  const totalCost =
    spreadCost + brokerageCost + sttCost + gstCost + exchangeFeeCost;
  const totalCostBps = (totalCost / tradeValue) * 10000;
  
  return {
    spreadCost,
    brokerage: brokerageCost,
    stt: sttCost,
    gst: gstCost,
    exchangeFee: exchangeFeeCost,
    totalCost,
    totalCostBps,
  };
}

/**
 * Calculate cumulative costs for multiple trades
 */
export function calculateTotalCosts(
  trades: TradeExecution[],
  fees: FeeStructure = DEFAULT_FEES
): {
  byTrade: TransactionCost[];
  total: TransactionCost;
} {
  const byTrade = trades.map((trade) =>
    calculateTransactionCost(trade.quantity, trade.price, fees)
  );
  
  const total: TransactionCost = {
    spreadCost: 0,
    brokerage: 0,
    stt: 0,
    gst: 0,
    exchangeFee: 0,
    totalCost: 0,
    totalCostBps: 0,
  };
  
  let totalTradeValue = 0;
  
  byTrade.forEach((cost) => {
    total.spreadCost += cost.spreadCost;
    total.brokerage += cost.brokerage;
    total.stt += cost.stt;
    total.gst += cost.gst;
    total.exchangeFee += cost.exchangeFee;
    total.totalCost += cost.totalCost;
  });
  
  trades.forEach((trade) => {
    totalTradeValue += trade.quantity * trade.price;
  });
  
  total.totalCostBps =
    totalTradeValue > 0 ? (total.totalCost / totalTradeValue) * 10000 : 0;
  
  return { byTrade, total };
}

/**
 * Calculate slippage (difference between expected and actual execution price)
 */
export function calculateSlippage(
  expectedPrice: number,
  actualPrice: number,
  quantity: number
): {
  absoluteSlippage: number;
  percentageSlippage: number;
  costInValue: number;
} {
  const absoluteSlippage = actualPrice - expectedPrice;
  const percentageSlippage = (absoluteSlippage / expectedPrice) * 100;
  const costInValue = absoluteSlippage * quantity;
  
  return {
    absoluteSlippage,
    percentageSlippage,
    costInValue,
  };
}

/**
 * Calculate implementation shortfall
 * IS = (Arrival Price - Execution Price) * Quantity + Commissions
 */
export function calculateImplementationShortfall(
  arrivalPrice: number,
  executionPrice: number,
  quantity: number,
  totalCosts: number
): number {
  return (arrivalPrice - executionPrice) * quantity + totalCosts;
}

/**
 * Calculate VWAP participation
 * Participation = (Execution Price - VWAP Min) / (VWAP Max - VWAP Min)
 */
export function calculateVWAPParticipation(
  executionPrice: number,
  vwapMin: number,
  vwapMax: number
): number {
  if (vwapMax === vwapMin) return 50; // If no range, return 50%
  
  const participation = ((executionPrice - vwapMin) / (vwapMax - vwapMin)) * 100;
  return Math.min(100, Math.max(0, participation));
}

/**
 * Calculate effective spread
 */
export function calculateEffectiveSpread(
  bidPrice: number,
  askPrice: number
): number {
  const midPrice = (bidPrice + askPrice) / 2;
  const spread = askPrice - bidPrice;
  return (spread / midPrice) * 10000; // In basis points
}

/**
 * Calculate execution efficiency
 */
export function calculateExecutionEfficiency(
  targetPrice: number,
  executionPrice: number,
  volume: number
): number {
  const priceImprovement = (targetPrice - executionPrice) / targetPrice;
  return priceImprovement * 100;
}

/**
 * Waterfall breakdown for cost visualization
 */
export function getCostWaterfallData(
  arrivalPrice: number,
  executionPrice: number,
  costs: TransactionCost,
  quantity: number
): Array<{
  label: string;
  value: number;
  percentage: number;
  cumulative: number;
}> {
  const executionSlippage = (arrivalPrice - executionPrice) * quantity;
  const totalImpact = executionSlippage + costs.totalCost;
  
  return [
    {
      label: 'Execution Slippage',
      value: executionSlippage,
      percentage: (executionSlippage / totalImpact) * 100,
      cumulative: executionSlippage,
    },
    {
      label: 'Spread Cost',
      value: costs.spreadCost,
      percentage: (costs.spreadCost / totalImpact) * 100,
      cumulative: executionSlippage + costs.spreadCost,
    },
    {
      label: 'Brokerage',
      value: costs.brokerage,
      percentage: (costs.brokerage / totalImpact) * 100,
      cumulative: executionSlippage + costs.spreadCost + costs.brokerage,
    },
    {
      label: 'STT',
      value: costs.stt,
      percentage: (costs.stt / totalImpact) * 100,
      cumulative:
        executionSlippage +
        costs.spreadCost +
        costs.brokerage +
        costs.stt,
    },
    {
      label: 'GST',
      value: costs.gst,
      percentage: (costs.gst / totalImpact) * 100,
      cumulative:
        executionSlippage +
        costs.spreadCost +
        costs.brokerage +
        costs.stt +
        costs.gst,
    },
    {
      label: 'Exchange Fee',
      value: costs.exchangeFee,
      percentage: (costs.exchangeFee / totalImpact) * 100,
      cumulative: totalImpact,
    },
  ];
}
