import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/provider";
import { getQuote, getSparkline } from "@/lib/vnstock/client";
import type {
  RecommendationAction,
  TickerRecommendation,
} from "@/lib/storage/layout-storage";

export const maxDuration = 60;

function calculateRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(1));
}

function getFallbackRecommendation(
  _sym: string,
  quote?: any,
  sparkline?: any[]
): { action: RecommendationAction; rationale: string } {
  const price = quote?.price;
  const changePct = quote?.changePct ?? 0;
  if (!price || !sparkline || sparkline.length < 5) {
    return {
      action: "Cần theo dõi",
      rationale: `Thị giá hiện tại ${
        price ? price.toLocaleString() : "đang cập nhật"
      }. Cần theo dõi thêm diễn biến cung cầu để xác định điểm mua hợp lý.`,
    };
  }

  const closes = sparkline.map((p) => p.close);
  const sma20 =
    closes.length >= 20
      ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20
      : closes.reduce((a, b) => a + b, 0) / closes.length;
  const isAboveSma = price >= sma20;
  const rsi = calculateRsi(closes);

  if (isAboveSma && changePct >= -0.5 && (rsi === null || rsi < 70)) {
    return {
      action: "Mua",
      rationale: `Giá giữ vững trên đường SMA20 (${sma20.toFixed(1)}) cho thấy xu hướng tăng ngắn hạn duy trì tốt. Chỉ báo RSI ${
        rsi ? `ở mức ${rsi}` : ""
      } vẫn còn dư địa tăng trưởng. Nhà đầu tư có thể xem xét mở vị thế mua thăm dò hoặc gom thêm ở các nhịp điều chỉnh.`,
    };
  } else if (!isAboveSma && (changePct < -1 || (rsi !== null && rsi < 40))) {
    return {
      action: "Không mua",
      rationale: `Giá vận động dưới ngưỡng SMA20 (${sma20.toFixed(1)}) và đang chịu áp lực điều chỉnh ngắn hạn. Chỉ báo kỹ thuật chưa cho tín hiệu dòng tiền đảo chiều tạo đáy. Nhà đầu tư chưa nên mua vội mà cần ưu tiên quan sát bảo toàn vốn.`,
    };
  } else {
    return {
      action: "Cần theo dõi",
      rationale: `Cổ phiếu đang biến động giằng co tích lũy quanh ngưỡng ${price.toFixed(1)}. Khối lượng và xu hướng giá chưa đủ độ tin cậy để giải ngân. Nên tiếp tục theo dõi chặt chẽ phản ứng tại các vùng hỗ trợ và kháng cự gần nhất.`,
    };
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const rawSymbols = json?.symbols;
    if (!Array.isArray(rawSymbols) || rawSymbols.length === 0) {
      return new Response(JSON.stringify({ error: "Danh sách mã không hợp lệ" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const symbols = Array.from(
      new Set(
        rawSymbols
          .map((s) => String(s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
          .filter((s) => s.length >= 3 && s.length <= 10)
      )
    ).slice(0, 20);

    if (symbols.length === 0) {
      return new Response(JSON.stringify({ error: "Không tìm thấy mã hợp lệ" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Fetch market quotes and sparklines in parallel
    const [quoteResults, sparklineResults] = await Promise.all([
      Promise.allSettled(symbols.map((sym) => getQuote(sym))),
      Promise.allSettled(symbols.map((sym) => getSparkline(sym))),
    ]);

    const summaries: string[] = [];
    symbols.forEach((sym, idx) => {
      const qRes = quoteResults[idx];
      const spRes = sparklineResults[idx];
      const quote = qRes.status === "fulfilled" ? qRes.value : null;
      const sparkline = spRes.status === "fulfilled" ? spRes.value : [];
      const price = quote?.price;
      const changePct = quote?.changePct ?? 0;
      const closes = sparkline.map((p) => p.close);
      const rsi = calculateRsi(closes);
      const sma20 =
        closes.length >= 20
          ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20
          : closes.length > 0
          ? closes.reduce((a, b) => a + b, 0) / closes.length
          : null;

      summaries.push(
        `- Mã ${sym}: Giá ${price ?? "N/A"} (${changePct >= 0 ? "+" : ""}${changePct}%), ${
          sma20 ? `SMA20 = ${sma20.toFixed(2)}, ` : ""
        }${rsi !== null ? `RSI(14) = ${rsi}, ` : ""}khối lượng ${quote?.volume?.toLocaleString() ?? "N/A"}.`
      );
    });

    const recMap: Record<string, TickerRecommendation> = {};
    const now = Date.now();

    // 2. Try LLM Recommendation
    try {
      const model = getLanguageModel();
      const systemPrompt = `Bạn là chuyên gia cố vấn tài chính chứng khoán Việt Nam (HOSE, HNX).
Nhiệm vụ: Phân tích nhanh dữ liệu giá và chỉ báo kỹ thuật của các mã cổ phiếu trong danh mục theo dõi và đưa ra khuyến cáo vắn tắt cho từng mã.

QUY TẮC BẮT BUỘC:
1. "action": CHỈ ĐƯỢC CHỌN 1 TRONG 3 GIÁ TRỊ: "Mua", "Không mua", hoặc "Cần theo dõi".
2. "rationale": TỐI ĐA 3 CÂU vắn tắt, súc tích, khách quan. Nêu rõ lí do ngắn gọn dựa trên xu hướng, ngưỡng cản/hỗ trợ hoặc RSI/MA.
3. Trả về đúng định dạng JSON thuần túy (không kèm markdown \`\`\` hay văn bản ngoài JSON):
{
  "recommendations": [
    {
      "symbol": "FPT",
      "action": "Mua" | "Không mua" | "Cần theo dõi",
      "rationale": "Giá giữ vững trên MA20 và xu hướng tăng tiếp diễn. RSI ở 52 chưa vào vùng quá mua. Thích hợp mở vị thế gom mua quanh vùng giá hiện tại."
    }
  ]
}`;

      const userPrompt = `Dưới đây là thông tin thị trường các mã cổ phiếu trong danh mục theo dõi:
${summaries.join("\n")}

Hãy đưa ra khuyến cáo vắn tắt cho từng mã cổ phiếu trên theo đúng định dạng JSON yêu cầu.`;

      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        maxTokens: 1200,
      });

      const cleanJson = result.text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      const list = Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : Array.isArray(parsed)
        ? parsed
        : [];

      for (const item of list) {
        if (item && item.symbol) {
          const symUpper = String(item.symbol).toUpperCase();
          let action: RecommendationAction = "Cần theo dõi";
          const rawAction = String(item.action || "").trim();
          if (rawAction === "Mua" || (rawAction.toLowerCase().includes("mua") && !rawAction.toLowerCase().includes("không"))) {
            action = "Mua";
          } else if (rawAction === "Không mua" || rawAction.toLowerCase().includes("không") || rawAction.toLowerCase().includes("bán")) {
            action = "Không mua";
          }
          recMap[symUpper] = {
            symbol: symUpper,
            action,
            rationale: String(item.rationale || "").trim(),
            updatedAt: now,
          };
        }
      }
    } catch (err) {
      console.warn("Lỗi LLM recommendations, dùng fallback:", err);
    }

    // 3. Fallback for any missing symbols
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      if (!recMap[sym] || !recMap[sym].rationale) {
        const qRes = quoteResults[i];
        const spRes = sparklineResults[i];
        const quote = qRes.status === "fulfilled" ? qRes.value : null;
        const sparkline = spRes.status === "fulfilled" ? spRes.value : [];
        const fallback = getFallbackRecommendation(sym, quote, sparkline);
        recMap[sym] = {
          symbol: sym,
          action: fallback.action,
          rationale: fallback.rationale,
          updatedAt: now,
        };
      }
    }

    return new Response(JSON.stringify({ recommendations: recMap }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Lỗi API watchlist recommendations:", err);
    return new Response(
      JSON.stringify({
        error: err?.message || "Đã xảy ra lỗi khi tạo khuyến cáo",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
