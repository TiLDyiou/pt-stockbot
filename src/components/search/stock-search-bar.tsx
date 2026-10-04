"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatPrice, formatPercent } from "@/lib/utils/format";
import {
  SearchIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "lucide-animated";

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
        <SearchIcon
          size={14}
          className="absolute left-3 text-slate-400 dark:text-zinc-500 pointer-events-none"
          animateOnHover
        />
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
          placeholder="Tra cứu mã hoặc giá cổ phiếu"
          className="w-full pl-8 pr-12 py-1.5 text-xs bg-slate-100 dark:bg-zinc-900 border-none outline-none focus:outline-none focus:ring-0 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-sans transition-all"
        />
        <span className="absolute right-2.5 text-[10px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md hidden sm:inline pointer-events-none">
          /
        </span>
      </div>

      {/* Dropdown Results */}
      {isOpen && (query.trim().length > 0 || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#171718] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in duration-100">
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500 font-mono animate-pulse">
              Đang tra cứu giá...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500">
              Không tìm thấy kết quả nào cho &quot;{query}&quot;. Bấm Enter để mở biểu đồ trực tiếp mã này.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const isPositive = (item.changePct || 0) > 0;
                const isNegative = (item.changePct || 0) < 0;

                return (
                  <div
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    className={`flex items-center justify-between p-3 cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? "bg-slate-100 dark:bg-zinc-800"
                        : "hover:bg-slate-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {/* Left: Symbol & Name */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900 dark:text-white text-xs tracking-wider">
                          {item.symbol}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                          {item.exchange}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-xs">
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
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPositive
                                ? "bg-emerald-500/10 text-emerald-500"
                                : isNegative
                                ? "bg-rose-500/10 text-rose-500"
                                : "bg-amber-500/10 text-amber-500"
                            }`}
                          >
                            {isPositive && <TrendingUpIcon size={11} animateOnHover />}
                            {isNegative && <TrendingDownIcon size={11} animateOnHover />}
                            <span>{formatPercent(item.changePct)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                          <span>Mở biểu đồ</span>
                          <ArrowRightIcon size={11} animateOnHover />
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
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold transition-colors shadow-xs cursor-pointer"
                          title="Hỏi AI phân tích mã này"
                        >
                          <SparklesIcon size={11} animateOnHover />
                          <span>Phân tích AI</span>
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
