"use client";

import { ChatMessage, LessonOption } from "@/lib/schema/chartActions";

interface MessageBubbleProps {
    message: ChatMessage;
    onLessonOptionClick: (option: LessonOption) => void;
}

export function MessageBubble({ message, onLessonOptionClick }: MessageBubbleProps) {
    const isUser = message.role === "user";

    // Parse content for special formatting
    const formatContent = (content: string) => {
        // Split by newlines and format each line
        const lines = content.split("\n");
        return lines.map((line, idx) => {
            // Handle bullet points
            if (line.startsWith("•") || line.startsWith("-")) {
                return (
                    <div key={idx} style={{ paddingLeft: "8px", marginBottom: "4px" }}>
                        {line}
                    </div>
                );
            }
            // Handle bold text **text**
            const boldRegex = /\*\*(.*?)\*\*/g;
            const parts = [];
            let lastIndex = 0;
            let match;

            while ((match = boldRegex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(line.slice(lastIndex, match.index));
                }
                parts.push(
                    <strong key={`bold-${idx}-${match.index}`}>{match[1]}</strong>
                );
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < line.length) {
                parts.push(line.slice(lastIndex));
            }

            if (parts.length === 0) {
                return line ? (
                    <p key={idx} style={{ margin: "4px 0" }}>
                        {line}
                    </p>
                ) : (
                    <br key={idx} />
                );
            }

            return (
                <p key={idx} style={{ margin: "4px 0" }}>
                    {parts}
                </p>
            );
        });
    };

    return (
        <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
            <div className="message-content">{formatContent(message.content)}</div>

            {/* Lesson options */}
            {message.lessonOptions && message.lessonOptions.length > 0 && (
                <div className="lesson-options">
                    {message.lessonOptions.map((option) => (
                        <button
                            key={option.id}
                            className="lesson-option-chip"
                            onClick={() => onLessonOptionClick(option)}
                            title={option.description}
                        >
                            {option.title}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
