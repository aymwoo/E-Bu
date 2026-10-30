import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cleanAndParseJSON,
  extractAssistantText,
  testAIConfig,
} from "./imageAnalysisService";
import { AIProviderType } from "../types";

describe("cleanAndParseJSON", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully parse valid JSON", () => {
    const validJSON = `
      {
        "content": "What is 1+1?",
        "options": ["1", "2"],
        "answer": "2",
        "analysis": "1+1=2",
        "knowledgePoints": ["Math"],
        "subject": "Math",
        "difficulty": 1
      }
    `;
    const result = cleanAndParseJSON(validJSON);
    expect(result.content).toBe("What is 1+1?");
    expect(result.options).toEqual(["1", "2"]);
    expect(result.answer).toBe("2");
  });

  it("should successfully parse JSON embedded in markdown code blocks", () => {
    const validJSON = `\`\`\`json
      {
        "content": "What is 1+1?",
        "options": ["1", "2"],
        "answer": "2",
        "analysis": "1+1=2",
        "knowledgePoints": ["Math"],
        "subject": "Math",
        "difficulty": 1
      }
    \`\`\``;
    const result = cleanAndParseJSON(validJSON);
    expect(result.content).toBe("What is 1+1?");
    expect(result.options).toEqual(["1", "2"]);
    expect(result.answer).toBe("2");
  });

  it("should successfully fix and parse JSON with LaTeX backslash issues", () => {
    // Escaped with single backslash simulating the issue described in the file
    const latexJSON = `
      {
        "content": "Solve \\\\sqrt{4}",
        "options": ["1", "2"],
        "answer": "2",
        "analysis": "1+1=2",
        "knowledgePoints": ["Math"],
        "subject": "Math",
        "difficulty": 1
      }
    `;
    const result = cleanAndParseJSON(latexJSON);
    expect(result.content).toBe("Solve \\sqrt{4}");
  });

  it("should throw a specific error and log to console when parsing completely invalid JSON", () => {
    const invalidJSON = "This is definitely not a JSON object";

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => cleanAndParseJSON(invalidJSON)).toThrowError(/JSON 解析失败:/);

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "JSON parsing failed after all cleanup attempts:",
      invalidJSON.substring(0, 500),
    );
  });
});

describe("extractAssistantText", () => {
  it("reads the standard OpenAI / DashScope / Ark shape", () => {
    const payload = {
      choices: [{ message: { role: "assistant", content: '{"a":1}' } }],
    };
    expect(extractAssistantText(payload)).toBe('{"a":1}');
  });

  it("joins multi-part content arrays", () => {
    const payload = {
      choices: [
        { message: { content: [{ type: "text", text: "abc" }, { text: "def" }] } },
      ],
    };
    expect(extractAssistantText(payload)).toBe("abcdef");
  });

  it("reads streaming delta chunks", () => {
    const payload = { choices: [{ delta: { content: "part" } }] };
    expect(extractAssistantText(payload)).toBe("part");
  });

  it("reads the legacy {result:{response}} envelope without throwing", () => {
    expect(extractAssistantText({ result: { response: "hello" } })).toBe("hello");
  });

  it("reads proxies that nest choices under data", () => {
    const payload = { data: { choices: [{ message: { content: "nested" } }] } };
    expect(extractAssistantText(payload)).toBe("nested");
  });

  it("reads Ollama-style {message:{content}} and bare {response}", () => {
    expect(extractAssistantText({ message: { content: "ollama" } })).toBe("ollama");
    expect(extractAssistantText({ response: "plain" })).toBe("plain");
  });

  it("returns undefined (never throws) for unknown shapes", () => {
    // This is the regression: `data.choices ? ... : data.result.response`
    // crashed with "Cannot read properties of undefined (reading 'response')".
    expect(() => extractAssistantText({ code: 400, message: "bad" })).not.toThrow();
    expect(extractAssistantText({ code: 400, message: "bad" })).toBeUndefined();
    expect(extractAssistantText({})).toBeUndefined();
    expect(extractAssistantText(null)).toBeUndefined();
    expect(extractAssistantText(undefined)).toBeUndefined();
    expect(extractAssistantText([])).toBeUndefined();
  });

  it("ignores empty content", () => {
    expect(
      extractAssistantText({ choices: [{ message: { content: "   " } }] }),
    ).toBeUndefined();
  });
});

describe("testAIConfig against an OpenAI-compatible gateway", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const respond = (status: number, body: string) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  });

  const qwenConfig = {
    type: AIProviderType.QWEN,
    apiKey: "sk-test",
    baseUrl: "https://example.com/compatible-mode/v1",
    modelName: "qwen-vl-max",
  };

  it("returns true for a standard choices response", async () => {
    global.fetch = vi.fn(async () =>
      respond(200, JSON.stringify({ choices: [{ message: { content: "测试成功" } }] })),
    ) as any;

    await expect(testAIConfig(qwenConfig)).resolves.toBe(true);
  });

  it("surfaces the gateway error instead of crashing on a missing `choices`", async () => {
    global.fetch = vi.fn(async () =>
      respond(200, JSON.stringify({ code: "InvalidParameter", message: "model not found" })),
    ) as any;

    // Before the fix this threw "Cannot read properties of undefined (reading 'response')".
    await expect(testAIConfig(qwenConfig)).rejects.toThrow(/model not found/);
    await expect(testAIConfig(qwenConfig)).rejects.not.toThrow(/reading 'response'/);
  });

  it("explains an invalid API key on 401", async () => {
    global.fetch = vi.fn(async () =>
      respond(401, JSON.stringify({ error: { message: "Invalid API-key provided" } })),
    ) as any;

    await expect(testAIConfig(qwenConfig)).rejects.toThrow(/API Key 无效或已过期/);
  });

  it("requires an API key for built-in clouds", async () => {
    await expect(testAIConfig({ ...qwenConfig, apiKey: "" })).rejects.toThrow(
      /未填写 API Key/,
    );
  });
});
