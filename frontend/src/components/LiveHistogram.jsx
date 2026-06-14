import { useEffect, useRef } from "react";

export default function LiveHistogram({ beforeUrl, afterUrl }) {
  const canvasOriginalRef = useRef(null);
  const canvasProcessedRef = useRef(null);

  const processHistogram = async (url, canvasRef, getIsCancelled) => {
    if (!url) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const img = new window.Image();
      img.onload = () => {
        if (getIsCancelled()) return;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128; canvas.height = 128;
        ctx.drawImage(img, 0, 0, 128, 128);
        const data = ctx.getImageData(0, 0, 128, 128).data;

        let r = new Array(256).fill(0), g = new Array(256).fill(0), b = new Array(256).fill(0);
        let maxCount = 0;
        for (let i = 0; i < data.length; i += 4) { r[data[i]]++; g[data[i+1]]++; b[data[i+2]]++; }
        for(let i = 0; i < 256; i++) {
          if(r[i] > maxCount) maxCount = r[i]; if(g[i] > maxCount) maxCount = g[i]; if(b[i] > maxCount) maxCount = b[i];
        }
        URL.revokeObjectURL(objUrl);
        const drawCtx = canvasRef.current?.getContext('2d');
        if(!drawCtx) return;
        const w = drawCtx.canvas.width; const h = drawCtx.canvas.height;
        drawCtx.clearRect(0, 0, w, h);
        drawCtx.globalCompositeOperation = 'lighter';
        const drawLine = (colorArr, colorStyle) => {
          drawCtx.beginPath(); drawCtx.moveTo(0, h);
          for(let i = 0; i < 256; i++) drawCtx.lineTo((i/255)*w, h - (colorArr[i]/maxCount)*h);
          drawCtx.lineTo(w, h); drawCtx.fillStyle = colorStyle; drawCtx.fill();
        };
        drawLine(r, 'rgba(239, 68, 68, 0.6)'); drawLine(g, 'rgba(34, 197, 94, 0.6)'); drawLine(b, 'rgba(59, 130, 246, 0.6)');
      };
      img.src = objUrl;
    } catch(e) {}
  };

  useEffect(() => {
    let isCancelled = false;
    processHistogram(beforeUrl, canvasOriginalRef, () => isCancelled);
    return () => { isCancelled = true; };
  }, [beforeUrl]);

  useEffect(() => {
    let isCancelled = false;
    processHistogram(afterUrl, canvasProcessedRef, () => isCancelled);
    return () => { isCancelled = true; };
  }, [afterUrl]);

  return (
    <div className="mt-4 border border-cli-border p-2 bg-cli-bg flex flex-col shrink-0 shadow-inner">
       <div className="text-[10px] text-cli-accent font-bold mb-2 border-b border-cli-border pb-1">HISTOGRAM_COMPARE (RGB)</div>
       <div className="flex gap-2 h-24">
         <div className="flex-1 bg-[#010408] border border-cli-border relative">
           <span className="absolute top-1 left-1 text-[8px] text-cli-dim z-10 bg-black/50 px-1">ORIGINAL</span>
           <canvas ref={canvasOriginalRef} className="absolute inset-0 w-full h-full" width={128} height={64}></canvas>
         </div>
         <div className="flex-1 bg-[#010408] border border-cli-border relative">
           <span className="absolute top-1 right-1 text-[8px] text-cli-accent z-10 bg-black/50 px-1">PROCESSED</span>
           <canvas ref={canvasProcessedRef} className="absolute inset-0 w-full h-full" width={128} height={64}></canvas>
         </div>
       </div>
    </div>
  );
}