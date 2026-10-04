"use client";

import React, { useEffect, useState } from "react";
import {
  loadDisclaimerAccepted,
  saveDisclaimerAccepted,
} from "@/lib/storage/layout-storage";

export function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const accepted = loadDisclaimerAccepted();
    if (!accepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    saveDisclaimerAccepted(true);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md double-bezel-shell shadow-ambient-lg animate-in zoom-in-95 duration-300">
        <div className="double-bezel-core p-6">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-mono uppercase tracking-widest mb-3">
            <span>⚠️</span>
            <span>Khuyến cáo thị trường</span>
          </div>

          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Miễn trừ Trách nhiệm Đầu tư
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-sans">
            Mọi dữ liệu giá, chỉ báo kỹ thuật, báo cáo tài chính và phản hồi của trợ lý AI chỉ mang tính chất tham khảo, không cấu thành bất kỳ khuyến nghị mua/bán hay cam kết tài chính nào. Dữ liệu từ các nguồn công khai có thể có độ trễ hoặc sai lệch theo thời gian thực.
          </p>

          <button
            onClick={handleAccept}
            className="group w-full flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all duration-300 shadow-emerald-glow active:scale-[0.98]"
          >
            <span>Tôi đã hiểu và tiếp tục</span>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] group-hover:translate-x-0.5 transition-transform">
              ✓
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
