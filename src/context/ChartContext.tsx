"use client";

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import {
    ChartContextState,
    ChartAction,
    Candle,
    Timeframe,
    IndicatorConfig,
    HighlightPoint,
    Annotation,
} from "@/lib/schema/chartActions";

// Initial state
const initialState: ChartContextState = {
    symbol: "BTCUSDT",
    timeframe: "1d",
    candles: [],
    indicators: [],
    visibleFrom: null,
    visibleTo: null,
    highlights: [],
    annotations: [],
    isLoading: false,
};

// Internal actions for the reducer
type InternalAction =
    | { type: "SET_SYMBOL"; symbol: string }
    | { type: "SET_TIMEFRAME"; timeframe: Timeframe }
    | { type: "SET_CANDLES"; candles: Candle[] }
    | { type: "SET_LOADING"; isLoading: boolean }
    | { type: "ADD_INDICATOR"; indicator: IndicatorConfig }
    | { type: "UPDATE_INDICATOR_PARAMS"; indicatorName: string; params: Record<string, number> }
    | { type: "REMOVE_INDICATOR"; indicatorName: string }
    | { type: "CLEAR_INDICATORS" }
    | { type: "ADD_HIGHLIGHTS"; points: HighlightPoint[] }
    | { type: "ADD_ANNOTATION"; annotation: Annotation }
    | { type: "CLEAR_HIGHLIGHTS" }
    | { type: "SET_VISIBLE_RANGE"; from: number; to: number };

// Reducer
function chartReducer(state: ChartContextState, action: InternalAction): ChartContextState {
    switch (action.type) {
        case "SET_SYMBOL":
            return { ...state, symbol: action.symbol };
        case "SET_TIMEFRAME":
            return { ...state, timeframe: action.timeframe };
        case "SET_CANDLES":
            return { ...state, candles: action.candles };
        case "SET_LOADING":
            return { ...state, isLoading: action.isLoading };
        case "ADD_INDICATOR":
            // Check if indicator already exists
            if (state.indicators.some((i) => i.name === action.indicator.name)) {
                return {
                    ...state,
                    indicators: state.indicators.map((i) =>
                        i.name === action.indicator.name ? action.indicator : i
                    ),
                };
            }
            return { ...state, indicators: [...state.indicators, action.indicator] };
        case "UPDATE_INDICATOR_PARAMS":
            return {
                ...state,
                indicators: state.indicators.map((i) =>
                    i.name === action.indicatorName ? { ...i, params: action.params } : i
                ),
            };
        case "REMOVE_INDICATOR":
            return {
                ...state,
                indicators: state.indicators.filter((i) => i.name !== action.indicatorName),
            };
        case "CLEAR_INDICATORS":
            return { ...state, indicators: [] };
        case "ADD_HIGHLIGHTS":
            return { ...state, highlights: [...state.highlights, ...action.points] };
        case "ADD_ANNOTATION":
            return { ...state, annotations: [...state.annotations, action.annotation] };
        case "CLEAR_HIGHLIGHTS":
            return { ...state, highlights: [], annotations: [] };
        case "SET_VISIBLE_RANGE":
            return { ...state, visibleFrom: action.from, visibleTo: action.to };
        default:
            return state;
    }
}

// Context interface
interface ChartContextValue {
    state: ChartContextState;
    dispatch: React.Dispatch<InternalAction>;
    executeAction: (action: ChartAction) => Promise<void>;
    executeActions: (actions: ChartAction[]) => Promise<void>;
    loadCandles: (symbol?: string, timeframe?: Timeframe) => Promise<void>;
}

const ChartContext = createContext<ChartContextValue | null>(null);

// Provider component
export function ChartProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(chartReducer, initialState);

    // Load candles from API
    const loadCandles = useCallback(
        async (symbol?: string, timeframe?: Timeframe) => {
            const targetSymbol = symbol || state.symbol;
            const targetTimeframe = timeframe || state.timeframe;

            dispatch({ type: "SET_LOADING", isLoading: true });

            try {
                const response = await fetch(
                    `/api/market-data/candles?symbol=${targetSymbol}&timeframe=${targetTimeframe}&limit=500`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch candles");
                }

                const data = await response.json();
                dispatch({ type: "SET_CANDLES", candles: data.candles });
            } catch (error) {
                console.error("Error loading candles:", error);
            } finally {
                dispatch({ type: "SET_LOADING", isLoading: false });
            }
        },
        [state.symbol, state.timeframe]
    );

    // Execute a single chart action
    const executeAction = useCallback(
        async (action: ChartAction) => {
            switch (action.type) {
                case "SET_SYMBOL":
                    dispatch({ type: "SET_SYMBOL", symbol: action.symbol });
                    await loadCandles(action.symbol);
                    break;

                case "SET_TIMEFRAME":
                    dispatch({ type: "SET_TIMEFRAME", timeframe: action.timeframe });
                    await loadCandles(undefined, action.timeframe);
                    break;

                case "LOAD_CANDLES":
                    await loadCandles(action.symbol, action.timeframe as Timeframe);
                    break;

                case "ADD_INDICATOR":
                    const defaultParams: Record<string, Record<string, number>> = {
                        MACD: { fast: 12, slow: 26, signal: 9 },
                        RSI: { period: 14 },
                        EMA: { period: 20 },
                    };
                    dispatch({
                        type: "ADD_INDICATOR",
                        indicator: {
                            name: action.indicator,
                            params: action.params || defaultParams[action.indicator] || {},
                            visible: true,
                        },
                    });
                    break;

                case "UPDATE_INDICATOR_PARAMS":
                    dispatch({
                        type: "UPDATE_INDICATOR_PARAMS",
                        indicatorName: action.indicator,
                        params: action.params,
                    });
                    break;

                case "HIGHLIGHT_POINTS":
                    dispatch({ type: "ADD_HIGHLIGHTS", points: action.points });
                    break;

                case "HIGHLIGHT_REGION":
                    // Convert region to highlight points for visualization
                    dispatch({
                        type: "ADD_HIGHLIGHTS",
                        points: [
                            {
                                time: action.region.fromTime,
                                pane: action.region.pane,
                                label: action.region.label ? `Start: ${action.region.label}` : undefined,
                            },
                            {
                                time: action.region.toTime,
                                pane: action.region.pane,
                                label: action.region.label ? `End: ${action.region.label}` : undefined,
                            },
                        ],
                    });
                    break;

                case "ADD_ANNOTATION":
                    dispatch({
                        type: "ADD_ANNOTATION",
                        annotation: action.annotation,
                    });
                    break;

                case "FOCUS_RANGE":
                    dispatch({
                        type: "SET_VISIBLE_RANGE",
                        from: action.range.fromTime,
                        to: action.range.toTime,
                    });
                    break;

                case "CLEAR_HIGHLIGHTS":
                    dispatch({ type: "CLEAR_HIGHLIGHTS" });
                    break;

                case "CLEAR_INDICATORS":
                    dispatch({ type: "CLEAR_INDICATORS" });
                    break;
            }
        },
        [loadCandles]
    );

    // Execute multiple actions sequentially
    const executeActions = useCallback(
        async (actions: ChartAction[]) => {
            for (const action of actions) {
                await executeAction(action);
            }
        },
        [executeAction]
    );

    return (
        <ChartContext.Provider value={{ state, dispatch, executeAction, executeActions, loadCandles }}>
            {children}
        </ChartContext.Provider>
    );
}

// Hook to use the chart context
export function useChart() {
    const context = useContext(ChartContext);
    if (!context) {
        throw new Error("useChart must be used within a ChartProvider");
    }
    return context;
}
