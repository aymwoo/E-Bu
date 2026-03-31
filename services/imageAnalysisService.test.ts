import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanAndParseJSON } from "./imageAnalysisService";

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
      invalidJSON.substring(0, 500)
    );
  });
});
