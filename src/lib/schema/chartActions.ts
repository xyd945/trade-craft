import { z } from "zod";

// Timeframe options
export const TimeframeSchema = z.enum(["1h", "4h", "1d"]);
export type Timeframe = z.infer<typeof TimeframeSchema>;

// Indicator types
export const IndicatorTypeSchema = z.enum(["MACD", "RSI", "EMA"]);
export type IndicatorType = z.infer<typeof IndicatorTypeSchema>;

// Pane types
export const PaneTypeSchema = z.enum(["price", "indicator"]);
export type PaneType = z.infer<typeof PaneTypeSchema>;

// Chart action schemas
export const SetSymbolActionSchema = z.object({
    type: z.literal("SET_SYMBOL"),
    symbol: z.string(),
});

export const SetTimeframeActionSchema = z.object({
    type: z.literal("SET_TIMEFRAME"),
    timeframe: TimeframeSchema,
});

export const LoadCandlesActionSchema = z.object({
    type: z.literal("LOAD_CANDLES"),
    symbol: z.string(),
    timeframe: z.string(),
    from: z.number().optional(),
    to: z.number().optional(),
});

export const AddIndicatorActionSchema = z.object({
    type: z.literal("ADD_INDICATOR"),
    indicator: IndicatorTypeSchema,
    params: z.record(z.string(), z.number()).optional(),
});

export const UpdateIndicatorParamsActionSchema = z.object({
    type: z.literal("UPDATE_INDICATOR_PARAMS"),
    indicator: IndicatorTypeSchema,
    params: z.record(z.string(), z.number()),
});

export const HighlightPointSchema = z.object({
    time: z.number(),
    price: z.number().optional(),
    pane: PaneTypeSchema.optional(),
    label: z.string().optional(),
});

export const HighlightPointsActionSchema = z.object({
    type: z.literal("HIGHLIGHT_POINTS"),
    points: z.array(HighlightPointSchema),
});

export const HighlightRegionActionSchema = z.object({
    type: z.literal("HIGHLIGHT_REGION"),
    region: z.object({
        fromTime: z.number(),
        toTime: z.number(),
        pane: PaneTypeSchema.optional(),
        label: z.string().optional(),
    }),
});

export const AddAnnotationActionSchema = z.object({
    type: z.literal("ADD_ANNOTATION"),
    annotation: z.object({
        time: z.number(),
        price: z.number().optional(),
        text: z.string(),
        pane: PaneTypeSchema.optional(),
    }),
});

export const FocusRangeActionSchema = z.object({
    type: z.literal("FOCUS_RANGE"),
    range: z.object({
        fromTime: z.number(),
        toTime: z.number(),
    }),
});

export const ClearHighlightsActionSchema = z.object({
    type: z.literal("CLEAR_HIGHLIGHTS"),
});

export const ClearIndicatorsActionSchema = z.object({
    type: z.literal("CLEAR_INDICATORS"),
});

// Union of all chart actions
export const ChartActionSchema = z.discriminatedUnion("type", [
    SetSymbolActionSchema,
    SetTimeframeActionSchema,
    LoadCandlesActionSchema,
    AddIndicatorActionSchema,
    UpdateIndicatorParamsActionSchema,
    HighlightPointsActionSchema,
    HighlightRegionActionSchema,
    AddAnnotationActionSchema,
    FocusRangeActionSchema,
    ClearHighlightsActionSchema,
    ClearIndicatorsActionSchema,
]);

export type ChartAction = z.infer<typeof ChartActionSchema>;

// Lesson option schema
export const LessonOptionSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    actions: z.array(ChartActionSchema),
});

export type LessonOption = z.infer<typeof LessonOptionSchema>;

// Candle data schema
export const CandleSchema = z.object({
    time: z.number(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().optional(),
});

export type Candle = z.infer<typeof CandleSchema>;

// Market data response
export const MarketDataResponseSchema = z.object({
    symbol: z.string(),
    timeframe: z.string(),
    candles: z.array(CandleSchema),
});

export type MarketDataResponse = z.infer<typeof MarketDataResponseSchema>;

// Indicator configuration
export interface IndicatorConfig {
    name: IndicatorType;
    params: Record<string, number>;
    visible: boolean;
}

// Chart context state
export interface ChartContextState {
    symbol: string;
    timeframe: Timeframe;
    candles: Candle[];
    indicators: IndicatorConfig[];
    visibleFrom: number | null;
    visibleTo: number | null;
    highlights: HighlightPoint[];
    annotations: Annotation[];
    isLoading: boolean;
}

export type HighlightPoint = z.infer<typeof HighlightPointSchema>;

export interface Annotation {
    time: number;
    price?: number;
    text: string;
    pane?: PaneType;
}

// Chat types
export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    lessonOptions?: LessonOption[];
    timestamp: Date;
}

export interface ChatRequest {
    messages: { role: string; content: string }[];
    chartContext: {
        symbol: string;
        timeframe: string;
        visibleFrom: number | null;
        visibleTo: number | null;
        indicators: { name: string; params: Record<string, number> }[];
    };
}

export interface ChatResponse {
    message: {
        role: "assistant";
        content: string;
    };
    lessonOptions?: LessonOption[];
    actions?: ChartAction[];
}
