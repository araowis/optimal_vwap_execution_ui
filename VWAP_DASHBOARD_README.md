# VWAP Institutional Trading Dashboard

A comprehensive, professional-grade dashboard for VWAP (Volume Weighted Average Price) strategy execution and backtesting with advanced analytics, customizable visualizations, and institutional-level benchmarking.

## Features

### Core Functionality

- **CSV Data Upload**: Upload tick-by-tick market data in OHLCV format
- **VWAP Calculation**: Real-time VWAP computation with configurable bands
- **Buy Signal Detection**: Intelligent signal detection based on price deviation from VWAP
- **Volume Analysis**: Detailed volume allocation across price levels with bin visualization
- **Backtest Execution**: Full-featured backtest engine with animated progress reporting
- **Comprehensive Benchmarking**: Detailed execution metrics vs VWAP and performance analysis

### Visualization Features

- **Candlestick Charts**: Professional candlestick visualization with VWAP overlay
- **VWAP Bands**: Upper and lower bands with configurable width and colors
- **Volume Visualization**: Volume bars with color coding and bin allocation heatmaps
- **Buy Signal Markers**: Visual markers for buy signals with signal strength indicators
- **Hover Analytics**: Comprehensive datapoint information on hover
- **Customizable Colors**: Full color customization for all chart elements

### Analysis Capabilities

- **Price vs VWAP**: Track execution price against VWAP throughout execution
- **Implementation Shortfall**: Calculate how much worse execution was vs arrival price
- **Cost Breakdown**: Detailed breakdown of all fees and costs
- **Performance Metrics**: Sharpe ratio, win rate, max drawdown, volatility
- **VWAP Participation**: Percentage of execution at target VWAP level
- **Tranche-Level Analytics**: Execution metrics by tranche
- **Volume Allocation**: Volume distribution across price levels

## Data Format

CSV file should have the following format:

```
timestamp,open,high,low,close,volume,oi
2026-01-01 09:15:00+05:30,4090,4103.9,4088.3,4102.3,8121,0
2026-01-01 09:16:00+05:30,4102.6,4106.4,4099,4104.9,19045,0
```

Required columns: `timestamp`, `open`, `high`, `low`, `close`, `volume`
Optional columns: `oi` (open interest)

## Usage Guide

### 1. Upload Data

1. Click on the upload area in the Data Upload panel (left sidebar)
2. Select your CSV file with OHLCV data
3. The dashboard will parse and validate the data
4. Chart will automatically populate with candlestick data

### 2. Configure Strategy Parameters

Set your trading parameters in the left panel:

- **Total Quantity**: Total shares to execute
- **Number of Tranches**: Break order into multiple parts
- **Tranche Size**: Shares per tranche (auto-calculated)
- **Order Type**: LIMIT or MARKET orders
- **Max Slippage %**: Maximum acceptable price drift
- **VWAP Deviation**: Percentage threshold for buy signals
- **Min Volume Threshold**: Minimum volume required for execution
- **Execution Window**: Intraday or multi-day execution

### 3. Customize Visualization

Use the Customization panel (right sidebar) to:

- **Chart Settings**: Change period (1min, 5min, 15min, hourly, daily)
- **VWAP Bands**: Adjust band width (standard deviations), colors, and opacity
- **Volume**: Configure number of bins (5, 10, 20, 50) and coloring style
- **Buy Signals**: Control marker size and strength threshold
- **Theme**: Switch between light and dark modes

### 4. Run Backtest

1. Click **Run Backtest** button
2. Watch the animated progress with verbose messages
3. View results in the right panel once complete
4. Review execution summary at the bottom

### 5. Analyze Results

The dashboard shows:

- **Key Metrics**: Execution price, improvement vs VWAP, total costs
- **Cost Breakdown**: Spread, brokerage, STT, GST, exchange fees
- **Performance**: Sharpe ratio, win rate, max drawdown, volatility
- **Execution Summary**: Fill quantity, cost in basis points, implementation shortfall

## Architecture

### Library Structure

