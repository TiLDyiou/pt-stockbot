"use client";

import React, { useState } from "react";

interface BreadthDonutChartProps {
  advancing: number;
  unchanged: number;
  declining: number;
  ceiling?: number;
  floor?: number;
}

export function BreadthDonutChart({
  advancing = 94,
  unchanged = 50,
  declining = 229,
  ceiling = 4,
  floor = 10,
}: BreadthDonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const total = Math.max(1, advancing + unchanged + declining);

  // Wedge angles setup to match the screenshot:
  // - Top left: Không đổi (yellow)
  // - Top right: Tăng (green)
  // - Bottom: Giảm (red)
  const angleUnchanged = (unchanged / total) * 360;
  const angleAdvancing = (advancing / total) * 360;
  const angleDeclining = (declining / total) * 360;

  // Starting at 220 degrees (top left)
  const startAngle = 220;
  const a1 = startAngle;
  const a2 = a1 + angleUnchanged;
  const a3 = a2 + angleAdvancing;
  const a4 = a3 + angleDeclining; // wraps around to a1

  // Polar to Cartesian conversion helper
  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  };

  // Generate SVG path for a donut / pie wedge
  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    innerR: number,
    startAngleDeg: number,
    endAngleDeg: number
  ) => {
    const startOuter = polarToCartesian(cx, cy, r, endAngleDeg);
    const endOuter = polarToCartesian(cx, cy, r, startAngleDeg);
    const startInner = polarToCartesian(cx, cy, innerR, startAngleDeg);
    const endInner = polarToCartesian(cx, cy, innerR, endAngleDeg);

    const arcSweep = endAngleDeg - startAngleDeg <= 180 ? "0" : "1";

    if (innerR === 0) {
      return [
        "M",
        cx,
        cy,
        "L",
        endOuter.x,
        endOuter.y,
        "A",
        r,
        r,
        0,
        arcSweep,
        1,
        startOuter.x,
        startOuter.y,
        "Z",
      ].join(" ");
    }

    return [
      "M",
      endInner.x,
      endInner.y,
      "L",
      endOuter.x,
      endOuter.y,
      "A",
      r,
      r,
      0,
      arcSweep,
      1,
      startOuter.x,
      startOuter.y,
      "L",
      startInner.x,
      startInner.y,
      "A",
      innerR,
      innerR,
      0,
      arcSweep,
      0,
      endInner.x,
      endInner.y,
      "Z",
    ].join(" ");
  };

  const cx = 175;
  const cy = 110;
  const outerR = 52;
  const innerR = 0; // Solid pie matching the reference screenshot!

  const pathUnchanged = describeArc(cx, cy, outerR, innerR, a1, a2);
  const pathAdvancing = describeArc(cx, cy, outerR, innerR, a2, a3);
  const pathDeclining = describeArc(cx, cy, outerR, innerR, a3, a4);

  // Leader lines matching the screenshot:
  // - Top left pointing to yellow: "Không đổi (50)"
  // - Top right pointing to green: "Tăng (94)"
  // - Bottom pointing to red: "Giảm (229)"
  const midUnchangedAngle = a1 + angleUnchanged / 2;
  const midAdvancingAngle = a2 + angleAdvancing / 2;
  const midDecliningAngle = 180; // Bottom center for Giảm

  const pUnchangedEdge = polarToCartesian(cx, cy, outerR - 4, midUnchangedAngle);
  const pAdvancingEdge = polarToCartesian(cx, cy, outerR - 4, midAdvancingAngle);
  const pDecliningEdge = polarToCartesian(cx, cy, outerR - 4, midDecliningAngle);

  return (
    <div className="flex flex-col items-center justify-between w-full h-full p-2 select-none">
      <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 tracking-wide text-center">
        Số lượng CP Tăng, Giảm, Không đổi
      </div>

      <div className="relative w-full flex-1 flex items-center justify-center min-h-[170px]">
        <svg
          viewBox="0 0 350 200"
          className="w-full h-full max-h-[190px] overflow-visible"
        >
          {/* Slice: Không đổi (Vàng) */}
          <path
            d={pathUnchanged}
            fill="#eab308"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-900/40 dark:text-zinc-900 transition-all duration-300 hover:opacity-90 cursor-pointer"
            onMouseEnter={() => setHoveredSlice("unchanged")}
            onMouseLeave={() => setHoveredSlice(null)}
          />

          {/* Slice: Tăng (Xanh lá) */}
          <path
            d={pathAdvancing}
            fill="#16a34a"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-900/40 dark:text-zinc-900 transition-all duration-300 hover:opacity-90 cursor-pointer"
            onMouseEnter={() => setHoveredSlice("advancing")}
            onMouseLeave={() => setHoveredSlice(null)}
          />

          {/* Slice: Giảm (Đỏ) */}
          <path
            d={pathDeclining}
            fill="#dc2626"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-900/40 dark:text-zinc-900 transition-all duration-300 hover:opacity-90 cursor-pointer"
            onMouseEnter={() => setHoveredSlice("declining")}
            onMouseLeave={() => setHoveredSlice(null)}
          />

          {/* Leader line 1: Không đổi (Top-left) */}
          <polyline
            points={`${pUnchangedEdge.x},${pUnchangedEdge.y} 125,52 105,52`}
            fill="none"
            stroke="#ca8a04"
            strokeWidth="1.2"
            strokeDasharray="none"
          />
          <text
            x="100"
            y="56"
            textAnchor="end"
            className="text-[11px] font-medium fill-slate-700 dark:fill-zinc-300"
          >
            Không đổi ({unchanged})
          </text>

          {/* Leader line 2: Tăng (Top-right) */}
          <polyline
            points={`${pAdvancingEdge.x},${pAdvancingEdge.y} 220,60 240,60`}
            fill="none"
            stroke="#16a34a"
            strokeWidth="1.2"
          />
          <text
            x="245"
            y="64"
            textAnchor="start"
            className="text-[11px] font-medium fill-slate-700 dark:fill-zinc-300"
          >
            Tăng ({advancing})
          </text>

          {/* Leader line 3: Giảm (Bottom) */}
          <polyline
            points={`${pDecliningEdge.x},${pDecliningEdge.y} 145,170 125,170`}
            fill="none"
            stroke="#dc2626"
            strokeWidth="1.2"
          />
          <text
            x="120"
            y="174"
            textAnchor="end"
            className="text-[11px] font-medium fill-slate-700 dark:fill-zinc-300"
          >
            Giảm ({declining})
          </text>
        </svg>

        {/* Hover Info Badge */}
        {hoveredSlice && (
          <div className="absolute bottom-1 bg-slate-900/90 text-white text-[11px] px-2.5 py-0.5 rounded-full font-mono shadow-md backdrop-blur border border-zinc-700">
            {hoveredSlice === "advancing" && (
              <span>
                Tăng: <strong className="text-emerald-400">{advancing}</strong> ({((advancing / total) * 100).toFixed(1)}%) | Trần: {ceiling}
              </span>
            )}
            {hoveredSlice === "unchanged" && (
              <span>
                Không đổi: <strong className="text-amber-400">{unchanged}</strong> ({((unchanged / total) * 100).toFixed(1)}%)
              </span>
            )}
            {hoveredSlice === "declining" && (
              <span>
                Giảm: <strong className="text-rose-400">{declining}</strong> ({((declining / total) * 100).toFixed(1)}%) | Sàn: {floor}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
