
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { AIConfig, AIProviderType, AIProviderConfig, CustomAIProvider } from '../types';
import { DEFAULT_SYSTEM_PROMPT, testAIConfig } from '../services/imageAnalysisService';

interface SettingsDialogProps {
  onClose: () => void;
}

// Color options for custom providers
const CUSTOM_COLORS = [
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-blue-500',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-purple-500',
  'from-lime-500 to-green-500',
  'from-red-500 to-pink-500',
  'from-teal-500 to-cyan-500',
  'from-fuchsia-500 to-pink-500',
];

const SettingsDialog: React.FC<SettingsDialogProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'AI' | 'PROMPT' | 'ABOUT'>('AI');
  const [config, setConfig] = useState<AIConfig>({ 
    activeProvider: AIProviderType.GEMINI,
    providers: {},
    customProviders: []
  });
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | string>(AIProviderType.GEMINI);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load config on mount
  useEffect(() => {
      const load = async () => {
         try {
            const config = await apiService.getAIConfig();
            setConfig(config);
            setSelectedProvider(config.activeProvider);
         } catch (e) {
            console.error("Failed to load config", e);
            setToast({ type: 'error', message: '加载配置失败，请检查网络' });
         }
      };
      load();
  }, []);

  // Check if selected provider is a custom one
  const isCustomProvider = (id: AIProviderType | string): boolean => {
    return !Object.values(AIProviderType).includes(id as AIProviderType);
  };

  // Get current provider's config
  const getCurrentProviderConfig = (): AIProviderConfig => {
    if (isCustomProvider(selectedProvider)) {
      const custom = config.customProviders?.find(p => p.id === selectedProvider);
      return custom?.config || {};
    }
    return config.providers[selectedProvider as AIProviderType] || {};
  };

  // Update current provider's config
  const updateCurrentProviderConfig = (updates: Partial<AIProviderConfig>) => {
    if (isCustomProvider(selectedProvider)) {
      setConfig(prev => ({
        ...prev,
        customProviders: prev.customProviders.map(p => 
          p.id === selectedProvider 
            ? { ...p, config: { ...p.config, ...updates } }
            : p
        )
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        providers: {
          ...prev.providers,
          [selectedProvider]: {
            ...prev.providers[selectedProvider as AIProviderType],
            ...updates
          }
        }
      }));
    }
  };

  // Select provider for viewing/editing
  const selectProvider = (provider: AIProviderType | string) => {
    setSelectedProvider(provider);
    setTestResult(null);
  };

  // Set selected provider as active
  const setAsActiveProvider = () => {
    setConfig(prev => ({ ...prev, activeProvider: selectedProvider }));
  };

  // Add new custom provider
  const addCustomProvider = () => {
    if (!newCustomName.trim()) return;
    
    const newProvider: CustomAIProvider = {
      id: `custom-${Date.now()}`,
      name: newCustomName.trim(),
      color: CUSTOM_COLORS[config.customProviders.length % CUSTOM_COLORS.length],
      config: {}
    };
    
    setConfig(prev => ({
      ...prev,
      customProviders: [...prev.customProviders, newProvider]
    }));
    
    setNewCustomName('');
    setIsAddingCustom(false);
    setSelectedProvider(newProvider.id);
  };

  // Delete custom provider
  const deleteCustomProvider = (id: string) => {
    if (!window.confirm('确定要删除这个自定义服务商吗？')) return;
    
    setConfig(prev => ({
      ...prev,
      customProviders: prev.customProviders.filter(p => p.id !== id),
      activeProvider: prev.activeProvider === id ? AIProviderType.GEMINI : prev.activeProvider
    }));
    
    if (selectedProvider === id) {
      setSelectedProvider(AIProviderType.GEMINI);
    }
  };

  const handleSave = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setToast(null);

      // Build the active provider config for testing
      let testConfig;
      if (isCustomProvider(config.activeProvider)) {
        const customProvider = config.customProviders.find(p => p.id === config.activeProvider);
        testConfig = {
          type: config.activeProvider,
          apiKey: customProvider?.config.apiKey,
          baseUrl: customProvider?.config.baseUrl,
          modelName: customProvider?.config.modelName,
          systemPrompt: config.systemPrompt
        };
      } else {
        const providerConfig = config.providers[config.activeProvider as AIProviderType] || {};
        testConfig = {
          type: config.activeProvider,
          apiKey: providerConfig.apiKey,
          baseUrl: providerConfig.baseUrl,
          modelName: providerConfig.modelName,
          systemPrompt: config.systemPrompt
        };
      }

      await testAIConfig(testConfig);

      apiService.saveAIConfig(config);
      setToast({ type: 'success', message: '设置已成功保存！' });
      setTestResult({ success: true, message: '配置测试成功！' });

      if (activeTab === 'AI') {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '配置测试失败';
      setTestResult({ success: false, message: errorMessage });
      setToast({ type: 'error', message: `保存失败: ${errorMessage}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      let testConfig;
      if (isCustomProvider(selectedProvider)) {
        const customProvider = config.customProviders.find(p => p.id === selectedProvider);
        testConfig = {
          type: selectedProvider,
          apiKey: customProvider?.config.apiKey,
          baseUrl: customProvider?.config.baseUrl,
          modelName: customProvider?.config.modelName,
          systemPrompt: config.systemPrompt
        };
      } else {
        const providerConfig = config.providers[selectedProvider as AIProviderType] || {};
        testConfig = {
          type: selectedProvider,
          apiKey: providerConfig.apiKey,
          baseUrl: providerConfig.baseUrl,
          modelName: providerConfig.modelName,
          systemPrompt: config.systemPrompt
        };
      }

      await testAIConfig(testConfig);

      setTestResult({ success: true, message: '配置测试成功！' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '配置测试失败';
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  const resetPrompt = () => {
    if (window.confirm('确定要恢复默认提示词吗？这将覆盖您当前的所有修改。')) {
      setConfig({ ...config, systemPrompt: DEFAULT_SYSTEM_PROMPT });
    }
  };

  const builtInProviders = [
    { id: AIProviderType.GEMINI, name: 'Google Gemini', desc: '系统预置，支持结构化输出 (推荐)', color: 'from-blue-500 to-indigo-600' },
    { id: AIProviderType.QWEN, name: '通义千问', desc: '阿里通义千问VL模型', color: 'from-orange-500 to-red-500' },
    { id: AIProviderType.DOUBAO, name: '豆包', desc: '字节豆包多模态模型', color: 'from-purple-500 to-pink-500' },
    { id: AIProviderType.OPENAI, name: 'OpenAI / 兼容', desc: '自定义 API 接口', color: 'from-emerald-500 to-teal-600' },
  ];

  const currentProviderConfig = getCurrentProviderConfig();
  const selectedCustomProvider = config.customProviders?.find(p => p.id === selectedProvider);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[700px]">
        {/* Sidebar */}
        <div className="w-full md:w-48 bg-slate-50 border-r border-slate-100 p-6 flex flex-col">
          <h2 className="text-xl font-black text-slate-800 mb-8 px-2">设置中心</h2>
          <nav className="space-y-2 flex-1">
            <button 
              onClick={() => setActiveTab('AI')}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'AI' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              AI 服务商
            </button>
            <button 
              onClick={() => setActiveTab('PROMPT')}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'PROMPT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              提示词管理
            </button>
            <button 
              onClick={() => setActiveTab('ABOUT')}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'ABOUT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              关于应用
            </button>
          </nav>
          <button onClick={onClose} className="mt-auto px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors">
            关闭窗口
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-white">
          {/* Toast Notification */}
          {toast && (
            <div className={`mb-4 p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
              toast.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {toast.type === 'success' ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-bold text-sm">{toast.message}</span>
              <button 
                onClick={() => setToast(null)} 
                className="ml-auto text-current opacity-50 hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          {activeTab === 'AI' ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">模型引擎配置</h3>
                <p className="text-sm text-slate-500">选择并配置 AI 服务提供商，每个服务商的配置独立保存。</p>
              </div>

              {/* Built-in Provider Selection */}
              <div className="grid grid-cols-2 gap-2">
                {builtInProviders.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectProvider(p.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      selectedProvider === p.id 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-xs`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{p.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{p.desc}</p>
                    </div>
                    {config.activeProvider === p.id && (
                      <div className="text-indigo-600 flex-shrink-0">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Providers Section */}
              {config.customProviders && config.customProviders.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">自定义服务商</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {config.customProviders.map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectProvider(p.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          selectedProvider === p.id 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-xs font-bold`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{p.name}</h4>
                          <p className="text-[10px] text-slate-500 truncate">{p.description || '自定义 OpenAI 兼容接口'}</p>
                        </div>
                        {config.activeProvider === p.id && (
                          <div className="text-indigo-600 flex-shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Custom Provider */}
              {isAddingCustom ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustomName}
                    onChange={e => setNewCustomName(e.target.value)}
                    placeholder="输入服务商名称"
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && addCustomProvider()}
                  />
                  <button
                    onClick={addCustomProvider}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => { setIsAddingCustom(false); setNewCustomName(''); }}
                    className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingCustom(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  添加自定义服务商
                </button>
              )}

              {/* Test Result */}
              {testResult && (
                <div className={`p-4 rounded-2xl border ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    )}
                    {testResult.message}
                  </div>
                </div>
              )}

              {/* Provider Configuration */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700">
                    {isCustomProvider(selectedProvider) 
                      ? selectedCustomProvider?.name 
                      : builtInProviders.find(p => p.id === selectedProvider)?.name
                    } 配置
                  </h4>
                  <div className="flex items-center gap-2">
                    {isCustomProvider(selectedProvider) && (
                      <button 
                        onClick={() => deleteCustomProvider(selectedProvider as string)}
                        className="text-xs bg-rose-100 text-rose-600 px-3 py-1 rounded-full font-bold hover:bg-rose-200 transition-colors"
                      >
                        删除
                      </button>
                    )}
                    {config.activeProvider === selectedProvider ? (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">当前使用</span>
                    ) : (
                      <button 
                        onClick={setAsActiveProvider}
                        className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-bold hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                      >
                        设为当前
                      </button>
                    )}
                  </div>
                </div>
                
                {/* API Key */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">密钥 (API Key)</label>
                  <input
                    type="password"
                    value={currentProviderConfig.apiKey || ''}
                    onChange={e => updateCurrentProviderConfig({ apiKey: e.target.value })}
                    placeholder={
                      selectedProvider === AIProviderType.GEMINI ? 'Google AI API Key' :
                      selectedProvider === AIProviderType.QWEN ? '阿里云API Key' :
                      selectedProvider === AIProviderType.DOUBAO ? '豆包API Key' :
                      'sk-...'
                    }
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-sm"
                  />
                </div>

                {/* Base URL - not needed for Gemini */}
                {selectedProvider !== AIProviderType.GEMINI && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">接口地址 (Base URL)</label>
                    <input
                      type="text"
                      value={currentProviderConfig.baseUrl || ''}
                      onChange={e => updateCurrentProviderConfig({ baseUrl: e.target.value })}
                      placeholder={
                        selectedProvider === AIProviderType.QWEN ? 'https://dashscope.aliyuncs.com/compatible-mode/v1' :
                        selectedProvider === AIProviderType.DOUBAO ? 'https://ark.cn-beijing.volces.com/api/v3' :
                        'https://api.openai.com/v1'
                      }
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-sm"
                    />
                  </div>
                )}

                {/* Model Name */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">模型名称 (Model ID)</label>
                  <input
                    type="text"
                    value={currentProviderConfig.modelName || ''}
                    onChange={e => updateCurrentProviderConfig({ modelName: e.target.value })}
                    placeholder={
                      selectedProvider === AIProviderType.GEMINI ? 'gemini-2.0-flash' :
                      selectedProvider === AIProviderType.QWEN ? 'qwen-vl-max' :
                      selectedProvider === AIProviderType.DOUBAO ? 'ep-xxxxxxxxxx (火山引擎推理接入点ID)' :
                      'gpt-4o'
                    }
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTest}
                  disabled={isTesting}
                  className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? '测试中...' : '测试配置'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isTesting}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? '保存中...' : '保存配置'}
                </button>
              </div>
            </div>
          ) : activeTab === 'PROMPT' ? (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
               <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">AI 提示词管理</h3>
                <p className="text-sm text-slate-500">自定义 AI 如何解析您的题目图片。高级用户可以通过修改此处的 System Prompt 来微调输出风格。</p>
              </div>

              <div className="flex-1 min-h-0 flex flex-col gap-4">
                <div className="flex-1 relative">
                  <textarea 
                    value={config.systemPrompt || DEFAULT_SYSTEM_PROMPT}
                    onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
                    className="w-full h-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed resize-none shadow-inner"
                    placeholder="在此输入系统提示词..."
                  />
                  <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-700 bg-slate-800 px-2 py-1 rounded">SYSTEM_PROMPT</div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                    ⚠️ 注意：提示词必须明确要求 AI 返回符合预定义结构的 JSON 格式，且必须包含题目所需的全部核心字段（如 content, analysis 等），否则系统可能无法正常显示解析结果。
                  </p>
                </div>

                <div className="flex gap-3">
                   <button 
                    onClick={resetPrompt}
                    className="px-6 py-3 border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    恢复默认
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    保存提示词修改
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-2xl font-black text-slate-800">E-Bu v1.3.0</h3>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                致力于为中学生提供最纯粹、最高效的错题管理工具。支持多 AI 服务商（Gemini、通义千问、豆包、OpenAI）智能识别。
              </p>
              <div className="pt-8 flex gap-6">
                <a href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors underline decoration-2 underline-offset-4">用户协议</a>
                <a href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors underline decoration-2 underline-offset-4">隐私政策</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
