# VWAP Trading Dashboard - Next.js Frontend

A modern, real-time trading dashboard for executing Volume Weighted Average Price (VWAP) strategies with institutional-grade analytics and Upstox market data integration.

## 🚀 Features

### Core Functionality
- **Real-time Market Data Integration**: WebSocket-based streaming with Upstox API for live quotes and Level 2 market depth
- **Historical Data Analysis**: Fetch and analyze historical candle data with customizable timeframes
- **VWAP Strategy Execution**: Advanced VWAP calculations with configurable parameters (via Java backend)
- **Interactive Charts**: Beautiful, responsive charts with Recharts showing price, VWAP, bands, and buy signals
- **Volume Analysis**: Volume curves and analysis with multiple visualization options
- **Watchlist Management**: Real-time stock watchlist with price tracking and market depth
- **Backtesting Engine**: Strategy backtesting with detailed performance metrics (via Java backend)

### UI/UX Features
- **Resizable & Collapsible Sidebars**: Flexible layout with drag-to-resize panels
- **Dark Mode**: Modern dark theme with excellent contrast
- **Responsive Design**: Works seamlessly across different screen sizes
- **Real-time Updates**: Live price updates and market depth streaming
- **Interactive Charts**: Zoom, pan, and hover for detailed analysis
- **Customizable**: Extensive customization options for charts and strategies

## 📋 Prerequisites

### For Frontend (Next.js)
- Node.js 18+ 
- pnpm package manager
- Upstox Developer Account with API access
- Upstox Access Token (valid for 30 days)

### For Backend (Java)
- Java 17 or higher
- Maven 3.6+
- Historical market data CSV files

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/araowis/optimal_vwap_execution.git
cd optimal_vwap_execution
```

### 2. Set up the Java Backend

**Install Java and Maven (if not already installed):**
- Java 17+: [Download](https://adoptium.net/)
- Maven 3.6+: [Download](https://maven.apache.org/download.cgi)

**Build the Java backend:**
```bash
cd optimal_vwap_execution
mvn clean package
```

**Run the Java backend:**
```bash
java -jar target/vwap-execution-1.0-SNAPSHOT.jar reliance_3M_1min.csv 10000 0.05
```

This will:
- Load historical data from `reliance_3M_1min.csv`
- Set total quantity to 10,000 shares
- Set participation rate to 5%
- Start the web server on `http://localhost:4567`

**Backend API Endpoints:**
- `GET /api/summary` - Summary statistics
- `GET /api/daily` - Daily results
- `GET /api/chart/:date` - Chart data for specific date
- `GET /api/pnl` - Cumulative P&L
- `GET /api/pretrade` - Pretrade analysis
- `GET /api/execution/:date` - Execution logs
- `POST /api/run-strategy` - Run strategy with custom parameters
- `GET /api/volume-curve/:date` - Volume curve prediction
- `GET /api/bin-allocation` - Bin allocation based on volume curve
- `GET /api/corrections/:date` - Correction logs

### 3. Set up the Next.js Frontend

**Navigate to frontend directory:**
```bash
cd new-frontend
```

**Install dependencies:**
```bash
pnpm install
```

**Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
UPSTOX_ACCESS_TOKEN=your_access_token_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:4567
```

### 4. Run the Frontend

**Development mode:**
```bash
pnpm dev
```

The app will be available at `http://localhost:3001`

**Production build:**
```bash
pnpm build
pnpm start
```

## 🔧 Configuration

### Getting Upstox Access Token

