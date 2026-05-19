const UpstoxClient = require("upstox-js-sdk");

// --- Configuration ---
const ACCESS_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiI1SkNXTVQiLCJqdGkiOiI2OWUxZTAxYmVhOTJhNTBmZTYwZjExMDkiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaXNQbHVzUGxhbiI6dHJ1ZSwiaXNFeHRlbmRlZCI6dHJ1ZSwiaWF0IjoxNzc2NDEwNjUxLCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE4MDc5OTkyMDB9.Bi0M5BhIrybJeWHlEWCKn-OXEJikPCvu3lz6yOUyUY8"; // Replace with your token
const INSTRUMENT_KEY = "NSE_EQ|INE002A01018"; // Reliance NSE

// Initialize API Client
const defaultClient = UpstoxClient.ApiClient.instance;
const OAUTH2 = defaultClient.authentications["OAUTH2"];
OAUTH2.accessToken = ACCESS_TOKEN;

async function startL2Stream() {
  try {
    // 1. Get the authorized WebSocket URL using direct fetch (to avoid SDK bug)
    const authResponse = await fetch(
      "https://api.upstox.com/v3/feed/market-data-feed/authorize",
      {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      },
    );

    const authData = await authResponse.json();
    console.log("Auth response:", authData);

    if (!authData.data?.authorized_redirect_uri) {
      throw new Error("Failed to get authorized WebSocket URL");
    }

    const wsUrl = authData.data.authorized_redirect_uri;
    console.log("WebSocket URL:", wsUrl);

    // Use the SDK's streamer with the correct constructor signature
    // MarketDataStreamerV3(instrumentKeys, mode) - SDK handles subscription automatically
    const streamer = new UpstoxClient.MarketDataStreamerV3(
      [INSTRUMENT_KEY],
      "full",
    );

    // 2. Event: Connection Open
    streamer.on("open", () => {
      console.log("Connected to Upstox WebSocket");
      console.log("Subscribed to:", INSTRUMENT_KEY, "in full mode");
    });

    // 3. Event: Receiving Data
    streamer.on("message", (data) => {
      // Handle Buffer data (binary protobuf or JSON-encoded binary)
      let parsedData = data;
      if (Buffer.isBuffer(data)) {
        try {
          const decoded = data.toString("utf8");
          parsedData = JSON.parse(decoded);
        } catch (e) {
          console.log("Raw buffer data:", data);
          return;
        }
      }

      console.log("Received data:", JSON.stringify(parsedData, null, 2));

      const feed = parsedData.feeds ? parsedData.feeds[INSTRUMENT_KEY] : null;
      if (feed && feed.ff && feed.ff.marketFF) {
        const depth = feed.ff.marketFF.marketDepth;
        const ltp = feed.ff.marketFF.ltpc.ltp;

        console.clear();
        console.log(`--- RELIANCE Real-time L2 ---`);
        console.log(`LTP: ₹${ltp}`);

        console.log("\nBUY ORDERS (Bids):");
        depth.buy.forEach((bid) => {
          console.log(
            `  Price: ${bid.price} | Qty: ${bid.quantity} | Orders: ${bid.orders}`,
          );
        });

        console.log("\nSELL ORDERS (Asks):");
        depth.sell.forEach((ask) => {
          console.log(
            `  Price: ${ask.price} | Qty: ${ask.quantity} | Orders: ${ask.orders}`,
          );
        });
      } else {
        console.log("Data structure:", Object.keys(parsedData));
      }
    });

    streamer.on("error", (err) => console.error("Socket Error:", err));

    // Connect
    streamer.connect();
  } catch (error) {
    console.error("Initialization Error:", error);
  }
}

startL2Stream();
