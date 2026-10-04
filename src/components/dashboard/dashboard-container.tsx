"use client";

import React, { useState, useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import {
  loadDashboardLayout,
  saveDashboardLayout,
  DashboardWidget,
  loadModuleVisibility,
  saveModuleVisibility,
  DEFAULT_MODULE_VISIBILITY,
  loadModuleOrder,
  saveModuleOrder,
  DEFAULT_MODULE_ORDER,
  ModuleVisibility,
  ModuleId,
} from "@/lib/storage/layout-storage";
import { StockChart } from "../chart/stock-chart";
import { WatchlistWidget } from "../watchlist/watchlist-widget";
import { MarketOverviewWidget } from "./market-overview-widget";
import { MarketTickerStrip } from "./market-ticker-strip";
import {
  LayoutGridIcon,
  ChartLineIcon,
  BookmarkIcon,
  EarthIcon,
  GripVerticalIcon,
} from "lucide-animated";

export const MODULE_CONFIG: Record<
  ModuleId,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string; animateOnHover?: boolean }> }
> = {
  chart: { label: "Biểu đồ", icon: ChartLineIcon },
  watchlist: { label: "Danh mục", icon: BookmarkIcon },
  overview: { label: "Tổng quan", icon: EarthIcon },
};

export interface DashboardContainerProps {
  onAnalyzeTicker?: (ticker: string) => void;
  externalAddChartTicker?: string | null;
  onClearExternalChartTicker?: () => void;
  modules?: ModuleVisibility;
  moduleOrder?: ModuleId[];
  onSetModuleVisible?: (mod: keyof ModuleVisibility, visible: boolean) => void;
  onSetModuleOrder?: (order: ModuleId[] | ((prev: ModuleId[]) => ModuleId[])) => void;
}

