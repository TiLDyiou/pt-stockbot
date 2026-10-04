"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  loadDashboardLayout,
  saveDashboardLayout,
  DEFAULT_LAYOUT,
  DashboardWidget,
  WidgetSize,
} from "@/lib/storage/layout-storage";
import { SortableWidget } from "./sortable-widget";
import { StockChart } from "../chart/stock-chart";
import { WatchlistWidget } from "../watchlist/watchlist-widget";
import { MarketOverviewWidget } from "./market-overview-widget";

interface DashboardContainerProps {
  onAnalyzeTicker?: (ticker: string) => void;
  externalAddChartTicker?: string | null;
  onClearExternalChartTicker?: () => void;
}

export function DashboardContainer({
  onAnalyzeTicker: _onAnalyzeTicker,
  externalAddChartTicker,
  onClearExternalChartTicker,
}: DashboardContainerProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newChartTicker, setNewChartTicker] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const layout = loadDashboardLayout();
    setWidgets(layout.widgets);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!externalAddChartTicker || !isMounted) return;
    const sym = externalAddChartTicker.trim().toUpperCase();

    setWidgets((prev) => {
      const existing = prev.find((w) => w.type === "chart" && w.symbol === sym);
      if (existing) return prev;

      const newWidget: DashboardWidget = {
        id: `chart-${sym.toLowerCase()}-${Date.now()}`,
        type: "chart",
        title: `Biểu đồ ${sym}`,
        symbol: sym,
        size: "double",
      };
      const updated = [newWidget, ...prev];
      saveDashboardLayout({ version: 2, widgets: updated });
      return updated;
    });

    if (onClearExternalChartTicker) {
      onClearExternalChartTicker();
    }
  }, [externalAddChartTicker, isMounted, onClearExternalChartTicker]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = widgets.findIndex((w) => w.id === active.id);
    const newIndex = widgets.findIndex((w) => w.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const updated = arrayMove(widgets, oldIndex, newIndex);
      setWidgets(updated);
      saveDashboardLayout({ version: 2, widgets: updated });
    }
  };

  const handleResize = (id: string, newSize: WidgetSize) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, size: newSize } : w));
    setWidgets(updated);
    saveDashboardLayout({ version: 2, widgets: updated });
  };

  const handleRemove = (id: string) => {
    const updated = widgets.filter((w) => w.id !== id);
    setWidgets(updated);
    saveDashboardLayout({ version: 2, widgets: updated });
  };

  const handleResetLayout = () => {
    if (confirm("Khôi phục bố cục mặc định?")) {
      setWidgets(DEFAULT_LAYOUT.widgets);
      saveDashboardLayout(DEFAULT_LAYOUT);
    }
  };

  const handleAddChart = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = newChartTicker.trim().toUpperCase();
    if (!sym) return;

    const newWidget: DashboardWidget = {
      id: `chart-${sym.toLowerCase()}-${Date.now()}`,
      type: "chart",
      title: `Biểu đồ ${sym}`,
      symbol: sym,
      size: "double",
    };

    const updated = [...widgets, newWidget];
    setWidgets(updated);
    saveDashboardLayout({ version: 2, widgets: updated });
    setNewChartTicker("");
    setIsAddOpen(false);
  };

  const handleAddWidgetType = (type: "watchlist" | "market_overview") => {
    const title = type === "watchlist" ? "Danh mục theo dõi" : "Tổng quan thị trường";
    const newWidget: DashboardWidget = {
      id: `${type}-${Date.now()}`,
      type,
      title,
      size: "single",
    };
    const updated = [...widgets, newWidget];
    setWidgets(updated);
    saveDashboardLayout({ version: 2, widgets: updated });
    setIsAddOpen(false);
  };

  const handleSelectSymbol = (sym: string) => {
    const exists = widgets.some((w) => w.type === "chart" && w.symbol === sym);
    if (!exists) {
      const newWidget: DashboardWidget = {
        id: `chart-${sym.toLowerCase()}-${Date.now()}`,
        type: "chart",
        title: `Biểu đồ ${sym}`,
        symbol: sym,
        size: "double",
      };
      const updated = [newWidget, ...widgets];
      setWidgets(updated);
      saveDashboardLayout({ version: 2, widgets: updated });
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-400 font-mono">
        Đang tải bảng điều khiển...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-terminal-bg overflow-hidden select-none">
      {/* Dashboard Sub-Toolbar (36px) */}
      <div className="h-[38px] px-3 bg-white dark:bg-terminal-panel border-b border-slate-200 dark:border-terminal-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Bảng điều khiển
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-terminal-subtle text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
            {widgets.length} panel
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsAddOpen(!isAddOpen)}
            className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded transition-colors"
          >
            + Thêm Panel
          </button>
          <button
            onClick={handleResetLayout}
            className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-terminal-subtle hover:bg-slate-200 dark:hover:bg-terminal-hover text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 rounded transition-colors"
            title="Khôi phục lại layout mặc định"
          >
            Khôi phục
          </button>
        </div>
      </div>

      {/* Quick Add Bar */}
      {isAddOpen && (
        <div className="px-3 py-2 bg-slate-100 dark:bg-terminal-header border-b border-slate-200 dark:border-terminal-border flex flex-wrap items-center gap-2.5 text-xs animate-in fade-in duration-100">
          <form onSubmit={handleAddChart} className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">Mã:</span>
            <input
              type="text"
              placeholder="VD: HPG"
              value={newChartTicker}
              onChange={(e) => setNewChartTicker(e.target.value)}
              className="px-2 py-1 text-xs uppercase bg-white dark:bg-terminal-panel border border-slate-300 dark:border-slate-700 rounded w-24 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
            <button
              type="submit"
              disabled={!newChartTicker.trim()}
              className="px-2.5 py-1 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded font-medium disabled:opacity-40"
            >
              + Biểu đồ
            </button>
          </form>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          <button
            onClick={() => handleAddWidgetType("watchlist")}
            className="px-2.5 py-1 bg-white dark:bg-terminal-panel hover:bg-slate-50 dark:hover:bg-terminal-hover border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
          >
            + Watchlist
          </button>

          <button
            onClick={() => handleAddWidgetType("market_overview")}
            className="px-2.5 py-1 bg-white dark:bg-terminal-panel hover:bg-slate-50 dark:hover:bg-terminal-hover border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
          >
            + Thị trường
          </button>

          <button
            onClick={() => setIsAddOpen(false)}
            className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto p-3">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-slate-400 text-xs mb-2">Chưa có panel nào hiển thị</p>
            <button
              onClick={handleResetLayout}
              className="px-3 py-1 bg-emerald-600 text-white text-xs rounded"
            >
              Khôi phục mặc định
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map((w) => w.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-12 gap-3">
                {widgets.map((widget) => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    onResize={handleResize}
                    onRemove={handleRemove}
                  >
                    {widget.type === "chart" && widget.symbol && (
                      <StockChart symbol={widget.symbol} />
                    )}
                    {widget.type === "watchlist" && (
                      <WatchlistWidget onSelectSymbol={handleSelectSymbol} />
                    )}
                    {widget.type === "market_overview" && <MarketOverviewWidget />}
                  </SortableWidget>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
