import { useState, useEffect } from 'react';

export default function CropOverlay({ params, onChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); 
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startParams, setStartParams] = useState({});

  const startDrag = (e, type) => {
    e.stopPropagation(); e.preventDefault();
    setIsDragging(true); setDragType(type);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setStartPos({ x: clientX, y: clientY });
    setStartParams({ ...params });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - startPos.x;
      const deltaY = clientY - startPos.y;
      
      const wrapper = document.getElementById('crop-wrapper');
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      
      const deltaPctX = (deltaX / rect.width) * 100;
      const deltaPctY = (deltaY / rect.height) * 100;

      let { x_pct: newX, y_pct: newY, w_pct: newW, h_pct: newH } = startParams;

      // BOX DRAGGING (Translasi Kotak) - Bebas baik saat locked maupun freeform
      if (dragType === 'box') {
        newX += deltaPctX; newY += deltaPctY;
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + newW > 100) newX = 100 - newW;
        if (newY + newH > 100) newY = 100 - newH;
      } 
      // RESIZE LOGIC
      else {
        // JIKA RASIO DI-LOCK
        if (params.ratio && params.ratio !== 'FREEFORM') {
          const [rw, rh] = params.ratio.split(':').map(Number);
          const R = rw / rh;
          const K = (rect.width / rect.height) / R;

          let useY = Math.abs(deltaPctY) > Math.abs(deltaPctX);
          let deltaW = 0; let deltaH = 0;
          
          if (useY) {
              if (dragType === 'se' || dragType === 'sw') deltaH = deltaPctY;
              if (dragType === 'ne' || dragType === 'nw') deltaH = -deltaPctY;
              let tempH = startParams.h_pct + deltaH;
              let tempW = tempH / K;
              if (tempW < 5) { tempW = 5; tempH = 5 * K; }
              newH = tempH; newW = tempW;
          } else {
              if (dragType === 'se' || dragType === 'ne') deltaW = deltaPctX;
              if (dragType === 'sw' || dragType === 'nw') deltaW = -deltaPctX;
              let tempW = startParams.w_pct + deltaW;
              let tempH = tempW * K;
              if (tempW < 5) { tempW = 5; tempH = 5 * K; }
              newW = tempW; newH = tempH;
          }

          // Atur koordinat berdasarkan titik tarik (anchor)
          if (dragType === 'nw') {
              newX = startParams.x_pct + startParams.w_pct - newW;
              newY = startParams.y_pct + startParams.h_pct - newH;
          } else if (dragType === 'ne') {
              newY = startParams.y_pct + startParams.h_pct - newH;
          } else if (dragType === 'sw') {
              newX = startParams.x_pct + startParams.w_pct - newW;
          }

          // Pencegahan menembus batas batas layar (menahan ukuran agar rasio tidak rusak)
          if (newX < 0 || newY < 0 || newX + newW > 100 || newY + newH > 100) {
              newX = params.x_pct; newY = params.y_pct; newW = params.w_pct; newH = params.h_pct;
          }
        } 
        // JIKA MODE FREEFORM BEBAS
        else {
          if (dragType === 'nw') {
            newX += deltaPctX; newY += deltaPctY;
            newW -= deltaPctX; newH -= deltaPctY;
          } else if (dragType === 'ne') {
            newY += deltaPctY;
            newW += deltaPctX; newH -= deltaPctY;
          } else if (dragType === 'sw') {
            newX += deltaPctX;
            newW -= deltaPctX; newH += deltaPctY;
          } else if (dragType === 'se') {
            newW += deltaPctX; newH += deltaPctY;
          }

          if (newW < 5) { newW = 5; newX = params.x_pct; } 
          if (newH < 5) { newH = 5; newY = params.y_pct; }

          if (newX < 0) { newW += newX; newX = 0; }
          if (newY < 0) { newH += newY; newY = 0; }
          if (newX + newW > 100) newW = 100 - newX;
          if (newY + newH > 100) newH = 100 - newY;
        }
      }

      onChange({ x_pct: newX, y_pct: newY, w_pct: newW, h_pct: newH, ratio: params.ratio });
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, dragType, startPos, startParams, onChange, params.ratio]);

  if (params.w_pct === undefined) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto">
      {/* Background Mask */}
      <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-[2px]" style={{ height: `${params.y_pct}%` }} />
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[2px]" style={{ top: `${params.y_pct + params.h_pct}%` }} />
      <div className="absolute bg-black/60 backdrop-blur-[2px]" style={{ top: `${params.y_pct}%`, height: `${params.h_pct}%`, left: 0, width: `${params.x_pct}%` }} />
      <div className="absolute bg-black/60 backdrop-blur-[2px]" style={{ top: `${params.y_pct}%`, height: `${params.h_pct}%`, right: 0, left: `${params.x_pct + params.w_pct}%` }} />

      {/* Bounding Box Utama */}
      <div 
        className="absolute border border-cli-accent cursor-move shadow-[0_0_15px_rgba(0,0,170,0.5)] flex items-center justify-center transition-none"
        style={{ left: `${params.x_pct}%`, top: `${params.y_pct}%`, width: `${params.w_pct}%`, height: `${params.h_pct}%` }}
        onMouseDown={(e) => startDrag(e, 'box')} onTouchStart={(e) => startDrag(e, 'box')}
      >
        <div className="w-4 h-[1px] bg-cli-accent/50 absolute"></div>
        <div className="w-[1px] h-4 bg-cli-accent/50 absolute"></div>
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
           <div className="border-r border-b border-cli-accent"></div><div className="border-r border-b border-cli-accent"></div><div className="border-b border-cli-accent"></div>
           <div className="border-r border-b border-cli-accent"></div><div className="border-r border-b border-cli-accent"></div><div className="border-b border-cli-accent"></div>
           <div className="border-r border-cli-accent"></div><div className="border-r border-cli-accent"></div><div></div>
        </div>

        {/* Sudut Handle Resize */}
        <div className="absolute w-5 h-5 bg-cli-accent -top-2.5 -left-2.5 cursor-nwse-resize" onMouseDown={(e) => startDrag(e, 'nw')} onTouchStart={(e) => startDrag(e, 'nw')} />
        <div className="absolute w-5 h-5 bg-cli-accent -top-2.5 -right-2.5 cursor-nesw-resize" onMouseDown={(e) => startDrag(e, 'ne')} onTouchStart={(e) => startDrag(e, 'ne')} />
        <div className="absolute w-5 h-5 bg-cli-accent -bottom-2.5 -left-2.5 cursor-nesw-resize" onMouseDown={(e) => startDrag(e, 'sw')} onTouchStart={(e) => startDrag(e, 'sw')} />
        <div className="absolute w-5 h-5 bg-cli-accent -bottom-2.5 -right-2.5 cursor-nwse-resize" onMouseDown={(e) => startDrag(e, 'se')} onTouchStart={(e) => startDrag(e, 'se')} />
      </div>
    </div>
  );
}