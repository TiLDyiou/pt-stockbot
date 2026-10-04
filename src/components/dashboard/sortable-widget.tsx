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
      )} flex flex-col transition-all duration-200`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 rounded-t-lg text-xs">
        {/* Drag handle & Title */}
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 px-1"
            title="Kéo để di chuyển widget"
          >
            ⋮⋮
          </button>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {widget.title}
          </span>
        </div>

        {/* Actions: Resize & Close */}
        <div className="flex items-center gap-2">
          <button
            onClick={cycleSize}
            className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            title="Thay đổi kích thước (1 cột / 2 cột / full)"
          >
            {widget.size === "single" ? "1x" : widget.size === "double" ? "2x" : "Full"}
          </button>
          <button
            onClick={() => onRemove(widget.id)}
            className="text-slate-400 hover:text-rose-500 font-bold px-1"
            title="Đóng widget"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-b-lg overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  );
}
