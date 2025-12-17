# Trading Learning App (Tradecraft) — Developer Specification

## 1. Goal

Build an educational trading app where users learn trading concepts via an AI chat that **drives interactive chart visualizations**. The app should feel fundamentally different from generic chatbots by letting the AI **explain and demonstrate concepts directly on a live chart** (initially with TradingView Lightweight Charts).

Primary example flow: User asks “What is MACD?” → AI explains + loads BTC/USDT chart + overlays MACD + highlights specific behaviors (crossovers, zero-line, divergence) interactively.

## 2. Non-goals

- Not a production trading terminal or execution platform.
- Not financial advice; strictly educational.
- No advanced “pro backtesting UI” in v1 (reserved for v2).

## 3. Tech Stack

- Frontend: **Next.js (App Router)** + **TypeScript** + **Tailwind CSS**.
- Chart: **TradingView Lightweight Charts**.
- LLM: **DeepSeek**, integrated via an **OpenAI-compatible API interface** (standard OpenAI-style request/response schemas).
- Data: market candles from a public exchange API (e.g., Binance, it doesn't require api key and authentication) OR a proxy service (details in §9). In v1 keep it simple.

## 4. Product Requirements

### 4.1 Core UX

- Layout: split pane
  - Left: Chat window (conversation + interactive “lesson cards”).
  - Right: Chart panel (price chart + indicators + highlights).
- The AI response is not only text. It includes **structured interactive elements**:
  - “Concept blocks” (definition, intuition, parameters, common pitfalls).
  - “Try on chart” actions (buttons / chips) that, when clicked, update the chart: add indicator, pan/zoom, highlight region, annotate points.
  - “Guided steps” that can progress: Step 1 show MACD; Step 2 show crossover; Step 3 show divergence, etc.

### 4.2 Learning Focus

- Educational explanations:
  - Key terms (MACD, RSI, EMA, ATR, support/resistance, trend, momentum, volatility).
  - Indicator parameters (e.g., MACD 12/26/9) and what changing them does.
  - Multiple usage patterns + limitations.
- Strong emphasis on “**show it on a real chart**” rather than static images.

### 4.3 Interactivity Requirements

- Each AI answer may include a list of “methods” (e.g., signal line crossover, zero line crossover, divergence).
- When user clicks one method, chart updates to:
  - focus on a relevant historical window
  - display indicator state
  - highlight points/segments
  - show annotation labels and tooltips
- User can ask follow-ups; system retains chart state and lesson context.

### 4.4 Content Safety & Disclaimers

- Persistent banner: “Educational content only. Not financial advice.”
- AI should avoid giving direct buy/sell instructions. If asked “Should I buy BTC now?”, respond with educational framing.

## 5. MVP Scope (v1)

### 5.1 Supported Features

- Chat-based Q&A with interactive chart actions.
- Symbols: at least **BTC/USDT**.
- Timeframes: 1h, 4h, 1d (configurable).
- Indicators:
  - MACD (first-class, per your example)
  - EMA (simple overlay)
  - RSI (secondary pane)
- Highlighting system:
  - point markers
  - shaded regions
  - labels
- “Lesson templates” for core concepts (MACD lesson is mandatory).

### 5.2 Not in v1

- Full strategy builder
- Full backtesting engine
- Account system/payments (optional)
- Social features

## 6. v2 Scope (Forward Plan)

- AI-assisted strategy creation
- Backtest visualization on chart:
  - trade markers
  - equity curve
  - stats table
- Multi-asset support
- Multi-model support (Gemini, etc.) via provider adapters

## 7. System Architecture

### 7.1 High-level Components

- **UI (Next.js)**
  - Chat module
  - Chart module
  - Action dispatcher
- **App API (Next.js Route Handlers)**
  - /api/chat (LLM proxy)
  - /api/market-data (candles)
- **LLM Layer**
  - OpenAI-compatible client pointing to DeepSeek endpoint
  - Tool/function calling to produce “chart actions”

### 7.2 Data Flow

1. User message → UI posts to /api/chat with:
   - conversation history
   - current chart context (symbol, timeframe, visible range)
   - optionally: derived indicator snapshots
2. /api/chat calls DeepSeek (OpenAI-compatible) with tool definitions.
3. LLM returns:
   - assistant message (text + structured UI content)
   - tool calls (chart actions)
4. UI renders message + executes chart actions via a **ChartAction Engine**.

## 8. Interaction Model: “Chart Actions”

### 8.1 Why Chart Actions

To keep the AI output deterministic and safe for UI execution, the LLM must not output arbitrary JS. Instead, it outputs **structured actions** that the frontend can validate and apply.

### 8.2 Action Schema (TypeScript)

```ts
export type ChartAction =
  | { type: 'SET_SYMBOL'; symbol: string }
  | { type: 'SET_TIMEFRAME'; timeframe: '1h' | '4h' | '1d' }
  | { type: 'LOAD_CANDLES'; symbol: string; timeframe: string; from?: number; to?: number }
  | { type: 'ADD_INDICATOR'; indicator: 'MACD' | 'RSI' | 'EMA'; params?: Record<string, number> }
  | { type: 'UPDATE_INDICATOR_PARAMS'; indicator: 'MACD' | 'RSI' | 'EMA'; params: Record<string, number> }
  | { type: 'HIGHLIGHT_POINTS'; points: Array<{ time: number; price?: number; pane?: 'price'|'indicator'; label?: string }> }
  | { type: 'HIGHLIGHT_REGION'; region: { fromTime: number; toTime: number; pane?: 'price'|'indicator'; label?: string } }
  | { type: 'ADD_ANNOTATION'; annotation: { time: number; price?: number; text: string; pane?: 'price'|'indicator' } }
  | { type: 'FOCUS_RANGE'; range: { fromTime: number; toTime: number } }
  | { type: 'CLEAR_HIGHLIGHTS' }
  | { type: 'CLEAR_INDICATORS' };
```

### 8.3 Action Execution

- Create a `ChartActionEngine` that:
  - validates actions (zod)
  - executes them against lightweight-charts
  - maintains a chart state store

### 8.4 “Clickable Methods” Binding

Each AI response can include interactive options:

- The text describes methods.
- Each method is bound to a predefined or LLM-generated action bundle.

Schema:

```ts
export type LessonOption = {
  id: string;
  title: string;
  description?: string;
  actions: ChartAction[];
};
```

UI: render as chips/buttons. On click, dispatch `actions` sequentially.

## 9. Market Data

### 9.1 Requirements

- Candlestick OHLCV data for BTC/USDT.
- Server-side fetch to avoid exposing API keys.
- Caching to reduce load.

### 9.2 API Design

- `GET /api/market-data/candles?symbol=BTCUSDT&timeframe=1h&limit=500`

Response:

```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "candles": [
    { "time": 1700000000, "open": 0, "high": 0, "low": 0, "close": 0, "volume": 0 }
  ]
}
```

### 9.3 Caching

- Use Next.js `fetch` caching or in-memory LRU cache.
- Consider incremental update: fetch latest candles periodically.

## 10. Indicator Engine

### 10.1 Computation

- Compute indicators client-side for simplicity (v1).
- Implement:
  - EMA
  - MACD: fast EMA (12), slow EMA (26), signal EMA (9)
  - RSI: standard 14

### 10.2 Visualization

- Price pane:
  - candlesticks
  - EMA overlay
- Indicator pane(s):
  - MACD: histogram + MACD line + signal line
  - RSI: RSI line + 30/70 bands

### 10.3 Highlighting

- Markers on price candles
- Vertical lines / shaded regions for time windows
- Labels on indicator events (crossovers, zero-line crossing)

## 11. LLM Integration (OpenAI Standard)

### 11.1 API Proxy

- Create `POST /api/chat` route.
- The frontend never calls DeepSeek directly.

Request body:

```json
{
  "messages": [{"role":"user","content":"what is MACD"}],
  "chartContext": {
    "symbol": "BTCUSDT",
    "timeframe": "1d",
    "visibleFrom": 1700000000,
    "visibleTo": 1705000000,
    "indicators": [
      {"name":"MACD","params":{"fast":12,"slow":26,"signal":9}}
    ]
  }
}
```

Response body:

```json
{
  "message": {
    "role": "assistant",
    "content": "...rich explanation..."
  },
  "lessonOptions": [
    {"id":"macd-crossover","title":"Signal line crossover","actions":[...]}
  ],
  "actions": [
    {"type":"ADD_INDICATOR","indicator":"MACD","params":{"fast":12,"slow":26,"signal":9}}
  ]
}
```

### 11.2 Tool / Function Calling

Define a tool called `emit_chart_actions`:

- Input: `{ actions: ChartAction[], lessonOptions?: LessonOption[] }`
- The model can call it when it wants the UI to update.

### 11.3 Prompting Strategy

System prompt goals:

- Be educational, not advisory.
- Always provide interactive learning: at least 1 chart action for indicator questions.
- Prefer referencing **real historical examples**: select a visible range and annotate.
- Keep actions minimal, deterministic, and valid.

## 12. UI Components

### 12.1 Chat

- Message bubbles
- Rich blocks:
  - Definition
  - Parameters table
  - Common signals list
  - “Try on chart” option chips

### 12.2 Chart Panel

- Symbol/timeframe selector
- Chart canvas
- Indicator pane toggles
- “Clear overlays” button

### 12.3 Lesson Sidebar (optional in v1)

- A vertical list of lesson steps and completion

## 13. State Management

- `useReducer` or Zustand for:
  - conversation state
  - chart state (symbol, timeframe, candles loaded, indicators active)
  - pending actions queue

Ensure the AI receives necessary context:

- currently visible range
- which indicators are on
- last highlights

## 14. Observability & Logging

- Log /api/chat requests:
  - timestamp
  - token usage (if provided)
  - tool calls emitted
- Client-side error boundary for chart rendering.

## 15. Testing

- Unit tests:
  - indicator calculation functions
  - action schema validation
- Integration tests:
  - /api/market-data returns correct candle format
  - /api/chat returns message + action bundle
- UI sanity:
  - clicking a lesson option updates chart reliably

## 16. Milestones

### Milestone A: Skeleton

- Next.js app + layout + chart renders BTC/USDT candles.

### Milestone B: Indicator Support

- Add MACD overlay pane + parameter control.

### Milestone C: AI Chat + Actions

- /api/chat + DeepSeek via OpenAI-compatible setup
- tool calling to emit actions

### Milestone D: Interactive Lessons

- clickable method chips that trigger action bundles
- MACD lesson end-to-end

## 17. Open Questions / Risks

- Market data provider reliability and rate limits.
- Lightweight-charts multi-pane indicator rendering complexity.
- Keeping LLM-generated actions valid (must enforce schema + fallback).
- Avoiding “financial advice” behavior.

---

## Appendix A: MACD Lesson Template (v1)

**When user asks:** “What is MACD?”

- Actions:
  1. Load BTC/USDT candles (1d)
  2. Add MACD(12,26,9)
  3. Focus to a historical window with clear crossover (auto-selected)
  4. Add markers/annotations for:
     - one bullish crossover
     - one bearish crossover
- Lesson options:
  - Signal line crossover → highlight crossover points
  - Zero line crossover → highlight MACD line crossing 0
  - Divergence → highlight price making HH while MACD makes LH

## Appendix B: Directory Structure (suggested)

```
/app
  /page.tsx
  /api
    /chat/route.ts
    /market-data/candles/route.ts
/components
  ChatPanel.tsx
  MessageBubble.tsx
  LessonOptions.tsx
  ChartPanel.tsx
  ChartCanvas.tsx
  chart/ChartActionEngine.ts
  chart/indicators/macd.ts
  chart/indicators/rsi.ts
  chart/indicators/ema.ts
/lib
  llm/openaiClient.ts
  schema/chartActions.ts
  market/fetchCandles.ts
```

