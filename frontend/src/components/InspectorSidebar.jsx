import LiveHistogram from "./LiveHistogram";

export default function InspectorSidebar({
  activeTool, isSyncing, toolParams, handleParamChange, applyCropTemplate,
  handleBakeEffect, isRebuilding, isBakingAnim, handleDiscardTool,
  layers, handleToggleLayer, handleDeleteLayer, currentActiveImageUrl, logs, logEndRef
}) {
  return (
    <aside className="w-80 flex-shrink-0 border-l border-cli-border flex flex-col bg-cli-panel relative z-20">
      <div className="p-3 border-b border-cli-border text-xs text-cli-accent font-bold">INSPECTOR</div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        
        {/* PARAMETERS */}
        <div className="flex-shrink-0">
          {!activeTool ? (
            <div className="text-xs text-cli-dim text-center border border-dashed border-cli-border p-4 bg-cli-bg">NO_COMMAND_SELECTED</div>
          ) : (
            <div className="flex flex-col gap-4 border border-cli-accent p-3 bg-cli-bg relative shadow-[0_0_15px_rgba(0,0,170,0.15)]">
              <div className="text-sm font-bold text-cli-accent border-b border-cli-border pb-2 flex justify-between items-center">
                {activeTool.label}
                {activeTool.endpoint !== 'crop' && <span className={`text-[10px] px-1.5 py-0.5 font-bold ${isSyncing ? 'bg-cli-dim text-cli-text' : 'bg-cli-accent text-cli-bg animate-pulse'}`}>{isSyncing ? 'WAIT' : 'LIVE'}</span>}
              </div>

              {activeTool.endpoint === 'crop' && (
                <div className="border border-cli-border p-2 bg-[#010408]">
                  <div className="text-[9px] text-cli-dim mb-2 font-bold tracking-widest">ASPECT RATIO TEMPLATES</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['FREEFORM', '1:1', '4:3', '16:9', '3:4', '9:16'].map(ratio => (
                      <button key={ratio} onClick={() => applyCropTemplate(ratio)} className={`px-2 py-1 text-[9px] border transition-colors flex-1 shadow-[0_0_10px_rgba(0,0,170,0.2)] ${toolParams.ratio === ratio ? 'border-cli-accent bg-cli-accent text-cli-bg font-bold' : 'border-cli-border hover:border-cli-accent'}`}>
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                <button onClick={handleBakeEffect} disabled={isSyncing || isRebuilding || isBakingAnim} className="flex-1 py-1.5 bg-cli-accent text-cli-bg font-bold hover:bg-white hover:text-black text-xs disabled:opacity-50">[ BAKE EFFECT ]</button>
                <button onClick={handleDiscardTool} disabled={isRebuilding} className="px-3 py-1.5 border border-cli-border text-xs hover:bg-red-900 hover:text-white">[ X ]</button>
              </div>
            </div>
          )}
        </div>

        {/* PIPELINE SEQUENCE */}
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

        <LiveHistogram imageUrl={currentActiveImageUrl} />

        {/* LOGS */}
        <div className="mt-4 border border-cli-border p-3 bg-cli-bg h-24 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto text-[10px] font-mono leading-relaxed text-cli-accent opacity-80">
            {logs.map((log, i) => <div key={i}>{log}</div>)}
            <div ref={logEndRef} />
          </div>
        </div>

      </div>
    </aside>
  );
}