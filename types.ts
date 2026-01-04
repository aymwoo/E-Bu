export enum Subject {
  MATH = "数学",
  PHYSICS = "物理",
  CHEMISTRY = "化学",
  BIOLOGY = "生物",
  ENGLISH = "英语",
  CHINESE = "语文",
  OTHER = "其他",
}

export enum AIProviderType {
  GEMINI = "GEMINI",
  QWEN = "QWEN",
  DOUBAO = "DOUBAO",
  OPENAI = "OPENAI",
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}

// Custom AI provider defined by user
export interface CustomAIProvider {
  id: string;
  name: string;
  color: string; // gradient color class e.g. 'from-pink-500 to-rose-500'
  description?: string;
  config: AIProviderConfig;
}

export interface AIConfig {
  activeProvider: AIProviderType | string; // Built-in type or custom provider ID
  providers: {
    [AIProviderType.GEMINI]?: AIProviderConfig;
    [AIProviderType.QWEN]?: AIProviderConfig;
    [AIProviderType.DOUBAO]?: AIProviderConfig;
    [AIProviderType.OPENAI]?: AIProviderConfig;
  };
  customProviders: CustomAIProvider[]; // User-defined providers
  systemPrompt?: string; // 用户自定义的系统提示词（所有 provider 共享）
}

// Flattened config for the active provider, used by imageAnalysisService
export interface ActiveProviderConfig {
  type: AIProviderType | string;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  systemPrompt?: string;
}

export interface Question {
  id: string;
  image?: string; // 原始拍摄图
  croppedDiagram?: string; // 用户截取的图例
  content: string;
  options?: string[];
  diagramDescription?: string;
  answer?: string;
  analysis: string;
  learningGuide: string;
  knowledgePoints: string[];
  subject: Subject;
  difficulty: number; // 1-5 stars
  createdAt: number;
  lastReviewedAt?: number;
  deletedAt?: number; // 如果存在，则表示在回收站中
}

export interface GeminiAnalysisResponse {
  content: string;
  options: string[];
  diagramDescription: string;
  answer: string;
  analysis: string;
  learningGuide: string;
  knowledgePoints: string[];
  subject: Subject;
  difficulty: number;
}