export function DashboardContainer({
  onAnalyzeTicker: _onAnalyzeTicker,
  externalAddChartTicker,
  onClearExternalChartTicker,
  modules: propModules,
  moduleOrder: propModuleOrder,
  onSetModuleVisible,
  onSetModuleOrder,
}: DashboardContainerProps) {
  const [chartTabs, setChartTabs] = useState<string[]>(["VNINDEX"]);
  const [activeSymbol, setActiveSymbol] = useState<string>("VNINDEX");
  const [maximizedWidget, setMaximizedWidget] = useState<"chart" | "overview" | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [localModules, setLocalModules] = useState<ModuleVisibility>(DEFAULT_MODULE_VISIBILITY);
  const [localModuleOrder, setLocalModuleOrder] = useState<ModuleId[]>(DEFAULT_MODULE_ORDER);
  const [draggedModule, setDraggedModule] = useState<ModuleId | null>(null);
  const [dragOverModule, setDragOverModule] = useState<ModuleId | null>(null);

  const modules = propModules ?? localModules;
  const moduleOrder = propModuleOrder ?? localModuleOrder;

  useEffect(() => {
    const layout = loadDashboardLayout();
    const chartSymbols = layout.widgets
      .filter((w) => w.type === "chart" && w.symbol)
      .map((w) => w.symbol as string);

    if (chartSymbols.length > 0) {
      setChartTabs(chartSymbols);
      setActiveSymbol(chartSymbols[0]);
    } else {
      setChartTabs(["VNINDEX"]);
      setActiveSymbol("VNINDEX");
    }

    if (!propModules) {
      const savedVis = loadModuleVisibility();
      setLocalModules(savedVis);
    }

    if (!propModuleOrder) {
      const savedOrder = loadModuleOrder();
      setLocalModuleOrder(savedOrder);
    }

    setIsMounted(true);
  }, [propModules, propModuleOrder]);

  const persistTabs = (tabs: string[]) => {
    const widgets: DashboardWidget[] = tabs.map((sym) => ({
      id: `chart-${sym.toLowerCase()}`,
      type: "chart",
      title: `Biểu đồ ${sym}`,
      symbol: sym,
      size: "double",
    }));

    widgets.push({
      id: "watchlist-default",
      type: "watchlist",
      title: "Danh mục theo dõi",
      size: "single",
    });
    widgets.push({
      id: "market-overview-default",
      type: "market_overview",
      title: "Tổng quan thị trường",
      size: "single",
    });

    saveDashboardLayout({ version: 2, widgets });
  };

  const setModuleVisible = (mod: keyof ModuleVisibility, visible: boolean) => {
    if (onSetModuleVisible) {
      onSetModuleVisible(mod, visible);
    } else {
      setLocalModules((prev) => {
        if (prev[mod] === visible) return prev;
        const next = { ...prev, [mod]: visible };
        saveModuleVisibility(next);
        return next;
      });
    }
  };

  useEffect(() => {
    if (!externalAddChartTicker || !isMounted) return;
    const sym = externalAddChartTicker.trim().toUpperCase();

    setChartTabs((prev) => {
      let updated: string[];
      if (!prev.includes(sym)) {
        updated = [...prev, sym];
      } else {
        updated = prev;
      }
      persistTabs(updated);
      return updated;
    });

    setActiveSymbol(sym);

    // If chart module was closed, reopen it so user sees the newly opened ticker
    setModuleVisible("chart", true);

    if (onClearExternalChartTicker) {
      onClearExternalChartTicker();
    }
  }, [externalAddChartTicker, isMounted, onClearExternalChartTicker]);

  const handleSelectSymbol = (sym: string) => {
    const upper = sym.toUpperCase();
    if (!chartTabs.includes(upper)) {
      const updated = [...chartTabs, upper];
      setChartTabs(updated);
      persistTabs(updated);
    }
    setActiveSymbol(upper);
    setModuleVisible("chart", true);
  };

  const handleAddChartTab = (sym: string) => {
    const upper = sym.toUpperCase();
    if (!chartTabs.includes(upper)) {
      const updated = [...chartTabs, upper];
      setChartTabs(updated);
      persistTabs(updated);
    }
    setActiveSymbol(upper);
  };

  const handleCloseChartTab = (sym: string) => {
    if (chartTabs.length <= 1) return;
    const updated = chartTabs.filter((t) => t !== sym);
    setChartTabs(updated);
    persistTabs(updated);
    if (activeSymbol === sym) {
      setActiveSymbol(updated[0]);
    }
  };

  const handleSwapModules = (sourceId: ModuleId, targetId: ModuleId) => {
    if (sourceId === targetId) return;
    const reorder = (prev: ModuleId[]) => {
      const next = [...prev];
      const sourceIdx = next.indexOf(sourceId);
      const targetIdx = next.indexOf(targetId);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        next[sourceIdx] = targetId;
        next[targetIdx] = sourceId;
        saveModuleOrder(next);
      }
      return next;
    };
    if (onSetModuleOrder) {
      onSetModuleOrder(reorder);
    } else {
      setLocalModuleOrder(reorder);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-400 font-mono">
        Đang khởi tạo workspace...
      </div>
    );
  }

  const renderDragHandle = (id: ModuleId) => (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData("application/x-dashboard-module", id);
        e.dataTransfer.setData(`application/x-module-${id}`, id);
        e.dataTransfer.effectAllowed = id === "watchlist" ? "copyMove" : "move";
        setDraggedModule(id);
      }}
      onDragEnd={() => {
        setDraggedModule(null);
        setDragOverModule(null);
      }}
      className="p-1 rounded-md text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 cursor-grab active:cursor-grabbing transition-colors shrink-0"
      title={
        id === "watchlist"
          ? "Kéo thả để hoán đổi vị trí, hoặc kéo vào khung Chat để phân tích toàn bộ danh mục"
          : `Kéo thả để hoán đổi vị trí module ${MODULE_CONFIG[id].label}`
      }
    >
      <GripVerticalIcon size={14} animateOnHover />
    </div>
  );

  const renderModule = (id: ModuleId) => {
    switch (id) {
      case "chart":
        return (
          <StockChart
            symbol={activeSymbol}
            openSymbols={chartTabs}
            activeSymbol={activeSymbol}
            onSelectSymbol={handleSelectSymbol}
            onAddSymbol={handleAddChartTab}
            onCloseSymbol={handleCloseChartTab}
            isMaximized={maximizedWidget === "chart"}
            onToggleMaximize={() =>
              setMaximizedWidget(maximizedWidget === "chart" ? null : "chart")
            }
            onCloseModule={() => {
              setMaximizedWidget(null);
              setModuleVisible("chart", false);
            }}
            dragHandle={renderDragHandle("chart")}
          />
        );
      case "watchlist":
        return (
          <WatchlistWidget
            onSelectSymbol={handleSelectSymbol}
            onCloseModule={() => setModuleVisible("watchlist", false)}
            dragHandle={renderDragHandle("watchlist")}
          />
        );
      case "overview":
        return (
          <MarketOverviewWidget
            onSelectSymbol={handleSelectSymbol}
            isMaximized={maximizedWidget === "overview"}
            onToggleMaximize={() =>
              setMaximizedWidget(maximizedWidget === "overview" ? null : "overview")
            }
            onCloseModule={() => {
              setMaximizedWidget(null);
              setModuleVisible("overview", false);
            }}
            dragHandle={renderDragHandle("overview")}
          />
        );
    }
  };

  const renderModuleSlot = (id: ModuleId) => {
    const isOver = dragOverModule === id && draggedModule !== id;
    return (
      <div
        onDragOver={(e) => {
          if (
            e.dataTransfer.types.includes("application/x-dashboard-module") ||
            draggedModule
          ) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOverModule !== id) setDragOverModule(id);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (dragOverModule === id) setDragOverModule(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverModule(null);
          const source =
            (e.dataTransfer.getData("application/x-dashboard-module") as ModuleId) ||
            draggedModule;
          if (source && source !== id) {
            handleSwapModules(source, id);
          }
          setDraggedModule(null);
        }}
        className={`relative flex flex-col h-full w-full min-h-0 overflow-hidden transition-all duration-150 ${
          isOver ? "ring-2 ring-emerald-500 ring-inset" : ""
        }`}
      >
        {renderModule(id)}

        {isOver && (
          <div className="absolute inset-0 z-50 pointer-events-none bg-emerald-500/15 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in duration-100">
            <div className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-mono text-xs font-bold shadow-lg flex items-center gap-2 border border-emerald-400">
              <GripVerticalIcon size={14} />
              <span>Thả để hoán đổi vị trí với {MODULE_CONFIG[id].label}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkspace = () => {
    // 1. Maximized single widget
    if (maximizedWidget === "chart") {
      return (
        <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
          {renderModule("chart")}
        </div>
      );
    }
    if (maximizedWidget === "overview") {
      return (
        <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
          {renderModule("overview")}
        </div>
      );
    }

    const activeModules = moduleOrder.filter((m) => modules[m]);

    // 2. All 3 modules active
    if (activeModules.length === 3) {
      return (
        <PanelGroup
          direction="vertical"
          id="dashboard-vertical-panels-3"
          autoSaveId="dashboard-vertical-panels-v1"
          className="h-full w-full flex-1"
        >
          <Panel
            id={`panel-${activeModules[0]}`}
            defaultSize={58}
            minSize={25}
            className="flex flex-col min-h-0 overflow-hidden"
          >
            {renderModuleSlot(activeModules[0])}
          </Panel>

          <PanelResizeHandle className="h-1 bg-slate-200/80 dark:bg-zinc-800/80 hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-colors cursor-row-resize shrink-0" />

          <Panel
            id="panel-bottom-row"
            defaultSize={42}
            minSize={20}
            className="flex flex-col min-h-0 overflow-hidden"
          >
            <PanelGroup
              direction="horizontal"
              id="dashboard-bottom-panels-3"
              autoSaveId="dashboard-bottom-panels-v1"
              className="h-full w-full flex-1"
            >
              <Panel
                id={`panel-${activeModules[1]}`}
                defaultSize={50}
                minSize={20}
                className="flex flex-col min-h-0 overflow-hidden"
              >
                {renderModuleSlot(activeModules[1])}
              </Panel>

              <PanelResizeHandle className="w-1 bg-slate-200/80 dark:bg-zinc-800/80 hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-colors cursor-col-resize shrink-0" />

              <Panel
                id={`panel-${activeModules[2]}`}
                defaultSize={50}
                minSize={20}
                className="flex flex-col min-h-0 overflow-hidden"
              >
                {renderModuleSlot(activeModules[2])}
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      );
    }

    // 3. Exactly 2 modules active
    if (activeModules.length === 2) {
      return (
        <PanelGroup
          direction="vertical"
          id="dashboard-vertical-panels-2"
          autoSaveId="dashboard-vertical-panels-2-v1"
          className="h-full w-full flex-1"
        >
          <Panel
            id={`panel-${activeModules[0]}`}
            defaultSize={50}
            minSize={25}
            className="flex flex-col min-h-0 overflow-hidden"
          >
            {renderModuleSlot(activeModules[0])}
          </Panel>

          <PanelResizeHandle className="h-1 bg-slate-200/80 dark:bg-zinc-800/80 hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-colors cursor-row-resize shrink-0" />

          <Panel
            id={`panel-${activeModules[1]}`}
            defaultSize={50}
            minSize={25}
            className="flex flex-col min-h-0 overflow-hidden"
          >
            {renderModuleSlot(activeModules[1])}
          </Panel>
        </PanelGroup>
      );
    }

    // 4. Exactly 1 module active
    if (activeModules.length === 1) {
      return (
        <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
          {renderModuleSlot(activeModules[0])}
        </div>
      );
    }

    // 5. Empty state
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono">
        <LayoutGridIcon size={32} className="text-slate-300 dark:text-zinc-700 mb-3" />
        <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
          Tất cả các module hiển thị đang được đóng.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {moduleOrder.map((modId) => {
            const Icon = MODULE_CONFIG[modId].icon;
            const label = MODULE_CONFIG[modId].label;
            return (
              <button
                key={modId}
                type="button"
                onClick={() => setModuleVisible(modId, true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white text-slate-700 dark:text-zinc-200 font-medium transition-colors cursor-pointer"
              >
                <Icon size={14} animateOnHover />
                <span>Mở {label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/70 dark:bg-[#09090b] overflow-hidden select-none">
      {/* 1. Seamless Top Market Ticker Strip */}
      {!maximizedWidget && (
        <div className="w-full shrink-0 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-[#111113]/70 backdrop-blur-xs py-0.5 px-0">
          <MarketTickerStrip
            activeSymbol={activeSymbol}
            onSelectSymbol={handleSelectSymbol}
          />
        </div>
      )}

      {/* 2. Main Dynamic Resizable Workspace Content */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {renderWorkspace()}
      </div>
    </div>
  );
}
