export interface HeatmapStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  value: number; // Traded value in tỷ VNĐ
  volume?: number;
  exchange: "HSX" | "HNX" | "UPCOM";
  size?: "lg" | "md" | "sm" | "xs"; // Visual weighting
}

export interface SectorGroup {
  id: string;
  name: string;
  weight: number; // percentage of market
  stocks: HeatmapStock[];
}

export interface CashFlowDistribution {
  upValue: number; // tỷ VNĐ
  upCount: number;
  downValue: number;
  downCount: number;
  unchangedValue: number;
  unchangedCount: number;
  totalValue: number;
}

export interface IndexMoverItem {
  symbol: string;
  point: number; // Điểm đóng góp vào VNINDEX
  price: number;
  changePct: number;
}

export interface MarketOverviewData {
  asOf: string;
  index: {
    symbol: string;
    close: number;
    change: number;
    changePercent: number;
    volume: number;
  };
  liquidity: {
    value: number; // tỷ VNĐ
    valuePrevious: number;
    changePercent: number;
    volume: number;
    unit: string;
  };
  breadth: {
    exchange: string;
    advancing: number;
    declining: number;
    unchanged: number;
    ceiling: number;
    floor: number;
    total: number;
    advanceDeclineRatio: number;
  };
  cashFlow: CashFlowDistribution;
  sectors: SectorGroup[];
  indexImpact: {
    positive: IndexMoverItem[];
    negative: IndexMoverItem[];
  };
  foreign: {
    buyValue: number;
    sellValue: number;
    netValue: number;
    topNetBuy: Array<{
      symbol: string;
      netValue: number;
      buyValue: number;
      sellValue: number;
      unit: string;
    }>;
    topNetSell: Array<{
      symbol: string;
      netValue: number;
      buyValue: number;
      sellValue: number;
      unit: string;
    }>;
  };
}

/**
 * Danh sách ngành nghề và cổ phiếu đại diện thị trường chứng khoán Việt Nam
 * Được khớp chính xác theo phân bổ ngành trên các terminal tài chính như FireAnt/SSI iBoard
 */
