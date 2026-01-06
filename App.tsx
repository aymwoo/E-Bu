
import React, { useState, useEffect } from 'react';

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};
import { Question, Subject, AIConfig } from './types';
import { apiService } from './services/apiService';
import QuestionCard from './components/QuestionCard';
import QuestionListItem from './components/QuestionListItem';
import QuestionDialog from './components/QuestionDialog';
import QuestionEditDialog from './components/QuestionEditDialog';
import LaTeXRenderer from './components/LaTeXRenderer';
import CaptureQuestion from './components/CaptureQuestion';
import TestGenerator from './components/TestGenerator';
import WorkbookGenerator from './components/WorkbookGenerator';
import HelpCenter from './components/HelpCenter';
import SettingsDialog from './components/SettingsDialog';

type MainTab = 'LIBRARY' | 'TRASH';

const App: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [trashQuestions, setTrashQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>('LIBRARY');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'ALL'>('ALL');
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [isGeneratingWorkbook, setIsGeneratingWorkbook] = useState(false);
  const [isShowingHelp, setIsShowingHelp] = useState(false);
  const [isShowingSettings, setIsShowingSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [viewMode, setViewMode] = useState<'CARD' | 'LIST'>('CARD');

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const raw = window.localStorage.getItem('pageSize');
    const parsed = raw ? Number(raw) : 20;
    if (![10, 20, 50, 100].includes(parsed)) return 20;
    return parsed;
  });
  const [total, setTotal] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);

  useEffect(() => {
    // Initial sync of global AI config
    apiService.syncRemoteConfig();
    apiService.getAIConfig().then(setAiConfig).catch(() => setAiConfig(null));
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab, page, selectedTag, pageSize, debouncedSearchQuery, selectedSubject]);

  useEffect(() => {
    // Switching tabs should reset paging.
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    // Persist paging preference.
    window.localStorage.setItem('pageSize', String(pageSize));
  }, [pageSize]);

  useEffect(() => {
    // Changing filters should reset paging.
    setPage(1);
  }, [selectedTag, debouncedSearchQuery, selectedSubject, pageSize]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'LIBRARY') {
        // Ensure badge count reflects trash, not library.
        const trashRes = await apiService.fetchTrash({ page: 1, pageSize: 1 });
        if (!Array.isArray(trashRes)) setTrashQuestions([]);

        const res = await apiService.fetchQuestions({
          page,
          pageSize,
          tag: selectedTag || undefined,
          q: debouncedSearchQuery || undefined,
          subject: selectedSubject === 'ALL' ? undefined : selectedSubject,
        });
        if (Array.isArray(res)) {
          setQuestions(res);
          setTotal(res.length);
        } else {
          setQuestions(res.items);
          setTotal(res.total);
        }
      } else {
        const res = await apiService.fetchTrash({
          page,
          pageSize,
          tag: selectedTag || undefined,
          q: debouncedSearchQuery || undefined,
          subject: selectedSubject === 'ALL' ? undefined : selectedSubject,
        });

        if (Array.isArray(res)) {
          setTrashQuestions(res);
          setTotal(res.length);
        } else {
          setTrashQuestions(res.items);
          setTotal(res.total);
        }
      }
      setSelectedIds(new Set());
    } catch (e) {
      console.error("Failed to load questions", e);
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = async (qData: Omit<Question, 'id' | 'createdAt'>) => {
    try {
      const newQuestion = await apiService.createQuestion(qData);
      setQuestions(prev => [newQuestion, ...prev]);
      setIsCapturing(false);
      setActiveQuestion(newQuestion);
    } catch (e: any) {
      console.error("Save failed", e);
      alert("保存失败: " + (e.message || "未知错误"));
    }
  };

  const deleteQuestion = async (id: string) => {
    if (window.confirm('确定要将这道错题移入回收站吗？')) {
      try {
        await apiService.deleteQuestion(id);
        setQuestions(prev => prev.filter(q => q.id !== id));
        const q = questions.find(item => item.id === id);
        if (q) setTrashQuestions(prev => [{...q, deletedAt: Date.now()}, ...prev]);
        if (activeQuestion?.id === id) setActiveQuestion(null);
        removeFromSelection(id);
      } catch (e) {
        alert("删除失败");
      }
    }
  };

  const restoreQuestion = async (id: string) => {
    try {
      await apiService.restoreQuestion(id);
      const restored = trashQuestions.find(q => q.id === id);
      setTrashQuestions(prev => prev.filter(q => q.id !== id));
      if (restored) setQuestions(prev => [restored, ...prev]);
      removeFromSelection(id);
    } catch (e) {
      alert("恢复失败");
    }
  };

  const hardDeleteQuestion = async (id: string) => {
    if (window.confirm('永久删除后将无法找回，确定继续吗？')) {
      try {
        await apiService.hardDeleteQuestion(id);
        setTrashQuestions(prev => prev.filter(q => q.id !== id));
        removeFromSelection(id);
      } catch (e) {
        alert("操作失败");
      }
    }
  };

  const removeFromSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateQuestionDifficulty = async (id: string, difficulty: number) => {
    try {
      const updated = await apiService.updateQuestion(id, { difficulty });
      updateQuestionState(id, updated);
    } catch (e) {
      console.error(e);
    }
  };

  const updateQuestionField = (id: string, field: keyof Question, value: any) => {
    const updateFn = (q: Question) => q.id === id ? { ...q, [field]: value } : q;
    setQuestions(prev => prev.map(updateFn));
    setTrashQuestions(prev => prev.map(updateFn));
    if (activeQuestion?.id === id) setActiveQuestion(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateQuestionState = (id: string, updated: Question) => {
    if (activeTab === 'LIBRARY') {
      setQuestions(prev => prev.map(q => q.id === id ? updated : q));
    } else {
      setTrashQuestions(prev => prev.map(q => q.id === id ? updated : q));
    }
    if (activeQuestion?.id === id) setActiveQuestion(updated);
  };

  const currentQuestions = activeTab === 'LIBRARY' ? questions : trashQuestions;

  const filteredQuestions = currentQuestions.filter(q => {
    const matchesSubject = selectedSubject === 'ALL' || q.subject === selectedSubject;
    // Search/tag/subject are applied server-side in paged mode; keep client-side
    // filtering for legacy array responses.
    const matchesSearch =
      !debouncedSearchQuery ||
      q.content.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      q.analysis.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      q.learningGuide.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (q.answer || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (q.diagramDescription || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (q.options || []).some((opt) => opt.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
      q.knowledgePoints.some((kp) => kp.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

    const matchesTag = !selectedTag || q.knowledgePoints.includes(selectedTag);
    return matchesSubject && matchesSearch && matchesTag;
  });

  const getSelectedQuestions = () => {
    return questions.filter(q => selectedIds.has(q.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredQuestions.map(q => q.id);
    const allSelected = allFilteredIds.every(id => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      allFilteredIds.forEach(id => next.delete(id));
    } else {
      allFilteredIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const batchSoftDelete = async () => {
    if (window.confirm(`确定要将选中的 ${selectedIds.size} 道错题移入回收站吗？`)) {
      try {
        await Promise.all(Array.from(selectedIds).map((id: string) => apiService.deleteQuestion(id)));
        loadData();
      } catch (e) { alert("批量操作失败"); }
    }
  };

  const batchHardDelete = async () => {
    if (window.confirm(`永久删除选中的 ${selectedIds.size} 道错题且不可找回，确定吗？`)) {
      try {
        await Promise.all(Array.from(selectedIds).map((id: string) => apiService.hardDeleteQuestion(id)));
        loadData();
      } catch (e) { alert("批量操作失败"); }
    }
  };

  const batchRestore = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map((id: string) => apiService.restoreQuestion(id)));
      loadData();
    } catch (e) { alert("恢复失败"); }
  };

  const handleBatchSave = async (qData: Omit<Question, 'id' | 'createdAt'>) => {
    try {
      const newQuestion = await apiService.createQuestion(qData);
      setQuestions(prev => [newQuestion, ...prev]);
    } catch (e: any) {
      console.error("Batch save failed", e);
      throw new Error(e.message || "保存失败");
    }
  };

  const isAllSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.has(q.id));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 md:px-6 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
          
          {/* Logo Section - Order 1 */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0 order-1" onClick={() => setActiveTab('LIBRARY')}>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">E-Bu</h1>
                <div className="px-1.5 py-0.5 md:px-2 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-500 flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                  AI Enhanced
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">易补，知错能补</p>
            </div>
          </div>

          {/* Search Bar - Order 3 (Mobile) / Order 2 (Desktop) */}
          <div className="w-full md:w-auto md:flex-1 max-w-xl relative order-3 md:order-2">
            <input 
              type="text" 
              placeholder={`在${activeTab === 'LIBRARY' ? '错题库' : '回收站'}中搜索...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 md:pl-10 ${searchQuery ? 'pr-10' : 'pr-4'} py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
                title="清空搜索"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <svg className="w-4 h-4 md:w-5 md:h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Actions - Order 2 (Mobile) / Order 3 (Desktop) */}
          <div className="flex gap-2 md:gap-3 items-center order-2 md:order-3 ml-auto md:ml-0">
            {/* Social Links */}
            <div className="hidden min-[400px]:flex items-center gap-0.5 md:gap-1 mr-1 border-r border-slate-200 pr-2 md:pr-3">
              <a 
                href="https://github.com/aymwoo/E-Bu" 
                target="_blank" 
                rel="noreferrer" 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title="GitHub Repository"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a 
                href="https://gitee.com/aymwoo/E-Bu" 
                target="_blank" 
                rel="noreferrer" 
                className="p-2 rounded-xl hover:bg-red-50 transition-all group"
                title="Gitee Repository"
              >
                <img src="/gitee.ico" alt="Gitee" className="w-6 h-6 object-contain opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>

            <button 
              onClick={() => setIsShowingSettings(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="设置"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <button 
              onClick={() => setActiveTab(activeTab === 'LIBRARY' ? 'TRASH' : 'LIBRARY')}
              className={`relative p-2 rounded-xl border transition-all ${
                activeTab === 'TRASH' 
                ? 'bg-amber-50 border-amber-200 text-amber-600' 
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title={activeTab === 'LIBRARY' ? '回收站' : '返回'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
               {activeTab === 'LIBRARY' && total > 0 && (
                 <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                   {total}
                 </span>
               )}

            </button>

            <button 
              onClick={() => setIsGeneratingTest(true)}
              className="hidden sm:block px-4 py-2 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-100"
            >
              生成试卷
            </button>
            
            <button 
              onClick={() => setIsCapturing(true)}
              className="px-3 md:px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">录入错题</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <div className="mb-8 flex items-center justify-between">
           <div>
               <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                 {activeTab === 'LIBRARY' ? '错题库' : '回收站'}
                 {selectedTag && (
                   <>
                     <span className="text-slate-300 font-light">/</span>
                     <span className="text-sm font-black text-indigo-600">#{selectedTag}</span>
                     <button
                       onClick={() => {
                         setSelectedTag(null);
                         setPage(1);
                       }}
                       className="text-[10px] font-black text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-full px-2 py-1"
                       title="清除标签筛选"
                     >
                       清除
                     </button>
                   </>
                 )}
                 <span className="text-slate-300 font-light">/</span>
                  <span className="text-sm font-bold text-slate-400">{total > 0 ? total : filteredQuestions.length} 道题目</span>

               </h2>

           </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedSubject('ALL');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedSubject === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}
              >
                全部
              </button>
              {Object.values(Subject).map(sub => (
                <button
                  key={sub}
                  onClick={() => {
                    setSelectedSubject(sub);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedSubject === sub ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('CARD')}
                className={`px-3 py-2 text-sm font-bold transition-colors ${
                  viewMode === 'CARD'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="卡片视图"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h7v7H4V6zm9 0h7v7h-7V6zM4 15h7v3H4v-3zm9 0h7v3h-7v-3z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`px-3 py-2 text-sm font-bold transition-colors ${
                  viewMode === 'LIST'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="列表视图"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
              </button>
            </div>

            <button 
              onClick={selectAllFiltered} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                isAllSelected 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isAllSelected ? 'border-white/30 bg-white/20' : 'border-slate-400 bg-transparent'
              }`}>
                {isAllSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {isAllSelected ? '取消全选' : '全选'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">Loading...</div>
        ) : filteredQuestions.length > 0 ? (
          viewMode === 'CARD' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-24">
              {filteredQuestions.map(q => (
                  <QuestionCard 
                    key={q.id} 
                    question={q} 
                    isSelected={selectedIds.has(q.id)}
                    onToggleSelect={() => toggleSelect(q.id)}
                    onDelete={activeTab === 'TRASH' ? hardDeleteQuestion : deleteQuestion}
                    onRestore={restoreQuestion}
                    onView={setActiveQuestion}
                    onEdit={setEditingQuestion}
                    onUpdateDifficulty={updateQuestionDifficulty}
                    onSelectKnowledgePoint={(kp) => {
                      setSelectedTag(kp);
                      setPage(1);
                      setActiveTab('LIBRARY');
                    }}
                    isTrashMode={activeTab === 'TRASH'}
                  />

              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-center">选择</th>
                      <th className="px-6 py-4">科目</th>
                      <th className="px-6 py-4">题目</th>
                      <th className="px-6 py-4">知识点</th>
                      <th className="px-6 py-4">难度</th>
                      <th className="px-6 py-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuestions.map(q => (
                      <QuestionListItem
                        key={q.id}
                        question={q}
                        isSelected={selectedIds.has(q.id)}
                        onToggleSelect={() => toggleSelect(q.id)}
                        onDelete={activeTab === 'TRASH' ? hardDeleteQuestion : deleteQuestion}
                        onRestore={restoreQuestion}
                        onView={setActiveQuestion}
                        onEdit={setEditingQuestion}
                        onUpdateDifficulty={updateQuestionDifficulty}
                        onSelectKnowledgePoint={(kp) => {
                          setSelectedTag(kp);
                          setPage(1);
                          setActiveTab('LIBRARY');
                        }}
                        isTrashMode={activeTab === 'TRASH'}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-24">暂无题目</div>
        )}

        {!isLoading && (
          <div className="flex items-center justify-between gap-4 mt-6 pb-6">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
              <span>
                第 {page} / {Math.max(1, Math.ceil(total / pageSize))} 页，共 {total} 道
              </span>
              <label className="flex items-center gap-2">
                <span>每页</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) || 20)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || total <= pageSize}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  page <= 1
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                上一页
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(Math.max(1, Math.ceil(total / pageSize)), p + 1))
                }
                disabled={page >= Math.max(1, Math.ceil(total / pageSize)) || total <= pageSize}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  page >= Math.max(1, Math.ceil(total / pageSize))
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </main>


      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <span className="text-sm font-bold">已选中 {selectedIds.size} 道</span>
          
          {activeTab === 'LIBRARY' ? (
            <>
              <button onClick={() => setIsGeneratingWorkbook(true)} className="px-4 py-2 bg-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20">打印练习册</button>
              <button onClick={batchSoftDelete} className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">移入回收站</button>
            </>
          ) : (
            <>
              <button onClick={batchRestore} className="px-4 py-2 bg-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20">恢复题目</button>
              <button onClick={batchHardDelete} className="px-4 py-2 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl transition-colors">彻底删除</button>
            </>
          )}
        </div>
      )}

      {isCapturing && (
        <CaptureQuestion
          onQuestionSaved={handleBatchSave}
          onCancel={() => {
            setIsCapturing(false);
            loadData();
          }}
        />
      )}
      {activeQuestion && (
        <QuestionDialog 
          question={activeQuestion} 
          onClose={() => setActiveQuestion(null)} 
          onUpdateDifficulty={updateQuestionDifficulty}
          onUpdateField={updateQuestionField}
        />
      )}
      {editingQuestion && (
        <QuestionEditDialog
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={(updated) => {
            updateQuestionState(updated.id, updated);
            if (activeQuestion?.id === updated.id) setActiveQuestion(updated);
          }}
        />
      )}
      {isGeneratingTest && <TestGenerator questions={questions} onClose={() => setIsGeneratingTest(false)} />}
      {isGeneratingWorkbook && <WorkbookGenerator questions={getSelectedQuestions()} onClose={() => setIsGeneratingWorkbook(false)} />}
      {isShowingHelp && <HelpCenter onClose={() => setIsShowingHelp(false)} onDataChanged={loadData} />}
      {isShowingSettings && (
        <SettingsDialog
          onClose={() => setIsShowingSettings(false)}
          onConfigSaved={(nextConfig) => setAiConfig(nextConfig)}
        />
      )}
    </div>
  );
};

export default App;
