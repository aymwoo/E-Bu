
import React, { useState } from 'react';
import { Question } from '../types';
import LaTeXRenderer from './LaTeXRenderer';

interface TestGeneratorProps {
  questions: Question[];
  onClose: () => void;
}

const BindingLine = () => (
  <div className="binding-line print:flex hidden">
    <div className="punch-hole"></div>
    <div className="punch-hole"></div>
    <div className="punch-hole"></div>
    <div className="punch-hole"></div>
    <div className="punch-hole"></div>
    <div className="absolute top-1/2 left-2 -translate-y-1/2 -rotate-90 text-[10px] text-slate-300 font-bold tracking-[1em] whitespace-nowrap">
      装 订 线 内 请 勿 答 题
    </div>
  </div>
);

const TestGenerator: React.FC<TestGeneratorProps> = ({ questions, onClose }) => {
  const [selectedKps, setSelectedKps] = useState<string[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showAnswersInPrint, setShowAnswersInPrint] = useState(true);

  const allKps: string[] = Array.from(new Set(questions.flatMap((q: Question) => q.knowledgePoints)));

  const toggleKp = (kp: string) => {
    setSelectedKps(prev => 
      prev.includes(kp) ? prev.filter(k => k !== kp) : [...prev, kp]
    );
  };

  const filteredQuestions = questions.filter(q => 
    selectedKps.length === 0 || q.knowledgePoints.some(kp => selectedKps.includes(kp))
  );

  const printTest = () => {
    window.print();
  };

  if (isGenerated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto flex flex-col print:bg-white print:block">
        {/* Preview Control Bar */}
        <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center print:hidden shadow-sm">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-slate-800">试卷预览与打印</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showAnswersInPrint} 
                  onChange={(e) => setShowAnswersInPrint(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>打印包含解析</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsGenerated(false)} 
              className="px-5 py-2 text-slate-600 font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              返回修改
            </button>
            <button 
              onClick={printTest} 
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              打印试卷 (A4)
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Paper Container */}
        <div className="flex-1 flex justify-center p-8 print:p-0 print:block">
          <div className="bg-white max-w-[210mm] w-full min-h-[297mm] paper-shadow print:shadow-none print:max-w-none relative print-container flex flex-col">
            <BindingLine />
            
            <div className="p-12 print:p-4 flex-1">
              <div className="text-center mb-12">
                <h1 className="text-3xl font-serif font-bold mb-4 tracking-widest text-slate-900">中学错题库阶段性诊断自测卷</h1>
                <div className="flex justify-center gap-8 text-sm text-slate-600 mb-8 font-medium">
                  <p>科目：________________</p>
                  <p>姓名：________________</p>
                  <p>学号：________________</p>
                  <p>得分：________________</p>
                </div>
                <div className="border-y-2 border-slate-900 py-2 flex justify-between px-4 text-xs font-bold uppercase tracking-widest">
                  <span>考查范围：{selectedKps.length > 0 ? selectedKps.join('、') : '全部已收录知识点'}</span>
                  <span>试卷编号：{new Date().toISOString().slice(0,10).replace(/-/g,'')}</span>
                </div>
              </div>

              <div className="space-y-10">
                {filteredQuestions.map((q, i) => (
                  <div key={q.id} className="relative pb-6 border-b border-slate-50 last:border-0 break-inside-avoid">
                    <div className="flex items-start gap-4">
                      <span className="text-lg font-bold font-serif shrink-0 w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-md">{i + 1}</span>
                      <div className="flex-1">
                        <div className="mb-4">
                           <LaTeXRenderer content={q.content} className="text-lg text-slate-800 leading-relaxed" />
                        </div>
                        
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6 ml-2">
                            {q.options.map((opt, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <span className="font-bold text-slate-900">{String.fromCharCode(65 + idx)}.</span>
                                <LaTeXRenderer content={opt} className="text-base text-slate-700" />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {q.image && (
                          <div className="my-6 flex justify-center border border-slate-100 p-4 rounded-lg bg-slate-50/50">
                            <img src={q.image} alt="Diagram" className="max-h-80 object-contain" />
                          </div>
                        )}
                        
                        {/* Space for student to write */}
                        <div className="mt-8 border-t border-dashed border-slate-200 pt-16 print:block hidden">
                          <p className="text-[10px] text-slate-300 text-right italic">（此处为答题区）</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredQuestions.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                  <p className="text-lg">未找到符合条件的题目</p>
                  <p className="text-sm">请尝试调整筛选条件</p>
                </div>
              )}
            </div>

            {/* Answer Key - Forced to new page if printing */}
            {showAnswersInPrint && filteredQuestions.length > 0 && (
              <div className="page-break p-12 print:p-4 border-t-8 border-slate-100">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-widest border-b-2 border-slate-900 inline-block pb-2">参考答案及详尽解析</h2>
                </div>
                
                <div className="space-y-12">
                  {filteredQuestions.map((q, i) => (
                    <div key={q.id} className="break-inside-avoid bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                        <span className="font-black text-slate-900">第 {i + 1} 题</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">正确答案:</span>
                          <span className="text-xl font-bold text-indigo-600">{q.answer}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                             <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                             解题思路与过程
                          </p>
                          <div className="text-sm text-slate-700 leading-relaxed">
                            <LaTeXRenderer content={q.analysis} />
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                             <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                             针对性学习建议
                          </p>
                          <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100 italic">
                            <LaTeXRenderer content={q.learningGuide} />
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-2">
                           {q.knowledgePoints.map((kp, idx) => (
                             <span key={idx} className="text-[9px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold">#{kp}</span>
                           ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer for Preview */}
            <div className="mt-auto p-12 text-center text-xs text-slate-400 border-t border-slate-50 print:hidden">
              <p>© 2024 E-Bu 智能错题系统 - 由 Gemini AI 强力驱动</p>
              <p className="mt-1">自动生成的个性化诊断试卷，旨在帮助学生精准查漏补缺</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-8 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">定制诊断试卷</h2>
            <p className="text-sm text-slate-500 mt-1">根据知识点掌握程度，生成专项练习</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 mb-8 space-y-6 scrollbar-hide">
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex justify-between items-center">
              选择复习知识点
              <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full lowercase">
                已选 {selectedKps.length} 个
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {allKps.map((kp: string) => (
                <button 
                  key={kp}
                  onClick={() => toggleKp(kp)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
                    selectedKps.includes(kp) 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                  }`}
                >
                  {kp}
                </button>
              ))}
              {allKps.length === 0 && (
                <div className="w-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
                  题库中还没有知识点标签
                </div>
              )}
            </div>
          </section>

          <section className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-indigo-900 font-bold">试卷规模预测</p>
                   <p className="text-indigo-600 text-xs mt-0.5">基于当前筛选条件的题目总数</p>
                </div>
                <div className="text-3xl font-black text-indigo-600">
                  {filteredQuestions.length} <span className="text-sm font-bold text-indigo-400">题</span>
                </div>
             </div>
          </section>

          <section className="space-y-3">
             <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl text-xs">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>提示：生成的试卷会自动包含标准的装订线和批改区。</span>
             </div>
          </section>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 px-6 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
          >
            取消
          </button>
          <button 
            disabled={filteredQuestions.length === 0}
            onClick={() => setIsGenerated(true)}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            生成并预览
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestGenerator;
