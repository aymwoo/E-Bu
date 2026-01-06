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

const MATH_SPANS_PATTERN = /\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$(?:\\\$|[^$])*\$/g;

const RAW_LATEX_COMMAND_PATTERN =
  /\\(?:frac|sqrt|times|cdot|pm|leq|geq|neq|approx|pi|theta|sin|cos|tan|log|ln|sum|prod|int|cdots|ldots)\b(?:\s*\{[^{}]*\})?/g;

const RAW_FRAC_PATTERN =
  /\\frac\s*\{[^{}]*\}\s*\{[^{}]*\}/g;

const RAW_SIMPLE_EXPR_PATTERN =
  /(?<!\\)\b[A-Za-z0-9]+(?:\^[A-Za-z0-9]+|_\{[^{}]*\}|_[A-Za-z0-9]+)(?:\s*[+\-*/]\s*\d+)?/g;

const RAW_SUPSUB_PATTERN = /(?<!\\)\b[A-Za-z0-9]+(?:\^\{[^{}]*\}|\^[A-Za-z0-9]+|_\{[^{}]*\}|_[A-Za-z0-9]+)+/g;

const looksLikeMathOnly = (s: string): boolean => {
  const trimmed = String(s || "").trim();
  if (!trimmed) return false;

  const hasMathDelimiters =
    trimmed.includes("$$") ||
    /(^|[^\\])\$/.test(trimmed) ||
    trimmed.includes("\\(") ||
    trimmed.includes("\\[");
  if (hasMathDelimiters) return false;

  if (/[\u4e00-\u9fff]/.test(trimmed)) return false;

  return (
    RAW_LATEX_COMMAND_PATTERN.test(trimmed) ||
    RAW_SUPSUB_PATTERN.test(trimmed) ||
    /[=+\-*/()<>]/.test(trimmed)
  );
};

const normalizeLatexInText = (input: unknown): string => {
  const raw = String(input ?? "");
  if (!raw.trim()) return raw;

  // Keep existing math spans intact; only wrap raw segments outside them.
  const spans: Array<{ start: number; end: number }> = [];
  for (const m of raw.matchAll(MATH_SPANS_PATTERN)) {
    if (m.index == null) continue;
    spans.push({ start: m.index, end: m.index + m[0].length });
  }

  const isInSpan = (index: number) =>
    spans.some((s) => index >= s.start && index < s.end);

    const addSpan = (start: number, end: number) => {
    spans.push({ start, end });
  };

  const wrapOutsideSpans = (pattern: RegExp, content: string) => {
    return content.replace(pattern, (match, offset: number) => {
      if (isInSpan(offset)) return match;
      if (/^\\[ntr]$/.test(match)) return match;

      const wrapped = `$${match}$`;
      addSpan(offset, offset + wrapped.length);
      return wrapped;
    });
  };

  if (looksLikeMathOnly(raw)) return `$${raw}$`;

  let result = raw;
  // Wrap more specific patterns first to avoid partial wrapping.
  result = wrapOutsideSpans(RAW_FRAC_PATTERN, result);
  result = wrapOutsideSpans(RAW_LATEX_COMMAND_PATTERN, result);
  result = wrapOutsideSpans(RAW_SIMPLE_EXPR_PATTERN, result);
  result = wrapOutsideSpans(RAW_SUPSUB_PATTERN, result);

  return result;
};

const normalizeLatexInOptions = (options: any): string[] => {
  if (!options) return [];
  const arr = Array.isArray(options) ? options : [options];
  return arr.map((opt) =>
    normalizeLatexInText(typeof opt === "string" ? opt : JSON.stringify(opt))
  );
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
        enableLatexAutoFix: true,
      };
      return { ...defaultConfig, ...data };
    } catch (e) {
      console.warn("Could not load remote config, using defaults", e);
      return {
        activeProvider: AIProviderType.GEMINI,
        providers: {},
        customProviders: [],
        enableLatexAutoFix: true,
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
  async fetchQuestions(params?: {
    page?: number;
    pageSize?: number;
    tag?: string;
    q?: string;
    subject?: string;
  }): Promise<
    | Question[]
    | {
        items: Question[];
        total: number;
        page: number;
        pageSize: number;
      }
  > {
    const url = new URL("/api/questions", window.location.origin);
    if (params?.page != null) url.searchParams.set("page", String(params.page));
    if (params?.pageSize != null)
      url.searchParams.set("pageSize", String(params.pageSize));
    if (params?.tag) url.searchParams.set("tag", params.tag);
    if (params?.q) url.searchParams.set("q", params.q);
    if (params?.subject) url.searchParams.set("subject", params.subject);

    const res = await fetch(url.toString().replace(window.location.origin, ""));
    if (!res.ok) throw new Error("Failed to fetch questions");
    const data = await res.json();

    if (Array.isArray(data)) {
      return data
        .map(transformQuestionFromApi)
        .sort(
          (a: Question, b: Question) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return {
      items: (data.items || []).map(transformQuestionFromApi),
      total: Number(data.total) || 0,
      page: Number(data.page) || (params?.page ?? 1),
      pageSize: Number(data.pageSize) || (params?.pageSize ?? 20),
    };
  },

  async fetchTrash(params?: {
    page?: number;
    pageSize?: number;
    tag?: string;
    q?: string;
    subject?: string;
  }): Promise<
    | Question[]
    | {
        items: Question[];
        total: number;
        page: number;
        pageSize: number;
      }
  > {
    const url = new URL("/api/trash", window.location.origin);
    if (params?.page != null) url.searchParams.set("page", String(params.page));
    if (params?.pageSize != null)
      url.searchParams.set("pageSize", String(params.pageSize));
    if (params?.tag) url.searchParams.set("tag", params.tag);
    if (params?.q) url.searchParams.set("q", params.q);
    if (params?.subject) url.searchParams.set("subject", params.subject);

    const res = await fetch(url.toString().replace(window.location.origin, ""));
    if (!res.ok) throw new Error("Failed to fetch trash");
    const data = await res.json();

    if (Array.isArray(data)) {
      return data
        .map(transformQuestionFromApi)
        .sort(
          (a: Question, b: Question) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return {
      items: (data.items || []).map(transformQuestionFromApi),
      total: Number(data.total) || 0,
      page: Number(data.page) || (params?.page ?? 1),
      pageSize: Number(data.pageSize) || (params?.pageSize ?? 20),
    };
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
      content: normalizeLatexInText(data.content || ""),
      options: normalizeLatexInOptions(ensureArray(data.options)),
      knowledgePoints: ensureArray(data.knowledgePoints, ["综合"]),
      subject: String(data.subject || "数学"),
      // Handle array answer (e.g. multiple choice ["A", "B"]) and ensure LaTeX is rendered.
      answer: (() => {
        const raw = Array.isArray(data.answer)
          ? data.answer.join(", ")
          : String(data.answer || "暂无答案");
        return normalizeLatexInText(raw);
      })(),
      analysis: normalizeLatexInText(data.analysis || "暂无解析"),
      learningGuide: normalizeLatexInText(data.learningGuide || "暂无建议"),
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

  // Database migrations
  async getMigrationStatus(): Promise<any> {
    const res = await fetch("/api/db/migrations");
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Failed to get migrations: ${res.status}`);
    }
    return res.json();
  },

  async migrateToLatest(): Promise<any> {
    const res = await fetch("/api/db/migrate", { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Failed to migrate: ${res.status}`);
    }
    return res.json();
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
