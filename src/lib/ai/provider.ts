import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "ai";

function normalizeBaseURL(url?: string): string | undefined {
  if (!url) return undefined;
  let clean = url.trim().replace(/\/+$/, "");
  if (!clean.endsWith("/v1")) {
    clean += "/v1";
  }
  return clean;
}

export function getLanguageModel(): LanguageModelV1 {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  const rawProvider = (process.env.AI_PROVIDER || "").trim();
  const modelName = process.env.LLM_MODEL?.trim();

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

  // 3. OpenAI / DeepSeek / Custom Base URL (OpenAI-compatible)
  const isUrlProvider = rawProvider.startsWith("http://") || rawProvider.startsWith("https://");
  const customBaseURL = normalizeBaseURL(
    (isUrlProvider ? rawProvider : undefined) ||
    process.env.OPENAI_BASE_URL ||
    process.env.AI_BASE_URL
  );

  const isOpenAIOrCompatible =
    isUrlProvider ||
    Boolean(customBaseURL) ||
    provider === "openai" ||
    provider === "deepseek" ||
    provider === "custom" ||
    (!provider && process.env.OPENAI_API_KEY) ||
    (!provider && !process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.ANTHROPIC_API_KEY);

  if (isOpenAIOrCompatible) {
    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.AI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Chưa cấu hình API Key. Vui lòng thiết lập OPENAI_API_KEY hoặc GOOGLE_GENERATIVE_AI_API_KEY trong file .env"
      );
    }

    const openai = createOpenAI({
      apiKey,
      ...(customBaseURL ? { baseURL: customBaseURL } : {}),
    });

    const defaultModel = customBaseURL ? "deepseek-v4-flash" : "gpt-4o-mini";
    return openai(modelName || defaultModel);
  }

  throw new Error(`Nhà cung cấp AI không được hỗ trợ: ${provider}`);
}

export function getMaxOutputTokens(): number {
  const envVal = process.env.MAX_OUTPUT_TOKENS;
  if (!envVal) return 1200;
  const parsed = parseInt(envVal, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? 1200 : parsed;
}
