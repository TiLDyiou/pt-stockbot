import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "ai";

export function getLanguageModel(): LanguageModelV1 {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  const modelName = process.env.LLM_MODEL;

  // 1. Google Gemini
  if (
    provider === "google" ||
    provider === "gemini" ||
    (!provider && process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  ) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Chưa cấu hình GOOGLE_GENERATIVE_AI_API_KEY trong file .env");
    }
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelName || "gemini-2.5-flash");
  }

  // 2. Anthropic Claude
  if (provider === "anthropic" || (!provider && process.env.ANTHROPIC_API_KEY)) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Chưa cấu hình ANTHROPIC_API_KEY trong file .env");
    }
    const anthropic = createAnthropic({ apiKey });
    return anthropic(modelName || "claude-3-5-sonnet-20241022");
  }

  // 3. OpenAI / Compatible
  if (
    provider === "openai" ||
    (!provider && process.env.OPENAI_API_KEY) ||
    (!provider && !process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.ANTHROPIC_API_KEY)
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Chưa cấu hình API Key. Vui lòng thiết lập GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY hoặc ANTHROPIC_API_KEY trong file .env"
      );
    }
    const openai = createOpenAI({ apiKey });
    return openai(modelName || "gpt-4o-mini");
  }

  throw new Error(`Nhà cung cấp AI không được hỗ trợ: ${provider}`);
}

export function getMaxOutputTokens(): number {
  const envVal = process.env.MAX_OUTPUT_TOKENS;
  if (!envVal) return 1200;
  const parsed = parseInt(envVal, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? 1200 : parsed;
}
