"use client";

import React, { useState, useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { ChatPanel } from "./chat/chat-panel";
import { DashboardContainer } from "./dashboard/dashboard-container";
import { DisclaimerModal } from "./chat/disclaimer-modal";

export function WorkspaceLayout() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");
  const [isMobile, setIsMobile] = useState(false);
  const [targetChartTicker, setTargetChartTicker] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Initial dark mode check
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-emerald-500 text-slate-900 font-extrabold text-sm shadow">
            PT
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none">
              PhuocThinh Stockbot
            </h1>
            <span className="text-[10px] text-slate-400">
              Workspace Phân tích Cổ phiếu Việt Nam
            </span>
          </div>
        </div>

        {/* Center Mobile Tab Switcher */}
        {isMobile && (
          <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "chat"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Trò chuyện
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "dashboard"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Bảng điều khiển
            </button>
          </div>
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs transition-colors"
            title="Đổi chế độ sáng / tối"
          >
            {isDarkMode ? "☀️ Sáng" : "🌙 Tối"}
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 overflow-hidden relative">
        {isMobile ? (
          // Mobile View: Tab Switching
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
          // Desktop View: Resizable Panels
          <PanelGroup direction="horizontal" className="h-full w-full">
            <Panel defaultSize={35} minSize={25} maxSize={50}>
              <ChatPanel onOpenChart={handleOpenChart} />
            </Panel>

            <PanelResizeHandle className="w-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-colors cursor-col-resize flex items-center justify-center">
              <div className="w-0.5 h-6 bg-slate-400 dark:bg-slate-600 rounded-full" />
            </PanelResizeHandle>

            <Panel defaultSize={65} minSize={50}>
              <DashboardContainer
                externalAddChartTicker={targetChartTicker}
                onClearExternalChartTicker={() => setTargetChartTicker(null)}
              />
            </Panel>
          </PanelGroup>
        )}
      </main>

      {/* First-visit disclaimer modal */}
      <DisclaimerModal />
    </div>
  );
}
