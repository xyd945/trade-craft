import OpenAI from "openai";
import { ChartAction, LessonOption, ChartActionSchema } from "@/lib/schema/chartActions";
import { z } from "zod";

// DeepSeek API client (OpenAI-compatible)
const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: "https://api.deepseek.com",
});

// Tool definition for emit_chart_actions
const emitChartActionsTool: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "emit_chart_actions",
        description:
            "Emit chart actions to update the chart visualization. Use this to add indicators, highlight points, focus on specific time ranges, or annotate the chart.",
        parameters: {
            type: "object",
            properties: {
                actions: {
                    type: "array",
                    description: "List of chart actions to execute",
                    items: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                enum: [
                                    "SET_SYMBOL",
                                    "SET_TIMEFRAME",
                                    "LOAD_CANDLES",
                                    "ADD_INDICATOR",
                                    "UPDATE_INDICATOR_PARAMS",
                                    "HIGHLIGHT_POINTS",
                                    "HIGHLIGHT_REGION",
                                    "ADD_ANNOTATION",
                                    "FOCUS_RANGE",
                                    "CLEAR_HIGHLIGHTS",
                                    "CLEAR_INDICATORS",
                                ],
                            },
                            symbol: { type: "string" },
                            timeframe: { type: "string", enum: ["1h", "4h", "1d"] },
                            indicator: { type: "string", enum: ["MACD", "RSI", "EMA"] },
                            params: {
                                type: "object",
                                additionalProperties: { type: "number" },
                            },
                            points: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        time: { type: "number" },
                                        price: { type: "number" },
                                        pane: { type: "string", enum: ["price", "indicator"] },
                                        label: { type: "string" },
                                    },
                                    required: ["time"],
                                },
                            },
                            region: {
                                type: "object",
                                properties: {
                                    fromTime: { type: "number" },
                                    toTime: { type: "number" },
                                    pane: { type: "string", enum: ["price", "indicator"] },
                                    label: { type: "string" },
                                },
                                required: ["fromTime", "toTime"],
                            },
                            annotation: {
                                type: "object",
                                properties: {
                                    time: { type: "number" },
                                    price: { type: "number" },
                                    text: { type: "string" },
                                    pane: { type: "string", enum: ["price", "indicator"] },
                                },
                                required: ["time", "text"],
                            },
                            range: {
                                type: "object",
                                properties: {
                                    fromTime: { type: "number" },
                                    toTime: { type: "number" },
                                },
                                required: ["fromTime", "toTime"],
                            },
                        },
                        required: ["type"],
                    },
                },
                lessonOptions: {
                    type: "array",
                    description:
                        "Interactive lesson options that the user can click to explore further",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            title: { type: "string" },
                            description: { type: "string" },
                            actions: {
                                type: "array",
                                items: { type: "object" },
                            },
                        },
                        required: ["id", "title", "actions"],
                    },
                },
            },
            required: ["actions"],
        },
    },
};

// System prompt
const SYSTEM_PROMPT = `You are Tradecraft, an expert trading education assistant. Your role is to teach trading concepts through interactive chart demonstrations.

## Core Principles:
1. **Educational Focus**: Explain concepts clearly for beginners and intermediate traders
2. **Interactive Learning**: Always use chart actions to demonstrate concepts visually
3. **No Financial Advice**: Never give buy/sell recommendations. Focus on education only.
4. **Real Examples**: Reference the actual chart data to illustrate concepts

## When explaining indicators (MACD, RSI, EMA):
1. First, add the indicator to the chart using emit_chart_actions
2. Explain what the indicator measures and how to interpret it
3. Describe common patterns and signals
4. Provide interactive lesson options for deeper exploration

## Chart Actions You Can Use:
- ADD_INDICATOR: Add MACD, RSI, or EMA to the chart
- HIGHLIGHT_POINTS: Mark specific candles or indicator values
- HIGHLIGHT_REGION: Highlight a time range
- ADD_ANNOTATION: Add text labels to specific points
- FOCUS_RANGE: Zoom to a specific time window
- CLEAR_HIGHLIGHTS: Remove all highlights
- CLEAR_INDICATORS: Remove all indicators

## Response Format:
1. Provide a clear text explanation
2. Call emit_chart_actions to update the chart
3. Include lessonOptions for interactive exploration

## Example for "What is MACD?":
- Add MACD indicator to chart
- Explain MACD components (MACD line, signal line, histogram)
- Provide lesson options: "Signal Line Crossover", "Zero Line Crossover", "Divergence"

Remember: You're teaching, not advising. Help users understand concepts, not make trading decisions.`;

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface ChartContext {
    symbol: string;
    timeframe: string;
    visibleFrom: number | null;
    visibleTo: number | null;
    indicators: { name: string; params: Record<string, number> }[];
}

export interface ChatCompletionResult {
    message: {
        role: "assistant";
        content: string;
    };
    lessonOptions?: LessonOption[];
    actions?: ChartAction[];
}

export async function getChatCompletion(
    messages: ChatMessage[],
    chartContext: ChartContext
): Promise<ChatCompletionResult> {
    // Add chart context to the last user message
    const contextInfo = `

[Current Chart Context]
Symbol: ${chartContext.symbol}
Timeframe: ${chartContext.timeframe}
Active Indicators: ${chartContext.indicators.length > 0 ? chartContext.indicators.map((i) => `${i.name}(${JSON.stringify(i.params)})`).join(", ") : "None"}
`;

    const messagesWithContext: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m, idx) => {
            if (idx === messages.length - 1 && m.role === "user") {
                return { role: m.role as "user", content: m.content + contextInfo };
            }
            return { role: m.role as "user" | "assistant", content: m.content };
        }),
    ];

    try {
        const response = await client.chat.completions.create({
            model: "deepseek-chat",
            messages: messagesWithContext,
            tools: [emitChartActionsTool],
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 2000,
        });

        const choice = response.choices[0];
        const message = choice.message;

        let actions: ChartAction[] = [];
        let lessonOptions: LessonOption[] = [];

        // Process tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
            for (const toolCall of message.tool_calls) {
                // Check if this is a function tool call
                if (toolCall.type === "function" && toolCall.function.name === "emit_chart_actions") {
                    try {
                        const args = JSON.parse(toolCall.function.arguments);

                        // Validate and extract actions
                        if (args.actions && Array.isArray(args.actions)) {
                            for (const action of args.actions) {
                                try {
                                    const validatedAction = ChartActionSchema.parse(action);
                                    actions.push(validatedAction);
                                } catch (e) {
                                    console.warn("Invalid action skipped:", action, e);
                                }
                            }
                        }

                        // Extract lesson options
                        if (args.lessonOptions && Array.isArray(args.lessonOptions)) {
                            lessonOptions = args.lessonOptions.map((opt: LessonOption) => ({
                                id: opt.id,
                                title: opt.title,
                                description: opt.description,
                                actions: (opt.actions || [])
                                    .map((a: ChartAction) => {
                                        try {
                                            return ChartActionSchema.parse(a);
                                        } catch {
                                            return null;
                                        }
                                    })
                                    .filter(Boolean) as ChartAction[],
                            }));
                        }
                    } catch (e) {
                        console.error("Failed to parse tool call arguments:", e);
                    }
                }
            }
        }

        return {
            message: {
                role: "assistant",
                content: message.content || "I've updated the chart for you.",
            },
            lessonOptions: lessonOptions.length > 0 ? lessonOptions : undefined,
            actions: actions.length > 0 ? actions : undefined,
        };
    } catch (error) {
        console.error("LLM API error:", error);
        throw error;
    }
}
