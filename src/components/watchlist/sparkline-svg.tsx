"use client";

import React from "react";

interface SparklineProps {
  data: { date: string; close: number }[];
  width?: number;
  height?: number;
}

export function SparklineSvg({
  data,
  width = 80,
  height = 24,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className="w-[80px] h-[24px] bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />;
  }

  const closes = data.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const points = data
    .map((d, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((d.close - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const isUp = closes[closes.length - 1] >= closes[0];
  const strokeColor = isUp ? "#10b981" : "#ef4444";

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
