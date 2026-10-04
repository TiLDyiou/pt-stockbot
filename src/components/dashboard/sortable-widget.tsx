"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DashboardWidget, WidgetSize } from "@/lib/storage/layout-storage";

interface SortableWidgetProps {
  widget: DashboardWidget;
  children: React.ReactNode;
  onResize: (id: string, newSize: WidgetSize) => void;
  onRemove: (id: string) => void;
}

export function SortableWidget({
  widget,
  children,
  onResize,
  onRemove,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const getColSpanClass = (size: WidgetSize) => {
    switch (size) {
      case "full":
        return "col-span-12";
      case "double":
        return "col-span-12 lg:col-span-8";
      case "single":
      default:
        return "col-span-12 md:col-span-6 lg:col-span-4";
    }
  };

  const cycleSize = () => {
    const nextSize: Record<WidgetSize, WidgetSize> = {
      single: "double",
      double: "full",
      full: "single",
    };
    onResize(widget.id, nextSize[widget.size]);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${getColSpanClass(
        widget.size
      )} flex flex-col bg-white dark:bg-terminal-panel border border-slate-200 dark:border-terminal-border rounded-lg shadow-sm overflow-hidden`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-terminal-header border-b border-slate-200 dark:border-terminal-border select-none">
        {/* Drag handle & Title */}
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-terminal-hover transition-colors"
            title="Kéo thả sắp xếp panel"
          >
            ⋮⋮
          </button>
          <span className="font-semibold text-xs tracking-tight text-slate-800 dark:text-slate-200">
            {widget.title}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={cycleSize}
            className="px-2 py-0.5 rounded bg-white dark:bg-terminal-subtle hover:bg-slate-100 dark:hover:bg-terminal-hover border border-slate-200 dark:border-slate-700/60 text-[10px] font-mono text-slate-600 dark:text-slate-300 transition-colors"
            title="Đổi kích thước (1 cột / 2 cột / full)"
          >
            {widget.size === "single" ? "1 Cột" : widget.size === "double" ? "2 Cột" : "Toàn rộng"}
          </button>
          <button
            onClick={() => onRemove(widget.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 text-xs transition-colors"
            title="Đóng panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 p-3 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
