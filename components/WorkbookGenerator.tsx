
import React, { useState } from 'react';
import { Question } from '../types';
import LaTeXRenderer from './LaTeXRenderer';

interface WorkbookGeneratorProps {
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
    <div>装 订 线 内 请 勿 答 题</div>
  </div>
);

const WorkbookGenerator: React.FC<WorkbookGeneratorProps> = ({ questions, onClose }) => {
  const [showOriginalImages, setShowOriginalImages] = useState(true);
  const [title, setTitle] = useState("错题练习");

  const printWorkbook = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto flex flex-col print:bg-white print:block">
      {/* Control Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center print:hidden shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex flex-col border-r border-slate-200 pr-6 mr-2">
             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">打印标题设置</span>
             <input 
               type="text"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               className="text-lg font-bold text-slate-800 border-b border-transparent focus:border-indigo-500 hover:border-slate-300 bg-transparent outline-none transition-all w-80 placeholder:text-slate-300"
             />
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
              已选中 {questions.length} 道错题
            </p>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600">
              <input 
                type="checkbox" 
                checked={showOriginalImages} 
                onChange={(e) => setShowOriginalImages(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>显示录入原图</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={printWorkbook} 
            className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            打印 / 导出 PDF
          </button>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex justify-center p-8 print:p-0 print:block">
        <div className="bg-white max-w-[210mm] w-full min-h-[297mm] paper-shadow print:shadow-none print:max-w-none relative print-container">
          <BindingLine />
          
          <div className="pt-12 pb-6 px-12 print:px-4 text-center">
            <h1 className="text-3xl font-serif font-bold tracking-widest text-slate-900">{title}</h1>
            <div className="flex justify-center gap-6 mt-6 text-xs text-slate-500 border-b pb-8">
              <span>生成日期：{new Date().toLocaleDateString()}</span>
              <span>题目总数：{questions.length} 道</span>
              <span>学习之星：⭐⭐⭐⭐⭐</span>
            </div>
          </div>

          <div className="flex flex-col">
            {questions.map((q, i) => (
              <div key={q.id} className="workbook-row border-b border-slate-100 flex flex-row">
                {/* Left Side: Question */}
                <div className="workbook-question w-1/2 p-8 border-r border-slate-100 bg-slate-50/20">
                  <div className="flex items-start gap-4 mb-4">
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-slate-200 text-slate-700 rounded text-xs font-bold">{i + 1}</span>
                    <div className="flex-1">
                      <LaTeXRenderer content={q.content} className="text-sm leading-relaxed text-slate-800" />
                      {q.options && q.options.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 gap-2">
                          {q.options.map((opt, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                              <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                              <LaTeXRenderer content={opt} />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Diagram: ALWAYS show if exists */}
                      {q.croppedDiagram && (
                        <div className="mt-4 flex flex-col items-center">
                          <p className="text-[9px] text-slate-400 mb-1 uppercase tracking-widest font-bold">考点图例：</p>
                          <div className="border border-indigo-100 p-2 rounded-lg bg-white shadow-sm">
                            <img src={q.croppedDiagram} alt="Diagram Legend" className="max-h-56 object-contain" />
                          </div>
                        </div>
                      )}

                      {/* Original Capture: ONLY show if toggled */}
                      {showOriginalImages && q.image && (
                        <div className="mt-4 flex flex-col items-center">
                          <p className="text-[9px] text-slate-400 mb-1 uppercase tracking-widest font-bold opacity-50">拍摄原图：</p>
                          <div className="border border-slate-100 p-2 rounded-lg bg-white/50">
                            <img src={q.image} alt="Original Capture" className="max-h-48 object-contain opacity-80" />
                          </div>
                        </div>
                      )}

                      <div className="mt-6 flex flex-wrap gap-1">
                        {q.knowledgePoints.map((kp, idx) => (
                          <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-white text-slate-400 rounded-full border">#{kp}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Blank Space */}
                <div className="workbook-space w-1/2 p-8 workbook-grid relative">
                  <div className="absolute top-4 right-4 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                    纠错与重演区 / Rework Area
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-12 text-center text-slate-300 text-[10px] print:hidden">
            --- 预览模式仅供参考，打印时将自动对齐并添加网格辅助线 ---
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkbookGenerator;
