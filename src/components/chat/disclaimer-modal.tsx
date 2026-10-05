"use client";

import React, { useEffect, useState } from "react";
import {
  loadDisclaimerAccepted,
  saveDisclaimerAccepted,
} from "@/lib/storage/layout-storage";
import { BadgeAlertIcon } from "lucide-animated";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#171718] border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3 text-amber-500">
          <BadgeAlertIcon size={20} className="text-amber-500 shrink-0" animateOnHover />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Miễn trừ Trách nhiệm Đầu tư
          </h2>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
          Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư. Dữ liệu có thể trễ hoặc không chính xác. Nhà đầu tư tự chịu trách nhiệm hoàn toàn về các quyết định giao dịch của mình.
        </p>

        <button
          onClick={handleAccept}
          className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-xs transition-colors shadow-xs cursor-pointer"
        >
          Tôi đã hiểu và đồng ý
        </button>
      </div>
    </div>
  );
}
