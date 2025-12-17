"use client";

import { ChatPanel } from "@/components/ChatPanel";
import { ChartPanel } from "@/components/ChartPanel";
import { ChartProvider } from "@/context/ChartContext";

export default function Home() {
  return (
    <ChartProvider>
      <div className="split-pane">
        <ChatPanel />
        <ChartPanel />
      </div>
    </ChartProvider>
  );
}
