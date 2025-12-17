"use client";

import { useEffect, useRef } from "react";
import {
    createChart,
    IChartApi,
    ISeriesApi,
    CandlestickData,
    LineData,
    HistogramData,
    Time,
    CandlestickSeries,
    LineSeries,
    HistogramSeries,
    SeriesMarker,
    createSeriesMarkers,
    ISeriesMarkersPluginApi,
} from "lightweight-charts";
import { useChart } from "@/context/ChartContext";
import { calculateEMA, calculateMACD, calculateRSI } from "@/lib/indicators";

export function ChartCanvas() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const macdLineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const macdSignalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const macdHistogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

    const { state } = useChart();

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: "#0a0a0a" },
                textColor: "#ededed",
            },
            grid: {
                vertLines: { color: "#1e293b" },
                horzLines: { color: "#1e293b" },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: "#3b82f6",
                    width: 1,
                    style: 2,
                },
                horzLine: {
                    color: "#3b82f6",
                    width: 1,
                    style: 2,
                },
            },
            rightPriceScale: {
                borderColor: "#1e293b",
            },
            timeScale: {
                borderColor: "#1e293b",
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: {
                vertTouchDrag: false,
            },
        });

        // Create candlestick series using v5 API
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#10b981",
            downColor: "#ef4444",
            borderUpColor: "#10b981",
            borderDownColor: "#ef4444",
            wickUpColor: "#10b981",
            wickDownColor: "#ef4444",
        });

        // Create markers plugin for the series
        const markers = createSeriesMarkers(candleSeries, []);

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        markersRef.current = markers;

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, []);

    // Update candle data
    useEffect(() => {
        if (!candleSeriesRef.current || state.candles.length === 0) return;

        const candleData: CandlestickData<Time>[] = state.candles.map((c) => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        candleSeriesRef.current.setData(candleData);
        chartRef.current?.timeScale().fitContent();
    }, [state.candles]);

    // Update indicators
    useEffect(() => {
        if (!chartRef.current || state.candles.length === 0) return;

        const closes = state.candles.map((c) => c.close);
        const times = state.candles.map((c) => c.time as Time);

        // Handle EMA
        const emaConfig = state.indicators.find((i) => i.name === "EMA");
        if (emaConfig) {
            const period = emaConfig.params.period || 20;
            const emaValues = calculateEMA(closes, period);

            const emaData: LineData<Time>[] = emaValues
                .map((value: number | null, idx: number) => ({
                    time: times[idx],
                    value: value as number,
                }))
                .filter((d: LineData<Time>) => d.value !== null);

            if (!emaSeriesRef.current) {
                emaSeriesRef.current = chartRef.current.addSeries(LineSeries, {
                    color: "#f59e0b",
                    lineWidth: 2,
                    priceLineVisible: false,
                });
            }
            emaSeriesRef.current.setData(emaData);
        } else if (emaSeriesRef.current) {
            chartRef.current.removeSeries(emaSeriesRef.current);
            emaSeriesRef.current = null;
        }

        // Handle MACD
        const macdConfig = state.indicators.find((i) => i.name === "MACD");
        if (macdConfig) {
            const fast = macdConfig.params.fast || 12;
            const slow = macdConfig.params.slow || 26;
            const signal = macdConfig.params.signal || 9;
            const { macdLine, signalLine, histogram } = calculateMACD(closes, fast, slow, signal);

            // MACD Line
            const macdLineData: LineData<Time>[] = macdLine
                .map((value: number | null, idx: number) => ({
                    time: times[idx],
                    value: value as number,
                }))
                .filter((d: LineData<Time>) => d.value !== null);

            if (!macdLineSeriesRef.current) {
                macdLineSeriesRef.current = chartRef.current.addSeries(LineSeries, {
                    color: "#3b82f6",
                    lineWidth: 2,
                    priceLineVisible: false,
                    priceScaleId: "macd",
                });
                chartRef.current.priceScale("macd").applyOptions({
                    scaleMargins: { top: 0.8, bottom: 0 },
                });
            }
            macdLineSeriesRef.current.setData(macdLineData);

            // Signal Line
            const signalLineData: LineData<Time>[] = signalLine
                .map((value: number | null, idx: number) => ({
                    time: times[idx],
                    value: value as number,
                }))
                .filter((d: LineData<Time>) => d.value !== null);

            if (!macdSignalSeriesRef.current) {
                macdSignalSeriesRef.current = chartRef.current.addSeries(LineSeries, {
                    color: "#f59e0b",
                    lineWidth: 2,
                    priceLineVisible: false,
                    priceScaleId: "macd",
                });
            }
            macdSignalSeriesRef.current.setData(signalLineData);

            // Histogram
            const histogramData: HistogramData<Time>[] = histogram
                .map((value: number | null, idx: number) => ({
                    time: times[idx],
                    value: value as number,
                    color: (value as number) >= 0 ? "#10b981" : "#ef4444",
                }))
                .filter((d: HistogramData<Time>) => d.value !== null);

            if (!macdHistogramSeriesRef.current) {
                macdHistogramSeriesRef.current = chartRef.current.addSeries(HistogramSeries, {
                    priceLineVisible: false,
                    priceScaleId: "macd",
                });
            }
            macdHistogramSeriesRef.current.setData(histogramData);
        } else {
            // Remove MACD series if not active
            if (macdLineSeriesRef.current) {
                chartRef.current.removeSeries(macdLineSeriesRef.current);
                macdLineSeriesRef.current = null;
            }
            if (macdSignalSeriesRef.current) {
                chartRef.current.removeSeries(macdSignalSeriesRef.current);
                macdSignalSeriesRef.current = null;
            }
            if (macdHistogramSeriesRef.current) {
                chartRef.current.removeSeries(macdHistogramSeriesRef.current);
                macdHistogramSeriesRef.current = null;
            }
        }

        // Handle RSI
        const rsiConfig = state.indicators.find((i) => i.name === "RSI");
        if (rsiConfig) {
            const period = rsiConfig.params.period || 14;
            const rsiValues = calculateRSI(closes, period);

            const rsiData: LineData<Time>[] = rsiValues
                .map((value: number | null, idx: number) => ({
                    time: times[idx],
                    value: value as number,
                }))
                .filter((d: LineData<Time>) => d.value !== null);

            if (!rsiSeriesRef.current) {
                rsiSeriesRef.current = chartRef.current.addSeries(LineSeries, {
                    color: "#a855f7",
                    lineWidth: 2,
                    priceLineVisible: false,
                    priceScaleId: "rsi",
                });
                chartRef.current.priceScale("rsi").applyOptions({
                    scaleMargins: { top: 0.85, bottom: 0 },
                });
            }
            rsiSeriesRef.current.setData(rsiData);
        } else if (rsiSeriesRef.current) {
            chartRef.current.removeSeries(rsiSeriesRef.current);
            rsiSeriesRef.current = null;
        }
    }, [state.candles, state.indicators]);

    // Handle markers for highlights
    useEffect(() => {
        if (!markersRef.current) return;

        if (state.highlights.length === 0) {
            markersRef.current.setMarkers([]);
            return;
        }

        const markers: SeriesMarker<Time>[] = state.highlights
            .filter((h) => !h.pane || h.pane === "price")
            .map((highlight) => ({
                time: highlight.time as Time,
                position: "aboveBar" as const,
                color: "#3b82f6",
                shape: "circle" as const,
                text: highlight.label || "",
            }));

        markersRef.current.setMarkers(markers);
    }, [state.highlights]);

    // Handle focus range
    useEffect(() => {
        if (!chartRef.current || !state.visibleFrom || !state.visibleTo) return;

        chartRef.current.timeScale().setVisibleRange({
            from: state.visibleFrom as Time,
            to: state.visibleTo as Time,
        });
    }, [state.visibleFrom, state.visibleTo]);

    return (
        <div
            ref={chartContainerRef}
            style={{ width: "100%", height: "100%" }}
        />
    );
}
