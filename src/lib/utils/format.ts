export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "-";
  return new Intl.NumberFormat("vi-VN").format(val);
}

export function formatPrice(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "-";
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "-";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

export function formatVolume(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "-";
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(2)}M`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(1)}k`;
  }
  return val.toString();
}