- **`lib/types.ts`**: All TypeScript interfaces and data types
- **`lib/data-parser.ts`**: CSV parsing and validation
- **`lib/vwap-calculator.ts`**: VWAP calculation and band computation
- **`lib/volume-allocation.ts`**: Volume bin allocation and profiling
- **`lib/transaction-costs.ts`**: Fee calculation and cost analysis
- **`lib/backtest-service.ts`**: Main backtest execution engine

### Component Structure

- **DashboardLayout**: Main container component
- **Header**: Dashboard title and controls
- **DataUploadPanel**: CSV upload interface
- **ParametersPanel**: Strategy parameter input
- **ChartPanel**: Main chart visualization area
- **CustomizationPanel**: Customization controls
- **BenchmarkingPanel**: Results and metrics display
- **ExecutionSummary**: Footer with key summary metrics

## Calculation Formulas

### VWAP (Volume Weighted Average Price)

```
VWAP = Σ(Typical Price × Volume) / Σ(Volume)
where Typical Price = (High + Low + Close) / 3
```

### VWAP Bands

```
Upper Band = VWAP + (StdDev × Multiplier)
Lower Band = VWAP - (StdDev × Multiplier)
```

### Implementation Shortfall

```
IS = (Arrival Price - Execution Price) × Quantity + Commissions
```

### VWAP Participation

```
Participation = (Execution Price - VWAP Min) / (VWAP Max - VWAP Min) × 100
```

## Theme Customization

The dashboard uses professional dark theme by default (optimized for trading). All colors are configurable:

- **Primary**: Brand color (blue-based)
- **Secondary**: Accent color (light gray)
- **Background**: Dark gray (trading-optimized)
- **Foreground**: Light text for contrast
- **Chart Colors**: Customizable for technical analysis

## Integration Points

### Java Backend Integration

The dashboard is designed to connect with a Java backend via:

- **REST API**: Backtest execution, data processing
- **WebSocket**: Real-time updates and progress streaming
- **Upstox API**: Real-time market data (in development)

### Current Status

- CSV upload: ✅ Implemented
- VWAP calculations: ✅ Implemented
- Backtest engine: ✅ Implemented
- Volume analysis: ✅ Implemented
- Comprehensive benchmarking: ✅ Implemented
- Java backend integration: 🔄 Ready for connection
- Upstox API integration: ⏳ In development
- WebSocket real-time updates: ⏳ In development

## Performance Considerations

- **Max Candles**: Dashboard handles 10,000+ candles smoothly
- **Real-time Updates**: Optimized for 1-minute candles
- **Browser Compatibility**: Chrome, Firefox, Safari, Edge (latest versions)
- **Memory**: Efficient memory management for large datasets

## Keyboard Shortcuts

(Coming soon)

## API Reference

### BacktestService

```typescript
const service = new BacktestService(candles, params, fees);
const results = await service.runBacktest();
```

### VWAP Calculator

```typescript
const vwapData = calculateVWAP(candles);
const bandsData = calculateVWAPBands(vwapData, bandWidth);
const signals = detectBuySignals(chartData, deviation, minVolume);
```

## Troubleshooting

### Data Upload Issues

- **Invalid CSV Format**: Ensure columns are: timestamp, open, high, low, close, volume
- **Timestamp Parse Error**: Use ISO 8601 format (e.g., 2026-01-01T09:15:00)
- **NaN Values**: Check for missing or invalid numeric values

### Backtest Issues

- **No Results**: Ensure data has at least 50 candles
- **Execution Shortfall**: Adjust VWAP deviation threshold parameter
- **High Costs**: Review fee structure and order type settings

### Visualization Issues

- **Chart Not Displaying**: Try refreshing the page
- **Performance Slow**: Reduce number of volume bins or increase chart period
- **Colors Not Updating**: Clear browser cache and refresh

## Future Enhancements

- Multi-timeframe analysis
- Advanced technical indicators (RSI, MACD, etc.)
- Portfolio-level execution analysis
- Real-time market data integration
- Machine learning signal generation
- Risk analytics and stress testing
- Export results to PDF/Excel
- Collaborative trading analysis

## License

Professional Trading Dashboard - All Rights Reserved

## Support

For issues, questions, or feature requests, please contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Dashboard Type**: Institutional Trading Platform
