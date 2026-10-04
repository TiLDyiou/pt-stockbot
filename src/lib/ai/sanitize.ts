export interface RawChatMessage {
  role: string;
  content: any;
  [key: string]: any;
}

export interface SanitizedMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 4000;

export function sanitizeMessages(rawMessages: unknown): SanitizedMessage[] {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw new Error("Danh sách tin nhắn không hợp lệ hoặc đang trống");
  }

  const cleaned: SanitizedMessage[] = [];

  for (const m of rawMessages) {
    if (!m || typeof m !== "object") continue;

    const role = (m as RawChatMessage).role;
    // Strictly drop system, tool, or any unrecognized role
    if (role !== "user" && role !== "assistant") {
      continue;
    }

    const rawContent = (m as RawChatMessage).content;
    let text = "";

    if (typeof rawContent === "string") {
      text = rawContent;
    } else if (Array.isArray(rawContent)) {
      // Extract text parts if formatted as multi-part content
      text = rawContent
        .filter((part: any) => part && part.type === "text" && typeof part.text === "string")
        .map((part: any) => part.text)
        .join("\n");
    }

    text = text.trim();
    if (!text) continue;

    if (text.length > MAX_CONTENT_LENGTH) {
      text = text.slice(0, MAX_CONTENT_LENGTH);
    }

    cleaned.push({
      role,
      content: text,
    });
  }

  if (cleaned.length === 0) {
    throw new Error("Không có tin nhắn hợp lệ nào");
  }

  // Keep at most MAX_MESSAGES
  const sliced = cleaned.slice(-MAX_MESSAGES);

  // Require the last message to be from 'user'
  const last = sliced[sliced.length - 1];
  if (last.role !== "user" || !last.content) {
    throw new Error("Tin nhắn cuối cùng phải là câu hỏi từ người dùng (user)");
  }

  return sliced;
}
