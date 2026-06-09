import { useState } from "react";
import { API_BASE_URL } from "../utils/constants";

export default function ExportModal({ 
  isOpen, 
  onClose, 
  originalMedia, 
  stackImage, 
  livePreviewUrl, 
  originalSize, 
  processedSize, 
  addLog 
}) {
  const [exportFormat, setExportFormat] = useState("jpg");
  const [sliderPos, setSliderPos] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  if (!isOpen) return null;

  const handleSliderMove = (clientX, rect) => {
    if (!isDraggingSlider) return;
    let x = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, x))); 
  };

  const handleConfirmExport = async () => {
    const targetUrl = livePreviewUrl || `${API_BASE_URL}/image/${stackImage}`;
    if (!stackImage && !livePreviewUrl) return;
    
    try {
      addLog(`[EXPORT] Processing render as ${exportFormat.toUpperCase()}...`);
      onClose(); 
      const res = await fetch(targetUrl); const blob = await res.blob();
      
      if (exportFormat === 'png') {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
          canvas.toBlob((convertedBlob) => {
            const url = window.URL.createObjectURL(convertedBlob);
            const link = document.createElement("a");
            link.href = url; link.download = `NANOPIX_${Date.now()}.png`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            addLog(`[OK] PNG Export completed.`);
          }, 'image/png');
        };
        img.src = URL.createObjectURL(blob);
      } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = `NANOPIX_${Date.now()}.jpg`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        addLog(`[OK] JPG Export completed.`);
      }
    } catch (error) { addLog(`[ERR] Export failed.`); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl h-[80vh] bg-cli-panel border-2 border-cli-accent flex flex-col shadow-[0_0_40px_rgba(0,0,170,0.3)]">
        <div className="border-b border-cli-accent p-3 flex justify-between items-center bg-cli-bg">
           <span className="text-cli-accent font-bold tracking-widest">&gt; EXPORT_PREVIEW_SYS</span>
           <div className="flex gap-6 text-[10px] font-bold">
              <div className="flex flex-col items-end"><span className="text-cli-dim">ORIGINAL_SIZE</span><span className="text-cli-accent">{originalSize}</span></div>
              <div className="flex flex-col items-end"><span className="text-cli-dim">PROCESSED_SIZE</span><span className="text-green-400">{processedSize}</span></div>
           </div>
           <button onClick={onClose} className="hover:text-red-500 font-bold px-2">X</button>
        </div>
        
        <div className="flex-1 relative bg-[#010408] overflow-hidden cursor-ew-resize select-none" onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onMouseLeave={() => setIsDraggingSlider(false)} onMouseMove={(e) => handleSliderMove(e.clientX, e.currentTarget.getBoundingClientRect())} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} onTouchMove={(e) => handleSliderMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-cli-accent) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          <div className="absolute top-2 left-4 z-50 bg-black/50 text-cli-dim px-2 text-[10px]">ORIGINAL</div>
          <div className="absolute top-2 right-4 z-50 bg-black/50 text-cli-accent px-2 text-[10px]">PROCESSED</div>
          
          {originalMedia && ( <img src={`${API_BASE_URL}/image/${originalMedia}`} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" /> )}
          {(stackImage || livePreviewUrl) && ( <img src={livePreviewUrl ? livePreviewUrl : `${API_BASE_URL}/image/${stackImage}`} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 filter drop-shadow-[0_0_15px_rgba(0,0,170,0.3)]" style={{ clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)` }} /> )}
          
          <div className="absolute top-0 bottom-0 w-[2px] bg-cli-accent z-40 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,170,1)]" style={{ left: `${sliderPos}%` }}><div className="bg-cli-bg border border-cli-accent text-cli-accent text-[8px] font-bold px-1 py-2 rotate-90 shadow-lg">||</div></div>
        </div>

        <div className="p-4 flex justify-between items-center bg-cli-bg border-t border-cli-accent">
           <div className="flex gap-4 items-center">
              <span className="text-cli-dim">FORMAT_OUTPUT:</span>
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="bg-cli-panel border border-cli-border text-cli-accent px-3 py-1.5 outline-none cursor-pointer"><option value="jpg">.JPG (COMPRESSED)</option><option value="png">.PNG (LOSSLESS)</option></select>
           </div>
           <div className="flex gap-3">
             <button onClick={onClose} className="px-6 py-2 border border-cli-border hover:bg-cli-text hover:text-cli-bg transition-colors">CANCEL</button>
             <button onClick={handleConfirmExport} className="bg-cli-accent text-cli-bg px-8 py-2 font-bold hover:bg-white hover:text-black transition-colors shadow-[0_0_15px_rgba(0,0,170,0.5)]">[ START EXPORT ]</button>
           </div>
        </div>
      </div>
    </div>
  );
}