1. Go to [Upstox Developer Apps](https://account.upstox.com/developer/apps)
2. Create a new app or use an existing one
3. Generate an access token (valid for 30 days)
4. Copy the token and add it to your `.env` file or use the "Connect Upstox API" button in the app

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `UPSTOX_ACCESS_TOKEN` | Your Upstox API access token | Yes |
| `NEXT_PUBLIC_BACKEND_URL` | Java backend URL (default: http://localhost:4567) | No |

### Backend Configuration

The Java backend accepts command-line arguments:
```bash
java -jar target/vwap-execution-1.0-SNAPSHOT.jar [csv_path] [total_qty] [participation_rate]
```

- `csv_path`: Path to historical data CSV file (default: reliance_3M_1min.csv)
- `total_qty`: Total quantity to trade (default: 10000)
- `participation_rate`: Participation rate as decimal (default: 0.05)

### Data Requirements

The Java backend requires historical market data in CSV format with the following columns:
- Date/Time
- Open
- High
- Low
- Close
- Volume

Sample data format:
```csv
datetime,open,high,low,close,volume
2024-01-01 09:15:00,2500.0,2510.0,2495.0,2505.0,100000
2024-01-01 09:16:00,2505.0,2515.0,2500.0,2510.0,150000
...
```

## 📁 Project Structure

```
new-frontend/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── clearbit/            # Clearbit API proxy (company logos)
│   │   └── upstox/              # Upstox API proxy routes
│   │       ├── health/          # Health check endpoint
│   │       ├── historical-candle/ # Historical candle data
│   │       ├── instruments/     # Instrument search
│   │       ├── market-data-feed/ # WebSocket authorization
│   │       └── market-quote/     # Market quote (REST API)
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/
│   ├── dashboard/                # Dashboard components
│   │   ├── charts/             # Chart components (PriceChart, VolumeChart)
│   │   ├── DashboardLayout.tsx # Main layout with resizable sidebars
│   │   ├── ChartPanel.tsx      # Chart display with VWAP analysis
│   │   ├── DataUploadPanel.tsx # Data upload and watchlist
│   │   ├── MarketDepth.tsx     # Market depth display
│   │   ├── ParametersPanel.tsx # Strategy parameters
│   │   ├── StockDetailPanel.tsx # Stock details panel
│   │   ├── UpstoxConfigDialog.tsx # Upstox configuration dialog
│   │   └── ...
│   ├── ui/                      # shadcn/ui components
│   └── theme-provider.tsx      # Theme configuration
├── hooks/                      # Custom React hooks
│   ├── use-mobile.ts          # Mobile detection
│   └── use-toast.ts           # Toast notifications
├── lib/                        # Utility libraries
│   ├── backend-integration.ts  # Backend API integration
│   ├── backtest-service.ts     # Backtesting logic
│   ├── data-parser.ts          # Data parsing utilities
│   ├── upstox-market-depth.ts  # Market depth hook
│   ├── vwap-calculator.ts      # VWAP calculations
│   └── types.ts                # TypeScript type definitions
├── public/                     # Static assets
├── styles/                     # Additional styles
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
└── next.config.mjs            # Next.js configuration
```

## 🔌 API Routes

### Java Backend API Routes

The Java backend provides the following REST API endpoints for strategy execution and analysis:

#### `GET /api/summary`
Get summary statistics across all trading days.

**Response:**
```json
{
  "totalShares": 100000,
  "avgFillRate": 0.98,
  "daysBelowVwap": 45,
  "totalDays": 60,
  "totalSavings": 15000.50,
  "avgFillPrice": 2500.25,
  "avgVwap": 2500.15
}
```

#### `GET /api/daily`
Get daily results for all trading days.

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "fillRate": 0.98,
    "avgFillPrice": 2500.25,
    "marketVwap": 2500.15,
    "vwapSlippageBps": -4.0,
    "implementationShortfallBps": -5.2,
    "implementationShortfallRupees": -130.50
  }
]
```

#### `GET /api/chart/:date`
Get chart data (price, VWAP, bands, volume) for a specific date.

**Parameters:**
- `date`: Date in ISO format (e.g., "2024-01-01")

**Response:**
```json
{
  "labels": ["09:15", "09:16", ...],
  "price": [2500, 2505, ...],
  "vwap": [2500.1, 2500.15, ...],
  "vwapUpper": [2505, 2505.5, ...],
  "vwapLower": [2495, 2495.5, ...],
  "volume": [100000, 150000, ...]
}
```

#### `POST /api/run-strategy`
Run strategy with custom parameters.

**Request Body:**
```json
{
  "date": "2024-01-01",
  "quantity": 10000,
  "participation": 0.05,
  "lambda": 0.10,
  "sigma": 0.0012,
  "bins": 10,
  "blend": 0.5,
  "warmUpMinutes": 30,
  "vwapWindowMinutes": 20,
  "enableTxCosts": true
}
```

**Response:**
```json
{
  "success": true,
  "fillRate": 0.98,
  "avgFillPrice": 2500.25,
  "marketVwap": 2500.15,
  "slippageBps": -4.0,
  "implementationShortfallBps": -5.2
}
```

#### `GET /api/volume-curve/:date`
Get predicted volume curve for a specific date.

#### `GET /api/bin-allocation`
Get bin allocation based on volume curve.

**Query Parameters:**
- `date`: Date in ISO format
- `bins`: Number of bins (default: 10)
- `quantity`: Total quantity (default: 10000)

#### `GET /api/corrections/:date`
Get correction logs for parameter adjustments during execution.

### Upstox API Routes

#### `GET /api/upstox/health`
Health check endpoint to validate Upstox access token.

**Headers:**
- `Authorization: Bearer {access_token}`

#### `GET /api/upstox/instruments/search`
Search for instruments by symbol or name.

**Query Parameters:**
- `query`: Search query (e.g., "RELIANCE")
- `segments`: Market segments (e.g., "FO,EQ")
- `exchanges`: Exchanges (e.g., "NSE")
- `records`: Number of results (default: 10)

#### `GET /api/upstox/historical-candle`
Fetch historical candle data for an instrument.

**Query Parameters:**
- `instrument_key`: Instrument key (e.g., "NSE_EQ|INE002A01018")
- `interval`: Candle interval (1minute, 30minute, day, week, month)
- `to_date`: End date (ISO format)
- `from_date`: Start date (ISO format)

#### `GET /api/upstox/market-quote`
Get market quote (L2 market depth) for an instrument.

**Query Parameters:**
- `instrument_key`: Instrument key
- `access_token`: Upstox access token

#### `GET /api/upstox/market-data-feed/authorize`
Authorize WebSocket connection for real-time data.

**Query Parameters:**
- `access_token`: Upstox access token

### Clearbit API Route

#### `GET /api/clearbit/companies/suggest`
Proxy for Clearbit company autocomplete API (used for fetching company logos).

**Query Parameters:**
- `query`: Company name to search

## 🧩 Components

### Dashboard Components

#### `DashboardLayout`
Main layout component with resizable and collapsible sidebars.

**Features:**
- Left sidebar: Data upload and parameters
- Right sidebar: Stock details and customization
- Center: Chart display
- Resizable panels with drag handles
- Collapsible panels

#### `ChartPanel`
Displays price charts with VWAP analysis.

**Features:**
- Price chart with VWAP line
- Upper and lower bands
- Buy signal indicators
- Volume overlay
- Timeframe selection (All, Day, Week, Month, Year)
- Interactive zoom and pan

#### `DataUploadPanel`
Handles data upload and watchlist management.

**Features:**
- CSV file upload
- Watchlist search and management
- Real-time mode toggle
- Stock selection with price tracking

#### `MarketDepth`
Displays Level 2 market depth data.

**Features:**
- Bid/ask orders (5 levels)
- Real-time updates via REST API polling
- Price, quantity, and order count display

#### `StockDetailPanel`
Shows detailed stock information.

**Features:**
- Company logo and name
- Market depth display
- OHLC data
- Volume information

#### `UpstoxConfigDialog`
Modal for configuring Upstox API credentials.

**Features:**
- Access token input
- Token validation
- Link to Upstox Developer Apps

## 📊 VWAP Strategy

The VWAP (Volume Weighted Average Price) strategy calculates the average price at which a stock has traded throughout the day, based on both volume and price.

### Calculation
```
VWAP = Σ(Price × Volume) / Σ(Volume)
```

### Bands
Upper and lower bands are calculated based on standard deviation from VWAP:
```
Upper Band = VWAP + (Multiplier × Standard Deviation)
Lower Band = VWAP - (Multiplier × Standard Deviation)
```

### Buy Signals
Buy signals are generated when:
- Price crosses below the lower band
- Volume is above average
- Trend is favorable

## 🎨 Customization

### Chart Customization
- **Band Color**: Customize VWAP band colors
- **Signal Color**: Set buy signal indicator color
- **Volume Curve**: Toggle volume curve overlay
- **Chart Period**: Select display period (1D, 1W, 1M, 3M, 6M, 1Y, ALL)

### Strategy Parameters
- **VWAP Period**: VWAP calculation period
- **Band Multiplier**: Standard deviation multiplier for bands
- **Volume Threshold**: Minimum volume for signals
- **Transaction Costs**: Set buy/sell transaction costs

## 🔐 Security

- Access tokens are stored locally in browser localStorage
- API routes proxy requests to avoid CORS issues
- No sensitive data is sent to third-party servers
- Upstox tokens are valid for 30 days

## 🐛 Troubleshooting

### Common Issues

**"Invalid access token" error**
- Regenerate your access token from Upstox Developer Apps
- Ensure the token hasn't expired (30-day validity)

**Market depth not displaying**
- Check browser console for API errors
- Ensure you're subscribed to the correct instrument
- Verify your Upstox Plus plan includes L2 data

**Chart not loading**
- Check if historical data is available for the selected date range
- Verify instrument key is correct
- Check browser console for errors

**CORS errors**
- API routes should proxy all external requests
- Ensure API routes are running correctly

## 📝 Development

### Adding New Components

1. Create component in `components/dashboard/` or `components/ui/`
2. Add TypeScript interfaces in `lib/types.ts` if needed
3. Import and use in parent components

### Adding New API Routes

1. Create route in `app/api/{service}/{endpoint}/route.ts`
2. Handle GET/POST requests
3. Return proper JSON responses
4. Add error handling

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Keep components small and focused

## 🚀 Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Docker

```bash
docker build -t vwap-dashboard .
docker run -p 3001:3001 vwap-dashboard
```

## 📄 License

This project is part of the optimal_vwap_execution repository.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review Upstox API documentation: https://upstox.com/developer/api-documentation

## 🙏 Acknowledgments

- Upstox for market data API
- shadcn/ui for UI components
- Recharts for charting library
- Next.js team for the amazing framework
