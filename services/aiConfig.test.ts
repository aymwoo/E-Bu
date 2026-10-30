import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiService,
  normalizeAIConfig,
  providerLabel,
  isBuiltInProvider,
} from "./apiService";
import { AIProviderType } from "../types";

describe("normalizeAIConfig", () => {
  it("keeps a modern config untouched in substance", () => {
    const config = normalizeAIConfig({
      activeProvider: "QWEN",
      providers: { QWEN: { apiKey: "k", modelName: "qwen-vl-max" } },
      customProviders: [],
      systemPrompt: "prompt",
      enableLatexAutoFix: false,
    });

    expect(config.activeProvider).toBe(AIProviderType.QWEN);
    expect(config.providers.QWEN).toEqual({ apiKey: "k", modelName: "qwen-vl-max" });
    expect(config.systemPrompt).toBe("prompt");
    expect(config.enableLatexAutoFix).toBe(false);
  });

  it("maps the legacy single-provider payload into providers[]", () => {
    const config = normalizeAIConfig({
      type: "QWEN",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      modelName: "qwen-vl-max",
      systemPrompt: "",
    });

    expect(config.activeProvider).toBe(AIProviderType.QWEN);
    expect(config.providers.QWEN?.baseUrl).toContain("dashscope");
    expect(config.providers.QWEN?.modelName).toBe("qwen-vl-max");
  });

  it("never leaks unknown legacy fields into the saved config", () => {
    const config = normalizeAIConfig({ type: "GEMINI", activeProvider: "QWEN" });
    expect(Object.keys(config).sort()).toEqual(
      ["activeProvider", "customProviders", "enableLatexAutoFix", "providers", "systemPrompt"].sort(),
    );
  });

  it("falls back to Gemini for garbage input", () => {
    expect(normalizeAIConfig(null).activeProvider).toBe(AIProviderType.GEMINI);
    expect(normalizeAIConfig("nope").activeProvider).toBe(AIProviderType.GEMINI);
  });
});

describe("providerLabel / isBuiltInProvider", () => {
  it("labels built-in and custom providers", () => {
    expect(providerLabel("QWEN")).toBe("通义千问");
    expect(
      providerLabel("custom-1", {
        activeProvider: "custom-1",
        providers: {},
        customProviders: [
          { id: "custom-1", name: "本地 Ollama", color: "", config: {} },
        ],
        enableLatexAutoFix: true,
      }),
    ).toBe("本地 Ollama");
    expect(providerLabel(undefined)).toBe("AI");
  });

  it("distinguishes built-in from custom ids", () => {
    expect(isBuiltInProvider("QWEN")).toBe(true);
    expect(isBuiltInProvider("custom-123")).toBe(false);
  });
});

describe("getActiveProviderConfig", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const serveConfig = (config: unknown) => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ configData: JSON.stringify(config) }),
    })) as any;
  };

  it("uses the persisted active provider instead of falling back to Gemini", async () => {
    serveConfig({
      activeProvider: "QWEN",
      providers: {
        QWEN: {
          apiKey: "sk-qwen",
          baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          modelName: "qwen-vl-max",
        },
      },
      customProviders: [],
    });

    const active = await apiService.getActiveProviderConfig();
    expect(active.type).toBe(AIProviderType.QWEN);
    expect(active.apiKey).toBe("sk-qwen");
    expect(active.modelName).toBe("qwen-vl-max");
  });

  it("reports a missing key for the active provider instead of silently using Gemini", async () => {
    serveConfig({ activeProvider: "QWEN", providers: {}, customProviders: [] });

    await expect(apiService.getActiveProviderConfig()).rejects.toThrow(/通义千问/);
  });

  it("allows keyless custom endpoints (local gateways) but requires a base URL", async () => {
    serveConfig({
      activeProvider: "custom-1",
      providers: {},
      customProviders: [
        { id: "custom-1", name: "本地 vLLM", color: "", config: { baseUrl: "http://localhost:8000/v1" } },
      ],
    });

    const active = await apiService.getActiveProviderConfig();
    expect(active.type).toBe("custom-1");
    expect(active.baseUrl).toBe("http://localhost:8000/v1");
  });

  it("keeps using the last known config when the backend blips", async () => {
    serveConfig({
      activeProvider: "QWEN",
      providers: { QWEN: { apiKey: "sk-qwen", modelName: "qwen-vl-max" } },
      customProviders: [],
    });
    await apiService.getActiveProviderConfig();

    global.fetch = vi.fn(async () => {
      throw new Error("Failed to fetch");
    }) as any;

    const active = await apiService.getActiveProviderConfig();
    expect(active.type).toBe(AIProviderType.QWEN);
  });

  it("surfaces a backend outage when nothing was ever loaded", async () => {
    vi.resetModules();
    const fresh = await import("./apiService");
    global.fetch = vi.fn(async () => {
      throw new Error("Failed to fetch");
    }) as any;

    await expect(fresh.apiService.getActiveProviderConfig()).rejects.toThrow(
      /无法读取模型配置/,
    );
  });
});
