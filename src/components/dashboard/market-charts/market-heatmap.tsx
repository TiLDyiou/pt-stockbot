"use client";

import React, { useState, useMemo } from "react";
import { SectorGroup, HeatmapStock, getStockColor } from "@/lib/vnstock/market-data";
import { formatNumber, formatPercent } from "@/lib/utils/format";

interface MarketHeatmapProps {
  sectors: SectorGroup[];
  exchangeFilter: "ALL" | "HSX" | "HNX" | "UPCOM";
  onSelectSymbol?: (symbol: string) => void;
}

export interface TreemapTile {
  symbol: string;
  stock: HeatmapStock;
  pctX: number;
  pctY: number;
  pctW: number;
  pctH: number;
}

/**
 * Thuật toán Squarified Treemap (Bruls, Huizing, van Wijk).
 * Phân bổ diện tích các ô chính xác 100% tỉ lệ theo Giá trị GD (stock.value),
 * sắp xếp lấp đầy hoàn toàn khung chứa (zero dead space) với tỉ lệ khung hình tối ưu.
 */
export function squarifyTreemap(
  stocks: HeatmapStock[],
  containerWidth: number = 300,
  containerHeight: number = 250
): TreemapTile[] {
  if (!stocks || stocks.length === 0) return [];
  if (stocks.length === 1) {
    return [
      {
        symbol: stocks[0].symbol,
        stock: stocks[0],
        pctX: 0,
        pctY: 0,
        pctW: 100,
        pctH: 100,
      },
    ];
  }

  const totalValue = stocks.reduce(
    (acc, it) => acc + (it.value && it.value > 0 ? it.value : 1),
    0
  );
  const totalArea = containerWidth * containerHeight;

  // Sắp xếp các cổ phiếu giảm dần theo diện tích (Giá trị GD)
  const normalized = stocks
    .map((it) => ({
      ...it,
      area: (((it.value && it.value > 0 ? it.value : 1) / totalValue) * totalArea),
    }))
    .sort((a, b) => b.area - a.area);

  const rects: TreemapTile[] = [];
  let curX = 0;
  let curY = 0;
  let curW = containerWidth;
  let curH = containerHeight;

  function worst(row: typeof normalized, side: number) {
    if (row.length === 0) return Infinity;
    const rowArea = row.reduce((sum, item) => sum + item.area, 0);
    const side2 = side * side;
    const rowArea2 = rowArea * rowArea;
    let maxAspect = 0;
    for (const item of row) {
      const aspect = Math.max(
        (side2 * item.area) / rowArea2,
        rowArea2 / (side2 * item.area)
      );
      if (aspect > maxAspect) maxAspect = aspect;
    }
    return maxAspect;
  }

  function layoutRow(
    row: typeof normalized,
    side: number,
    isHorizontal: boolean,
    isLastRow: boolean
  ) {
    const rowArea = row.reduce((sum, item) => sum + item.area, 0);
    let thickness = rowArea / side;
    if (isLastRow) {
      thickness = isHorizontal ? curH : curW;
    }
    let offset = 0;

    for (let idx = 0; idx < row.length; idx++) {
      const item = row[idx];
      const isLastInRow = idx === row.length - 1;
      let rx = curX;
      let ry = curY;
      let rw = 0;
      let rh = 0;

      if (isHorizontal) {
        const itemLength = isLastInRow ? curW - offset : item.area / thickness;
        rx = curX + offset;
        ry = curY;
        rw = itemLength;
        rh = thickness;
        offset += itemLength;
      } else {
        const itemLength = isLastInRow ? curH - offset : item.area / thickness;
        rx = curX;
        ry = curY + offset;
        rw = thickness;
        rh = itemLength;
        offset += itemLength;
      }

      rects.push({
        symbol: item.symbol,
        stock: item,
        pctX: (rx / containerWidth) * 100,
        pctY: (ry / containerHeight) * 100,
        pctW: (rw / containerWidth) * 100,
        pctH: (rh / containerHeight) * 100,
      });
    }

    if (isHorizontal) {
      curY += thickness;
      curH -= thickness;
    } else {
      curX += thickness;
      curW -= thickness;
    }
  }

  let remaining = [...normalized];
  while (remaining.length > 0) {
    const side = Math.max(1, Math.min(curW, curH));
    const isHorizontal = curW <= curH;

    let row = [remaining[0]];
    let i = 1;
    while (i < remaining.length) {
      const nextItem = remaining[i];
      const nextRow = [...row, nextItem];
      if (worst(nextRow, side) <= worst(row, side)) {
        row = nextRow;
        i++;
      } else {
        break;
      }
    }

    const isLastRow = row.length === remaining.length;
    layoutRow(row, side, isHorizontal, isLastRow);
    remaining = remaining.slice(row.length);
  }

  return rects;
}

