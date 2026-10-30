import { GoogleGenAI, Type } from "@google/genai";
import {
  GeminiAnalysisResponse,
  Subject,
  ActiveProviderConfig,
  AIProviderType,
} from "../types";

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    content: {
      type: Type.STRING,
      description: "题干文本，使用 Markdown 和 LaTeX 公式 ($...$)",
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "如果是选择题，列出选项。选项中的公式也必须使用 LaTeX 格式 ($...$)",
    },
    diagramDescription: {
      type: Type.STRING,
      description: "对题目中图示/图解的文字描述，如果没有则为空",
    },
    answer: { type: Type.STRING, description: "正确答案" },
    analysis: {
      type: Type.STRING,
      description: "详细解析步骤，使用 Markdown 和 LaTeX",
    },
    learningGuide: { type: Type.STRING, description: "学习建议和易错点提醒" },
    knowledgePoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "涉及的知识点标签",
    },
    subject: {
      type: Type.STRING,
      enum: Object.values(Subject),
      description: "学科分类",
    },
    difficulty: { type: Type.INTEGER, description: "难度评级 (1-5)" },
  },
  required: ["content", "analysis", "knowledgePoints", "subject", "difficulty"],
};

// 导出的默认提示词，供设置页面恢复使用
export const DEFAULT_SYSTEM_PROMPT = `你是一个中学错题解析专家。请识别图片中的题目并提取结构化信息。
要求：
1. 提取题干、选项、图解描述、答案、解析、建议、知识点、学科和难度。注意区分不同的试题类型（填空题/选择题/解答题等）：只有选择题才有选项。原图题目的答案可能是错误的，不要受原题答案影响，只根据题干进行解析。
2. 所有公式、符号、化学式必须使用 LaTeX，并用美元符号包裹：$...$ 或 $$...$$。不要使用 Unicode 数学符号替代 LaTeX。
   - 禁止输出：√ × · ÷ ² ³ θ π ° ≤ ≥ ≠ ≈ …（以及类似的上标/希腊字母/不等号 Unicode 符号）
   - 必须输出（示例）：
     - √6 → $\\sqrt{6}$
     - x² → $x^2$
     - × → $\\times$
     - ° → $^\\circ$
     - θ → $\\theta$
     - ≤/≥ → $\\leq$ / $\\geq$
3. 返回严格的 JSON 格式，字段名必须使用英文：content, options, diagramDescription, answer, analysis, learningGuide, knowledgePoints, subject, difficulty。
   - options 字段必须是简单的字符串数组，例如 ["A. 选项内容", "B. 选项内容"]，绝对不要使用对象结构。
4. 只在公式片段上使用 $...$，不要把整段中文句子包进 $...$。
5. 确保识别内容准确无误。
6. 在 JSON 字符串中，所有反斜杠必须写成双反斜杠 (例如 \\frac 而不是 \frac，\\sqrt 而不是 \sqrt)。`;

/**
 * Fix LaTeX backslashes in JSON content using character-by-character processing.
 */
function fixLatexEscapes(content: string): string {
  let result = "";
  let i = 0;

  while (i < content.length) {
    if (content[i] === "\\" && i + 1 < content.length) {
      const next = content[i + 1];

      if (next === "\\") {
        result += "\\\\";
        i += 2;
        continue;
      }

      if (next === '"' || next === "/") {
        result += "\\" + next;
        i += 2;
        continue;
      }

      if (
        next === "u" &&
        i + 5 < content.length &&
        /^[0-9a-fA-F]{4}$/.test(content.substring(i + 2, i + 6))
      ) {
        result += content.substring(i, i + 6);
        i += 6;
        continue;
      }

      if ("bfnrt".includes(next)) {
        const afterNext = i + 2 < content.length ? content[i + 2] : "";
        if (!/[a-zA-Z]/.test(afterNext)) {
          result += "\\" + next;
          i += 2;
          continue;
        }
      }

      result += "\\\\" + next;
      i += 2;
    } else {
      result += content[i];
      i++;
    }
  }

  return result;
}