export const DEFAULT_SECTORS: SectorGroup[] = [
  {
    id: "finance",
    name: "Tài chính",
    weight: 35,
    stocks: [
      { symbol: "VIX", name: "CTCP Chứng khoán VIX", price: 11.8, change: -0.35, changePct: -2.88, value: 680, exchange: "HSX", size: "lg" },
      { symbol: "SSI", name: "CTCP Chứng khoán SSI", price: 19.7, change: -0.45, changePct: -2.23, value: 620, exchange: "HSX", size: "lg" },
      { symbol: "VPB", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", price: 19.2, change: -0.35, changePct: -1.72, value: 490, exchange: "HSX", size: "md" },
      { symbol: "TCB", name: "Ngân hàng TMCP Kỹ thương Việt Nam", price: 32.25, change: -0.75, changePct: -2.27, value: 450, exchange: "HSX", size: "md" },
      { symbol: "MBB", name: "Ngân hàng TMCP Quân Đội", price: 23.4, change: -0.55, changePct: -2.30, value: 420, exchange: "HSX", size: "md" },
      { symbol: "HDB", name: "Ngân hàng TMCP Phát triển TP.HCM", price: 25.2, change: +0.40, changePct: +1.61, value: 380, exchange: "HSX", size: "md" },
      { symbol: "VND", name: "CTCP Chứng khoán VNDIRECT", price: 14.9, change: -0.45, changePct: -2.92, value: 350, exchange: "HSX", size: "md" },
      { symbol: "STB", name: "Ngân hàng TMCP Sài Gòn Thương Tín", price: 28.8, change: -0.80, changePct: -2.70, value: 330, exchange: "HSX", size: "sm" },
      { symbol: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", price: 11.2, change: -0.20, changePct: -1.76, value: 310, exchange: "HSX", size: "md" },
      { symbol: "ACB", name: "Ngân hàng TMCP Á Châu", price: 24.5, change: 0.00, changePct: 0.00, value: 290, exchange: "HSX", size: "sm" },
      { symbol: "VCB", name: "Ngân hàng TMCP Ngoại thương Việt Nam", price: 57.1, change: -0.40, changePct: -0.70, value: 280, exchange: "HSX", size: "sm" },
      { symbol: "CTG", name: "Ngân hàng TMCP Công Thương Việt Nam", price: 35.6, change: -0.40, changePct: -1.10, value: 270, exchange: "HSX", size: "sm" },
      { symbol: "TPB", name: "Ngân hàng TMCP Tiên Phong", price: 17.9, change: -0.30, changePct: -1.65, value: 260, exchange: "HSX", size: "sm" },
      { symbol: "VCI", name: "CTCP Chứng khoán Vietcap", price: 34.0, change: -1.55, changePct: -4.36, value: 240, exchange: "HSX", size: "sm" },
      { symbol: "SHS", name: "CTCP Chứng khoán Sài Gòn - Hà Nội", price: 14.5, change: -0.40, changePct: -2.68, value: 210, exchange: "HNX", size: "sm" },
      { symbol: "BID", name: "Ngân hàng TMCP Đầu tư và Phát triển VN", price: 48.2, change: -0.90, changePct: -1.83, value: 210, exchange: "HSX", size: "sm" },
      { symbol: "LPB", name: "Ngân hàng TMCP Lộc Phát Việt Nam", price: 31.8, change: +0.35, changePct: +1.11, value: 190, exchange: "HSX", size: "xs" },
      { symbol: "HCM", name: "CTCP Chứng khoán TP.Hồ Chí Minh", price: 28.6, change: -0.70, changePct: -2.39, value: 180, exchange: "HSX", size: "xs" },
      { symbol: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam", price: 21.3, change: -0.08, changePct: -0.37, value: 160, exchange: "HSX", size: "xs" },
      { symbol: "EIB", name: "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam", price: 18.2, change: -0.10, changePct: -0.55, value: 150, exchange: "HSX", size: "xs" },
      { symbol: "MBS", name: "CTCP Chứng khoán MB", price: 27.2, change: -0.60, changePct: -2.16, value: 150, exchange: "HNX", size: "xs" },
      { symbol: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", price: 12.4, change: -0.15, changePct: -1.20, value: 140, exchange: "HSX", size: "xs" },
      { symbol: "SSB", name: "Ngân hàng TMCP Đông Nam Á", price: 16.8, change: -0.10, changePct: -0.60, value: 95, exchange: "HSX", size: "xs" },
      { symbol: "VPX", name: "CTCP Chứng khoán VPBank", price: 21.0, change: -0.30, changePct: -1.41, value: 80, exchange: "HSX", size: "xs" },
    ],
  },
  {
    id: "realestate",
    name: "Bất động sản",
    weight: 22,
    stocks: [
      { symbol: "NVL", name: "CTCP Tập đoàn Đầu tư Địa ốc No Va", price: 10.5, change: +0.05, changePct: +0.48, value: 510, exchange: "HSX", size: "lg" },
      { symbol: "VHM", name: "CTCP Vinhomes", price: 67.9, change: -0.50, changePct: -0.73, value: 480, exchange: "HSX", size: "md" },
      { symbol: "DXG", name: "CTCP Tập đoàn Đất Xanh", price: 14.25, change: -0.30, changePct: -2.06, value: 320, exchange: "HSX", size: "md" },
      { symbol: "DIG", name: "Tổng CTCP Đầu tư Phát triển Xây dựng", price: 21.2, change: -0.40, changePct: -1.85, value: 290, exchange: "HSX", size: "md" },
      { symbol: "PDR", name: "CTCP Phát triển Bất động sản Phát Đạt", price: 21.4, change: -0.25, changePct: -1.15, value: 270, exchange: "HSX", size: "sm" },
      { symbol: "VIC", name: "Tập đoàn Vingroup - CTCP", price: 224.0, change: -1.10, changePct: -0.49, value: 250, exchange: "HSX", size: "sm" },
      { symbol: "VRE", name: "CTCP Vincom Retail", price: 18.0, change: -0.35, changePct: -1.91, value: 210, exchange: "HSX", size: "sm" },
      { symbol: "TCH", name: "CTCP Đầu tư Dịch vụ Tài chính Hoàng Huy", price: 16.5, change: -0.25, changePct: -1.49, value: 180, exchange: "HSX", size: "sm" },
      { symbol: "KBC", name: "Tổng Công ty Phát triển Đô thị Kinh Bắc", price: 27.8, change: -0.40, changePct: -1.42, value: 170, exchange: "HSX", size: "sm" },
      { symbol: "KDH", name: "CTCP Đầu tư Kinh doanh Nhà Khang Điền", price: 34.0, change: -0.10, changePct: -0.29, value: 160, exchange: "HSX", size: "xs" },
      { symbol: "NLG", name: "CTCP Đầu tư Nam Long", price: 38.5, change: +0.10, changePct: +0.26, value: 140, exchange: "HSX", size: "xs" },
      { symbol: "CEO", name: "CTCP Tập đoàn C.E.O", price: 15.6, change: -0.30, changePct: -1.89, value: 130, exchange: "HNX", size: "xs" },
      { symbol: "IDC", name: "Tổng Công ty IDICO - CTCP", price: 54.2, change: -0.60, changePct: -1.09, value: 120, exchange: "HNX", size: "xs" },
    ],
  },
  {
    id: "materials",
    name: "Vật liệu cơ bản",
    weight: 18,
    stocks: [
      { symbol: "HPG", name: "CTCP Tập đoàn Hòa Phát", price: 20.05, change: 0.00, changePct: 0.00, value: 850, exchange: "HSX", size: "lg" },
      { symbol: "HSG", name: "CTCP Tập đoàn Hoa Sen", price: 20.2, change: -0.35, changePct: -1.70, value: 280, exchange: "HSX", size: "md" },
      { symbol: "NKG", name: "CTCP Thép Nam Kim", price: 21.0, change: -0.40, changePct: -1.87, value: 240, exchange: "HSX", size: "md" },
      { symbol: "DCM", name: "CTCP Phân bón Dầu khí Cà Mau", price: 36.8, change: +0.65, changePct: +1.80, value: 210, exchange: "HSX", size: "sm" },
      { symbol: "DPM", name: "Tổng CTCP Phân bón và Hóa chất Dầu khí", price: 32.5, change: -0.80, changePct: -2.40, value: 190, exchange: "HSX", size: "sm" },
      { symbol: "GVR", name: "Tập đoàn Công nghiệp Cao su Việt Nam", price: 32.1, change: -0.40, changePct: -1.23, value: 170, exchange: "HSX", size: "sm" },
      { symbol: "DGC", name: "CTCP Tập đoàn Hóa chất Đức Giang", price: 108.5, change: -1.20, changePct: -1.09, value: 160, exchange: "HSX", size: "sm" },
    ],
  },
  {
    id: "consumer_discretionary",
    name: "Hàng tiêu dùng không thiết yếu",
    weight: 12,
    stocks: [
      { symbol: "PNJ", name: "CTCP Vàng bạc Đá quý Phú Nhuận", price: 23.05, change: -1.70, changePct: -6.87, value: 1466, exchange: "HSX", size: "lg" },
      { symbol: "MWG", name: "CTCP Đầu tư Thế Giới Di Động", price: 62.5, change: -0.90, changePct: -1.42, value: 380, exchange: "HSX", size: "md" },
      { symbol: "FRT", name: "CTCP Bán lẻ Kỹ thuật số FPT", price: 174.5, change: +5.40, changePct: +3.19, value: 220, exchange: "HSX", size: "sm" },
      { symbol: "DGW", name: "CTCP Thế Giới Số", price: 46.2, change: +1.25, changePct: +2.78, value: 180, exchange: "HSX", size: "sm" },
    ],
  },
  {
    id: "industrials",
    name: "Công nghiệp",
    weight: 14,
    stocks: [
      { symbol: "GEX", name: "CTCP Tập đoàn GELEX", price: 21.5, change: -0.80, changePct: -3.58, value: 390, exchange: "HSX", size: "md" },
      { symbol: "PVT", name: "Tổng CTCP Vận tải Dầu khí", price: 28.3, change: -0.30, changePct: -1.05, value: 250, exchange: "HSX", size: "md" },
      { symbol: "CII", name: "CTCP Đầu tư Hạ tầng Kỹ thuật TP.HCM", price: 15.25, change: -0.65, changePct: -4.08, value: 210, exchange: "HSX", size: "sm" },
      { symbol: "VCG", name: "Tổng CTCP Xuất nhập khẩu và Xây dựng VN", price: 18.7, change: -0.45, changePct: -2.35, value: 170, exchange: "HSX", size: "sm" },
      { symbol: "VSC", name: "CTCP Container Việt Nam", price: 18.3, change: -0.65, changePct: -3.42, value: 160, exchange: "HSX", size: "sm" },
      { symbol: "GMD", name: "CTCP Gemadept", price: 78.5, change: +0.80, changePct: +1.03, value: 160, exchange: "HSX", size: "sm" },
      { symbol: "HHV", name: "CTCP Đầu tư Hạ tầng Giao thông Đèo Cả", price: 12.1, change: -0.20, changePct: -1.63, value: 130, exchange: "HSX", size: "xs" },
      { symbol: "PC1", name: "CTCP Tập đoàn PC1", price: 26.5, change: -0.30, changePct: -1.12, value: 110, exchange: "HSX", size: "xs" },
    ],
  },
  {
    id: "consumer_staples",
    name: "Hàng tiêu dùng thiết yếu",
    weight: 9,
    stocks: [
      { symbol: "VNM", name: "CTCP Sữa Việt Nam", price: 65.4, change: +0.10, changePct: +0.15, value: 310, exchange: "HSX", size: "md" },
      { symbol: "MSN", name: "CTCP Tập đoàn Masan", price: 74.8, change: -0.20, changePct: -0.27, value: 290, exchange: "HSX", size: "md" },
      { symbol: "DBC", name: "CTCP Tập đoàn DABACO", price: 29.5, change: -0.40, changePct: -1.34, value: 140, exchange: "HSX", size: "sm" },
      { symbol: "SAB", name: "Tổng CTCP Bia - Rượu - NGK Sài Gòn", price: 56.2, change: -0.30, changePct: -0.53, value: 120, exchange: "HSX", size: "sm" },
    ],
  },
  {
    id: "energy",
    name: "Năng lượng",
    weight: 8,
    stocks: [
      { symbol: "BSR", name: "CTCP Lọc Hóa dầu Bình Sơn", price: 23.7, change: -0.70, changePct: -2.87, value: 340, exchange: "UPCOM", size: "lg" },
      { symbol: "PVD", name: "Tổng CTCP Khoan và Dịch vụ Khoan Dầu khí", price: 27.2, change: -0.60, changePct: -2.16, value: 230, exchange: "HSX", size: "md" },
      { symbol: "PVS", name: "Tổng CTCP Dịch vụ Kỹ thuật Dầu khí VN", price: 39.5, change: -0.70, changePct: -1.74, value: 210, exchange: "HNX", size: "md" },
      { symbol: "PLX", name: "Tập đoàn Xăng Dầu Việt Nam", price: 41.5, change: -0.45, changePct: -1.07, value: 160, exchange: "HSX", size: "sm" },
    ],
  },
  {
    id: "utilities",
    name: "Các dịch vụ tiện ích",
    weight: 7,
    stocks: [
      { symbol: "POW", name: "Tổng Công ty Điện lực Dầu khí Việt Nam", price: 12.7, change: -0.20, changePct: -1.55, value: 270, exchange: "HSX", size: "md" },
      { symbol: "GAS", name: "Tổng Công ty Khí Việt Nam - CTCP", price: 71.0, change: -0.60, changePct: -0.84, value: 240, exchange: "HSX", size: "md" },
      { symbol: "REE", name: "CTCP Cơ Điện Lạnh", price: 63.8, change: -0.40, changePct: -0.62, value: 120, exchange: "HSX", size: "sm" },
      { symbol: "GEG", name: "CTCP Điện Gia Lai", price: 12.3, change: +0.05, changePct: +0.41, value: 70, exchange: "HSX", size: "xs" },
    ],
  },
  {
    id: "technology",
    name: "Công nghệ thông tin",
    weight: 8,
    stocks: [
      { symbol: "FPT", name: "CTCP FPT", price: 62.1, change: -0.50, changePct: -0.80, value: 520, exchange: "HSX", size: "lg" },
      { symbol: "CMG", name: "CTCP Tập đoàn Công nghệ CMC", price: 51.5, change: +0.60, changePct: +1.18, value: 90, exchange: "HSX", size: "sm" },
      { symbol: "ELC", name: "CTCP Công nghệ - Viễn thông ELCOM", price: 22.8, change: -0.15, changePct: -0.65, value: 60, exchange: "HSX", size: "xs" },
    ],
  },
];

export const DEFAULT_INDEX_IMPACT: {
  positive: IndexMoverItem[];
  negative: IndexMoverItem[];
} = {
  positive: [
    { symbol: "HDB", point: 0.42, price: 25.2, changePct: 1.61 },
    { symbol: "NVL", point: 0.28, price: 10.5, changePct: 0.48 },
    { symbol: "FRT", point: 0.25, price: 174.5, changePct: 3.19 },
    { symbol: "DGW", point: 0.22, price: 46.2, changePct: 2.78 },
    { symbol: "DCM", point: 0.20, price: 36.8, changePct: 1.80 },
    { symbol: "LPB", point: 0.18, price: 31.8, changePct: 1.11 },
    { symbol: "VNM", point: 0.12, price: 65.4, changePct: 0.15 },
    { symbol: "GMD", point: 0.11, price: 78.5, changePct: 1.03 },
  ],
  negative: [
    { symbol: "PNJ", point: -1.85, price: 23.05, changePct: -6.87 },
    { symbol: "VHM", point: -1.42, price: 67.9, changePct: -0.73 },
    { symbol: "VCB", point: -1.25, price: 57.1, changePct: -0.70 },
    { symbol: "TCB", point: -0.98, price: 32.25, changePct: -2.27 },
    { symbol: "BID", point: -0.92, price: 48.2, changePct: -1.83 },
    { symbol: "VPB", point: -0.85, price: 19.2, changePct: -1.72 },
    { symbol: "MBB", point: -0.78, price: 23.4, changePct: -2.30 },
    { symbol: "SSI", point: -0.72, price: 19.7, changePct: -2.23 },
    { symbol: "VIX", point: -0.65, price: 11.8, changePct: -2.88 },
    { symbol: "GEX", point: -0.60, price: 21.5, changePct: -3.58 },
  ],
};

/**
 * Trả về màu sắc hex và class Tailwind tương ứng theo biến động %
 * Phù hợp quy chuẩn bảng điện tử thị trường Việt Nam
 */
export function getStockColor(changePct: number): {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
} {
  if (changePct >= 6.85) {
    // Tím trần
    return {
      bg: "#a855f7",
      text: "#ffffff",
      border: "#9333ea",
      badgeBg: "rgba(168, 85, 247, 0.15)",
    };
  }
  if (changePct <= -6.9) {
    // Xanh lơ sàn
    return {
      bg: "#06b6d4",
      text: "#ffffff",
      border: "#0891b2",
      badgeBg: "rgba(6, 182, 212, 0.15)",
    };
  }
  if (changePct > 2.0) {
    // Xanh lá sáng (tăng mạnh)
    return {
      bg: "#22c55e",
      text: "#ffffff",
      border: "#16a34a",
      badgeBg: "rgba(34, 197, 94, 0.15)",
    };
  }
  if (changePct > 0.05) {
    // Xanh lá chuẩn (tăng)
    return {
      bg: "#16a34a",
      text: "#ffffff",
      border: "#15803d",
      badgeBg: "rgba(22, 163, 74, 0.15)",
    };
  }
  if (changePct >= -0.05 && changePct <= 0.05) {
    // Vàng tham chiếu (không đổi)
    return {
      bg: "#eab308",
      text: "#0f172a",
      border: "#ca8a04",
      badgeBg: "rgba(234, 179, 8, 0.15)",
    };
  }
  if (changePct >= -2.0) {
    // Cam / Giảm nhẹ
    return {
      bg: "#ea580c",
      text: "#ffffff",
      border: "#c2410c",
      badgeBg: "rgba(234, 88, 12, 0.15)",
    };
  }
  if (changePct >= -4.5) {
    // Đỏ cam / Giảm vừa
    return {
      bg: "#dc2626",
      text: "#ffffff",
      border: "#b91c1c",
      badgeBg: "rgba(220, 38, 38, 0.15)",
    };
  }
  // Đỏ sẫm / Giảm sâu
  return {
    bg: "#991b1b",
    text: "#ffffff",
    border: "#7f1d1d",
    badgeBg: "rgba(153, 27, 27, 0.15)",
  };
}
