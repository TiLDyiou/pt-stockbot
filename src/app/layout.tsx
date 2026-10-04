import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhuocThinh Stockbot - Workspace Phân tích Cổ phiếu Việt Nam",
  description:
    "Workspace tương tác và trợ lý AI phân tích cổ phiếu Việt Nam (HOSE, HNX, UPCoM) với TradingView Lightweight Charts và drag-and-drop dashboard.",
  icons: {
    icon: "/candlestick.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
