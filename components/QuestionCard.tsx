
import React, { useState } from 'react';
import { Question } from '../types';
import LaTeXRenderer from './LaTeXRenderer';

interface QuestionCardProps {
  question: Question;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onView?: (question: Question) => void;
  onEdit?: (question: Question) => void;
  onUpdateDifficulty?: (id: string, difficulty: number) => void;
  onSelectKnowledgePoint?: (kp: string) => void;
  isTrashMode?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  isSelected = false,
  onToggleSelect,
  onDelete, 
  onRestore,
  onView, 
  onEdit,
  onUpdateDifficulty,
  onSelectKnowledgePoint,
  isTrashMode = false
}) => {
  const [isKpExpanded, setIsKpExpanded] = useState(false);
  const [showDiagramDesc, setShowDiagramDesc] = useState(false);
  const KP_DISPLAY_THRESHOLD = 4;

  const handleStarClick = (e: React.MouseEvent, rating: number) => {
    e.stopPropagation();
    onUpdateDifficulty?.(question.id, rating);
  };

  const handleKpClick = (e: React.MouseEvent, kp: string) => {
    e.stopPropagation();
    onSelectKnowledgePoint?.(kp);
  };

  const toggleKpExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsKpExpanded(!isKpExpanded);
  };

  const toggleDiagramDesc = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDiagramDesc(!showDiagramDesc);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.();
  };

  const kps = Array.isArray(question.knowledgePoints) ? question.knowledgePoints : [];

  const displayedKps = isKpExpanded 
    ? kps 
    : kps.slice(0, KP_DISPLAY_THRESHOLD);
  
  const hasMoreKps = kps.length > KP_DISPLAY_THRESHOLD;

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all flex flex-col h-full group relative cursor-pointer ${
        isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
      }`}
      onClick={() => onView?.(question)}
    >
      {/* Select Checkbox Overlay */}
      <div 
        className={`absolute top-2 right-2 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
          isSelected 
            ? 'bg-indigo-600 border-indigo-600 scale-110' 
            : 'bg-white/80 border-slate-300 opacity-0 group-hover:opacity-100 hover:border-indigo-400 backdrop-blur-sm'
        }`}
        onClick={handleSelect}
      >
        {isSelected && (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {question.image && (
        <div className="relative h-40 shrink-0 overflow-hidden bg-slate-100 border-b border-slate-100">
          <img src={question.image} alt="Question" className="w-full h-full object-contain" />
          
          {question.diagramDescription && (
            <div className="absolute top-2 left-2 z-10">
              <button 
                onClick={toggleDiagramDesc}
                className={`p-1.5 rounded-lg backdrop-blur-md transition-all border ${
                  showDiagramDesc 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-white/70 text-slate-600 border-white/50 hover:bg-white/90 shadow-sm'
                }`}
                title="查看图片描述"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          )}

          {showDiagramDesc && question.diagramDescription && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200">
              <div className="relative text-white text-xs leading-relaxed max-h-full overflow-y-auto">
                <p className="font-bold mb-1 flex items-center gap-1 opacity-70">识别图解：</p>
                {question.diagramDescription}
                <button onClick={toggleDiagramDesc} className="absolute -top-2 -right-2 p-1 text-white/50 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={`p-4 flex flex-col flex-1 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full uppercase">
            {question.subject}
          </span>
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
              <button
                key={i}
                onClick={(e) => handleStarClick(e, i + 1)}
                className="focus:outline-none hover:scale-110 transition-transform"
              >
                <svg className={`w-4 h-4 ${i < question.difficulty ? 'fill-current' : 'text-slate-200'}`} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-sm text-slate-600 mb-2 line-clamp-2">
          <LaTeXRenderer content={question.content} />
        </div>

        {/* Knowledge Points Area */}
        <div className="mt-auto pt-2 border-t border-slate-50">
          <div className="flex flex-wrap gap-1">
            {displayedKps.map((kp, idx) => (
              <button 
                key={idx} 
                onClick={(e) => handleKpClick(e, kp)}
                className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all focus:outline-none"
              >
                #{kp}
              </button>
            ))}
            {hasMoreKps && (
              <button onClick={toggleKpExpand} className="text-[10px] px-1.5 py-0.5 text-indigo-500 hover:text-indigo-700 font-semibold focus:outline-none">
                {isKpExpanded ? '收起' : `+${question.knowledgePoints.length - KP_DISPLAY_THRESHOLD}`}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-slate-50 mt-4 pt-3">
          <div className="flex items-center gap-2">
            {!isTrashMode && question.lastReviewedAt && (
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold uppercase tracking-widest">
                已复习
              </span>
            )}
            {isTrashMode && (
               <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold uppercase tracking-widest">
                待处理
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isTrashMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(question);
                }}
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="编辑题目"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {isTrashMode ? (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRestore?.(question.id); }}
                  className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                  title="恢复题目"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete?.(question.id); }}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="彻底删除"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete?.(question.id); }}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="移入回收站"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
