# VWAP Trading Dashboard - Setup & Deployment Guide

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Install Dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

2. **Run Development Server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

3. **Open Dashboard**
   - Navigate to `http://localhost:3000`
   - You'll see the VWAP Trading Dashboard

### First Steps

1. **Load Sample Data**
   - Click the upload area in the left panel
   - Select `public/sample-data.csv` (or upload your own CSV)
   - The chart will automatically populate

2. **Adjust Parameters**
   - Set total quantity: 100,000 shares
   - Number of tranches: 5
   - VWAP deviation: 0.5%

3. **Run Backtest**
   - Click "Run Backtest"
   - Watch the animated progress with verbose messages
   - Results appear on the right panel

4. **Customize Visualization**
   - Use the right panel to adjust chart colors, bands, volume bins
   - Try different chart periods (1min, 5min, etc.)
   - Toggle VWAP bands, volume visualization, etc.

## Project Structure

```
/vercel/share/v0-project/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Main dashboard page
│   └── globals.css          # Global styles & theme
├── components/
│   ├── dashboard/
│   │   ├── DashboardLayout.tsx      # Main layout
│   │   ├── Header.tsx               # Header component
│   │   ├── DataUploadPanel.tsx      # CSV upload
│   │   ├── ParametersPanel.tsx      # Strategy params
│   │   ├── ChartPanel.tsx           # Chart container
│   │   ├── CustomizationPanel.tsx   # Customization
│   │   ├── BenchmarkingPanel.tsx    # Results
│   │   ├── ExecutionSummary.tsx     # Footer summary
│   │   └── charts/
│   │       ├── PriceChart.tsx       # Candlestick chart
│   │       └── VolumeChart.tsx      # Volume visualization
│   └── ui/                          # shadcn components
├── lib/
│   ├── types.ts             # TypeScript interfaces
│   ├── data-parser.ts       # CSV parsing
│   ├── vwap-calculator.ts   # VWAP calculations
│   ├── volume-allocation.ts # Volume analysis
│   ├── transaction-costs.ts # Fee calculations
│   ├── backtest-service.ts  # Backtest engine
│   ├── backend-integration.ts # Backend API client
│   └── utils.ts             # Utility functions
├── public/
│   └── sample-data.csv      # Sample market data
├── VWAP_DASHBOARD_README.md # Feature documentation
├── SETUP.md                 # This file
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## Configuration

### Environment Variables

Create a `.env.local` file for backend integration:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_API_KEY=your_api_key_here
```

### Theme Customization

Edit `app/globals.css` to customize colors:

```css
:root {
  --primary: oklch(0.55 0.2 40);      /* Primary brand color */
  --secondary: oklch(0.92 0.01 100);  /* Secondary color */
  --background: oklch(0.98 0.001 0);  /* Background */
  --foreground: oklch(0.15 0 0);      /* Text color */
}

.dark {
  /* Dark theme colors */
  --background: oklch(0.12 0 0);
  --foreground: oklch(0.95 0.001 0);
  /* ... */
}
```

## Building for Production

### Build Command
```bash
pnpm build
# or
npm run build
```

### Run Production Build
```bash
pnpm start
# or
npm start
```

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables (if needed)
   - Click "Deploy"

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t vwap-dashboard .
docker run -p 3000:3000 vwap-dashboard
```

### AWS EC2 Deployment

1. Launch EC2 instance (Ubuntu 22.04)
2. Connect via SSH
3. Install Node.js and pnpm
4. Clone repository
5. Run: `pnpm install && pnpm build && pnpm start`
6. Use PM2 for process management

## Backend Integration Setup

### Java Backend Configuration

The dashboard expects a Java backend at `http://localhost:8080` with these endpoints:

#### Endpoints Required

```
POST   /api/backtest/submit         - Submit backtest job
GET    /api/backtest/results/:jobId - Get results
GET    /api/backtest/progress/:jobId - Get progress
POST   /api/backtest/cancel/:jobId  - Cancel job
WS     /api/backtest/stream/:jobId  - WebSocket stream
POST   /api/data/upload             - Upload CSV
POST   /api/upstox/fetch            - Fetch Upstox data
GET    /health                      - Health check
```

