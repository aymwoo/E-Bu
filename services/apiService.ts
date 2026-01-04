import {
  Question,
  GeminiAnalysisResponse,
  AIConfig,
  AIProviderType,
  Subject,
} from "../types";
import { analyzeQuestionImage } from "./imageAnalysisService";

const MOCK_DELAY = 300; // Minimal delay for UX feel if needed

// Helper to transform API/DB format to Frontend format
// The backend returns options/knowledgePoints as JSON strings.
const transformQuestionFromApi = (q: any): Question => {
  return {
    ...q,
    options: q.options
      ? typeof q.options === "string"
        ? JSON.parse(q.options)
        : q.options
      : [],
    knowledgePoints: q.knowledgePoints
      ? typeof q.knowledgePoints === "string"
        ? JSON.parse(q.knowledgePoints)
        : q.knowledgePoints
      : [],
    // Ensure date objects are handled if needed, usually string from JSON is fine
  };
};

export const apiService = {
  // AI Config Management
  async getAIConfig(): Promise<AIConfig> {
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Failed to load config");
      const data = await res.json();

      // If new format
      if (data.configData) {
        return JSON.parse(data.configData);
      }

      // Fallback or legacy format handling (if any)
      const defaultConfig: AIConfig = {
        activeProvider: AIProviderType.GEMINI,
        providers: {},
        customProviders: [],
      };
      return { ...defaultConfig, ...data };
    } catch (e) {
      console.warn("Could not load remote config, using defaults", e);
      return {
        activeProvider: AIProviderType.GEMINI,
        providers: {},
        customProviders: [],
      };
    }
  },

  async saveAIConfig(config: AIConfig): Promise<void> {
    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configData: JSON.stringify(config) }),
      });
    } catch (e) {
      console.error("Failed to save config", e);
      throw e;
    }
  },

  // Helper for internal use or simple syncing (Deprecated but kept for compatibility logic)
  async syncRemoteConfig(): Promise<AIConfig | null> {
    try {
      return await this.getAIConfig();
    } catch {
      return null;
    }
  },

  async getActiveProviderConfig() {
    // This now must be async
    const config = await this.getAIConfig();
    const activeId = config.activeProvider;

    // Check if it's a built-in provider
    if (Object.values(AIProviderType).includes(activeId as AIProviderType)) {
      const providerConfig = config.providers[activeId as AIProviderType] || {};
      return {
        type: activeId,
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        modelName: providerConfig.modelName,
        systemPrompt: config.systemPrompt,
      };
    }

    // Check custom providers
    const customProvider = config.customProviders.find(
      (p) => p.id === activeId
    );
    if (customProvider) {
      return {
        type: customProvider.id,
        apiKey: customProvider.config.apiKey,
        baseUrl: customProvider.config.baseUrl,
        modelName: customProvider.config.modelName,
        systemPrompt: config.systemPrompt,
      };
    }

    return {
      type: AIProviderType.GEMINI,
    };
  },

  // Question Management
  async fetchQuestions(): Promise<Question[]> {
    const res = await fetch("/api/questions");
    if (!res.ok) throw new Error("Failed to fetch questions");
    const data = await res.json();
    return data
      .map(transformQuestionFromApi)
      .sort(
        (a: Question, b: Question) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },

  async fetchTrash(): Promise<Question[]> {
    const res = await fetch("/api/trash");
    if (!res.ok) throw new Error("Failed to fetch trash");
    const data = await res.json();
    return data
      .map(transformQuestionFromApi)
      .sort(
        (a: Question, b: Question) =>
          new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
      );
  },

  async createQuestion(
    data: Omit<Question, "id" | "createdAt">
  ): Promise<Question> {
    // Helper to ensure array
    const ensureArray = (val: any, defaultVal: string[] = []): string[] => {
      if (!val) return defaultVal;
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
          return [val];
        } catch {
          return [val];
        }
      }
      return defaultVal;
    };

    // Sanitize data to satisfy backend requirements
    const payload = {
      ...data,
      content: String(data.content || ""),
      options: ensureArray(data.options),
      knowledgePoints: ensureArray(data.knowledgePoints, ["综合"]),
      subject: String(data.subject || "数学"),
      // Handle array answer (e.g. multiple choice ["A", "B"])
      answer: Array.isArray(data.answer)
        ? data.answer.join(", ")
        : String(data.answer || "暂无答案"),
      analysis: String(data.analysis || "暂无解析"),
      learningGuide: String(data.learningGuide || "暂无建议"),
      difficulty: Number(data.difficulty) || 3,
    };

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Create failed: ${res.status}`);
    }
    const q = await res.json();
    return transformQuestionFromApi(q);
  },

  async updateQuestion(
    id: string,
    updates: Partial<Question>
  ): Promise<Question> {
    const res = await fetch(`/api/questions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Update failed: ${res.status}`);
    }
    const q = await res.json();
    return transformQuestionFromApi(q);
  },

  async deleteQuestion(id: string): Promise<void> {
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete question");
  },

  async restoreQuestion(id: string): Promise<void> {
    const res = await fetch(`/api/questions/${id}/restore`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to restore question");
  },

  async hardDeleteQuestion(id: string): Promise<void> {
    const res = await fetch(`/api/questions/${id}/hard`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to hard delete question");
  },

  // Other utilities
  async getMistakeCount(): Promise<number> {
    const questions = await this.fetchQuestions();
    return questions.length;
  },

  async analyzeImage(
    base64Image: string,
    onProgress?: (stage: string) => void
  ): Promise<GeminiAnalysisResponse> {
    // Note: We need to get config first
    const config = await this.getActiveProviderConfig();
    return analyzeQuestionImage(base64Image, config);
  },

  // Backup utils - Updated to use backend export/import endpoint or just kept as legacy local export logic?
  // User asked for "all API", so we should use /api/export if available.
  // Backend has /api/export and /api/import.

  async exportBackup(): Promise<void> {
    window.open("/api/export", "_blank");
    // Or fetch and download blob
  },

  async importBackup(jsonString: string): Promise<void> {
    // Backend expects { data: [...] } structure
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error("Invalid JSON");
    }

    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });

    if (!res.ok) throw new Error("Failed to import backup");
  },
};
