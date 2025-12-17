"use client";

import { useEffect } from "react";
import { useChart } from "@/context/ChartContext";
import { ChartCanvas } from "./ChartCanvas";
import { Timeframe } from "@/lib/schema/chartActions";

export function ChartPanel() {
    const { state, dispatch, loadCandles, executeAction } = useChart();

    // Load initial candles on mount
    useEffect(() => {
        loadCandles();
    }, [loadCandles]);

    const handleSymbolChange = (symbol: string) => {
        executeAction({ type: "SET_SYMBOL", symbol });
    };

    const handleTimeframeChange = (timeframe: Timeframe) => {
        executeAction({ type: "SET_TIMEFRAME", timeframe });
    };

    const handleClearOverlays = () => {
        executeAction({ type: "CLEAR_HIGHLIGHTS" });
    };

    const handleClearIndicators = () => {
        executeAction({ type: "CLEAR_INDICATORS" });
    };

    const handleToggleIndicator = (indicator: "MACD" | "RSI" | "EMA") => {
        const existing = state.indicators.find((i) => i.name === indicator);
        if (existing) {
            dispatch({ type: "REMOVE_INDICATOR", indicatorName: indicator });
        } else {
            executeAction({ type: "ADD_INDICATOR", indicator });
        }
    };

    const isIndicatorActive = (indicator: string) => {
        return state.indicators.some((i) => i.name === indicator);
    };

    return (
        <div className="chart-panel">
            <div className="chart-controls">
                {/* Symbol selector */}
                <select
                    className="chart-select"
                    value={state.symbol}
                    onChange={(e) => handleSymbolChange(e.target.value)}
                >
                    <option value="BTCUSDT">BTC/USDT</option>
                    <option value="ETHUSDT">ETH/USDT</option>
                    <option value="BNBUSDT">BNB/USDT</option>
                </select>

                {/* Timeframe selector */}
                <select
                    className="chart-select"
                    value={state.timeframe}
                    onChange={(e) => handleTimeframeChange(e.target.value as Timeframe)}
                >
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="1d">1 Day</option>
                </select>

                <div style={{ flex: 1 }} />

                {/* Indicator toggles */}
                <button
                    className={`chart-button ${isIndicatorActive("EMA") ? "active" : ""}`}
                    onClick={() => handleToggleIndicator("EMA")}
                >
                    EMA
                </button>
                <button
                    className={`chart-button ${isIndicatorActive("MACD") ? "active" : ""}`}
                    onClick={() => handleToggleIndicator("MACD")}
                >
                    MACD
                </button>
                <button
                    className={`chart-button ${isIndicatorActive("RSI") ? "active" : ""}`}
                    onClick={() => handleToggleIndicator("RSI")}
                >
                    RSI
                </button>

                <div style={{ width: "1px", height: "24px", background: "var(--border)", margin: "0 8px" }} />

                {/* Clear buttons */}
                <button className="chart-button" onClick={handleClearOverlays}>
                    Clear Highlights
                </button>
                <button className="chart-button danger" onClick={handleClearIndicators}>
                    Clear All
                </button>
            </div>

            <div className="chart-container">
                {state.isLoading ? (
                    <div className="loading">
                        <div className="loading-spinner" />
                    </div>
                ) : (
                    <ChartCanvas />
                )}
            </div>

            {/* Status bar */}
            <div
                style={{
                    padding: "8px 16px",
                    background: "var(--card)",
                    borderTop: "1px solid var(--border)",
                    fontSize: "12px",
                    color: "var(--muted)",
                    display: "flex",
                    gap: "16px",
                }}
            >
                <span>📊 {state.symbol}</span>
                <span>⏱️ {state.timeframe}</span>
                <span>📈 {state.candles.length} candles</span>
                {state.indicators.length > 0 && (
                    <span>🔧 {state.indicators.map((i) => i.name).join(", ")}</span>
                )}
                {state.highlights.length > 0 && <span>✨ {state.highlights.length} highlights</span>}
            </div>
        </div>
    );
}
