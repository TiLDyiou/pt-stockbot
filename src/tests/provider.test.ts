import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getLanguageModel, getMaxOutputTokens } from "../lib/ai/provider";

describe("AI Provider Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("handles custom base URL (VietAPI / DeepSeek) in AI_PROVIDER", () => {
    process.env.AI_PROVIDER = "https://api.vietapi.tech/v1";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.LLM_MODEL = "deepseek-v4-flash";
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const model = getLanguageModel();
    expect(model).toBeDefined();
    expect(model.modelId).toBe("deepseek-v4-flash");
  });

  it("normalizes URL without /v1 automatically", () => {
    process.env.AI_PROVIDER = "https://api.vietapi.tech";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.LLM_MODEL = "deepseek-v4-pro";
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const model = getLanguageModel();
    expect(model).toBeDefined();
    expect(model.modelId).toBe("deepseek-v4-pro");
  });

  it("supports provider=deepseek with OPENAI_BASE_URL", () => {
    process.env.AI_PROVIDER = "deepseek";
    process.env.OPENAI_BASE_URL = "https://api.deepseek.com/v1";
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const model = getLanguageModel();
    expect(model).toBeDefined();
  });

  it("throws error when no API key is provided", () => {
    process.env.AI_PROVIDER = "https://api.vietapi.tech/v1";
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.AI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => getLanguageModel()).toThrowError(/Chưa cấu hình API Key/);
  });

  it("returns default or parsed max output tokens", () => {
    delete process.env.MAX_OUTPUT_TOKENS;
    expect(getMaxOutputTokens()).toBe(4000);

    process.env.MAX_OUTPUT_TOKENS = "2500";
    expect(getMaxOutputTokens()).toBe(2500);

    process.env.MAX_OUTPUT_TOKENS = "invalid";
    expect(getMaxOutputTokens()).toBe(4000);
  });
});
