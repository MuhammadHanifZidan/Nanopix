export default function Header({
  handleUndo,
  handleRedo,
  historyIndex,
  historyLength,
  isRebuilding,
  fileInputRef,
  handleUpload,
  originalMedia,
  setIsExportModalOpen
}) {
  return (
    <header className="h-14 flex-shrink-0 border-b border-cli-border flex items-center justify-between px-6 bg-cli-panel z-40 relative">
      <div className="flex items-center gap-4">
        {/* TAMBAHAN KURSOR BERKEDIP DI SINI */}
        <h1 className="text-xl font-bold tracking-widest text-cli-accent">
          NANOPIX<span className="text-cli-dim">.EXE</span><span className="animate-blink text-cli-text ml-1">_</span>
        </h1>
        <div className="ml-8 flex gap-2">
          <button onClick={handleUndo} disabled={historyIndex === 0 || isRebuilding} className="px-3 py-1 border border-cli-border text-xs hover:bg-cli-text hover:text-cli-bg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-cli-text">&lt; UNDO</button>
          <button onClick={handleRedo} disabled={historyIndex === historyLength - 1 || isRebuilding} className="px-3 py-1 border border-cli-border text-xs hover:bg-cli-text hover:text-cli-bg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-cli-text">REDO &gt;</button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="image/*" />
        <button onClick={() => fileInputRef.current.click()} className="px-4 py-1.5 border border-cli-border hover:bg-cli-accent hover:text-cli-bg transition-colors">+ LOAD MEDIA</button>
        <button onClick={() => { if(originalMedia) setIsExportModalOpen(true) }} className={`px-4 py-1.5 font-bold transition-colors ${originalMedia ? 'bg-cli-accent text-cli-bg hover:bg-white shadow-[0_0_15px_rgba(0,0,170,0.5)]' : 'bg-cli-dim text-cli-bg opacity-50 cursor-not-allowed'}`}>EXPORT /&gt;</button>
      </div>
    </header>
  );
}