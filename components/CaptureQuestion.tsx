
import React, { useState, useRef, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { Question } from '../types';
import ImageCropper from './ImageCropper';

interface BatchItem {
  id: string;
  preview: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  error?: string;
  result?: Omit<Question, 'id' | 'createdAt'>;
}

interface CaptureQuestionProps {
  onQuestionSaved: (question: Omit<Question, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}

const CaptureQuestion: React.FC<CaptureQuestionProps> = ({ onQuestionSaved, onCancel }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, // Prefer back camera on mobile
        audio: false 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      // Wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert("无法访问摄像头：您拒绝了权限请求。请在浏览器设置中允许访问摄像头。");
      } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        alert("无法访问摄像头：浏览器安全策略限制非 HTTPS 网站调用摄像头。请使用 localhost 或配置 HTTPS。");
      } else {
        alert(`无法访问摄像头：${err.message || '未知错误'}。请确保设备有摄像头且未被占用。`);
      }
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      closeCamera(); // Close camera stream, move to crop mode
    }
  };

  const handleCroppedPhoto = (croppedImage: string) => {
    const newItem: BatchItem = {
      id: crypto.randomUUID(),
      preview: croppedImage,
      status: 'pending'
    };
    setItems(prev => [...prev, newItem]);
    setCapturedImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Explicitly cast to File[] to ensure the type system recognizes these as Blobs for FileReader.
    // This resolves the error where 'file' might be inferred as 'unknown' in certain environments.
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newItem: BatchItem = {
          id: crypto.randomUUID(),
          preview: reader.result as string,
          status: 'pending'
        };
        setItems(prev => [...prev, newItem]);
      };
      // reader.readAsDataURL requires a Blob (which File inherits from).
      reader.readAsDataURL(file);
    });
    
    // Reset input for same file re-selection if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeItem = (id: string) => {
    if (isProcessing) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const startBatchAnalysis = async () => {
    if (isProcessing) return;
    
    const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'error');
    if (pendingItems.length === 0) return;

    setIsProcessing(true);

    // 顺序处理以防触发 API Rate Limit，也可以根据需要改为并行
    for (const item of pendingItems) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'analyzing', error: undefined } : i));
      
      try {
        const result = await apiService.analyzeImage(item.preview);
        const questionData = {
          image: item.preview,
          ...result
        };
        
        // 标记成功
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done', result: questionData } : i));
        
        // 即时通知 App 保存，这样用户不必等待所有都完成
        await onQuestionSaved(questionData);
      } catch (err: any) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: err.message || '识别失败' } : i));
      }
    }

    setIsProcessing(false);
  };

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    const error = items.filter(i => i.status === 'error').length;
    const analyzing = items.filter(i => i.status === 'analyzing').length;
    return { total, done, error, analyzing };
  }, [items]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-full md:h-auto md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-4 md:px-8 md:py-5 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">批量录入错题</h2>
            <p className="text-xs text-slate-500 mt-0.5">支持多选照片，Gemini 将为您逐一解析</p>
          </div>
          <button 
            onClick={onCancel} 
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-30"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {items.length === 0 ? (
            <div className="h-full flex flex-col md:flex-row gap-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group p-8"
              >
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-slate-700 mb-2">上传照片</p>
                <p className="text-slate-400 text-sm">点击选择或拖拽上传，支持多选</p>
              </div>

              <div 
                onClick={openCamera}
                className="flex-1 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group p-8"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-slate-700 mb-2">拍摄照片</p>
                <p className="text-slate-400 text-sm">使用摄像头直接拍摄并裁剪</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {items.map((item) => (
                <div key={item.id} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                  <img src={item.preview} className={`w-full h-full object-cover transition-all ${item.status === 'analyzing' ? 'scale-110 blur-[2px] opacity-50' : ''}`} />
                  
                  {/* Status Overlays */}
                  {item.status === 'analyzing' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-indigo-600/20">
                      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
                      <span className="text-[10px] text-white font-black uppercase tracking-tighter">AI 分析中</span>
                    </div>
                  )}

                  {item.status === 'done' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/80 animate-in zoom-in duration-300">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/80 p-3 text-center">
                      <svg className="w-8 h-8 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-[10px] text-white font-bold leading-tight">{item.error}</span>
                    </div>
                  )}

                  {/* Remove Button */}
                  {!isProcessing && item.status !== 'done' && (
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {/* Add More Button in Grid */}
              {!isProcessing && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-slate-400 hover:text-indigo-600"
                >
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs font-bold">继续添加</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-4 md:px-8 md:py-6 border-t bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">任务进度</span>
              <div className="flex items-center gap-3 mt-1">
                <div className="text-lg font-black text-slate-700">
                  {stats.done} <span className="text-slate-300">/</span> {stats.total}
                </div>
                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500" 
                    style={{ width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {stats.error > 0 && (
              <div className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-lg uppercase animate-pulse">
                {stats.error} 个任务出错
              </div>
            )}
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-white transition-colors disabled:opacity-50"
            >
              {stats.done === stats.total && stats.total > 0 ? '完成退出' : '取消'}
            </button>
            {stats.done < stats.total && (
              <button 
                onClick={startBatchAnalysis}
                disabled={isProcessing || items.length === 0}
                className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    正在逐一解析...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    开始批量识别
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          multiple
          onChange={handleFileChange} 
        />
      </div>

      {/* Camera View Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="relative flex-1 bg-black">
            <video 
              ref={videoRef}
              autoPlay 
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div className="h-24 bg-black/80 flex items-center justify-between px-8 pb-safe">
            <button 
              onClick={closeCamera}
              className="text-white font-bold p-4"
            >
              取消
            </button>
            <button 
              onClick={takePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 shadow-xl active:scale-95 transition-transform"
            ></button>
            <div className="w-16"></div> {/* Spacer for centering */}
          </div>
        </div>
      )}

      {/* Image Cropper Overlay */}
      {capturedImage && (
        <ImageCropper
          imageSrc={capturedImage}
          onCropComplete={handleCroppedPhoto}
          onCancel={() => {
            setCapturedImage(null);
            // Re-open camera if user cancels crop? 
            // Better to just go back to main view or re-open camera. 
            // Let's re-open camera for continuous shooting experience.
            openCamera(); 
          }}
          title="裁剪题目区域"
          description="请拖动方框选择要识别的题目区域"
        />
      )}
    </div>
  );
};

export default CaptureQuestion;
