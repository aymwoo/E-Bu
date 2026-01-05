
import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ 
  imageSrc, 
  onCropComplete, 
  onCancel,
  title = "截取题目图例",
  description = "拖拽鼠标框定需要保留的图示区域"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [displayImageSrc, setDisplayImageSrc] = useState(imageSrc);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  useEffect(() => {
    setDisplayImageSrc(imageSrc);
  }, [imageSrc]);

  const rotateImage = (direction: 'left' | 'right') => {
    const img = new Image();
    img.src = displayImageSrc;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Swap width and height for 90 degree rotation
        canvas.width = img.height;
        canvas.height = img.width;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        const angle = direction === 'left' ? -90 : 90;
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        setDisplayImageSrc(canvas.toDataURL('image/jpeg', 0.9));
        setCropRect(null); // Clear selection
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Check if click target is one of the buttons
    if ((e.target as HTMLElement).closest('button')) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setIsDragging(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setCropRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    
    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(currentPos.x - startPos.x);
    const h = Math.abs(currentPos.y - startPos.y);
    
    if (w > 10 && h > 10) {
      setCropRect({ x, y, w, h });
    }
  };

  const handleSave = () => {
    if (!cropRect || !imgRef.current || !canvasRef.current) return;
    
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate scale factor between display size and natural size
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    canvas.width = cropRect.w * scaleX;
    canvas.height = cropRect.h * scaleY;

    ctx.drawImage(
      img,
      cropRect.x * scaleX,
      cropRect.y * scaleY,
      cropRect.w * scaleX,
      cropRect.h * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    onCropComplete(canvas.toDataURL('image/jpeg', 0.9));
  };

  const rectX = Math.min(startPos.x, currentPos.x);
  const rectY = Math.min(startPos.y, currentPos.y);
  const rectW = Math.abs(currentPos.x - startPos.x);
  const rectH = Math.abs(currentPos.y - startPos.y);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col p-4 md:p-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6 max-w-5xl mx-auto w-full">
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-slate-400 text-sm mt-1">{description}</p>
        </div>
        <div className="flex gap-3">
            <div className="flex items-center bg-slate-800 rounded-xl mr-2 p-1">
                <button 
                  onClick={() => rotateImage('left')}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="向左旋转 90°"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <button 
                  onClick={() => rotateImage('right')}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="向右旋转 90°"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                    </svg>
                </button>
            </div>
            
          <button 
            onClick={onCancel}
            className="px-5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors font-semibold"
          >
            取消
          </button>
          <button 
            disabled={!cropRect && !isDragging}
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-900/20 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            确认截取
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        <div 
          ref={containerRef}
          className="relative max-w-full max-h-full cursor-crosshair select-none touch-none bg-black/40 rounded-lg overflow-hidden border border-white/10"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <img 
            ref={imgRef}
            src={displayImageSrc} 
            alt="To crop" 
            className="max-w-full max-h-[70vh] pointer-events-none"
            onLoad={(e) => {
              // Reset any previous crop if image changes
            }}
          />
          
          {/* Overlay mask */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

          {/* Selection Area */}
          {(isDragging || cropRect) && (
            <div 
              className="absolute border-2 border-indigo-400/60 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-10"
              style={{
                left: rectX,
                top: rectY,
                width: rectW,
                height: rectH
              }}
            >
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-indigo-400/60"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400/60"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-indigo-400/60"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-indigo-400/60"></div>
              
              {cropRect && !isDragging && (
                 <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest shadow-lg">
                   Selected Area
                 </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="max-w-5xl mx-auto w-full mt-6 flex justify-center">
         <div className="flex items-center gap-8 text-slate-500 text-xs font-medium">
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
               <span>拖拽框选</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-slate-500"></span>
               <span>松开确认</span>
            </div>
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
               <span>点击保存</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ImageCropper;
