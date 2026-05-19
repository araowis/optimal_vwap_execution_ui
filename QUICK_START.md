# VWAP Dashboard - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. **Start the Dashboard**

```bash
pnpm install    # Install dependencies
pnpm dev        # Start development server
# Open http://localhost:3000
```

### 2. **Load Data**

- Click the **upload area** in the left panel
- Select your CSV file or use `public/sample-data.csv`
- Wait for chart to populate

### 3. **Set Parameters**

In the left panel, configure:

- **Total Quantity**: 100,000 shares
- **Tranches**: 5 parts
- **VWAP Deviation**: 0.5%

### 4. **Run Backtest**

- Click **"Run Backtest"** button
- Watch animated progress
- View results on the right

### 5. **Customize View**

In the right panel:

- Adjust **VWAP Band Width**
- Change **Chart Period** (1min, 5min, etc.)
- Toggle **Volume Bins**
- Customize **Colors**

---

## 📊 Key Metrics at a Glance

| Metric                 | Meaning                                        |
| ---------------------- | ---------------------------------------------- |
| **Execution Price**    | Average price your order filled at             |
| **VWAP**               | Volume-weighted average price during execution |
| **Price Improvement**  | How much better/worse than VWAP                |
| **Total Cost**         | All fees and transaction costs                 |
| **VWAP Participation** | % of execution at target VWAP                  |
| **Sharpe Ratio**       | Risk-adjusted performance                      |
| **Win Rate**           | % of profitable trades                         |

---

## 🎨 Customization Quick Tips

### VWAP Bands

- **Band Width**: Increase for wider bands (1-3 sigma)
- **Colors**: Click color boxes to change
- **Opacity**: Adjust transparency with slider

### Volume Visualization

- **Number of Bins**: 5, 10, 20, or 50 price levels
- **Coloring**: Monochrome, gradient, or by price
- **Show Bins**: Toggle on hover

### Chart Period

- **1 Minute**: Most detailed, granular view
- **5 Minute**: Balance detail and clarity
- **Daily**: High-level overview

---

## 📝 CSV Format

Your data file must have these columns:

```
timestamp,open,high,low,close,volume,oi
2026-01-01 09:15:00+05:30,4090,4103.9,4088.3,4102.3,8121,0
```

**Column Requirements:**

- `timestamp`: ISO 8601 format with timezone
- `open, high, low, close`: Price values (float)
- `volume`: Trading volume (integer)
- `oi`: Optional (open interest)

---

## 🔧 Strategy Parameters Explained

### Execution Settings

- **Total Quantity**: Shares to buy
- **Number of Tranches**: Split order into N parts
- **Tranche Size**: Auto-calculated shares per part
- **Order Type**: LIMIT vs MARKET

### Risk Management

- **Max Slippage %**: Stop if price moves too much
- **VWAP Deviation %**: Buy signal threshold (e.g., 0.5% below VWAP)
- **Min Volume Threshold**: Minimum volume required

---

## 📈 Understanding Results

### Execution Summary (Bottom)

Shows overall execution quality with key metrics

### Benchmarking Panel (Right)

- **Cost Breakdown**: Where your money went
- **Performance Metrics**: Sharpe, win rate, drawdown
- **Execution Summary**: Fill %, costs, efficiency

### Chart Hover

Hover over any candle to see:

- Time, OHLCV data
- VWAP value at that point
- Price deviation from VWAP
- Volume details

---

## ⚡ Pro Tips

1. **Test with Sample Data First**
   - Use `public/sample-data.csv` to learn
   - Experiment with parameters

2. **Optimize Parameters**
   - Start with 5 tranches
   - Adjust VWAP deviation based on volatility
   - Lower max slippage for lower tolerance

3. **Analyze Results**
   - Look at cost breakdown for fee insights
   - Check VWAP participation rate
   - Monitor max adverse excursion

4. **Customize for Your Style**
   - Dark theme for night trading
   - Light theme for day analysis
   - Adjust colors for accessibility

---

## 🔗 Integration with Java Backend

### Setup

1. Ensure Java backend is running on `http://localhost:8080`
2. Add environment variables:
   ```
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
   NEXT_PUBLIC_WS_URL=ws://localhost:8080
   ```
3. Backtest will use backend when running

### Upstox Integration

1. Get API credentials from Upstox
2. Connect in "Data Upload" panel
3. Fetch real-time data automatically

---

## 🐛 Troubleshooting

### Chart Not Showing

- Check CSV format is correct
- Ensure timestamps are valid
- Clear browser cache

### Backtest Not Running

- Verify CSV data uploaded
- Check all parameters are valid
- Look at browser console for errors

### Slow Performance

- Reduce volume bins (use 5 or 10)
- Change chart period to 5min or daily
- Close other browser tabs

---

## 📚 Full Documentation

- **Features & Guides**: See `VWAP_DASHBOARD_README.md`
- **Setup & Deployment**: See `SETUP.md`
- **Build Overview**: See `BUILD_SUMMARY.md`

---

## 🚢 Deployment

### Quick Deploy to Vercel

```bash
git init
git add .
git commit -m "Initial"
git push -u origin main
```

Then visit vercel.com to connect and deploy

### Docker Deploy

```bash
docker build -t vwap-dashboard .
docker run -p 3000:3000 vwap-dashboard
```

---

## 📞 Support

**Need Help?**

1. Check browser console (F12) for errors
2. Review documentation files
3. Verify CSV format
4. Check backend connectivity

---

## ✨ What's Next?

- [ ] Load your own market data
- [ ] Run first backtest
- [ ] Customize visualization
- [ ] Connect Java backend
- [ ] Integrate Upstox API
- [ ] Export results

---

**Happy Trading! 📈**

_VWAP Dashboard v1.0.0 - Professional Trading Platform_
