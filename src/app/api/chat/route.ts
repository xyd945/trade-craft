import { NextRequest, NextResponse } from "next/server";
import { getChatCompletion, ChatMessage, ChartContext } from "@/lib/llm/openaiClient";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, chartContext } = body as {
            messages: ChatMessage[];
            chartContext: ChartContext;
        };

        // Validate request
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "Messages array is required" },
                { status: 400 }
            );
        }

        // Check for API key
        if (!process.env.DEEPSEEK_API_KEY) {
            // Return a mock response for development
            return NextResponse.json({
                message: {
                    role: "assistant",
                    content: `I see you're asking about trading concepts! 

To enable the full AI experience, please add your DeepSeek API key to the \`.env.local\` file:

\`\`\`
DEEPSEEK_API_KEY=your_key_here
\`\`\`

In the meantime, you can explore the chart manually using the controls above. Try:
• Click the **MACD**, **RSI**, or **EMA** buttons to add indicators
• Change the **symbol** or **timeframe** to explore different charts
• Use the chart's built-in zoom and pan features`,
                },
                lessonOptions: [
                    {
                        id: "add-macd",
                        title: "Add MACD Indicator",
                        description: "Display the MACD indicator on the chart",
                        actions: [
                            {
                                type: "ADD_INDICATOR",
                                indicator: "MACD",
                                params: { fast: 12, slow: 26, signal: 9 },
                            },
                        ],
                    },
                    {
                        id: "add-rsi",
                        title: "Add RSI Indicator",
                        description: "Display the RSI indicator on the chart",
                        actions: [
                            {
                                type: "ADD_INDICATOR",
                                indicator: "RSI",
                                params: { period: 14 },
                            },
                        ],
                    },
                    {
                        id: "add-ema",
                        title: "Add EMA Overlay",
                        description: "Display a 20-period EMA on the price chart",
                        actions: [
                            {
                                type: "ADD_INDICATOR",
                                indicator: "EMA",
                                params: { period: 20 },
                            },
                        ],
                    },
                ],
                actions: [],
            });
        }

        // Get completion from LLM
        const result = await getChatCompletion(messages, chartContext);

        // Log for observability
        console.log("[Chat API]", {
            timestamp: new Date().toISOString(),
            messagesCount: messages.length,
            hasActions: !!result.actions?.length,
            actionsCount: result.actions?.length || 0,
            hasLessonOptions: !!result.lessonOptions?.length,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Chat API Error]", error);
        return NextResponse.json(
            { error: "Failed to process chat request" },
            { status: 500 }
        );
    }
}
