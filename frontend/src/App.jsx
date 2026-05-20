import { useState, useRef, useEffect } from "react";

const API_BASE_URL = "http://localhost:5000/api";

const TOOL_CATEGORIES = {
  COLOR: [
    { id: 'grayscale', label: 'Grayscale', endpoint: 'grayscale', params: [] },
    { id: 'brightness-contrast', label: 'Bright/Contrast', endpoint: 'brightness-contrast', params: [
      { id: 'brightness', label: 'Brightness', type: 'range', min: -100, max: 100, default: 0 },
      { id: 'contrast', label: 'Contrast', type: 'range', min: -100, max: 100, default: 0 }
    ]}
  ],
  TRANSFORM: [
    { id: 'rotate', label: 'Rotate', endpoint: 'rotate', params: [ { id: 'angle', label: 'Angle', type: 'range', min: 0, max: 360, default: 0 } ]},
    { id: 'resize', label: 'Resize', endpoint: 'resize', params: [ { id: 'scale', label: 'Scale (%)', type: 'range', min: 10, max: 400, default: 100 } ]},
    { id: 'flip', label: 'Flip', endpoint: 'flip', params: [ { id: 'direction', label: 'Direction', type: 'select', options: ['horizontal', 'vertical', 'both'], default: 'horizontal' } ]}
  ],
  ENHANCEMENT: [
    { id: 'sharpen', label: 'Sharpen', endpoint: 'sharpen', params: [ { id: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 100, default: 50 } ]},
    { id: 'smooth', label: 'Smooth', endpoint: 'smooth', params: [ { id: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 100, default: 50 } ]},
    { id: 'histeq', label: 'Hist. Equalize', endpoint: 'histeq', params: []}
  ],
  EDGE: [
    { id: 'threshold', label: 'Threshold', endpoint: 'threshold', params: [ { id: 'thresh_value', label: 'Value', type: 'range', min: 0, max: 255, default: 127 }, { id: 'mode', label: 'Mode', type: 'select', options: ['binary', 'binary_inv', 'otsu'], default: 'binary' } ]},
    { id: 'canny', label: 'Canny Edge', endpoint: 'edge/canny', params: [ { id: 'threshold1', label: 'Thresh 1', type: 'range', min: 0, max: 255, default: 100 }, { id: 'threshold2', label: 'Thresh 2', type: 'range', min: 0, max: 255, default: 200 } ]},
    { id: 'sobel', label: 'Sobel', endpoint: 'edge/sobel', params: [ { id: 'direction', label: 'Direction', type: 'select', options: ['x', 'y', 'both'], default: 'both' } ]},
    { id: 'prewitt', label: 'Prewitt', endpoint: 'edge/prewitt', params: []},
    { id: 'robert', label: 'Robert', endpoint: 'edge/robert', params: []},
    { id: 'laplacian', label: 'Laplacian', endpoint: 'edge/laplacian', params: [ { id: 'kernel_size', label: 'Kernel Size', type: 'select', options: [1, 3, 5, 7], default: 3 } ]},
    { id: 'log', label: 'Laplacian of Gaussian', endpoint: 'edge/log', params: [ { id: 'sigma', label: 'Sigma', type: 'range', min: 0.1, max: 5.0, step: 0.1, default: 1.0 } ]},
    { id: 'morphology', label: 'Morphology', endpoint: 'morphology', params: [ { id: 'operation', label: 'Operation', type: 'select', options: ['erosion', 'dilation'], default: 'erosion' }, { id: 'kernel_size', label: 'Kernel Size', type: 'range', min: 3, max: 15, step: 2, default: 3 }, { id: 'iterations', label: 'Iterations', type: 'range', min: 1, max: 5, default: 1 } ]}
  ],
  SEGMENTATION: [
    { id: 'seg_threshold', label: 'Threshold Seg.', endpoint: 'segment/threshold', params: [ { id: 'thresh_value', label: 'Value', type: 'range', min: 0, max: 255, default: 127 }, { id: 'mode', label: 'Mode', type: 'select', options: ['manual', 'otsu'], default: 'otsu' } ]},
    { id: 'seg_edge', label: 'Edge Seg.', endpoint: 'segment/edge', params: [ { id: 'threshold1', label: 'Thresh 1', type: 'range', min: 0, max: 255, default: 50 }, { id: 'threshold2', label: 'Thresh 2', type: 'range', min: 0, max: 255, default: 150 } ]},
    { id: 'seg_region', label: 'Region/K-Means', endpoint: 'segment/region', params: [ { id: 'n_clusters', label: 'Clusters', type: 'range', min: 2, max: 8, default: 3 }, { id: 'min_area', label: 'Min Area', type: 'range', min: 100, max: 5000, step: 100, default: 500 } ]}
  ]
};

