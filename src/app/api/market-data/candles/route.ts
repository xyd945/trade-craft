import { NextRequest, NextResponse } from "next/server";
import { Candle } from "@/lib/schema/chartActions";

// Binance API base URL
const BINANCE_API = "https://api.binance.com/api/v3";

// Timeframe mapping to Binance interval format
const timeframeToInterval: Record<string, string> = {
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol") || "BTCUSDT";
    const timeframe = searchParams.get("timeframe") || "1d";
    const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 1000);

    const interval = timeframeToInterval[timeframe] || "1d";

    try {
        // Fetch from Binance with caching
        const response = await fetch(
            `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
            {
                next: {
                    revalidate: 60, // Cache for 60 seconds
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status}`);
        }

        const data = await response.json();

        // Transform Binance klines to our Candle format
        // Binance returns: [openTime, open, high, low, close, volume, closeTime, ...]
        const candles: Candle[] = data.map((kline: (string | number)[]) => ({
            time: Math.floor(Number(kline[0]) / 1000), // Convert ms to seconds for lightweight-charts
            open: parseFloat(kline[1] as string),
            high: parseFloat(kline[2] as string),
            low: parseFloat(kline[3] as string),
            close: parseFloat(kline[4] as string),
            volume: parseFloat(kline[5] as string),
        }));

        return NextResponse.json({
            symbol,
            timeframe,
            candles,
        });
    } catch (error) {
        console.error("Error fetching market data:", error);
        return NextResponse.json(
            { error: "Failed to fetch market data" },
            { status: 500 }
        );
    }
}
