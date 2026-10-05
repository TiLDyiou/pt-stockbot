"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, ChevronDown, Check } from "lucide-react";

export interface ThoughtLineProps {
  label?: string;
  doneLabel?: string;
  renderLabel?: (label: string, isWorking: boolean) => React.ReactNode;
  glyph?: "sparkle" | "dot" | "none" | React.ReactNode;
  steps?: string[];
  collapsible?: boolean;
  collapseOnSettle?: boolean;
  color?: string;
  glyphColor?: string;
  fontSize?: number;
  breathPeriod?: number;
  breathDepth?: number;
  shimmer?: boolean;
  shimmerDuration?: number;
  settleDuration?: number;
  settleBlur?: number;
  working?: boolean;
  settleAfter?: number;
  elapsed?: number;
  startTime?: number;
  showTimer?: boolean;
  onSettle?: (seconds: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

const formatSeconds = (sec: number) => `${sec.toFixed(1)}s`;

export default function ThoughtLine({
  label = "Đang suy nghĩ…",
  doneLabel = "Đã suy nghĩ trong",
  renderLabel,
  glyph = "sparkle",
  steps = [],
  collapsible = true,
  collapseOnSettle = true,
  fontSize = 12,
  working = true,
  elapsed,
  startTime,
  showTimer = true,
  onSettle,
  className = "",
  style,
}: ThoughtLineProps) {
  const isWorking = Boolean(working);
  const [open, setOpen] = useState(isWorking ? true : !collapseOnSettle);
  const [seconds, setSeconds] = useState<number>(() => {
    if (elapsed != null && elapsed > 0) return elapsed;
    if (startTime) return Math.max(0, (Date.now() - startTime) / 1000);
    return 0;
  });
  const startTimeRef = useRef<number | null>(startTime || null);
  const latestSecondsRef = useRef<number>(seconds);
  latestSecondsRef.current = seconds;

  useEffect(() => {
    if (elapsed != null && elapsed > 0) {
      setSeconds(elapsed);
    }
  }, [elapsed]);

  useEffect(() => {
    if (startTime) {
      startTimeRef.current = startTime;
    }
  }, [startTime]);

  // Expand when thinking starts, collapse when settled
  useEffect(() => {
    if (isWorking) {
      setOpen(true);
    } else if (collapseOnSettle) {
      setOpen(false);
      if (onSettle && latestSecondsRef.current > 0) {
        onSettle(latestSecondsRef.current);
      }
    }
  }, [isWorking, collapseOnSettle, onSettle]);

  // Realtime stopwatch
  useEffect(() => {
    if (!isWorking) {
      return;
    }

    if (startTime) {
      startTimeRef.current = startTime;
    } else if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const updateTimer = () => {
      const base = startTime || startTimeRef.current;
      if (base) {
        const diff = Math.max(0, (Date.now() - base) / 1000);
        setSeconds(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [isWorking, startTime]);

  const hasValidTimer = isWorking || seconds > 0 || (elapsed != null && elapsed > 0);
  const displaySeconds = elapsed != null && elapsed > 0 ? elapsed : seconds;
  const hasTrace = steps.length > 0;

  const currentLabelText = isWorking
    ? label
    : hasValidTimer
    ? doneLabel
    : "Đã hoàn tất phân tích";

  return (
    <div
      className={`w-full flex flex-col select-none text-left ${className}`}
      style={{ fontSize: `${fontSize}px`, ...style }}
    >
      {/* Header Button */}
      <button
        type="button"
        disabled={!collapsible || !hasTrace}
        onClick={() => {
          if (collapsible && hasTrace) {
            setOpen((prev) => !prev);
          }
        }}
        className={`w-full flex items-center gap-1.5 py-0.5 text-left outline-none ${
          collapsible && hasTrace ? "cursor-pointer group" : "cursor-default"
        }`}
      >
        {/* Glyph / Star Icon */}
        {glyph !== "none" && (
          <span className="shrink-0 text-emerald-500 inline-flex items-center justify-center">
            {glyph === "sparkle" ? (
              <Sparkles
                className={`w-3.5 h-3.5 text-emerald-500 transition-opacity ${
                  isWorking ? "animate-pulse" : "opacity-80"
                }`}
                strokeWidth={2}
              />
            ) : glyph === "dot" ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ) : (
              glyph
            )}
          </span>
        )}

        {/* Label */}
        <span className="font-medium text-slate-700 dark:text-zinc-200">
          {renderLabel ? renderLabel(currentLabelText, isWorking) : currentLabelText}
        </span>

        {/* Timer - immediately follows label */}
        {showTimer && hasValidTimer && (
          <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-zinc-400">
            {formatSeconds(displaySeconds)}
          </span>
        )}

        {/* Chevron - pinned to far right */}
        {collapsible && hasTrace && (
          <span className="ml-auto pl-2 text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition-colors">
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
              strokeWidth={2}
            />
          </span>
        )}
      </button>

      {/* Collapsible Steps Trace */}
      {hasTrace && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            open ? "max-h-96 opacity-100 mt-2 pb-0.5" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-1.5 pl-4 border-l border-slate-200 dark:border-zinc-800 ml-1.5">
            {steps.map((text, i) => {
              const isStepDone = !isWorking || i < steps.length - 1;
              return (
                <div key={`${i}-${text}`} className="flex items-center gap-2 text-xs">
                  <span className="shrink-0 inline-flex items-center justify-center w-3.5 h-3.5">
                    {isStepDone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                    ) : (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </span>
                  <span
                    className={`font-mono text-[11px] leading-relaxed break-words ${
                      isStepDone
                        ? "text-slate-500 dark:text-zinc-400"
                        : "text-slate-800 dark:text-zinc-200 font-medium"
                    }`}
                  >
                    {text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