const generateId = () => Math.random().toString(36).substring(2, 9);

// =======================================================
// KOMPONEN HISTOGRAM FRONTEND (ZERO-LATENCY)
// =======================================================
const LiveHistogram = ({ imageUrl }) => {
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
        
        const img = new Image();
        img.onload = () => {
          if (isCancelled) return;
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Downscale ukuran jadi 128x128 pixel saja agar proses perhitungan < 1ms
          canvas.width = 128; canvas.height = 128;
          ctx.drawImage(img, 0, 0, 128, 128);
          const data = ctx.getImageData(0, 0, 128, 128).data;

          let r = new Array(256).fill(0), g = new Array(256).fill(0), b = new Array(256).fill(0);
          let maxCount = 0;

          // Hitung distribusi pixel RGB
          for (let i = 0; i < data.length; i += 4) {
            r[data[i]]++; g[data[i+1]]++; b[data[i+2]]++;
          }
          for(let i = 0; i < 256; i++) {
            if(r[i] > maxCount) maxCount = r[i];
            if(g[i] > maxCount) maxCount = g[i];
            if(b[i] > maxCount) maxCount = b[i];
          }

          URL.revokeObjectURL(url);
          const drawCtx = canvasRef.current?.getContext('2d');
          if(!drawCtx) return;
          const w = drawCtx.canvas.width; const h = drawCtx.canvas.height;
          
          drawCtx.clearRect(0, 0, w, h);
          drawCtx.globalCompositeOperation = 'lighter'; // Blend warna tumpang tindih

          const drawLine = (colorArr, colorStyle) => {
            drawCtx.beginPath();
            drawCtx.moveTo(0, h);
            for(let i = 0; i < 256; i++) {
              drawCtx.lineTo((i/255)*w, h - (colorArr[i]/maxCount)*h);
            }
            drawCtx.lineTo(w, h);
            drawCtx.fillStyle = colorStyle;
            drawCtx.fill();
          };

          drawLine(r, 'rgba(239, 68, 68, 0.6)'); // Merah
          drawLine(g, 'rgba(34, 197, 94, 0.6)'); // Hijau
          drawLine(b, 'rgba(59, 130, 246, 0.6)'); // Biru
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
};
// =======================================================


function App() {
  const [originalMedia, setOriginalMedia] = useState(""); 
  const [stackImage, setStackImage] = useState(""); 
  const [livePreviewUrl, setLivePreviewUrl] = useState(null); 
  const [livePreviewFilename, setLivePreviewFilename] = useState(null);   
  
  const [layers, setLayers] = useState([]); 
  const [history, setHistory] = useState([[]]); 
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [progress, setProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);             
  const [isRebuilding, setIsRebuilding] = useState(false);       
  const [isBakingAnim, setIsBakingAnim] = useState(false); 
  
  const [activeTool, setActiveTool] = useState(null);
  const [toolParams, setToolParams] = useState({});
  const [logs, setLogs] = useState(["[SYS] Nanopix v5.0 Pipeline Ready", "[SYS] RGB Histogram module loaded."]);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("jpg");
  const [sliderPos, setSliderPos] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const fileInputRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => { if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  const addLog = (msg) => setLogs((prev) => [...prev, msg].slice(-15));
  const handleParamChange = (id, value) => { setToolParams(prev => ({ ...prev, [id]: value })); };

  const promoteToUploads = async (filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/processed/${filename}`);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("file", new File([blob], `chain_${Date.now()}.jpg`, { type: "image/jpeg" }));
      const uploadRes = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: formData });
      if (uploadRes.ok) { const data = await uploadRes.json(); return data.filename; }
    } catch (error) { console.error("Pipeline chain failed", error); }
    return null;
  };

  useEffect(() => {
    if (!activeTool || !stackImage || isRebuilding) return;
    const abortController = new AbortController();
    const timerId = setTimeout(async () => {
      setIsSyncing(true);
      const payload = { filename: stackImage, ...toolParams };
      try {
        const response = await fetch(`${API_BASE_URL}/process/${activeTool.endpoint}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: abortController.signal
        });
        if (response.ok) {
          const data = await response.json();
          const newUrl = `${API_BASE_URL}/processed/${data.filename}?t=${Date.now()}`;
          setLivePreviewFilename(data.filename); setLivePreviewUrl(newUrl);
        }
      } catch (error) { 
        if (error.name !== 'AbortError') console.error("Proses error:", error);
      } finally { setIsSyncing(false); }
    }, 150); 
    return () => { clearTimeout(timerId); abortController.abort(); };
  }, [toolParams, activeTool, stackImage, isRebuilding]);

  const rebuildPipeline = async (targetLayers) => {
    setIsRebuilding(true); setActiveTool(null); setLivePreviewUrl(null); let currentInput = originalMedia;
    for (const layer of targetLayers) {
      if (!layer.visible) continue;
      const res = await fetch(`${API_BASE_URL}/process/${layer.endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: currentInput, ...layer.params })
      });
      if (res.ok) {
        const data = await res.json();
        const promoted = await promoteToUploads(data.filename);
        if (promoted) currentInput = promoted; else break;
      } else break;
    }
    setStackImage(currentInput); setIsRebuilding(false);
  };

  const handleBakeEffect = async () => {
    if (!livePreviewFilename) return;
    setIsBakingAnim(true);
    const promoted = await promoteToUploads(livePreviewFilename);
    const newLayer = { id: generateId(), label: activeTool.label, endpoint: activeTool.endpoint, params: { ...toolParams }, visible: true };
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newLayers);
    setHistory(updatedHistory); setHistoryIndex(updatedHistory.length - 1);
    setStackImage(promoted); setLivePreviewUrl(null); setActiveTool(null);
    setTimeout(() => setIsBakingAnim(false), 600);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProgress(20);
    const formData = new FormData(); formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: formData });
    if (res.ok) { 
      const d = await res.json(); 
      setOriginalMedia(d.filename); setStackImage(d.filename); 
      setLayers([]); setHistory([[]]); setHistoryIndex(0);
      setActiveTool(null); setLivePreviewUrl(null); setSliderPos(50); 
    }
    setProgress(0);
  };

  const handleSelectTool = (tool) => {
    if (isRebuilding) return;
    setActiveTool(tool);
    const initialParams = {}; tool.params.forEach(p => initialParams[p.id] = p.default);
    setToolParams(initialParams);
  };

  const handleDiscardTool = () => { setActiveTool(null); setLivePreviewUrl(null); setLivePreviewFilename(null); };

  const handleToggleLayer = (id) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
    setLayers(newLayers); 
    const updatedHistory = history.slice(0, historyIndex + 1); updatedHistory.push(newLayers);
    setHistory(updatedHistory); setHistoryIndex(updatedHistory.length - 1); rebuildPipeline(newLayers);
  };

  const handleDeleteLayer = (id) => {
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers); 
    const updatedHistory = history.slice(0, historyIndex + 1); updatedHistory.push(newLayers);
    setHistory(updatedHistory); setHistoryIndex(updatedHistory.length - 1); rebuildPipeline(newLayers);
  };

  const handleUndo = () => {
    if (historyIndex > 0) { const newIdx = historyIndex - 1; setHistoryIndex(newIdx); setLayers(history[newIdx]); rebuildPipeline(history[newIdx]); }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) { const newIdx = historyIndex + 1; setHistoryIndex(newIdx); setLayers(history[newIdx]); rebuildPipeline(history[newIdx]); }
  };

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
      setIsExportModalOpen(false); 
      const res = await fetch(targetUrl); const blob = await res.blob();
      if (exportFormat === 'png') {
        const img = new Image();
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

  // Tentukan URL mana yang sedang aktif untuk di-feed ke Histogram
  const currentActiveImageUrl = livePreviewUrl ? livePreviewUrl : (stackImage ? `${API_BASE_URL}/image/${stackImage}` : null);

  return (
    <div className="h-screen w-screen flex flex-col bg-cli-bg text-cli-text font-mono text-sm uppercase overflow-hidden relative">
      
      {/* MODAL EXPORT & KOMPARASI */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm">
          <div className="w-full max-w-5xl h-[80vh] bg-cli-panel border-2 border-cli-accent flex flex-col shadow-[0_0_40px_rgba(0,229,255,0.15)]">
            <div className="border-b border-cli-accent p-3 flex justify-between items-center bg-cli-bg">
               <span className="text-cli-accent font-bold tracking-widest">&gt; EXPORT_PREVIEW_SYS</span>
               <button onClick={() => setIsExportModalOpen(false)} className="hover:text-red-500 font-bold px-2">X</button>
            </div>
            <div className="flex-1 relative bg-[#010408] overflow-hidden cursor-ew-resize select-none" onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onMouseLeave={() => setIsDraggingSlider(false)} onMouseMove={(e) => handleSliderMove(e.clientX, e.currentTarget.getBoundingClientRect())} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} onTouchMove={(e) => handleSliderMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}>
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #00e5ff 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              <div className="absolute top-2 left-4 z-50 bg-black/50 text-cli-dim px-2 text-[10px]">ORIGINAL</div>
              <div className="absolute top-2 right-4 z-50 bg-black/50 text-cli-accent px-2 text-[10px]">PROCESSED</div>
              {originalMedia && ( <img src={`${API_BASE_URL}/image/${originalMedia}`} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" /> )}
              {(stackImage || livePreviewUrl) && ( <img src={livePreviewUrl ? livePreviewUrl : `${API_BASE_URL}/image/${stackImage}`} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 filter drop-shadow-[0_0_15px_rgba(0,229,255,0.2)]" style={{ clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)` }} /> )}
              <div className="absolute top-0 bottom-0 w-[2px] bg-cli-accent z-40 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,1)]" style={{ left: `${sliderPos}%` }}><div className="bg-cli-bg border border-cli-accent text-cli-accent text-[8px] font-bold px-1 py-2 rotate-90 shadow-lg">||</div></div>
            </div>
            <div className="p-4 flex justify-between items-center bg-cli-bg border-t border-cli-accent">
               <div className="flex gap-4 items-center">
                  <span className="text-cli-dim">FORMAT_OUTPUT:</span>
                  <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="bg-cli-panel border border-cli-border text-cli-accent px-3 py-1.5 outline-none cursor-pointer"><option value="jpg">.JPG (COMPRESSED)</option><option value="png">.PNG (LOSSLESS)</option></select>
               </div>
               <div className="flex gap-3">
                 <button onClick={() => setIsExportModalOpen(false)} className="px-6 py-2 border border-cli-border hover:bg-cli-text hover:text-cli-bg transition-colors">CANCEL</button>
                 <button onClick={handleConfirmExport} className="bg-cli-accent text-cli-bg px-8 py-2 font-bold hover:bg-white transition-colors shadow-[0_0_15px_rgba(0,229,255,0.4)]">[ START EXPORT ]</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER MAIN */}
      <header className="h-14 flex-shrink-0 border-b border-cli-border flex items-center justify-between px-6 bg-cli-panel z-40 relative">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-widest text-cli-accent">NANOPIX<span className="text-cli-dim">.EXE</span></h1>
          <div className="ml-8 flex gap-2">
            <button onClick={handleUndo} disabled={historyIndex === 0 || isRebuilding} className="px-3 py-1 border border-cli-border text-xs hover:bg-cli-text hover:text-cli-bg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-cli-text">&lt; UNDO</button>
            <button onClick={handleRedo} disabled={historyIndex === history.length - 1 || isRebuilding} className="px-3 py-1 border border-cli-border text-xs hover:bg-cli-text hover:text-cli-bg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-cli-text">REDO &gt;</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="image/*" />
          <button onClick={() => fileInputRef.current.click()} className="px-4 py-1.5 border border-cli-border hover:bg-cli-accent hover:text-cli-bg transition-colors">+ LOAD MEDIA</button>
          <button onClick={() => { if(originalMedia) setIsExportModalOpen(true) }} className={`px-4 py-1.5 font-bold transition-colors ${originalMedia ? 'bg-cli-accent text-cli-bg hover:bg-white shadow-[0_0_10px_rgba(0,229,255,0.5)]' : 'bg-cli-dim text-cli-bg opacity-50 cursor-not-allowed'}`}>EXPORT /&gt;</button>
        </div>
      </header>

      {(progress > 0 || isRebuilding) && (
        <div className="h-1 w-full bg-cli-bg border-b border-cli-border z-40 relative">
          <div className="h-full bg-cli-accent animate-pulse transition-all duration-300" style={{ width: progress > 0 ? `${progress}%` : '100%' }} />
        </div>
      )}

      <main className="flex-1 flex overflow-hidden z-10">
        
        {/* KIRI - TOOLS */}
        <aside className="w-64 flex-shrink-0 border-r border-cli-border flex flex-col bg-cli-bg relative z-20">
          <div className="p-3 border-b border-cli-border text-xs text-cli-accent font-bold underline underline-offset-4">COMMANDS</div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {Object.keys(TOOL_CATEGORIES).map(category => (
              <div key={category}>
                <div className="text-cli-dim text-[10px] mb-1">:: {category}</div>
                <div className="flex flex-col gap-1">
                  {TOOL_CATEGORIES[category].map(tool => (
                    <button key={tool.id} onClick={() => handleSelectTool(tool)} disabled={isRebuilding} className={`text-left px-3 py-2 border transition-all text-xs ${activeTool?.id === tool.id ? 'border-cli-accent bg-cli-accent text-cli-bg font-bold shadow-[0_0_10px_rgba(0,229,255,0.3)]' : 'border-cli-border hover:border-cli-accent hover:text-cli-accent'} disabled:opacity-50`}>
                      &gt; {tool.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* TENGAH - WORKSPACE */}
        <section className="flex-1 flex flex-col bg-cli-bg relative p-8">
          <div className="w-full h-full border border-cli-border bg-[#010408] flex items-center justify-center relative overflow-hidden shadow-inner">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #00e5ff 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            
            {isBakingAnim && (
              <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-cli-accent opacity-10 animate-pulse"></div>
                <div className="bg-cli-bg border border-cli-accent text-cli-accent px-8 py-3 font-bold text-xl tracking-widest z-10 shadow-[0_0_20px_rgba(0,229,255,0.8)]">&gt; PROCESSING...</div>
              </div>
            )}
            {isRebuilding && (
              <div className="absolute inset-0 z-50 bg-[#000814]/80 flex flex-col items-center justify-center gap-4 text-cli-accent backdrop-blur-sm">
                 <div className="w-12 h-12 border-2 border-dashed border-cli-accent animate-spin"></div>
                 <p className="animate-pulse tracking-widest text-xs">REBUILDING_PIPELINE...</p>
              </div>
            )}

            {(stackImage || livePreviewUrl) ? (
              <img src={livePreviewUrl ? livePreviewUrl : `${API_BASE_URL}/image/${stackImage}`} alt="Workspace" className="max-w-full max-h-full object-contain relative z-10 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
            ) : (
              <div className="flex flex-col items-center gap-4 text-cli-dim relative z-10 animate-pulse">
                <div className="w-16 h-16 border-2 border-dashed border-cli-dim flex items-center justify-center text-2xl">?</div>
                <p>AWAITING_INPUT_SIGNAL...</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-between text-[11px] text-cli-dim">
            <span className="flex items-center gap-2">
              SYS_STATUS: {isRebuilding ? <span className="text-yellow-400">REBUILDING</span> : isSyncing ? <span className="text-cli-accent animate-pulse">SYNCING...</span> : <span>IDLE</span>}
            </span>
            <span>PRESS [EXPORT] FOR BEFORE/AFTER COMPARISON</span>
          </div>
        </section>

        {/* KANAN - INSPECTOR, LAYERS, HISTOGRAM, & LOGS */}
        <aside className="w-80 flex-shrink-0 border-l border-cli-border flex flex-col bg-cli-panel relative z-20">
          <div className="p-3 border-b border-cli-border text-xs text-cli-accent font-bold">INSPECTOR</div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            
            <div className="flex-shrink-0">
              {!activeTool ? (
                <div className="text-xs text-cli-dim text-center border border-dashed border-cli-border p-4 bg-cli-bg">NO_COMMAND_SELECTED</div>
              ) : (
                <div className="flex flex-col gap-4 border border-cli-accent p-3 bg-cli-bg relative shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                  <div className="text-sm font-bold text-cli-accent border-b border-cli-border pb-2 flex justify-between items-center">
                    {activeTool.label}
                    <span className={`text-[10px] px-1.5 py-0.5 font-bold ${isSyncing ? 'bg-cli-dim text-cli-text' : 'bg-cli-accent text-cli-bg animate-pulse'}`}>{isSyncing ? 'WAIT' : 'LIVE'}</span>
                  </div>
                  {activeTool.params.map(param => (
                    <div key={param.id}>
                      <div className="flex justify-between text-[10px] mb-2"><span>{param.label}</span><span className="text-cli-accent">{toolParams[param.id]}</span></div>
                      {param.type === 'range' ? (
                        <input type="range" min={param.min} max={param.max} step={param.step || 1} value={toolParams[param.id] !== undefined ? toolParams[param.id] : param.default} onChange={(e) => handleParamChange(param.id, Number(e.target.value))} className="w-full accent-cli-accent cursor-pointer" />
                      ) : param.type === 'select' ? (
                        <select value={toolParams[param.id] !== undefined ? toolParams[param.id] : param.default} onChange={(e) => handleParamChange(param.id, e.target.value)} className="w-full bg-cli-panel border border-cli-border p-1.5 text-xs uppercase outline-none text-cli-accent">
                          {param.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2 pt-3 border-t border-cli-border">
                    <button onClick={handleBakeEffect} disabled={isSyncing || isRebuilding || isBakingAnim} className="flex-1 py-1.5 bg-cli-accent text-cli-bg font-bold hover:bg-white text-xs disabled:opacity-50">[ BAKE EFFECT ]</button>
                    <button onClick={handleDiscardTool} disabled={isRebuilding} className="px-3 py-1.5 border border-cli-border text-xs hover:bg-red-900 hover:text-white">[ X ]</button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border border-cli-border flex-1 flex flex-col bg-cli-bg shadow-inner">
              <div className="text-[10px] text-cli-accent font-bold p-2 border-b border-cli-border bg-cli-panel">PIPELINE SEQUENCE</div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                 {layers.slice().reverse().map((layer, reverseIdx) => {
                    const idx = layers.length - 1 - reverseIdx;
                    return (
                      <div key={layer.id} className={`flex justify-between items-center text-[10px] border p-2 ${layer.visible ? 'border-cli-border bg-cli-panel' : 'border-transparent opacity-50 bg-[#000408]'}`}>
                         <span className="font-bold flex gap-2 items-center"><span className="bg-cli-dim text-cli-bg px-1">L{idx + 1}</span><span className={layer.visible ? 'text-cli-text' : 'line-through'}>{layer.label}</span></span>
                         <div className="flex gap-1">
                           <button onClick={() => handleToggleLayer(layer.id)} disabled={isRebuilding} className="w-5 h-5 border border-cli-border hover:text-cli-accent">{layer.visible ? 'O' : '-'}</button>
                           <button onClick={() => handleDeleteLayer(layer.id)} disabled={isRebuilding} className="w-5 h-5 border border-cli-border hover:bg-red-900 hover:text-white">X</button>
                         </div>
                      </div>
                    )
                 })}
                 <div className="flex justify-between items-center text-[10px] border border-dashed border-cli-dim p-2 bg-[#000408] opacity-70">
                     <span className="font-bold flex gap-2 items-center"><span className="bg-cli-border text-cli-dim px-1">L0</span><span>BASE_IMAGE</span></span>
                     <span>[ LOCKED ]</span>
                 </div>
              </div>
            </div>

            {/* LIVE HISTOGRAM */}
            <LiveHistogram imageUrl={currentActiveImageUrl} />

            <div className="mt-4 border border-cli-border p-3 bg-cli-bg h-24 flex flex-col shrink-0">
              <div className="flex-1 overflow-y-auto text-[10px] font-mono leading-relaxed text-cli-accent opacity-80">
                {logs.map((log, i) => <div key={i}>{log}</div>)}
                <div ref={logEndRef} />
              </div>
            </div>

          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;