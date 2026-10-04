"use client";

import React, { useState, useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { ChatPanel } from "./chat/chat-panel";
import { DashboardContainer } from "./dashboard/dashboard-container";
import { DisclaimerModal } from "./chat/disclaimer-modal";
import { StockSearchBar } from "./search/stock-search-bar";
import { isMarketOpen } from "@/lib/vnstock/market-hours";

export function WorkspaceLayout() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");
  const [isMobile, setIsMobile] = useState(false);
  const [targetChartTicker, setTargetChartTicker] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [marketActive, setMarketActive] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Default to dark theme for financial terminal
    document.documentElement.classList.add("dark");
    setIsDarkMode(true);
    setMarketActive(isMarketOpen());

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  const handleOpenChart = (ticker: string) => {
    setTargetChartTicker(ticker);
    if (isMobile) {
      setActiveTab("dashboard");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-terminal-bg text-slate-800 dark:text-slate-100 font-sans">
      {/* Docked Financial Terminal Top Bar (42px) */}
      <header className="h-[42px] px-3 bg-white dark:bg-terminal-header border-b border-slate-200 dark:border-terminal-border flex items-center justify-between shrink-0 select-none z-20">
        {/* Left: Terminal Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded bg-emerald-600 text-white font-bold text-xs tracking-wider">
              PT
            </span>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              PhuocThinh Stockbot
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-3">
            <span className="text-slate-500">VN30</span>
            <span>•</span>
            <span className="text-slate-500">HOSE</span>
            <span>•</span>
            <span className="text-slate-500">HNX</span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-sm mx-4">
          <StockSearchBar onSelectSymbol={handleOpenChart} />
        </div>

        {/* Right: Market Status Indicator & Theme Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 dark:bg-terminal-subtle text-[11px] font-mono border border-slate-200 dark:border-slate-700/60">
            <span
              className={`w-2 h-2 rounded-full ${
                marketActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {marketActive ? "TRONG PHIÊN" : "ĐÓNG CỬA"}
            </span>
          </div>

          {/* Mobile Tab Switcher */}
          {isMobile && (
            <div className="flex bg-slate-200 dark:bg-terminal-subtle p-0.5 rounded text-xs font-medium">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === "chat"
                    ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Trò chuyện
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Bảng điều khiển
              </button>
            </div>
          )}
        </div>

        {/* Right: Theme Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-terminal-subtle hover:bg-slate-200 dark:hover:bg-terminal-hover border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-600 dark:text-slate-300 transition-colors"
            title="Đổi giao diện Sáng / Tối"
          >
            <span>{isDarkMode ? "☀️" : "🌙"}</span>
            <span className="text-[11px] hidden sm:inline">
              {isDarkMode ? "Sáng" : "Tối"}
            </span>
          </button>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <main className="flex-1 overflow-hidden">
        {isMobile ? (
          <div className="h-full w-full">
            {activeTab === "chat" ? (
              <ChatPanel onOpenChart={handleOpenChart} />
            ) : (
              <DashboardContainer
                externalAddChartTicker={targetChartTicker}
                onClearExternalChartTicker={() => setTargetChartTicker(null)}
              />
            )}
          </div>
        ) : (
          <PanelGroup direction="horizontal" className="h-full w-full">
            {/* Left Pane: Chat Terminal */}
            <Panel defaultSize={35} minSize={25} maxSize={50}>
              <ChatPanel onOpenChart={handleOpenChart} />
            </Panel>

            {/* Clean 4px Splitter */}
            <PanelResizeHandle className="w-1 bg-slate-200 dark:bg-terminal-border hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-colors cursor-col-resize" />

            {/* Right Pane: Dashboard Workspace */}
            <Panel defaultSize={65} minSize={50}>
              <DashboardContainer
                externalAddChartTicker={targetChartTicker}
                onClearExternalChartTicker={() => setTargetChartTicker(null)}
              />
            </Panel>
          </PanelGroup>
        )}
      </main>

      {/* Disclaimer Modal */}
      <DisclaimerModal />
    </div>
  );
}
