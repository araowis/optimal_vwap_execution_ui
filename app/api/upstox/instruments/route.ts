import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch instruments data from Upstox static server
    const response = await fetch(
      "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json",
    );

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch instruments from Upstox" },
        { status: response.status },
      );
    }

    const text = await response.text();
    const instruments = JSON.parse(text);

    return NextResponse.json({
      success: true,
      instruments: instruments,
    });
  } catch (error) {
    console.error("Error fetching instruments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch instruments data" },
      { status: 500 },
    );
  }
}
