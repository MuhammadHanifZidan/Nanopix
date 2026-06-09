import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../utils/constants";
import CropOverlay from "./CropOverlay";

export default function Workspace({
  isBakingAnim, isRebuilding, isSyncing, stackImage, livePreviewUrl, imgDims,
  activeTool, toolParams, setToolParams, originalSize, processedSize
}) {
  const [zoom, setZoom] = useState(1);
  const [spinner, setSpinner] = useState('|');

  useEffect(() => {
    if (!isRebuilding && !isBakingAnim) return;
    const chars = ['|', '/', '-', '\\'];
    let i = 0;
    const interval = setInterval(() => { i = (i + 1) % chars.length; setSpinner(chars[i]); }, 100);
    return () => clearInterval(interval);
  }, [isRebuilding, isBakingAnim]);

  return (
    <section className="flex-1 flex flex-col bg-cli-bg relative p-8">
      {/* Background CRT */}
      <div className="crt-background"></div>

      <div className="w-full h-full border border-cli-border bg-[#010408] flex items-center justify-center relative overflow-hidden shadow-inner p-4">
        
        {/* Loading Overlay */}
        {(isBakingAnim || isRebuilding) && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-4xl text-cli-accent mb-4 font-bold">{spinner}</div>
          </div>
        )}

        {(stackImage || livePreviewUrl) ? (
          <div className="relative w-full h-full overflow-auto flex items-center justify-center cursor-grab">
            <div 
              id="crop-wrapper" 
              className="relative flex shrink-0 shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-transform duration-100"
              style={{ 
                aspectRatio: `${imgDims.w} / ${imgDims.h}`,
                transform: `scale(${zoom})` 
              }}
            >
              <img src={livePreviewUrl ? livePreviewUrl : `${API_BASE_URL}/image/${stackImage}`} alt="Workspace" className="w-full h-full block pointer-events-none z-10" />
              {activeTool?.endpoint === 'crop' && (
                <CropOverlay params={toolParams} onChange={(newParams) => setToolParams(prev => ({ ...prev, ...newParams }))} />
              )}
            </div>
          </div>
        ) : (
          <div className="text-cli-dim animate-blink">AWAITING_INPUT_SIGNAL...</div>
        )}
      </div>
      
      {/* Zoom Control */}
      <div className="mt-4 flex justify-between items-center text-[11px] text-cli-dim">
        <div className="flex items-center gap-4">
          <span>ZOOM</span>
          <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(e.target.value)} className="w-32 accent-cli-accent" />
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        <span className="flex gap-4">
          <span>ORIGINAL: <span className="text-cli-accent">{originalSize}</span></span>
          <span>PROCESSED: <span className="text-green-400">{processedSize}</span></span>
        </span>
      </div>
    </section>
  );
}