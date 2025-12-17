import { NextRequest, NextResponse } from "next/server";
import { Candle } from "@/lib/schema/chartActions";

// Force Node.js runtime (not Edge) for better compatibility
export const runtime = "nodejs";

// Binance API endpoints (with fallbacks)
const BINANCE_APIS = [
    "https://api.binance.com/api/v3",
    "https://api1.binance.com/api/v3",
    "https://api2.binance.com/api/v3",
    "https://api3.binance.com/api/v3",
];

// Timeframe mapping to Binance interval format
const timeframeToInterval: Record<string, string> = {
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
};

// Helper to add CORS headers
function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol") || "BTCUSDT";
    const timeframe = searchParams.get("timeframe") || "1d";
    const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 1000);

    const interval = timeframeToInterval[timeframe] || "1d";

    // Try each API endpoint until one works
    let lastError: Error | null = null;

    for (const apiBase of BINANCE_APIS) {
        try {
            const url = `${apiBase}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
            console.log(`[Market Data] Fetching from: ${apiBase}`);

            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Tradecraft/1.0",
                },
                // Don't use Next.js caching on Vercel to avoid issues
                cache: "no-store",
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Market Data] ${apiBase} failed: ${response.status} - ${errorText}`);
                lastError = new Error(`Binance API error: ${response.status}`);
                continue;
            }

            const data = await response.json();

            // Transform Binance klines to our Candle format
            const candles: Candle[] = data.map((kline: (string | number)[]) => ({
                time: Math.floor(Number(kline[0]) / 1000),
                open: parseFloat(kline[1] as string),
                high: parseFloat(kline[2] as string),
                low: parseFloat(kline[3] as string),
                close: parseFloat(kline[4] as string),
                volume: parseFloat(kline[5] as string),
            }));

            console.log(`[Market Data] Success: ${candles.length} candles from ${apiBase}`);

            return NextResponse.json(
                { symbol, timeframe, candles },
                { headers: corsHeaders() }
            );
        } catch (error) {
            console.error(`[Market Data] ${apiBase} exception:`, error);
            lastError = error as Error;
            continue;
        }
    }

    // All endpoints failed
    console.error("[Market Data] All Binance endpoints failed:", lastError?.message);
    return NextResponse.json(
        {
            error: "Failed to fetch market data from all endpoints",
            details: lastError?.message,
        },
        { status: 500, headers: corsHeaders() }
    );
}

