"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatPrice, formatPercent } from "@/lib/utils/format";

interface SearchResultItem {
  symbol: string;
  name: string;
  exchange: string;
  price?: number;
  changePct?: number;
}

interface StockSearchBarProps {
  onSelectSymbol: (symbol: string) => void;
  onAnalyzeSymbol?: (symbol: string) => void;
}

export function StockSearchBar({
  onSelectSymbol,
  onAnalyzeSymbol,
}: StockSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K or '/' to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && document.activeElement !== inputRef.current)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (symbol: string) => {
    onSelectSymbol(symbol.toUpperCase());
    setQuery("");
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (results.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % (results.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].symbol);
      } else if (query.trim().length >= 3) {
        handleSelect(query.trim().toUpperCase());
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <span className="absolute left-2.5 text-slate-400 text-xs pointer-events-none">
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Tra mã hoặc giá (VD: VNINDEX, FPT, VCB, HPG)..."
          className="w-full pl-7 pr-12 py-1 text-xs bg-slate-100 dark:bg-terminal-subtle border border-slate-200 dark:border-slate-700/80 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400 font-sans transition-all"
        />
        <span className="absolute right-2 text-[10px] font-mono text-slate-400 border border-slate-300 dark:border-slate-700 px-1 rounded hidden sm:inline pointer-events-none">
          /
        </span>
      </div>

      {/* Dropdown Results */}
      {isOpen && (query.trim().length > 0 || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-terminal-panel border border-slate-200 dark:border-terminal-border rounded-md shadow-xl overflow-hidden z-50 animate-in fade-in duration-100">
          {isLoading && results.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 font-mono animate-pulse">
              Đang tra cứu giá...
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              Không tìm thấy kết quả nào cho &quot;{query}&quot;. Bấm Enter để mở biểu đồ trực tiếp mã này.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-terminal-border/60">
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const isUp = (item.changePct || 0) >= 0;

                return (
                  <div
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? "bg-slate-100 dark:bg-terminal-hover"
                        : "hover:bg-slate-50 dark:hover:bg-terminal-subtle"
                    }`}
                  >
                    {/* Left: Symbol & Name */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-slate-900 dark:text-white text-xs tracking-wider">
                          {item.symbol}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-terminal-subtle text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {item.exchange}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {item.name}
                      </span>
                    </div>

                    {/* Right: Live Price & Actions */}
                    <div className="flex items-center gap-3">
                      {item.price !== undefined ? (
                        <div className="text-right font-mono">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            {formatPrice(item.price)}
                          </div>
                          <div
                            className={`text-[10px] font-semibold ${
                              isUp ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {formatPercent(item.changePct)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Mở biểu đồ →
                        </span>
                      )}

                      {onAnalyzeSymbol && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalyzeSymbol(item.symbol);
                            setIsOpen(false);
                            setQuery("");
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-medium hover:bg-emerald-100"
                          title="Hỏi AI phân tích mã này"
                        >
                          Phân tích AI
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
