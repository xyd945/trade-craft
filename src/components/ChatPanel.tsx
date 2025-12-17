"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useChart } from "@/context/ChartContext";
import { ChatMessage, LessonOption, ChartAction } from "@/lib/schema/chartActions";
import { MessageBubble } from "./MessageBubble";

export function ChatPanel() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Welcome to Tradecraft! 👋\n\nI'm your trading education assistant. Ask me about any trading concept and I'll explain it with interactive chart demonstrations.\n\nTry asking:\n• \"What is MACD?\"\n• \"Explain RSI indicator\"\n• \"How do EMAs work?\"",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { state, executeActions } = useChart();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    chartContext: {
                        symbol: state.symbol,
                        timeframe: state.timeframe,
                        visibleFrom: state.visibleFrom,
                        visibleTo: state.visibleTo,
                        indicators: state.indicators.map((i) => ({
                            name: i.name,
                            params: i.params,
                        })),
                    },
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: data.message.content,
                lessonOptions: data.lessonOptions,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Execute any immediate actions from the response
            if (data.actions && data.actions.length > 0) {
                await executeActions(data.actions);
            }
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                role: "assistant",
                content:
                    "Sorry, I encountered an error. Please make sure the API is configured correctly and try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleLessonOptionClick = async (option: LessonOption) => {
        // Add a message showing what option was selected
        const selectionMessage: ChatMessage = {
            id: `selection-${Date.now()}`,
            role: "user",
            content: `Show me: ${option.title}`,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, selectionMessage]);

        // Execute the actions
        await executeActions(option.actions);

        // Add confirmation message
        const confirmMessage: ChatMessage = {
            id: `confirm-${Date.now()}`,
            role: "assistant",
            content: `I've updated the chart to show ${option.title}. ${option.description || "Take a look at the highlighted areas on the chart."}`,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, confirmMessage]);
    };

    return (
        <div className="chat-panel">
            <div className="chat-header" style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>💬 Trading Assistant</h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                    Ask about trading concepts
                </p>
            </div>

            <div className="chat-messages">
                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        onLessonOptionClick={handleLessonOptionClick}
                    />
                ))}
                {isLoading && (
                    <div className="message-bubble assistant">
                        <div className="flex items-center gap-2">
                            <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                            <span>Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                <textarea
                    className="chat-input"
                    placeholder="Ask about trading concepts..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    disabled={isLoading}
                    style={{ resize: "none" }}
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !input.trim()}
                    style={{
                        marginTop: "8px",
                        width: "100%",
                        padding: "10px",
                        background: input.trim() ? "var(--primary)" : "var(--secondary)",
                        border: "none",
                        borderRadius: "8px",
                        color: input.trim() ? "white" : "var(--muted)",
                        fontWeight: 500,
                        cursor: input.trim() ? "pointer" : "not-allowed",
                        transition: "all 0.2s",
                    }}
                >
                    {isLoading ? "Sending..." : "Send Message"}
                </button>
            </div>
        </div>
    );
}
