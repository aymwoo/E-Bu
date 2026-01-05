import React, { useMemo, useState } from "react";
import { Question } from "../types";
import LaTeXRenderer from "./LaTeXRenderer";
import { apiService } from "../services/apiService";

interface QuestionEditDialogProps {
  question: Question;
  onClose: () => void;
  onSaved?: (updated: Question) => void;
}

const QuestionEditDialog: React.FC<QuestionEditDialogProps> = ({
  question,
  onClose,
  onSaved,
}) => {
  const [content, setContent] = useState(question.content || "");
  const [options, setOptions] = useState<string[]>(() =>
    Array.isArray(question.options) ? question.options.map(String) : []
  );
  const [answer, setAnswer] = useState(question.answer || "");
  const [analysis, setAnalysis] = useState(question.analysis || "");
  const [learningGuide, setLearningGuide] = useState(
    question.learningGuide || ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const canSave = useMemo(() => {
    if (!content.trim()) return false;
    if (!analysis.trim()) return false;
    if (!learningGuide.trim()) return false;
    // options can be empty (e.g. fill-in)
    return true;
  }, [analysis, content, learningGuide]);

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setToast(null);
    try {
      const sanitizedOptions = options
        .map((o) => String(o || "").trim())
        .filter((o) => o.length > 0);

      const updated = await apiService.updateQuestion(question.id, {
        content,
        options: sanitizedOptions,
        answer: answer || undefined,
        analysis,
        learningGuide,
      });

      setToast({ type: "success", message: "保存成功" });
      onSaved?.(updated);

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (e: any) {
      const message = e?.message || "未知错误";
      setToast({ type: "error", message: `保存失败：${message}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b space-y-3">
          {toast && (
            <div
              className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${
                toast.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-auto text-current opacity-50 hover:opacity-100 transition-opacity"
                title="关闭提示"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">编辑题目</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                支持 LaTeX：用 $...$ / $$...$$ 包裹公式
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all hover:text-slate-600"
              title="关闭"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {question.image && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                原始图片
              </div>
              <img
                src={question.image}
                alt="Original"
                className="w-full max-h-48 object-contain rounded-xl bg-white"
              />
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
          {/* Form */}
          <div className="min-h-0 overflow-y-auto p-6 space-y-6">
            <section className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                题干
              </h3>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[140px] p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-y"
                placeholder="输入题目内容（支持 LaTeX）"
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  选项
                </h3>
                <button
                  onClick={addOption}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  添加选项
                </button>
              </div>

              <div className="space-y-2">
                {options.length === 0 && (
                  <div className="text-xs text-slate-400">
                    当前无选项（如填空/问答题可不填）。
                  </div>
                )}
                {options.map((opt, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl"
                  >
                    <div className="w-8 text-sm font-black text-indigo-600 pt-2">
                      {String.fromCharCode(65 + i)}.
                    </div>
                    <textarea
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="flex-1 min-h-[60px] p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-y"
                      placeholder={`选项 ${String.fromCharCode(65 + i)}（支持 LaTeX）`}
                    />
                    <button
                      onClick={() => removeOption(i)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="删除该选项"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                答案
              </h3>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="例如：A 或 3 或 $x=2$"
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                解析
              </h3>
              <textarea
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-y"
                placeholder="输入解析（支持 LaTeX）"
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                复习建议
              </h3>
              <textarea
                value={learningGuide}
                onChange={(e) => setLearningGuide(e.target.value)}
                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-y"
                placeholder="输入复习建议（支持 LaTeX）"
              />
            </section>
          </div>

          {/* Preview */}
          <div className="min-h-0 overflow-y-auto p-6 bg-slate-50 border-l border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                实时预览
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">
                仅预览显示效果
              </span>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  题干
                </div>
                <LaTeXRenderer content={content || "(空)"} className="text-slate-800" />

                {options.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 gap-3">
                    {options.map((opt, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                      >
                        <span className="font-black text-indigo-600 shrink-0">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <LaTeXRenderer
                          content={opt || "(空)"}
                          className="text-sm text-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  答案
                </div>
                <LaTeXRenderer content={answer || "(未填写)"} />
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  解析
                </div>
                <LaTeXRenderer content={analysis || "(空)"} />
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  复习建议
                </div>
                <LaTeXRenderer content={learningGuide || "(空)"} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {canSave ? "" : "题干 / 解析 / 复习建议 不能为空"}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50"
              disabled={isSaving}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "保存中..." : "保存修改"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionEditDialog;
