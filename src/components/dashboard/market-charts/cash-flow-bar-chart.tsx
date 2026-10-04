"use client";

import React, { useState } from "react";
import { CashFlowDistribution } from "@/lib/vnstock/market-data";
import { formatNumber } from "@/lib/utils/format";

interface CashFlowBarChartProps {
  data: CashFlowDistribution;
}

export function CashFlowBarChart({ data }: CashFlowBarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const upVal = data.upValue || 2647.7;
  const downVal = data.downValue || 10772.0;
  const sameVal = data.unchangedValue || 1025.3;
  const totalVal = Math.max(1, upVal + downVal + sameVal);

  // Y-axis maximum: round up to nearest multiple of 2000 or 12000
  const maxVal = Math.max(12000, Math.ceil(Math.max(upVal, downVal, sameVal) / 2000) * 2000);
  const yTicks = [12000, 10000, 8000, 6000, 4000, 2000, 0].filter((v) => v <= maxVal);

  const chartHeight = 135;
  const chartWidth = 320;
  const plotLeft = 65;
  const plotRight = chartWidth - 15;
  const plotTop = 15;
  const plotBottom = plotTop + chartHeight;

  const getY = (val: number) => {
    return plotBottom - (val / maxVal) * chartHeight;
  };

  // Bar coordinates: 3 bars evenly distributed
  const availableWidth = plotRight - plotLeft;
  const barWidth = 26;
  const barX_Up = plotLeft + availableWidth * 0.2 - barWidth / 2;
  const barX_Down = plotLeft + availableWidth * 0.5 - barWidth / 2;
  const barX_Same = plotLeft + availableWidth * 0.8 - barWidth / 2;

  const barH_Up = Math.max(2, (upVal / maxVal) * chartHeight);
  const barH_Down = Math.max(2, (downVal / maxVal) * chartHeight);
  const barH_Same = Math.max(2, (sameVal / maxVal) * chartHeight);

  return (
    <div className="flex flex-col items-center justify-between w-full h-full p-2 select-none">
      <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 tracking-wide text-center">
        Phân bố dòng tiền
      </div>

      <div className="relative w-full flex-1 flex items-center justify-center min-h-[170px]">
        <svg
          viewBox={`0 0 ${chartWidth} 190`}
          className="w-full h-full max-h-[190px] overflow-visible"
        >
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={plotLeft - 5}
                  y1={y}
                  x2={plotRight}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.8"
                  strokeDasharray="2 3"
                  className="text-slate-200 dark:text-zinc-800/90"
                />
                <text
                  x={plotLeft - 10}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 dark:fill-zinc-500"
                >
                  {tick} tỷ
                </text>
              </g>
            );
          })}

          {/* Bar 1: Tăng (Green) */}
          <g
            onMouseEnter={() => setHoveredBar("up")}
            onMouseLeave={() => setHoveredBar(null)}
            className="cursor-pointer transition-opacity hover:opacity-90"
          >
            <rect
              x={barX_Up}
              y={plotBottom - barH_Up}
              width={barWidth}
              height={barH_Up}
              rx="2.5"
              fill="#16a34a"
            />
            {/* Top Value Label */}
            <text
              x={barX_Up + barWidth / 2}
              y={plotBottom - barH_Up - 5}
              textAnchor="middle"
              className="text-[10px] font-mono font-medium fill-slate-700 dark:fill-zinc-300"
            >
              {formatNumber(upVal)} tỷ
            </text>
            {/* Bottom Category Label */}
            <text
              x={barX_Up + barWidth / 2}
              y={plotBottom + 16}
              textAnchor="middle"
              className="text-[11px] font-medium fill-slate-600 dark:fill-zinc-400"
            >
              Tăng
            </text>
          </g>

          {/* Bar 2: Giảm (Red) */}
          <g
            onMouseEnter={() => setHoveredBar("down")}
            onMouseLeave={() => setHoveredBar(null)}
            className="cursor-pointer transition-opacity hover:opacity-90"
          >
            <rect
              x={barX_Down}
              y={plotBottom - barH_Down}
              width={barWidth}
              height={barH_Down}
              rx="2.5"
              fill="#dc2626"
            />
            {/* Top Value Label */}
            <text
              x={barX_Down + barWidth / 2}
              y={plotBottom - barH_Down - 5}
              textAnchor="middle"
              className="text-[10px] font-mono font-medium fill-slate-700 dark:fill-zinc-300"
            >
              {formatNumber(downVal)} tỷ
            </text>
            {/* Bottom Category Label */}
            <text
              x={barX_Down + barWidth / 2}
              y={plotBottom + 16}
              textAnchor="middle"
              className="text-[11px] font-medium fill-slate-600 dark:fill-zinc-400"
            >
              Giảm
            </text>
          </g>

          {/* Bar 3: Kh. đổi (Yellow) */}
          <g
            onMouseEnter={() => setHoveredBar("same")}
            onMouseLeave={() => setHoveredBar(null)}
            className="cursor-pointer transition-opacity hover:opacity-90"
          >
            <rect
              x={barX_Same}
              y={plotBottom - barH_Same}
              width={barWidth}
              height={barH_Same}
              rx="2.5"
              fill="#eab308"
            />
            {/* Top Value Label */}
            <text
              x={barX_Same + barWidth / 2}
              y={plotBottom - barH_Same - 5}
              textAnchor="middle"
              className="text-[10px] font-mono font-medium fill-slate-700 dark:fill-zinc-300"
            >
              {formatNumber(sameVal)} tỷ
            </text>
            {/* Bottom Category Label */}
            <text
              x={barX_Same + barWidth / 2}
              y={plotBottom + 16}
              textAnchor="middle"
              className="text-[11px] font-medium fill-slate-600 dark:fill-zinc-400"
            >
              Kh. đổi
            </text>
          </g>
        </svg>

        {/* Hover Info Badge */}
        {hoveredBar && (
          <div className="absolute bottom-1 bg-slate-900/90 text-white text-[11px] px-2.5 py-0.5 rounded-full font-mono shadow-md backdrop-blur border border-zinc-700">
            {hoveredBar === "up" && (
              <span>
                Dòng tiền tăng: <strong className="text-emerald-400">{formatNumber(upVal)} tỷ</strong> ({((upVal / totalVal) * 100).toFixed(1)}%)
              </span>
            )}
            {hoveredBar === "down" && (
              <span>
                Dòng tiền giảm: <strong className="text-rose-400">{formatNumber(downVal)} tỷ</strong> ({((downVal / totalVal) * 100).toFixed(1)}%)
              </span>
            )}
            {hoveredBar === "same" && (
              <span>
                Dòng tiền không đổi: <strong className="text-amber-400">{formatNumber(sameVal)} tỷ</strong> ({((sameVal / totalVal) * 100).toFixed(1)}%)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
