import { useEffect, useRef } from "react";

export default function LiveHistogram({ imageUrl }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imageUrl) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      return;
    }
    let isCancelled = false;
    const processHistogram = async () => {
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const img = new window.Image();
        img.onload = () => {
          if (isCancelled) return;
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
          URL.revokeObjectURL(url);
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
        img.src = url;
      } catch(e) {}
    };
    processHistogram();
    return () => { isCancelled = true; };
  }, [imageUrl]);

  return (
    <div className="mt-4 border border-cli-border p-2 bg-cli-bg h-24 flex flex-col shrink-0 shadow-inner">
       <div className="text-[10px] text-cli-accent font-bold mb-1 border-b border-cli-border pb-1">LIVE_HISTOGRAM (RGB)</div>
       <div className="flex-1 w-full bg-[#010408] border border-cli-border relative">
         <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={256} height={64}></canvas>
       </div>
    </div>
  );
}