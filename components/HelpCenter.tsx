
import React, { useState, useRef } from 'react';
import { Subject } from '../types';
import { apiService } from '../services/apiService';

interface HelpCenterProps {
  onClose: () => void;
  onDataChanged?: () => void;
}

const HelpCenter: React.FC<HelpCenterProps> = ({ onClose, onDataChanged }) => {
  const [activeSection, setActiveSection] = useState<'GUIDE' | 'DATA' | 'API'>('GUIDE');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    const jsonString = apiService.exportBackup();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `E-Bu_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('导入操作将覆盖当前所有本地题目数据且不可撤销，确定继续吗？')) {
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await apiService.importBackup(content);
        alert('数据恢复成功！');
        onDataChanged?.();
      } catch (err: any) {
        alert('导入失败: ' + err.message);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const ApiDetail = ({ 
    method, 
    path, 
    desc, 
    params, 
    payload, 
    response 
  }: { 
    method: string, 
    path: string, 
    desc: string,
    params?: string,
    payload?: string,
    response: string 
  }) => (
    <div className="mb-12 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
        <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
          method === 'GET' ? 'bg-blue-600 text-white' : 
          method === 'POST' ? 'bg-emerald-600 text-white' : 
          method === 'PATCH' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
        }`}>{method}</span>
        <code className="text-sm text-slate-800 font-mono font-bold">{path}</code>
      </div>
      <div className="p-6 space-y-6">
        <p className="text-sm text-slate-600 font-medium">{desc}</p>
        
        {params && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Query Parameters</h4>
            <pre className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 border border-slate-100 italic">{params}</pre>
          </div>
        )}

        {payload && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Request Body (JSON)</h4>
            <div className="relative group">
              <pre className="bg-slate-900 p-4 rounded-xl text-xs text-emerald-400 font-mono overflow-x-auto">{payload}</pre>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Response Object</h4>
          <pre className="bg-slate-900 p-4 rounded-xl text-xs text-indigo-300 font-mono overflow-x-auto">{response}</pre>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={onClose}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">E-Bu</h1>
                <div className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-500 flex items-center gap-1">
                  DEVHUB
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">帮助与开发者中心</p>
            </div>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveSection('GUIDE')}
            className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${activeSection === 'GUIDE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            操作指南
          </button>
          <button 
            onClick={() => setActiveSection('DATA')}
            className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${activeSection === 'DATA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            数据管理
          </button>
          <button 
            onClick={() => setActiveSection('API')}
            className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${activeSection === 'API' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            后端 API
          </button>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar Nav */}
        <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-6 overflow-y-auto hidden md:block">
          <nav className="space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">核心指南</h3>
              <ul className="space-y-3 text-sm font-medium text-slate-600">
                <li onClick={() => setActiveSection('GUIDE')} className="hover:text-indigo-600 cursor-pointer flex items-center gap-2">识别题目流程</li>
                <li onClick={() => setActiveSection('GUIDE')} className="hover:text-indigo-600 cursor-pointer flex items-center gap-2">LaTeX 公式规范</li>
              </ul>
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">数据与导出</h3>
              <ul className="space-y-3 text-sm font-medium text-slate-600">
                <li onClick={() => setActiveSection('DATA')} className="hover:text-indigo-600 cursor-pointer flex items-center gap-2">本地数据库备份</li>
                <li onClick={() => setActiveSection('DATA')} className="hover:text-indigo-600 cursor-pointer flex items-center gap-2">数据迁移说明</li>
              </ul>
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">API 参考</h3>
              <ul className="space-y-3 text-sm font-medium text-slate-600">
                <li onClick={() => setActiveSection('API')} className="hover:text-indigo-600 cursor-pointer flex items-center gap-2">错题管理接口</li>
                <li onClick={() => setActiveSection('API')} className="hover:text-indigo-600 cursor-pointer flex items-center gap-2">AI 分析接口</li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
          <div className="max-w-4xl mx-auto">
            {activeSection === 'GUIDE' ? (
              <div className="prose prose-slate max-w-none">
                <h1 className="text-3xl font-black text-slate-800 mb-6">操作指南</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold mb-4">1</div>
                    <h3 className="text-lg font-bold text-indigo-900 mb-2">拍照录入</h3>
                    <p className="text-sm text-indigo-700/80 leading-relaxed">系统支持多图上传。AI 会通过 OCR 和语义理解自动区分题干、选项和解析。</p>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold mb-4">2</div>
                    <h3 className="text-lg font-bold text-emerald-900 mb-2">精炼图例</h3>
                    <p className="text-sm text-emerald-700/80 leading-relaxed">点击题目详情的"提取图例"，可手动框选图片中的关键几何图或实验仪器图。此图将永久显示在导出练习册中。</p>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-800 mb-4">AI 服务商配置</h2>
                <p className="text-sm text-slate-600 mb-4">系统支持多个 AI 服务商，每个服务商配置独立保存，可随时切换：</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                      <h4 className="font-bold text-slate-800">Google Gemini</h4>
                    </div>
                    <p className="text-xs text-slate-500">推荐，支持结构化 JSON 输出。默认模型：gemini-2.0-flash</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-red-500"></div>
                      <h4 className="font-bold text-slate-800">通义千问</h4>
                    </div>
                    <p className="text-xs text-slate-500">阿里多模态模型。默认模型：qwen-vl-max</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500"></div>
                      <h4 className="font-bold text-slate-800">豆包</h4>
                    </div>
                    <p className="text-xs text-slate-500">字节多模态模型。需配置火山引擎 Ark 接入点 ID (ep-xxx)</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600"></div>
                      <h4 className="font-bold text-slate-800">OpenAI / 兼容</h4>
                    </div>
                    <p className="text-xs text-slate-500">自定义 API，兼容 OpenAI 格式的接口。默认模型：gpt-4o</p>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-800 mb-4">LaTeX 输入建议</h2>
                <div className="bg-slate-900 p-6 rounded-2xl text-emerald-400 font-mono text-sm leading-relaxed mb-12">
                  <p className="text-slate-500 mb-2">// 推荐使用双反斜杠转义，防止后端解析 JSON 出错</p>
                  {`"content": "已知 $f(x) = \\\\sqrt{{x^2 + 1}}$，求 $f'(x)$"`}
                </div>
              </div>
            ) : activeSection === 'DATA' ? (
              <div className="space-y-10">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 mb-4">数据管理</h1>
                  <p className="text-slate-500">本系统目前默认将数据存储在浏览器的本地存储中。您可以定期导出备份以防止数据丢失。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">导出错题库</h3>
                    <p className="text-sm text-slate-500 mb-8 flex-1">将当前本地库中所有题目（含图片、图例、回收站数据）导出为 JSON 文件。</p>
                    <button 
                      onClick={handleExport}
                      className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      立即导出备份
                    </button>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">恢复备份数据</h3>
                    <p className="text-sm text-slate-500 mb-8 flex-1">上传之前导出的备份文件，恢复您的错题记录。注意：此操作会覆盖当前所有本地数据。</p>
                    <button 
                      onClick={handleImportClick}
                      className="w-full py-3 border-2 border-amber-200 text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-all"
                    >
                      {isImporting ? '恢复中...' : '选择备份文件'}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".json"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-slate-300">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM5.884 6.607a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zm11.314 2.828a1 1 0 11-1.414 0 1 1 0 011.414 0zm-2.828 4.243a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zm-4.243 2.828a1 1 0 100-2v-1a1 1 0 10-2 0v1a1 1 0 100 2zM4.47 14.25a1 1 0 000 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 0zM4 10a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" /></svg>
                    关于数据同步的建议
                  </h4>
                  <p className="text-sm leading-relaxed opacity-80 mb-2">
                    <strong className="text-indigo-300">为什么不同设备数据不一致？</strong><br/>
                    本应用采用纯前端架构（Local-First），所有错题数据均存储在您当前使用的浏览器本地缓存（LocalStorage）中，并未上传至云端数据库。因此，不同设备（如手机和电脑）之间的数据是物理隔离的，无法自动互通。
                  </p>
                  <p className="text-sm leading-relaxed opacity-80">
                    <strong className="text-indigo-300">如何跨设备同步？</strong><br/>
                    请使用上方的“导出错题库”功能生成 JSON 备份文件，发送至新设备，然后在该设备上点击“恢复备份数据”即可。
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-20">
                <div className="mb-10">
                  <h1 className="text-3xl font-black text-slate-800 mb-4">后端 API 接口规范</h1>
                  <p className="text-slate-500">本指南定义了前端应用与后端服务器之间的通讯协议。所有请求均应包含 <code className="bg-slate-100 px-1 rounded">Content-Type: application/json</code>。</p>
                </div>

                <section>
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <span className="w-12 h-[1px] bg-slate-200"></span>
                    错题核心管理
                    <span className="flex-1 h-[1px] bg-slate-200"></span>
                  </h2>

                  <ApiDetail 
                    method="GET" 
                    path="/api/questions" 
                    desc="分页获取错题库。可以通过学科枚举和关键词进行模糊搜索。"
                    params="?subject=数学&query=二次函数&limit=20&offset=0"
                    response={`[
  {
    "id": "uuid-string",
    "subject": "数学",
    "content": "题干内容...",
    "difficulty": 3,
    "createdAt": 1700000000000,
    "knowledgePoints": ["函数", "导数"],
    "image": "url_or_base64"
  },
  ...
]`}
                  />

                  <ApiDetail 
                    method="POST" 
                    path="/api/questions" 
                    desc="保存新识别的错题到数据库。image 字段建议存储拍摄时的原始大图。"
                    payload={`{
  "subject": "物理",
  "content": "一个质量为 $m$ 的物体...",
  "options": ["$A. 10N$", "$B. 20N$"],
  "answer": "A",
  "analysis": "根据牛顿第二定律...",
  "knowledgePoints": ["力学", "牛顿定律"],
  "difficulty": 4,
  "image": "data:image/jpeg;base64,..."
}`}
                    response={`{
  "id": "new-uuid",
  "createdAt": 1709253400000,
  "status": "success"
}`}
                  />
                </section>

                <section>
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <span className="w-12 h-[1px] bg-slate-200"></span>
                    批量数据迁移
                    <span className="flex-1 h-[1px] bg-slate-200"></span>
                  </h2>
                  <ApiDetail 
                    method="POST" 
                    path="/api/backup/import" 
                    desc="用于开发者将本地 JSON 备份文件批量导入到中心数据库。通常在迁移到新系统时使用。"
                    payload={`{
  "version": "1.2.0",
  "data": [ /* 完整的错题数组 */ ]
}`}
                    response={`{ "importedCount": 150, "status": "ok" }`}
                  />
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="h-12 border-t border-slate-100 flex items-center justify-center bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        E-Bu DevHub • 接口文档版本 v1.3.0
      </div>
    </div>
  );
};

export default HelpCenter;
