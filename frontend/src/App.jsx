import { useState, useRef, useEffect } from "react";
import { API_BASE_URL, generateId, getImageDimensions, formatSize } from "./utils/constants";
import ExportModal from "./components/ExportModal";
import Header from "./components/Header";
import CommandSidebar from "./components/CommandSidebar";
import Workspace from "./components/Workspace";
import InspectorSidebar from "./components/InspectorSidebar";

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
  const [originalSize, setOriginalSize] = useState("0.00 KB");  
  const [processedSize, setProcessedSize] = useState("0.00 KB"); 
  
  const [activeTool, setActiveTool] = useState(null);
  const [toolParams, setToolParams] = useState({});
  const [logs, setLogs] = useState(["[SYS] Nanopix UI Modularized Successfully."]);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [imgDims, setImgDims] = useState({ w: 1, h: 1 }); 

  const fileInputRef = useRef(null);
  const logEndRef = useRef(null);
  const stackImgDims = useRef({ w: 1000, h: 1000 });

  useEffect(() => {
    if (stackImage) {
      getImageDimensions(stackImage).then(dims => {
        stackImgDims.current = dims;
        setImgDims(dims);
      });
    }
  }, [stackImage]);

  useEffect(() => { if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  const addLog = (msg) => setLogs((prev) => [...prev, msg].slice(-15));
  const handleParamChange = (id, value) => { setToolParams(prev => ({ ...prev, [id]: value })); };

  const applyCropTemplate = (ratioStr) => {
    if (ratioStr === 'FREEFORM') {
      setToolParams(prev => ({ ...prev, ratio: 'FREEFORM' }));
      addLog(`[CMD] Crop mode: FREEFORM`);
      return;
    }
    const [rw, rh] = ratioStr.split(':').map(Number);
    const targetRatio = rw / rh;
    const { w: imgW, h: imgH } = imgDims;
    const imgRatio = imgW / imgH;

    let newWPct, newHPct;
    if (imgRatio > targetRatio) {
      newHPct = 90; newWPct = targetRatio * (imgH / imgW) * 90;
    } else {
      newWPct = 90; newHPct = (1 / targetRatio) * (imgW / imgH) * 90;
    }
    const newXPct = (100 - newWPct) / 2;
    const newYPct = (100 - newHPct) / 2;

    setToolParams(prev => ({ ...prev, w_pct: newWPct, h_pct: newHPct, x_pct: newXPct, y_pct: newYPct, ratio: ratioStr }));
    addLog(`[CMD] Locked area to: ${ratioStr}`);
  };

  const fetchSize = async (url) => {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      let size = res.headers.get('content-length');
      if (!size) { 
        const getRes = await fetch(url);
        const blob = await getRes.blob();
        size = blob.size;
      }
      return formatSize(Number(size));
    } catch(e) { return "UNKNOWN"; }
  };

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
    if (activeTool.endpoint === 'crop') return; 

    const abortController = new AbortController();
    const timerId = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const response = await fetch(`${API_BASE_URL}/process/${activeTool.endpoint}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: stackImage, ...toolParams }), signal: abortController.signal
        });
        if (response.ok) {
          const data = await response.json();
          const newUrl = `${API_BASE_URL}/processed/${data.filename}?t=${Date.now()}`;
          setLivePreviewFilename(data.filename); setLivePreviewUrl(newUrl);
          fetchSize(newUrl).then(setProcessedSize);
        }
      } catch (error) { 
        if (error.name !== 'AbortError') console.error(error);
      } finally { setIsSyncing(false); }
    }, 150); 
    return () => { clearTimeout(timerId); abortController.abort(); };
  }, [toolParams, activeTool, stackImage, isRebuilding]);

  const rebuildPipeline = async (targetLayers) => {
    setIsRebuilding(true); setActiveTool(null); setLivePreviewUrl(null); let currentInput = originalMedia;
    for (const layer of targetLayers) {
      if (!layer.visible) continue;
      let payload = { filename: currentInput, ...layer.params };
      if (layer.endpoint === 'crop') {
        const dims = await getImageDimensions(currentInput);
        payload.x = Math.floor((layer.params.x_pct / 100) * dims.w);
        payload.y = Math.floor((layer.params.y_pct / 100) * dims.h);
        payload.width = Math.floor((layer.params.w_pct / 100) * dims.w);
        payload.height = Math.floor((layer.params.h_pct / 100) * dims.h);
      }
      const res = await fetch(`${API_BASE_URL}/process/${layer.endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const promoted = await promoteToUploads(data.filename);
        if (promoted) currentInput = promoted; else break;
      } else break;
    }
    setStackImage(currentInput); setIsRebuilding(false);
    fetchSize(`${API_BASE_URL}/image/${currentInput}`).then(setProcessedSize);
  };

  const handleBakeEffect = async () => {
    if (activeTool.endpoint !== 'crop' && !livePreviewFilename) return;
    setIsBakingAnim(true);
    let promotedFilename;

    if (activeTool.endpoint === 'crop') {
       addLog("[SYS] Calculating crop boundaries...");
       const dims = await getImageDimensions(stackImage);
       const payload = { 
         filename: stackImage, 
         x: Math.floor((toolParams.x_pct / 100) * dims.w), y: Math.floor((toolParams.y_pct / 100) * dims.h),
         width: Math.floor((toolParams.w_pct / 100) * dims.w), height: Math.floor((toolParams.h_pct / 100) * dims.h)
       };
       const res = await fetch(`${API_BASE_URL}/process/crop`, {
         method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
       });
       const data = await res.json();
       promotedFilename = await promoteToUploads(data.filename);
    } else {
       promotedFilename = await promoteToUploads(livePreviewFilename);
    }

    const newLayer = { id: generateId(), label: activeTool.label, endpoint: activeTool.endpoint, params: { ...toolParams }, visible: true };
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newLayers);
    setHistory(updatedHistory); setHistoryIndex(updatedHistory.length - 1);

    setStackImage(promotedFilename); setLivePreviewUrl(null); setActiveTool(null);
    fetchSize(`${API_BASE_URL}/image/${promotedFilename}`).then(setProcessedSize);
    setTimeout(() => setIsBakingAnim(false), 600);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProgress(20);
    const sizeStr = formatSize(file.size);
    setOriginalSize(sizeStr); setProcessedSize(sizeStr);

    const formData = new FormData(); formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: formData });
    if (res.ok) { 
      const d = await res.json(); 
      setOriginalMedia(d.filename); setStackImage(d.filename); 
      setLayers([]); setHistory([[]]); setHistoryIndex(0);
      setActiveTool(null); setLivePreviewUrl(null); 
    }
    setProgress(0);
  };

  const handleSelectTool = (tool) => {
    if (isRebuilding) return;
    setActiveTool(tool);
    const initialParams = {};
    if (tool.endpoint === 'crop') {
       initialParams.x_pct = 0; initialParams.y_pct = 0; initialParams.w_pct = 100; initialParams.h_pct = 100; initialParams.ratio = 'FREEFORM';
    } else {
       tool.params.forEach(p => initialParams[p.id] = p.default);
    }
    setToolParams(initialParams);
  };

  const handleDiscardTool = () => {
    setActiveTool(null); setLivePreviewUrl(null); setLivePreviewFilename(null);
    fetchSize(`${API_BASE_URL}/image/${stackImage}`).then(setProcessedSize);
  };

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

  const currentActiveImageUrl = livePreviewUrl ? livePreviewUrl : (stackImage ? `${API_BASE_URL}/image/${stackImage}` : null);

  return (
    <div className="h-screen w-screen flex flex-col bg-cli-bg text-cli-text font-mono text-sm uppercase overflow-hidden relative">
      
      <ExportModal 
        isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)}
        originalMedia={originalMedia} stackImage={stackImage} livePreviewUrl={livePreviewUrl}
        originalSize={originalSize} processedSize={processedSize} addLog={addLog}
      />

      <Header 
        handleUndo={handleUndo} handleRedo={handleRedo} historyIndex={historyIndex} historyLength={history.length}
        isRebuilding={isRebuilding} fileInputRef={fileInputRef} handleUpload={handleUpload} 
        originalMedia={originalMedia} setIsExportModalOpen={setIsExportModalOpen}
      />

      {(progress > 0 || isRebuilding) && (
        <div className="h-1 w-full bg-cli-bg border-b border-cli-border z-40 relative">
          <div className="h-full bg-cli-accent animate-pulse transition-all duration-300" style={{ width: progress > 0 ? `${progress}%` : '100%' }} />
        </div>
      )}

      <main className="flex-1 flex overflow-hidden z-10">
        
        <CommandSidebar activeTool={activeTool} handleSelectTool={handleSelectTool} isRebuilding={isRebuilding} />

        <Workspace 
          isBakingAnim={isBakingAnim} isRebuilding={isRebuilding} isSyncing={isSyncing}
          stackImage={stackImage} livePreviewUrl={livePreviewUrl} imgDims={imgDims}
          activeTool={activeTool} toolParams={toolParams} setToolParams={setToolParams}
          originalSize={originalSize} processedSize={processedSize}
        />

        <InspectorSidebar 
          activeTool={activeTool} isSyncing={isSyncing} toolParams={toolParams}
          handleParamChange={handleParamChange} applyCropTemplate={applyCropTemplate}
          handleBakeEffect={handleBakeEffect} isRebuilding={isRebuilding}
          isBakingAnim={isBakingAnim} handleDiscardTool={handleDiscardTool}
          layers={layers} handleToggleLayer={handleToggleLayer} handleDeleteLayer={handleDeleteLayer}
          currentActiveImageUrl={currentActiveImageUrl} logs={logs} logEndRef={logEndRef}
        />

      </main>
    </div>
  );
}

export default App;