### Request/Response Examples

**Submit Backtest:**
```javascript
POST /api/backtest/submit
{
  "strategy": {
    "totalQuantity": 100000,
    "numTranches": 5,
    "trancheSize": 20000,
    "maxSlippage": 0.1,
    "vwapDeviation": 0.5,
    "minVolumeThreshold": 0,
    "orderType": "LIMIT",
    "executionTimeframe": "INTRADAY"
  },
  "timeRange": {
    "start": "2026-01-01T09:15:00Z",
    "end": "2026-01-01T16:00:00Z"
  },
  "fees": {
    "spreadBps": 2,
    "brokerage": 0.03,
    "stt": 0.025,
    "gst": 18,
    "exchangeFee": 0.00325
  }
}

Response:
{
  "jobId": "job_12345",
  "status": "SUBMITTED",
  "createdAt": "2026-01-01T09:15:00Z"
}
```

**Get Progress:**
```
GET /api/backtest/progress/job_12345

Response:
{
  "jobId": "job_12345",
  "progress": 45,
  "message": "Allocating volumes...",
  "status": "RUNNING",
  "startTime": "2026-01-01T09:15:00Z",
  "estimatedCompletionTime": "2026-01-01T09:17:00Z"
}
```

## Performance Optimization

### Tips

1. **Use Production Build**: Always use production build for deployment
2. **Enable Compression**: Use gzip compression on server
3. **Optimize Images**: Compress chart images and assets
4. **Caching**: Implement browser caching for static assets
5. **Code Splitting**: Leverage Next.js automatic code splitting

### Monitoring

- Monitor memory usage for large datasets (10,000+ candles)
- Track WebSocket connections for real-time features
- Use performance monitoring tools (Vercel Analytics, etc.)

## Troubleshooting

### Common Issues

**1. Chart Not Rendering**
- Clear browser cache
- Check browser console for errors
- Ensure CSV data is valid

**2. Slow Performance**
- Reduce number of volume bins
- Increase chart period (use 5min instead of 1min)
- Check browser memory usage

**3. Backtest Not Starting**
- Verify CSV data uploaded successfully
- Check parameters are valid
- Check browser console for errors

**4. WebSocket Connection Failed**
- Verify backend URL is correct
- Check CORS configuration on backend
- Ensure WebSocket port is open

**5. CSV Upload Fails**
- Verify CSV format (see VWAP_DASHBOARD_README.md)
- Check file size isn't too large
- Ensure all required columns present

## Development Tips

### Debugging

```typescript
// Add debug logs in components
console.log("[v0] Variable:", variable);
console.log("[v0] State updated:", newState);
```

### Testing Locally

1. Use the sample data: `public/sample-data.csv`
2. Create custom test data with extreme values
3. Test with different browser zoom levels
4. Test on mobile devices for responsiveness

### Code Style

- Use TypeScript for type safety
- Follow existing component patterns
- Use Tailwind CSS for styling
- Keep components focused and reusable

## API Documentation

See `lib/backend-integration.ts` for:
- `BackendClient` class for API communication
- `pollBacktestProgress` for polling-based updates
- WebSocket integration examples

## Support & Troubleshooting

For issues:
1. Check console logs for error messages
2. Review VWAP_DASHBOARD_README.md for feature details
3. Verify backend connectivity if using Java integration
4. Check network tab in browser dev tools

## Next Steps

1. ✅ Deploy to production
2. ✅ Connect to Java backend
3. ⏳ Integrate Upstox API
4. ⏳ Add real-time WebSocket updates
5. ⏳ Implement advanced risk analytics
6. ⏳ Add multi-asset support

---

**Dashboard Version**: 1.0.0  
**Last Updated**: April 2026  
**Framework**: Next.js 16 + React 19 + TypeScript  
**Styling**: Tailwind CSS + shadcn/ui
