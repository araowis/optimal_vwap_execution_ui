const WebSocket = require("ws");
const axios = require("axios");
const protobuf = require("protobufjs");
const { Buffer } = require("buffer");

// --- CONFIGURATION ---
const ACCESS_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiI1SkNXTVQiLCJqdGkiOiI2OWUxZTAxYmVhOTJhNTBmZTYwZjExMDkiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaXNQbHVzUGxhbiI6dHJ1ZSwiaXNFeHRlbmRlZCI6dHJ1ZSwiaWF0IjoxNzc2NDEwNjUxLCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE4MDc5OTkyMDB9.Bi0M5BhIrybJeWHlEWCKn-OXEJikPCvu3lz6yOUyUY8"; // Get from Upstox Developer Console
const INSTRUMENT_KEY = "NSE_EQ|INE848E01016"; // Example: RELIANCE
const HISTORICAL_URL = `https://api.upstox.com/v2/historical-candle/intraday/${INSTRUMENT_KEY}/1minute`;

// --- 1. FETCH HISTORICAL DATA (REST API) ---
async function getHistoricalData() {
  try {
    const response = await axios.get(HISTORICAL_URL, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
    console.log("--- Historical Data ---");
    console.log(response.data.data.candles); // [timestamp, open, high, low, close, volume, 0]
  } catch (error) {
    console.error(
      "Error fetching historical data:",
      error.response?.data || error.message,
    );
  }
}

// --- 2. SETUP WEBSOCKET & PROTOBUF (L3 DATA) ---
async function startWebSocket() {
  // Load Protobuf Model
  const root = await protobuf.load("marketDataFeed.proto"); // Download this from Upstox docs
  const FeedMessage = root.lookupType("com.upstox.marketdatafeed.FeedMessage");

  // Authorize WebSocket
  const authUrl = "https://api.upstox.com/v3/feed/market-data-feed/authorize";
  const authResponse = await axios.get(authUrl, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const socketUrl = authResponse.data.data.authorizedRedirectUri;

  const ws = new WebSocket(socketUrl, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    followRedirects: true,
  });

  ws.on("open", () => {
    console.log("Connected to Upstox WebSocket");
    // Subscribe to Full Mode (L3 Data)
    const subscription = {
      guid: "someguid",
      method: "sub",
      data: {
        mode: "full",
        instrumentKeys: [INSTRUMENT_KEY],
      },
    };
    ws.send(Buffer.from(JSON.stringify(subscription)));
  });

  ws.on("message", (data) => {
    // Decode Protobuf binary data
    const message = FeedMessage.decode(new Uint8Array(data));
    console.log("--- Live L3 Data ---");
    console.log(JSON.stringify(message, null, 2));
  });

  ws.on("error", (e) => console.error("WS Error:", e));
  ws.on("close", () => console.log("WS Disconnected"));
}

// --- EXECUTION ---
getHistoricalData();
startWebSocket();
