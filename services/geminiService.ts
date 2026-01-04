
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResponse, Subject } from "../types";

// Always use the API_KEY from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    content: { type: Type.STRING, description: "题干文本，使用 Markdown 和 LaTeX 公式 ($...$)" },
    options: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "如果是选择题，列出选项。选项中的公式也必须使用 LaTeX 格式 ($...$)"
    },
    diagramDescription: { type: Type.STRING, description: "对题目中图示/图解的文字描述，如果没有则为空" },
    answer: { type: Type.STRING, description: "正确答案" },
    analysis: { type: Type.STRING, description: "详细解析步骤，使用 Markdown 和 LaTeX" },
    learningGuide: { type: Type.STRING, description: "学习建议和易错点提醒" },
    knowledgePoints: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "涉及的知识点标签"
    },
    subject: { 
      type: Type.STRING, 
      enum: Object.values(Subject),
      description: "学科分类"
    },
    difficulty: { type: Type.INTEGER, description: "难度评级 (1-5)" }
  },
  required: ["content", "analysis", "knowledgePoints", "subject", "difficulty"],
  propertyOrdering: ["content", "options", "diagramDescription", "answer", "analysis", "learningGuide", "knowledgePoints", "subject", "difficulty"]
};

/**
 * Uses Gemini 3 Pro to analyze question images.
 */
export const analyzeQuestionImage = async (base64Image: string): Promise<GeminiAnalysisResponse> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image
          }
        },
        {
          text: "请识别并分析这张图片中的题目。提取题干、选项、图解描述、答案、详细解析和学习建议。请识别其中所属的学科并给出1-5星的难度建议。\n\n**重要规则：**\n1. 所有公式、数学符号、物理量、化学式、单位等必须使用 LaTeX 格式包装。\n2. **必须**在题干中应用 LaTeX。\n3. **必须**在选项数组（options）中的每一个选项字符串里应用 LaTeX 公式，例如：['$x^2$', '$y=2x$']。\n4. 行内公式使用 $...$，独立行公式使用 $$...$$。\n5. 确保 LaTeX 代码语法正确，无转义错误。"
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_SCHEMA
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    return JSON.parse(text.trim()) as GeminiAnalysisResponse;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("解析失败，请确保图片清晰且包含完整题目。");
  }
};