export function MarketHeatmap({
  sectors,
  exchangeFilter = "ALL",
  onSelectSymbol,
}: MarketHeatmapProps) {
  const [hoveredStock, setHoveredStock] = useState<HeatmapStock | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handleDragStart = (e: React.DragEvent, symbol: string) => {
    e.dataTransfer.setData("text/plain", symbol);
    e.dataTransfer.setData("application/x-stock-ticker", symbol);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleMouseMove = (e: React.MouseEvent, stock: HeatmapStock) => {
    setHoveredStock(stock);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  // Filter stocks by exchange if specified
  const filteredSectors = useMemo(() => {
    return sectors
      .map((sec) => {
        const stocks =
          exchangeFilter === "ALL"
            ? sec.stocks
            : sec.stocks.filter((s) => s.exchange === exchangeFilter);
        return { ...sec, stocks };
      })
      .filter((sec) => sec.stocks.length > 0);
  }, [sectors, exchangeFilter]);

  const getSector = (id: string) => filteredSectors.find((s) => s.id === id);

  const financeSec = getSector("finance");
  const realestateSec = getSector("realestate");
  const materialsSec = getSector("materials");
  const consDiscSec = getSector("consumer_discretionary");
  const industrialsSec = getSector("industrials");
  const consStaplesSec = getSector("consumer_staples");
  const energySec = getSector("energy");
  const utilitiesSec = getSector("utilities");
  const techSec = getSector("technology");

  const knownSectorIds = useMemo(
    () => [
      "finance",
      "realestate",
      "materials",
      "consumer_discretionary",
      "industrials",
      "consumer_staples",
      "energy",
      "utilities",
      "technology",
    ],
    []
  );

  const otherSectors = useMemo(
    () => filteredSectors.filter((s) => !knownSectorIds.includes(s.id)),
    [filteredSectors, knownSectorIds]
  );

  const renderSectorBox = (
    sector: SectorGroup | undefined,
    aspectWidth: number,
    aspectHeight: number,
    extraClasses = "",
    style?: React.CSSProperties
  ) => {
    if (!sector || sector.stocks.length === 0) return null;

    const tiles = squarifyTreemap(sector.stocks, aspectWidth, aspectHeight);

    return (
      <div
        key={sector.id}
        style={style}
        className={`flex flex-col bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 rounded overflow-hidden ${extraClasses}`}
      >
        {/* Sector Title Banner */}
        <div className="bg-slate-100/90 dark:bg-zinc-800/90 px-1.5 py-0.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 h-5">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-zinc-200 truncate">
            {sector.name}
          </span>
          <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-400 shrink-0 ml-1">
            {sector.stocks.length} mã
          </span>
        </div>

        {/* Sector Stocks Squarified Treemap Area (100% full coverage, zero dead gaps) */}
        <div className="relative flex-1 w-full min-h-0 overflow-hidden bg-slate-200/30 dark:bg-black/30">
          {tiles.map((tile) => {
            const color = getStockColor(tile.stock.changePct);
            const isRef = Math.abs(tile.stock.changePct) <= 0.05;

            // Kích thước ô tương đối dựa trên tỉ lệ % diện tích tính từ Giá trị GD
            const isVeryLarge = tile.pctW >= 24 && tile.pctH >= 24;
            const isMedium =
              (tile.pctW >= 14 && tile.pctH >= 14) || tile.pctW * tile.pctH >= 180;
            const isSmall = !isVeryLarge && !isMedium && tile.pctW >= 7 && tile.pctH >= 8;

            const showChange = tile.pctH >= 10 && tile.pctW >= 7;
            const showValue = tile.pctW >= 24 && tile.pctH >= 34;

            return (
              <div
                key={tile.symbol}
                draggable
                onDragStart={(e) => handleDragStart(e, tile.symbol)}
                onClick={() => onSelectSymbol?.(tile.symbol)}
                onMouseEnter={(e) => handleMouseMove(e, tile.stock)}
                onMouseMove={(e) => handleMouseMove(e, tile.stock)}
                onMouseLeave={() => setHoveredStock(null)}
                style={{
                  position: "absolute",
                  left: `${tile.pctX}%`,
                  top: `${tile.pctY}%`,
                  width: `${tile.pctW}%`,
                  height: `${tile.pctH}%`,
                  backgroundColor: color.bg,
                  color: color.text,
                }}
                className="box-border border border-black/25 dark:border-black/50 overflow-hidden flex flex-col items-center justify-center text-center cursor-pointer select-none transition-transform duration-75 hover:scale-[1.02] hover:z-20 active:scale-95 shadow-2xs"
              >
                {/* Stock Symbol */}
                <span
                  className={`font-black font-mono leading-none tracking-tight ${
                    isVeryLarge
                      ? "text-xs sm:text-sm"
                      : isMedium
                      ? "text-[10px] sm:text-xs"
                      : isSmall
                      ? "text-[8.5px] sm:text-[9.5px] truncate px-0.5"
                      : "text-[7.5px] truncate px-0.5"
                  }`}
                >
                  {tile.symbol}
                </span>

                {/* Change % (ẩn nếu ô quá nhỏ để tránh đè chữ) */}
                {showChange && (
                  <span
                    className={`font-mono leading-tight mt-0.5 opacity-95 ${
                      isVeryLarge
                        ? "text-[10px] sm:text-xs font-bold"
                        : isMedium
                        ? "text-[9px] sm:text-[10px] font-medium"
                        : "text-[8px] truncate"
                    }`}
                  >
                    {isRef ? "0.00%" : formatPercent(tile.stock.changePct)}
                  </span>
                )}

                {/* Traded Value (chỉ hiển thị trên các ô lớn có đủ không gian) */}
                {showValue && (
                  <span className="font-mono text-[9px] opacity-80 leading-none mt-0.5 truncate px-0.5">
                    {formatNumber(tile.stock.value)} tỷ
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col min-h-0 overflow-y-auto">
      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200/60 dark:border-zinc-800 text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 dark:text-zinc-400 font-sans font-medium">
            Quy ước màu:
          </span>
          <span className="inline-flex items-center gap-1 text-[#a855f7] font-bold">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#a855f7]" /> Trần
          </span>
          <span className="inline-flex items-center gap-1 text-[#22c55e] font-bold">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#22c55e]" /> Tăng
          </span>
          <span className="inline-flex items-center gap-1 text-[#eab308] font-bold">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#eab308]" /> Tham chiếu
          </span>
          <span className="inline-flex items-center gap-1 text-[#ea580c] font-bold">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#ea580c]" /> Giảm nhẹ
          </span>
          <span className="inline-flex items-center gap-1 text-[#dc2626] font-bold">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#dc2626]" /> Giảm sâu
          </span>
          <span className="inline-flex items-center gap-1 text-[#06b6d4] font-bold">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#06b6d4]" /> Sàn
          </span>
        </div>
        <div className="text-slate-400 dark:text-zinc-500 hidden sm:block">
          Nhấn để mở mã • Kéo vào Chat để phân tích AI
        </div>
      </div>

      {/* Main 5-Column Treemap Grid matching Screenshot Exactly */}
      <div className="p-1.5 sm:p-2 flex flex-col md:flex-row gap-1.5 flex-1 min-h-[380px] h-full">
        {/* Column 1: Tài chính (Financials - large left block ~36% width, full height) */}
        {financeSec && (
          <div
            style={{ flex: "36 36 0%" }}
            className="w-full md:w-auto flex flex-col min-h-[280px] md:min-h-0 h-full"
          >
            {renderSectorBox(financeSec, 360, 460, "h-full w-full flex-1")}
          </div>
        )}

        {/* Column 2: Bất động sản (Top 56%) & Hàng tiêu dùng không thiết yếu (Bottom 44%) -> ~28% width */}
        {(realestateSec || consDiscSec) && (
          <div
            style={{ flex: "28 28 0%" }}
            className="w-full md:w-auto flex flex-col gap-1.5 min-h-[300px] md:min-h-0 h-full"
          >
            {realestateSec && (
              <div
                style={{ flex: consDiscSec ? "56 56 0%" : "1 1 0%" }}
                className="flex flex-col min-h-[140px] md:min-h-0"
              >
                {renderSectorBox(realestateSec, 280, 260, "h-full w-full flex-1")}
              </div>
            )}
            {consDiscSec && (
              <div
                style={{ flex: realestateSec ? "44 44 0%" : "1 1 0%" }}
                className="flex flex-col min-h-[120px] md:min-h-0"
              >
                {renderSectorBox(consDiscSec, 280, 200, "h-full w-full flex-1")}
              </div>
            )}
          </div>
        )}

        {/* Column 3: Vật liệu cơ bản (Top 50%) & Công nghiệp (Bottom 50%) -> ~18% width */}
        {(materialsSec || industrialsSec) && (
          <div
            style={{ flex: "18 18 0%" }}
            className="w-full md:w-auto flex flex-col gap-1.5 min-h-[280px] md:min-h-0 h-full"
          >
            {materialsSec && (
              <div
                style={{ flex: industrialsSec ? "50 50 0%" : "1 1 0%" }}
                className="flex flex-col min-h-[130px] md:min-h-0"
              >
                {renderSectorBox(materialsSec, 180, 230, "h-full w-full flex-1")}
              </div>
            )}
            {industrialsSec && (
              <div
                style={{ flex: materialsSec ? "50 50 0%" : "1 1 0%" }}
                className="flex flex-col min-h-[130px] md:min-h-0"
              >
                {renderSectorBox(industrialsSec, 180, 230, "h-full w-full flex-1")}
              </div>
            )}
          </div>
        )}

        {/* Column 4: Hàng tiêu dùng thiết yếu (Top 65%) & Các dịch vụ tiện ích (Bottom 35%) -> ~9% width */}
        {(consStaplesSec || utilitiesSec) && (
          <div
            style={{ flex: "9 9 0%" }}
            className="w-full md:w-auto flex flex-col gap-1.5 min-h-[220px] md:min-h-0 h-full"
          >
            {consStaplesSec && (
              <div
                style={{ flex: utilitiesSec ? "65 65 0%" : "1 1 0%" }}
                className="flex flex-col min-h-[130px] md:min-h-0"
              >
                {renderSectorBox(consStaplesSec, 100, 300, "h-full w-full flex-1")}
              </div>
            )}
            {utilitiesSec && (
              <div
                style={{ flex: consStaplesSec ? "35 35 0%" : "1 1 0%" }}
                className="flex flex-col min-h-[90px] md:min-h-0"
              >
                {renderSectorBox(utilitiesSec, 100, 160, "h-full w-full flex-1")}
              </div>
            )}
          </div>
        )}

        {/* Column 5: Năng lượng (Top 70%) & Công nghệ thông tin (Bottom 30%) -> ~9% width */}
        {(energySec || techSec) && (
          <div
            style={{ flex: "9 9 0%" }}
            className="w-full md:w-auto flex flex-col gap-1.5 min-h-[220px] md:min-h-0 h-full"
          >
            {energySec && (
              <div
                style={{ flex: techSec ? "70 70 0%" : "1 1 0%" }}
                className="flex flex-col min-h-[140px] md:min-h-0"
              >
                {renderSectorBox(energySec, 100, 320, "h-full w-full flex-1")}
              </div>
            )}
            {techSec && (
              <div
                style={{ flex: energySec ? "30 30 0%" : "1 1 0%" }}
                className="flex flex-col min-h-[80px] md:min-h-0"
              >
                {renderSectorBox(techSec, 100, 140, "h-full w-full flex-1")}
              </div>
            )}
          </div>
        )}

        {/* Dynamic / Fallback Columns for any other sectors */}
        {otherSectors.length > 0 && (
          <div
            style={{ flex: "12 12 0%" }}
            className="w-full md:w-auto flex flex-col gap-1.5 min-h-[200px] md:min-h-0 h-full"
          >
            {otherSectors.map((sec) => (
              <div key={sec.id} className="flex-1 flex flex-col min-h-[100px] md:min-h-0">
                {renderSectorBox(sec, 150, 150, "h-full w-full flex-1")}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Stock Details Tooltip */}
      {hoveredStock && tooltipPos && (
        <div
          style={{
            position: "fixed",
            left: `${Math.min(window.innerWidth - 230, Math.max(10, tooltipPos.x - 115))}px`,
            top: `${Math.max(10, tooltipPos.y - 125)}px`,
            zIndex: 9999,
          }}
          className="pointer-events-none w-56 p-2.5 rounded-lg bg-slate-900/95 text-white shadow-2xl border border-zinc-700/80 backdrop-blur-md text-xs font-sans animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold font-mono text-sm text-sky-400">
                {hoveredStock.symbol}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                {hoveredStock.exchange}
              </span>
            </div>
            <span
              className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: getStockColor(hoveredStock.changePct).bg,
                color: getStockColor(hoveredStock.changePct).text,
              }}
            >
              {hoveredStock.changePct >= 0 ? "+" : ""}
              {hoveredStock.changePct.toFixed(2)}%
            </span>
          </div>

          <div className="text-[11px] text-zinc-300 font-medium truncate mb-2">
            {hoveredStock.name}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-zinc-800/80 pt-1.5">
            <div>
              <span className="text-zinc-500 block">Thị giá</span>
              <span className="font-bold text-white text-xs">
                {hoveredStock.price.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Giá trị GD</span>
              <span className="font-bold text-amber-300 text-xs">
                {formatNumber(hoveredStock.value)} tỷ
              </span>
            </div>
          </div>

          <div className="mt-2 text-[9px] text-emerald-400/90 font-mono text-center">
            ✦ Nhấn để xem biểu đồ • Kéo vào Chat AI
          </div>
        </div>
      )}
    </div>
  );
}
