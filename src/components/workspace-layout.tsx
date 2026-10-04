"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { ChatPanel } from "./chat/chat-panel";
import { DashboardContainer } from "./dashboard/dashboard-container";
import { DisclaimerModal } from "./chat/disclaimer-modal";
import { StockSearchBar } from "./search/stock-search-bar";
import {
  SunIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-animated";

export function WorkspaceLayout() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");
  const [isMobile, setIsMobile] = useState(false);
  const [targetChartTicker, setTargetChartTicker] = useState<string | null>(
    null,
  );
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const chatPanelRef = useRef<ImperativePanelHandle>(null);

  const toggleChatPanel = () => {
    const panel = chatPanelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
        setIsChatCollapsed(false);
      } else {
        panel.collapse();
        setIsChatCollapsed(true);
      }
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Default to dark theme for financial workspace
    document.documentElement.classList.add("dark");
    setIsDarkMode(true);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-[#09090b] text-slate-800 dark:text-zinc-100 font-sans">
      {/* Top Header (Compact 44px for maximum vertical canvas) */}
      <header className="h-[44px] px-2.5 sm:px-3.5 bg-white dark:bg-[#09090b] border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between shrink-0 select-none z-20">
        {/* Left: Brand Identity & Sidebar Toggle */}
        <div className="flex items-center gap-2">
          {!isMobile && (
            <button
              onClick={toggleChatPanel}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title={isChatCollapsed ? "Mở rộng Trợ lý AI" : "Thu gọn Trợ lý AI (Mở rộng tối đa bề ngang)"}
            >
              {isChatCollapsed ? (
                <PanelLeftOpenIcon size={16} animateOnHover />
              ) : (
                <PanelLeftCloseIcon size={16} animateOnHover />
              )}
            </button>
          )}

          <div className="flex items-center gap-2">
            <img
              src="/candlestick.svg"
              alt="PhuocThinh Stockbot"
              className="w-5 h-5 object-contain shrink-0"
            />
            <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white">
              PhuocThinh Stockbot
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-slate-400 dark:text-zinc-500 border-l border-slate-200 dark:border-zinc-800 pl-2.5">
            <span>VN30</span>
            <span>•</span>
            <span>HOSE</span>
            <span>•</span>
            <span>HNX</span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-sm mx-3">
          <StockSearchBar onSelectSymbol={handleOpenChart} />
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Mobile Tab Switcher */}
          {isMobile && (
            <div className="flex bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-2.5 py-0.5 rounded-md transition-colors ${
                  activeTab === "chat"
                    ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white font-semibold shadow-xs"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
              >
                Trò chuyện
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-2.5 py-0.5 rounded-md transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white font-semibold shadow-xs"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
              >
                Bảng điều khiển
              </button>
            </div>
          )}

          {/* Theme Switcher */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700/80 text-xs font-mono text-slate-600 dark:text-zinc-300 transition-colors"
            title="Đổi giao diện Sáng / Tối"
          >
            {isDarkMode ? (
              <SunIcon size={13} animateOnHover />
            ) : (
              <MoonIcon size={13} animateOnHover />
            )}
            <span className="text-[10px] hidden sm:inline">
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
          <PanelGroup
            direction="horizontal"
            id="main-workspace-horizontal"
            className="h-full w-full"
          >
            {/* Left Pane: Chat Assistant */}
            <Panel
              ref={chatPanelRef}
              id="pane-chat"
              defaultSize={27}
              minSize={20}
              maxSize={45}
              collapsible={true}
              collapsedSize={0}
              onCollapse={() => setIsChatCollapsed(true)}
              onExpand={() => setIsChatCollapsed(false)}
              className="h-full flex flex-col min-h-0 overflow-hidden"
            >
              <ChatPanel onOpenChart={handleOpenChart} />
            </Panel>

            {/* Splitter */}
            <PanelResizeHandle
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                if (chatPanelRef.current?.isCollapsed()) {
                  chatPanelRef.current.expand();
                  setIsChatCollapsed(false);
                }
              }}
              className="w-1 bg-slate-200 dark:bg-zinc-800/80 hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-colors cursor-col-resize shrink-0"
            />

            {/* Right Pane: Dashboard Workspace */}
            <Panel
              id="pane-dashboard"
              defaultSize={73}
              minSize={50}
              className="h-full flex flex-col min-h-0 overflow-hidden"
            >
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
