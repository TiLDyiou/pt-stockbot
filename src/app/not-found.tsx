import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 font-sans">
      <h2 className="text-xl font-bold mb-2">404 - Không tìm thấy trang</h2>
      <p className="text-sm text-slate-400 mb-4">Trang bạn yêu cầu không tồn tại.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-medium transition-colors"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
