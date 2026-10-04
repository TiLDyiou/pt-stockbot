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
      )} flex flex-col transition-all duration-300 double-bezel-shell`}
    >
      <div className="double-bezel-core flex flex-col h-full overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 dark:bg-white/[0.02] border-b border-black/[0.04] dark:border-white/[0.06] text-xs">
          {/* Drag handle & Title */}
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Kéo thả để sắp xếp"
            >
              ⋮⋮
            </button>
            <span className="font-semibold text-xs tracking-tight text-slate-800 dark:text-slate-200">
              {widget.title}
            </span>
          </div>

          {/* Action pills: Resize & Close */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={cycleSize}
              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-black/[0.04] dark:border-white/[0.08] text-[10px] font-mono text-slate-600 dark:text-slate-300 transition-all active:scale-[0.96]"
              title="Đổi kích thước card (1x / 2x / Full)"
            >
              {widget.size === "single" ? "1x" : widget.size === "double" ? "2x" : "Full"}
            </button>
            <button
              onClick={() => onRemove(widget.id)}
              className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all text-xs"
              title="Đóng widget"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Inner Card Content */}
        <div className="flex-1 p-3 overflow-hidden bg-white/50 dark:bg-transparent">
          {children}
        </div>
      </div>
    </div>
  );
}
