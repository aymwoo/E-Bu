import { describe, expect, it, vi } from "vitest";

import { apiService } from "./apiService";

describe("apiService.createQuestion LaTeX normalization", () => {
  it("wraps raw LaTeX when field is only math", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: "q1",
        createdAt: new Date().toISOString(),
        content: "x",
        options: JSON.stringify([]),
        answer: "x",
        analysis: "x",
        learningGuide: "x",
        knowledgePoints: JSON.stringify(["综合"]),
        subject: "数学",
        difficulty: 3,
      }),
    }));

    // @ts-expect-error test override
    global.fetch = fetchMock;

    await apiService.createQuestion({
      content: "\\sqrt{2}",
      options: ["\\frac{1}{6}"],
      answer: "\\sqrt{2}",
      analysis: "\\sqrt{x^2+1}",
      learningGuide: "\\frac{1}{6}",
      knowledgePoints: ["综合"],
      subject: "数学" as any,
      difficulty: 3,
      image: "",
    } as any);

    expect(fetchMock).toHaveBeenCalled();
    const calls = fetchMock.mock.calls as unknown as Array<any>;
    const init = calls[0][1];
    const body = JSON.parse(init.body);

    expect(body.content).toBe("$\\sqrt{2}$");
    expect(body.answer).toBe("$\\sqrt{2}$");
    expect(body.analysis).toBe("$\\sqrt{x^2+1}$");
    expect(body.learningGuide).toBe("$\\frac{1}{6}$");
    expect(body.options).toEqual(["$\\frac{1}{6}$"]);
  });

  it("does not double-wrap when $...$ already present", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: "q1",
        createdAt: new Date().toISOString(),
        content: "x",
        options: JSON.stringify([]),
        answer: "x",
        analysis: "x",
        learningGuide: "x",
        knowledgePoints: JSON.stringify(["综合"]),
        subject: "数学",
        difficulty: 3,
      }),
    }));

    // @ts-expect-error test override
    global.fetch = fetchMock;

    await apiService.createQuestion({
      content: "$\\sqrt{2}$",
      options: ["A. $\\frac{1}{6}$"],
      answer: "$\\sqrt{2}$",
      analysis: "先写 $\\sqrt{2}$ 再写 $x$",
      learningGuide: "$\\frac{1}{6}$",
      knowledgePoints: ["综合"],
      subject: "数学" as any,
      difficulty: 3,
      image: "",
    } as any);

    expect(fetchMock).toHaveBeenCalled();
    const calls = fetchMock.mock.calls as unknown as Array<any>;
    const init = calls[0][1];
    const body = JSON.parse(init.body);

    expect(body.content).toBe("$\\sqrt{2}$");
    expect(body.answer).toBe("$\\sqrt{2}$");
    expect(body.analysis).toBe("先写 $\\sqrt{2}$ 再写 $x$");
    expect(body.options).toEqual(["A. $\\frac{1}{6}$"]);
  });

  it("wraps raw LaTeX fragments inside mixed text", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: "q1",
        createdAt: new Date().toISOString(),
        content: "x",
        options: JSON.stringify([]),
        answer: "x",
        analysis: "x",
        learningGuide: "x",
        knowledgePoints: JSON.stringify(["综合"]),
        subject: "数学",
        difficulty: 3,
      }),
    }));

    // @ts-expect-error test override
    global.fetch = fetchMock;

    await apiService.createQuestion({
      content: "根据\\sqrt{2}可得x^2+1",
      options: ["选项含\\frac{1}{6}", "换行\\n不要包裹"],
      answer: "x_1+x^2",
      analysis: "先算\\sqrt{2}再算x_1",
      learningGuide: "保持 $x$ 不变",
      knowledgePoints: ["综合"],
      subject: "数学" as any,
      difficulty: 3,
      image: "",
    } as any);

    expect(fetchMock).toHaveBeenCalled();
    const calls = fetchMock.mock.calls as unknown as Array<any>;
    const init = calls[0][1];
    const body = JSON.parse(init.body);

    expect(body.content).toBe("根据$\\sqrt{2}$可得$x^2+1$");
    expect(body.analysis).toBe("先算$\\sqrt{2}$再算$x_1$");
    expect(body.answer).toBe("$x_1+x^2$");
    expect(body.learningGuide).toBe("保持 $x$ 不变");
    expect(body.options).toEqual(["选项含$\\frac{1}{6}$", "换行\\n不要包裹"]);
  });
});
