"use client";

import React, { useState, useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { ChatPanel } from "./chat/chat-panel";
import { DashboardContainer } from "./dashboard/dashboard-container";
import { DisclaimerModal } from "./chat/disclaimer-modal";
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

    // Default to premium OLED dark mode
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ambient-light dark:bg-ambient-mesh text-slate-800 dark:text-slate-100 transition-colors duration-500 font-sans">
      {/* Floating Island Command Bar Header */}
      <header className="px-4 pt-3 pb-2 z-30 shrink-0">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between px-4 py-2 rounded-2xl glass-surface shadow-ambient-sm transition-all duration-300">
          {/* Brand Mark with Haptic Depth */}
          <div className="flex items-center gap-3">
            <div className="relative group flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 font-extrabold text-xs shadow-emerald-glow tracking-wider cursor-default">
              PT
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  PhuocThinh
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  AI Stockbot
                </span>
              </div>
            </div>
          </div>

          {/* Market Status Live Pill & Center Navigation */}
          <div className="flex items-center gap-2">
            {/* Live market radar pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs font-mono">
              <span className="relative flex h-2 w-2">
                {marketActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    marketActive ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                {marketActive ? "Thị trường Mở" : "Thị trường Đóng"}
              </span>
            </div>

            {/* Mobile Tab Switcher */}
            {isMobile && (
              <div className="flex p-0.5 rounded-full bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 text-xs font-medium">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`px-3 py-1 rounded-full transition-all duration-300 ${
                    activeTab === "chat"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Trò chuyện
                </button>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-3 py-1 rounded-full transition-all duration-300 ${
                    activeTab === "dashboard"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Bảng điều khiển
                </button>
              </div>
            )}
          </div>

          {/* Right Controls: Theme Toggle Island Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-black/[0.05] dark:border-white/[0.08] text-xs font-medium transition-all duration-300 active:scale-[0.97]"
              title="Chuyển chế độ sáng / tối"
            >
              <span className="transition-transform duration-300 group-hover:rotate-12">
                {isDarkMode ? "☀️" : "🌙"}
              </span>
              <span className="text-[11px] hidden sm:inline text-slate-700 dark:text-slate-300">
                {isDarkMode ? "Sáng" : "Tối"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Panels */}
      <main className="flex-1 overflow-hidden px-4 pb-3">
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
          <PanelGroup direction="horizontal" className="h-full w-full gap-3">
            {/* Left Chat Pane */}
            <Panel defaultSize={36} minSize={26} maxSize={48}>
              <ChatPanel onOpenChart={handleOpenChart} />
            </Panel>

            {/* Kinetic Neon Resizer Handle */}
            <PanelResizeHandle className="relative w-1.5 group flex items-center justify-center transition-colors">
              <div className="w-1 h-12 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-emerald-500 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all duration-300" />
            </PanelResizeHandle>

            {/* Right Dashboard Pane */}
            <Panel defaultSize={64} minSize={52}>
              <DashboardContainer
                externalAddChartTicker={targetChartTicker}
                onClearExternalChartTicker={() => setTargetChartTicker(null)}
              />
            </Panel>
          </PanelGroup>
        )}
      </main>

      {/* Floating Disclaimer Modal */}
      <DisclaimerModal />
    </div>
  );
}
