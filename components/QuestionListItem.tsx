
import React from 'react';
import { Question } from '../types';
import LaTeXRenderer from './LaTeXRenderer';

interface QuestionListItemProps {
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

const QuestionListItem: React.FC<QuestionListItemProps> = ({ 
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
  const handleStarClick = (e: React.MouseEvent, rating: number) => {
    e.stopPropagation();
    onUpdateDifficulty?.(question.id, rating);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.();
  };

  const handleKpClick = (e: React.MouseEvent, kp: string) => {
    e.stopPropagation();
    onSelectKnowledgePoint?.(kp);
  };

  return (
    <tr 
      className={`group hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`}
      onClick={() => onView?.(question)}
    >
      <td className="px-6 py-4 text-center">
        <div 
          onClick={handleSelect}
          className={`w-5 h-5 mx-auto rounded border-2 flex items-center justify-center transition-all ${
            isSelected 
              ? 'bg-indigo-600 border-indigo-600' 
              : 'bg-white border-slate-300 hover:border-indigo-400'
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase whitespace-nowrap">
          {question.subject}
        </span>
      </td>
      <td className="px-6 py-4 min-w-[200px]">
        <div className="text-sm text-slate-700 line-clamp-1 max-w-md">
          <LaTeXRenderer content={question.content} className="inline" />
        </div>
        <div className="mt-1 flex gap-2">
            {!isTrashMode && question.lastReviewedAt && (
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-sm font-bold uppercase tracking-widest">
                已复习
              </span>
            )}
            {isTrashMode && (
               <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-sm font-bold uppercase tracking-widest">
                已删除：{new Date(question.deletedAt || 0).toLocaleDateString()}
              </span>
            )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {question.knowledgePoints.slice(0, 2).map((kp, idx) => (
            <button 
              key={idx}
              onClick={(e) => handleKpClick(e, kp)}
              className="text-[10px] px-1.5 py-0.5 bg-white text-slate-500 rounded border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              #{kp}
            </button>
          ))}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-0.5 text-amber-400">
          {[...Array(5)].map((_, i) => (
            <button key={i} onClick={(e) => handleStarClick(e, i + 1)} className="focus:outline-none hover:scale-125 transition-transform">
              <svg className={`w-3.5 h-3.5 ${i < question.difficulty ? 'fill-current' : 'text-slate-200'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            </button>
          ))}
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
           {isTrashMode ? (
             <>
               <button 
                 onClick={(e) => { e.stopPropagation(); onRestore?.(question.id); }}
                 className="text-emerald-500 hover:text-emerald-700"
                 title="恢复"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onDelete?.(question.id); }}
                 className="text-red-400 hover:text-red-600"
                 title="永久删除"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
             </>
           ) : (
             <>
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   onEdit?.(question);
                 }}
                 className="text-slate-400 hover:text-indigo-600"
                 title="编辑"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                 </svg>
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onDelete?.(question.id); }}
                 className="text-slate-400 hover:text-red-500"
                 title="移入回收站"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
             </>
           )}

        </div>
      </td>
    </tr>
  );
};

export default QuestionListItem;
