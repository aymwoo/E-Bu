
import React, { useState } from 'react';
import { Question, Subject } from '../types';
import LaTeXRenderer from './LaTeXRenderer';
import ImageCropper from './ImageCropper';
import QuestionEditDialog from './QuestionEditDialog';
import { apiService } from '../services/apiService';

interface QuestionDialogProps {
  question: Question;
  onClose: () => void;
  onUpdateDifficulty?: (id: string, difficulty: number) => void;
  onUpdateField?: (id: string, field: keyof Question, value: any) => void;
}

const QuestionDialog: React.FC<QuestionDialogProps> = ({ 
  question, 
  onClose, 
  onUpdateDifficulty,
  onUpdateField
}) => {
  const [isCropping, setIsCropping] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCropComplete = async (croppedBase64: string) => {
    setIsUpdating(true);
    try {
      await apiService.updateQuestion(question.id, { croppedDiagram: croppedBase64 });
      onUpdateField?.(question.id, 'croppedDiagram', croppedBase64);
      setIsCropping(false);
    } catch (e) {
      alert("更新失败");
    } finally {
      setIsUpdating(false);
    }
  };

  const removeCroppedDiagram = async () => {
    if (!window.confirm('确定要删除已提取的图例吗？')) return;
    setIsUpdating(true);
    try {
      await apiService.updateQuestion(question.id, { croppedDiagram: undefined });
      onUpdateField?.(question.id, 'croppedDiagram', undefined);
    } catch (e) {
      alert("删除失败");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSubject = async (newSubject: string) => {
    setIsUpdating(true);
    try {
      await apiService.updateQuestion(question.id, { subject: newSubject as any });
      onUpdateField?.(question.id, 'subject', newSubject);
    } catch (e) {
      alert("更新科目失败");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTag = async () => {
    const newTag = prompt("请输入新的知识点标签：");
    if (!newTag || !newTag.trim()) return;
    
    // Avoid duplicates
    if (question.knowledgePoints?.includes(newTag.trim())) {
      alert("该标签已存在");
      return;
    }

    const newTags = [...(question.knowledgePoints || []), newTag.trim()];
    setIsUpdating(true);
    try {
      await apiService.updateQuestion(question.id, { knowledgePoints: newTags });
      onUpdateField?.(question.id, 'knowledgePoints', newTags);
    } catch (e) {
      alert("添加标签失败");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!window.confirm(`确定要移除标签 "${tagToRemove}" 吗？`)) return;
    const newTags = (question.knowledgePoints || []).filter(t => t !== tagToRemove);
    setIsUpdating(true);
    try {
      await apiService.updateQuestion(question.id, { knowledgePoints: newTags });
      onUpdateField?.(question.id, 'knowledgePoints', newTags);
    } catch (e) {
      alert("移除标签失败");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 md:px-6 md:py-4 border-b">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <div className="relative group/subject">
                <select 
                  value={question.subject}
                  onChange={(e) => handleUpdateSubject(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1 bg-indigo-600 text-white text-sm rounded-md uppercase shadow-sm outline-none cursor-pointer hover:bg-indigo-700 transition-colors font-bold"
                >
                  {Object.values(Subject).map(s => (
                    <option key={s} value={s} className="text-slate-800 bg-white">{s}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/80">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              错题详情
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 md:space-y-10 scrollbar-hide">
            {/* Question Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">题目详情内容</h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                  title="编辑题目/选项"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑
                </button>
              </div>
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 group relative">
                <LaTeXRenderer content={question.content} className="text-lg leading-relaxed text-slate-800" />
                
                {question.options && question.options.length > 0 && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.options.map((opt, i) => {
                      // Safety check for non-string options (e.g. if AI returns objects)
                      const optContent = typeof opt === 'object' 
                        ? (opt['content'] || opt['text'] || opt['value'] || JSON.stringify(opt)) 
                        : String(opt);
                        
                      return (
                        <div key={i} className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors">
                          <span className="font-black text-indigo-600 shrink-0">{String.fromCharCode(65 + i)}.</span>
                          <LaTeXRenderer content={optContent} className="text-sm text-slate-600" />
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Extracted Diagram Section */}
                {question.croppedDiagram && (
                  <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 relative group/legend">
                    <div className="flex items-center gap-2 mb-3">
                       <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                       <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">已提取的精简图例</span>
                    </div>
                    <div className="flex justify-center bg-white p-4 rounded-xl shadow-sm border border-indigo-50">
                      <img src={question.croppedDiagram} alt="Extracted Legend" className="max-h-64 object-contain" />
                    </div>
                    <button 
                      onClick={removeCroppedDiagram}
                      className="absolute top-4 right-4 p-2 bg-white text-red-500 rounded-lg shadow-sm hover:bg-red-50 transition-colors opacity-0 group-hover/legend:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Original Capture Section */}
                {question.image && (
                  <div className="mt-8 relative group/img">
                    <div className="flex items-center justify-between mb-3">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">原始录入照片</span>
                       <button 
                         onClick={() => setIsCropping(true)}
                         className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                       >
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" />
                         </svg>
                         提取精简图例
                       </button>
                    </div>
                    <div className="flex justify-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[100px] items-center">
                      <img src={question.image} alt="Original Capture" className="max-h-96 object-contain grayscale-[0.3] hover:grayscale-0 transition-all" />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Analysis Section */}
              <section>
                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  精辟解题思路
                </h3>
                <div className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-emerald-100">
                      <span className="text-[10px] font-black text-emerald-400 uppercase mr-1">Correct Answer</span>
                      <span className="text-sm font-black text-emerald-600">{question.answer}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <LaTeXRenderer content={question.analysis} className="text-slate-700 leading-relaxed" />
                  </div>
                </div>
              </section>

              {/* Learning Guide Section */}
              <section>
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  针对性复习建议
                </h3>
                <div className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100">
                  <LaTeXRenderer content={question.learningGuide} className="text-slate-700 leading-relaxed italic" />
                  <div className="mt-8 pt-6 border-t border-indigo-100/50">
                     <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">涉及核心考点 (点击 + 添加)</h4>
                     <div className="flex flex-wrap gap-2">
                       {(Array.isArray(question.knowledgePoints) ? question.knowledgePoints : []).map((kp, i) => (
                         <span key={i} className="group relative px-3 py-1.5 bg-white text-indigo-600 text-xs rounded-xl border border-indigo-200 font-bold shadow-sm pr-7">
                           #{kp}
                           <button 
                             onClick={() => handleRemoveTag(kp)}
                             className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-indigo-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                             title="移除此标签"
                           >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                           </button>
                         </span>
                       ))}
                       <button 
                         onClick={handleAddTag}
                         className="px-3 py-1.5 bg-indigo-50 text-indigo-400 text-xs rounded-xl border border-dashed border-indigo-300 font-bold hover:bg-indigo-100 hover:text-indigo-600 hover:border-indigo-400 transition-all flex items-center gap-1"
                       >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          添加
                       </button>
                     </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="px-8 py-4 bg-slate-50 border-t flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">录入时间</span>
              <span className="text-xs text-slate-500 font-medium">{new Date(question.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">掌握程度标记</span>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => onUpdateDifficulty?.(question.id, i + 1)}
                        className="focus:outline-none hover:scale-125 transition-transform"
                        title={`标记为 ${i + 1} 星掌握`}
                      >
                        <svg className={`w-5 h-5 ${i < question.difficulty ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {isCropping && question.image && (
        <ImageCropper 
          imageSrc={question.image}
          onCropComplete={handleCropComplete}
          onCancel={() => setIsCropping(false)}
        />
      )}

      {isEditing && (
        <QuestionEditDialog
          question={question}
          onClose={() => setIsEditing(false)}
          onSaved={(updated) => {
            onUpdateField?.(question.id, 'content', updated.content);
            onUpdateField?.(question.id, 'options', updated.options || []);
            onUpdateField?.(question.id, 'answer', updated.answer);
            onUpdateField?.(question.id, 'analysis', updated.analysis);
            onUpdateField?.(question.id, 'learningGuide', updated.learningGuide);
          }}
        />
      )}

      {isUpdating && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
             <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
             <p className="text-sm font-bold text-slate-700">正在同步更新数据...</p>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionDialog;
