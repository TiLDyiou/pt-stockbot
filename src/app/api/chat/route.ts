import { streamText } from "ai";
import { getLanguageModel, getMaxOutputTokens } from "@/lib/ai/provider";
import { sanitizeMessages } from "@/lib/ai/sanitize";
import { stockTools } from "@/lib/ai/tools";

export const maxDuration = 30;

const SYSTEM_PROMPT = `Bạn là trợ lý ảo phân tích cổ phiếu Việt Nam (HOSE, HNX, UPCoM) thông minh, khách quan và chuyên nghiệp.

Nguyên tắc bắt buộc:
1. Trả lời súc tích, ngắn gọn, đi thẳng vào trọng tâm câu hỏi của người dùng.
2. Không bịa đặt số liệu. Chỉ sử dụng dữ liệu trả về từ các công cụ (tools).
3. Luôn đính kèm thời điểm dữ liệu (as_of) khi nhắc đến thị giá hoặc chỉ số.
4. Nếu người dùng hỏi về phân tích kỹ thuật: tập trung vào xu hướng, RSI, MACD, cản/hỗ trợ, khối lượng.
5. Nếu người dùng hỏi về phân tích cơ bản/tài chính: tập trung vào doanh thu, lợi nhuận sau thuế, P/E, ROE.
6. Kết thúc các phân tích bằng một dòng lưu ý ngắn: "Thông tin chỉ mang tính tham khảo, không phải khuyến nghị đầu tư."`;

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const cleanMessages = sanitizeMessages(json.messages);

    const model = getLanguageModel();
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: cleanMessages,
      tools: stockTools,
      maxSteps: 5,
      maxTokens: getMaxOutputTokens(),
    });

    return result.toDataStreamResponse();
  } catch (err: any) {
    console.error("Lỗi chat API:", err);
    return new Response(
      JSON.stringify({
        error: err?.message || "Đã xảy ra lỗi trong quá trình xử lý yêu cầu",
      }),
      {
        status: err?.message?.includes("tin nhắn") ? 400 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