/**
 * Resizes and compresses image to speed up AI processing
 */
const compressImage = async (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const MAX_SIDE = 1024; // Limit to 1024px for faster processing

      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width > height) {
          height = Math.round((height * MAX_SIDE) / width);
          width = MAX_SIDE;
        } else {
          width = Math.round((width * MAX_SIDE) / height);
          height = MAX_SIDE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => resolve(base64Str); // Fallback
  });
};

/**
 * Helper function to clean and parse JSON from AI responses
 */
export function cleanAndParseJSON(content: string): GeminiAnalysisResponse {
  let cleaned = content.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  cleaned = cleaned.trim();

  // Aggressively fix LaTeX escapes first.
  // The AI often returns single backslashes for LaTeX commands (e.g. \frac instead of \\frac).
  // Standard JSON.parse accepts \f as a form feed, leading to garbled text (♠rac).
  // We must escape these BEFORE parsing.
  const fixedContent = fixLatexEscapes(cleaned);

  try {
    return JSON.parse(fixedContent);
  } catch (firstError) {
    try {
      // Fallback: try parsing the original cleaned content (rare case where fix broke valid JSON?)
      return JSON.parse(cleaned);
    } catch (secondError) {
      try {
        let sanitized = fixedContent.replace(
          /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
          "",
        );
        return JSON.parse(sanitized);
      } catch (thirdError) {
        console.error(
          "JSON parsing failed after all cleanup attempts:",
          content.substring(0, 500),
        );
        throw new Error(`JSON 解析失败: ${(firstError as Error).message}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Response shape helpers
 *
 * Different OpenAI-compatible gateways wrap the assistant message very
 * differently (choices[].message.content, {result:{response}}, {response},
 * Ollama's {message:{content}}, SSE bodies ...). Never assume a shape:
 * destructuring a missing branch used to crash with
 * "Cannot read properties of undefined (reading 'response')".
 * ------------------------------------------------------------------ */

type AnyRecord = Record<string, any>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeParseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function snippet(text: string, max = 300): string {
  const trimmed = (text || "").replace(/\s+/g, " ").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

/** Coerce a message `content` field (string | parts array | object) into text. */
function contentToText(content: unknown): string | undefined {
  if (typeof content === "string") {
    return content.trim() ? content : undefined;
  }
  if (Array.isArray(content)) {
    const merged = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (isRecord(part)) {
          if (typeof part.text === "string") return part.text;
          if (typeof part.content === "string") return part.content;
        }
        return "";
      })
      .join("");
    return merged.trim() ? merged : undefined;
  }
  if (isRecord(content)) {
    if (typeof content.text === "string") return content.text;
    if (content.content) return contentToText(content.content);
  }
  return undefined;
}

/**
 * Extract the assistant text from any known chat-completion envelope.
 * Exported for tests.
 */
export function extractAssistantText(payload: unknown): string | undefined {
  if (typeof payload === "string") {
    return payload.trim() ? payload : undefined;
  }
  if (!isRecord(payload)) return undefined;

  // 1) OpenAI / DashScope / Ark / most gateways: choices[0].message.content
  if (Array.isArray(payload.choices) && payload.choices.length > 0) {
    const choice = payload.choices[0];
    const text =
      contentToText(choice?.message?.content) ??
      contentToText(choice?.delta?.content) ??
      contentToText(choice?.text) ??
      contentToText(choice);
    if (text) return text;
  }

  // 2) Proxies that nest the OpenAI envelope one level deeper.
  if (isRecord(payload.data)) {
    const nested = extractAssistantText(payload.data);
    if (nested) return nested;
  }
  if (isRecord(payload.result)) {
    const nested = extractAssistantText(payload.result);
    if (nested) return nested;
  }

  // 3) {result: {response}} / {response} / Ollama {message: {content}}
  const direct = [
    payload.result?.response,
    payload.response,
    payload.output_text,
    payload.output?.text,
    payload.answer,
  ];
  for (const candidate of direct) {
    const text = contentToText(candidate);
    if (text) return text;
  }

  // Ollama-style {message: {content}} (a bare string `message` is an error
  // envelope, not model output — never treat it as the answer).
  if (isRecord(payload.message)) {
    const messageText = contentToText(payload.message.content);
    if (messageText) return messageText;
  }

  // 4) Last resort: a bare text field on the envelope itself.
  return contentToText(payload.content) ?? contentToText(payload.text);
}

/** Rebuild text from a `data: {...}` SSE body (some gateways stream anyway). */
function extractFromSSE(rawText: string): string | undefined {
  if (!/^\s*(data|event):/.test(rawText)) return undefined;
  const chunks: string[] = [];
  for (const line of rawText.split(/\r?\n/)) {
    const match = /^\s*data:\s*(.*)$/.exec(line);
    if (!match) continue;
    const data = match[1].trim();
    if (!data || data === "[DONE]") continue;
    const parsed = safeParseJSON(data);
    const text = extractAssistantText(parsed);
    if (text) chunks.push(text);
  }
  const merged = chunks.join("");
  return merged.trim() ? merged : undefined;
}

/** Pull a human-readable message out of any API error envelope. */
function errorMessageFromPayload(payload: unknown): string | undefined {
  if (typeof payload === "string") return payload.trim() || undefined;
  if (!isRecord(payload)) return undefined;

  const error = payload.error;
  if (typeof error === "string") return error.trim() || undefined;
  if (isRecord(error)) {
    const inner = [error.message, error.msg, error.error?.message, error.code]
      .find((v) => typeof v === "string" && v.trim());
    if (typeof inner === "string") return inner.trim();
  }

  const top = [payload.message, payload.msg, payload.detail, payload.error_msg, payload.errorMessage]
    .find((v) => typeof v === "string" && v.trim());
  return typeof top === "string" ? top.trim() : undefined;
}

/** Users often paste the full endpoint instead of the base URL. */
function normalizeBaseUrl(baseUrl: string | undefined, fallback: string): string {
  const url = (baseUrl || fallback || "").trim().replace(/\/+$/, "");
  return url.replace(/\/chat\/completions$/i, "");
}

function toDataUrl(image: string): string {
  return image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;
}

interface ChatCallResult {
  ok: boolean;
  status: number;
  rawText: string;
  payload: any;
}

async function callChatCompletion(
  baseUrl: string,
  apiKey: string | undefined,
  body: unknown,
): Promise<ChatCallResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Local / self-hosted gateways (Ollama, vLLM, LM Studio ...) need no key.
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  // Read as text first so an unexpected (non-JSON) body never turns into an
  // opaque `response.json()` failure.
  const rawText = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    rawText,
    payload: safeParseJSON(rawText),
  };
}

/** Friendly message for provider-side failures. */
function describeCallFailure(result: ChatCallResult, baseUrl: string): string {
  const message =
    errorMessageFromPayload(result.payload) ||
    snippet(result.rawText) ||
    `HTTP error! status: ${result.status}`;

  if (/support text|MultiContent|image_url|vision|multimodal/i.test(message)) {
    return `该模型似乎不支持图片输入。请确保在服务商控制台选择了支持视觉(Vision)能力的模型版本。原始错误：${message}`;
  }

  if (result.status === 401 || result.status === 403) {
    return `API Key 无效或已过期（HTTP ${result.status}）。请检查密钥是否完整、是否与所选服务商匹配。原始错误：${message}`;
  }

  if (result.status === 404) {
    return `接口地址或模型名称不存在（HTTP 404）。接口地址：${baseUrl}，请确认 Base URL 是否包含正确的版本路径（如 /v1），以及模型名称是否可用。原始错误：${message}`;
  }

  return message;
}

/**
 * Gemini Provider Implementation
 */
async function analyzeWithGemini(
  base64Image: string,
  config: ActiveProviderConfig,
  prompt: string,
): Promise<GeminiAnalysisResponse> {
  if (!config.apiKey) throw new Error("API Key 未设置");
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const model = config.modelName || "gemini-2.0-flash";

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini 返回为空");
  return JSON.parse(text.trim());
}

/**
 * OpenAI Compatible Provider Implementation (Qwen, Doubao, OpenAI)
 */
function buildChatRequestBody(
  base64Image: string,
  model: string,
  prompt: string,
  includeResponseFormat: boolean,
): AnyRecord {
  const body: AnyRecord = {
    model,
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: [
          { type: "text", text: "请解析这张题目图片，并以 JSON 格式输出。" },
          { type: "image_url", image_url: { url: toDataUrl(base64Image) } },
        ],
      },
    ],
  };
  if (includeResponseFormat) {
    body.response_format = { type: "json_object" };
  }
  return body;
}

async function analyzeWithOpenAICompatible(
  base64Image: string,
  config: ActiveProviderConfig,
  prompt: string,
): Promise<GeminiAnalysisResponse> {
  let model = config.modelName || "gpt-4o";
  let baseUrl: string;
  // Doubao/Ark does not accept `response_format`; other gateways do.
  let includeResponseFormat = true;

  if (config.type === AIProviderType.QWEN) {
    baseUrl = normalizeBaseUrl(
      config.baseUrl,
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    );
    model = config.modelName || "qwen-vl-max";
  } else if (config.type === AIProviderType.DOUBAO) {
    baseUrl = normalizeBaseUrl(
      config.baseUrl,
      "https://ark.cn-beijing.volces.com/api/v3",
    );
    if (!config.modelName?.trim()) {
      throw new Error(
        "豆包需要配置推理接入点ID (ep-xxxxxxxxxx)，请在火山引擎 Ark 控制台创建接入点后填写。",
      );
    }
    model = config.modelName.trim();
    includeResponseFormat = false;
  } else {
    baseUrl = normalizeBaseUrl(config.baseUrl, "https://api.openai.com/v1");
  }

  const isBuiltIn = Object.values(AIProviderType).includes(
    config.type as AIProviderType,
  );
  // Built-in clouds always need a key; self-hosted custom endpoints may not.
  if (!config.apiKey && isBuiltIn) {
    throw new Error(
      `当前使用的服务商（${config.type}）未填写 API Key，请在设置中填写后重试。`,
    );
  }
  if (!baseUrl) throw new Error("接口地址 (Base URL) 未设置");

  let result = await callChatCompletion(
    baseUrl,
    config.apiKey,
    buildChatRequestBody(base64Image, model, prompt, includeResponseFormat),
  );

  // Some gateways reject `response_format`; retry once without it.
  if (!result.ok && includeResponseFormat) {
    const failure = describeCallFailure(result, baseUrl);
    if (/response_format|json_object|unsupported|not support/i.test(failure)) {
      console.warn(
        "AI provider rejected response_format, retrying without it:",
        failure,
      );
      result = await callChatCompletion(
        baseUrl,
        config.apiKey,
        buildChatRequestBody(base64Image, model, prompt, false),
      );
    }
  }

  if (!result.ok) {
    console.error("AI API Error Response:", result.status, result.rawText);
    throw new Error(describeCallFailure(result, baseUrl));
  }

  const content =
    extractAssistantText(result.payload) ?? extractFromSSE(result.rawText);

  if (!content || !content.trim()) {
    console.error("AI API returned no assistant text:", result.rawText);
    const hint = errorMessageFromPayload(result.payload);
    throw new Error(
      hint
        ? `AI 返回错误：${hint}`
        : `AI 返回内容为空或格式无法识别。原始响应：${snippet(result.rawText)}`,
    );
  }

  return cleanAndParseJSON(content);
}

/**
 * Test AI Configuration
 */
export const testAIConfig = async (
  config: ActiveProviderConfig,
): Promise<boolean> => {
  const testPrompt = "请回复'测试成功'，仅回复这四个字，不要有任何其他内容。";

  try {
    if (config.type === AIProviderType.GEMINI) {
      if (!config.apiKey) throw new Error("API Key 未设置");
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const model = config.modelName || "gemini-2.0-flash";
      const result = await ai.models.generateContent({
        model: model,
        contents: testPrompt,
      });
      if (!result.text) throw new Error("Gemini 返回为空");
      return true;
    } else {
      let baseUrl = config.baseUrl;
      let model = config.modelName || "gpt-4o";

      if (config.type === AIProviderType.QWEN) {
        baseUrl =
          baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1";
        model = config.modelName || "qwen-vl-max";
      } else if (config.type === AIProviderType.DOUBAO) {
        baseUrl = baseUrl || "https://ark.cn-beijing.volces.com/api/v3";
        model = config.modelName || "doubao-1-5-pro-32k-250115";
      }

      const isBuiltIn = Object.values(AIProviderType).includes(
        config.type as AIProviderType,
      );
      // Local / self-hosted gateways need no API key.
      if (!config.apiKey && isBuiltIn) {
        throw new Error(
          `当前测试的服务商（${config.type}）未填写 API Key，请先在配置中填写。`,
        );
      }

      let requestBody;
      if (config.type === AIProviderType.DOUBAO) {
        requestBody = {
          model: model,
          messages: [
            { role: "user", content: [{ type: "text", text: testPrompt }] },
          ],
        };
      } else {
        requestBody = {
          model: model,
          messages: [
            { role: "system", content: testPrompt },
            { role: "user", content: testPrompt },
          ],
        };
      }

      const result = await callChatCompletion(
        normalizeBaseUrl(
          baseUrl,
          config.type === AIProviderType.QWEN
            ? "https://dashscope.aliyuncs.com/compatible-mode/v1"
            : "https://api.openai.com/v1",
        ),
        config.apiKey,
        requestBody,
      );

      if (!result.ok) {
        throw new Error(describeCallFailure(result, baseUrl));
      }

      const content = extractAssistantText(result.payload);
      if (!content) {
        throw new Error(
          `AI 返回内容为空或格式无法识别。原始响应：${snippet(result.rawText)}`,
        );
      }
      return true;
    }
  } catch (e) {
    console.error("AI Config Test Failed:", e);
    throw new Error(`AI 配置测试失败: ${(e as Error).message}`);
  }
};

/**
 * Universal Entry Point
 */
export const analyzeQuestionImage = async (
  base64Image: string,
  config: ActiveProviderConfig,
): Promise<GeminiAnalysisResponse> => {
  const finalPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const prompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  console.log("AI Config:", {
    ...config,
    systemPrompt: config.systemPrompt ? "Custom" : "Default",
    usedPromptPrefix: prompt.slice(0, 50) + "...",
  });

  // Compress image before sending to AI to reduce latency
  const compressedImage = await compressImage(base64Image);

  try {
    if (config.type === AIProviderType.GEMINI) {
      return await analyzeWithGemini(compressedImage, config, finalPrompt);
    } else {
      return await analyzeWithOpenAICompatible(
        compressedImage,
        config,
        finalPrompt,
      );
    }
  } catch (e) {
    console.error("AI Analysis Failed:", e);
    const message =
      e instanceof Error && e.message ? e.message : "未知错误";
    // Keep the provider's actual message so the user can act on it
    // (e.g. 余额不足 / 模型不支持图片) instead of a generic hint.
    throw new Error(`识别失败：${message}`);
  }
};
