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
function cleanAndParseJSON(content: string): GeminiAnalysisResponse {
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
async function analyzeWithOpenAICompatible(
  base64Image: string,
  config: ActiveProviderConfig,
  prompt: string,
): Promise<GeminiAnalysisResponse> {
  let baseUrl = config.baseUrl;
  let model = config.modelName || "gpt-4o";

  if (config.type === AIProviderType.QWEN) {
    baseUrl = baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    model = config.modelName || "qwen-vl-max";
  } else if (config.type === AIProviderType.DOUBAO) {
    baseUrl = baseUrl || "https://ark.cn-beijing.volces.com/api/v3";
    if (!config.modelName?.trim()) {
      throw new Error(
        "豆包需要配置推理接入点ID (ep-xxxxxxxxxx)，请在火山引擎 Ark 控制台创建接入点后填写。",
      );
    }
    model = config.modelName.trim();
  }

  if (!config.apiKey) throw new Error("API Key 未设置");

  let requestBody;
  if (config.type === AIProviderType.QWEN) {
    requestBody = {
      model: model,
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "请解析这张题目图片，并以 JSON 格式输出。" },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };
  } else if (config.type === AIProviderType.DOUBAO) {
    const imageUrl = base64Image.startsWith("data:")
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    requestBody = {
      model: model,
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "请解析这张题目图片，并以 JSON 格式输出。" },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    };
  } else {
    requestBody = {
      model: model,
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "请解析这张题目图片，并以 JSON 格式输出。" },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = "AI 请求失败";
    try {
      const err = await response.json();
      console.error("AI API Error Response:", err);
      // Check for specific Doubao/Vision error
      const rawMsg = err.error?.message || err.message || JSON.stringify(err);
      if (rawMsg.includes("support text") || rawMsg.includes("MultiContent")) {
        errorMessage =
          "该模型似乎不支持图片输入。请确保您在火山引擎/服务商控制台选择了支持视觉(Vision)能力的模型版本。";
      } else {
        errorMessage = rawMsg;
      }
    } catch (e) {
      console.error("AI API Error (Text):", await response.text());
      errorMessage = `HTTP error! status: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = data.choices
    ? data.choices[0].message.content
    : data.result.response;
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

      if (!config.apiKey) throw new Error("API Key 未设置");

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

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "AI 测试请求失败");
      }

      const data = await response.json();
      const hasContent = data.choices
        ? !!data.choices[0]?.message?.content
        : !!data.result?.response;
      return hasContent;
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
    throw new Error("识别失败，请检查 AI 配置或图片清晰度。");
  }
};
