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

  // Load layout on mount only
  useEffect(() => {
    const layout = loadDashboardLayout();
    setWidgets(layout.widgets);
    setIsMounted(true);
  }, []);

  // Handle external trigger to add a chart (e.g. from chat ticker chip)
  useEffect(() => {
    if (!externalAddChartTicker || !isMounted) return;
    const sym = externalAddChartTicker.trim().toUpperCase();

    setWidgets((prev) => {
      // If widget already exists, keep it or focus it
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
      saveDashboardLayout({ version: 1, widgets: updated });
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
      saveDashboardLayout({ version: 1, widgets: updated });
    }
  };

  const handleResize = (id: string, newSize: WidgetSize) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, size: newSize } : w));
    setWidgets(updated);
    saveDashboardLayout({ version: 1, widgets: updated });
  };

  const handleRemove = (id: string) => {
    const updated = widgets.filter((w) => w.id !== id);
    setWidgets(updated);
    saveDashboardLayout({ version: 1, widgets: updated });
  };

  const handleResetLayout = () => {
    if (confirm("Khôi phục bố cục mặc định của bảng điều khiển?")) {
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
    saveDashboardLayout({ version: 1, widgets: updated });
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
    saveDashboardLayout({ version: 1, widgets: updated });
    setIsAddOpen(false);
  };

  const handleSelectSymbol = (sym: string) => {
    // Check if chart widget already exists
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
      saveDashboardLayout({ version: 1, widgets: updated });
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-400">
        Đang khởi tạo bảng điều khiển...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top Dashboard Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Bảng điều khiển
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {widgets.length} panels
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddOpen(!isAddOpen)}
            className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors"
          >
            + Thêm Panel
          </button>
          <button
            onClick={handleResetLayout}
            className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded transition-colors"
            title="Khôi phục bố cục mặc định"
          >
            Khôi phục
          </button>
        </div>
      </div>

      {/* Add Widget Dropdown/Form */}
      {isAddOpen && (
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs animate-in fade-in duration-150">
          <form onSubmit={handleAddChart} className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Thêm Biểu đồ:
            </span>
            <input
              type="text"
              placeholder="Mã CP (VD: HPG)"
              value={newChartTicker}
              onChange={(e) => setNewChartTicker(e.target.value)}
              className="px-2 py-1 uppercase bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded w-28 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!newChartTicker.trim()}
              className="px-2 py-1 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded font-medium disabled:opacity-50"
            >
              Thêm
            </button>
          </form>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <button
            onClick={() => handleAddWidgetType("watchlist")}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded"
          >
            + Watchlist
          </button>

          <button
            onClick={() => handleAddWidgetType("market_overview")}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded"
          >
            + Tổng quan thị trường
          </button>

          <button
            onClick={() => setIsAddOpen(false)}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Grid Content with Drag & Drop */}
      <div className="flex-1 overflow-y-auto p-4">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-slate-400 text-sm mb-3">Chưa có panel nào hiển thị</p>
            <button
              onClick={handleResetLayout}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs"
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
              <div className="grid grid-cols-12 gap-4">
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
