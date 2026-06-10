import { useState } from "react";
import { TOOL_CATEGORIES } from "../utils/constants";

// --- CSS FILTER SIMULATOR ---
const getEffectStyle = (id) => {
  switch(id) {
    case 'grayscale': return { filter: 'grayscale(100%)' };
    case 'brightness-contrast': return { filter: 'brightness(140%) contrast(150%)' };
    case 'crop': return { clipPath: 'inset(15%)', transform: 'scale(1.3)' };
    case 'rotate': return { transform: 'rotate(25deg) scale(1.3)' };
    case 'resize': return { transform: 'scale(1.5)' };
    case 'flip': return { transform: 'scaleX(-1)' };
    case 'sharpen': return { filter: 'contrast(180%) saturate(150%)' };
    case 'smooth': return { filter: 'blur(3px)' };
    case 'histeq': return { filter: 'saturate(200%) contrast(120%) brightness(110%)' };
    case 'threshold': return { filter: 'contrast(1000%) grayscale(100%)' };
    case 'canny': 
    case 'hsv': return { filter: 'hue-rotate(90deg) saturate(200%)' };
    case 'sobel':
    case 'prewitt':
    case 'robert':
    case 'laplacian':
    case 'log':
      return { filter: 'invert(100%) grayscale(100%) contrast(500%)' };
    case 'morphology': return { filter: 'blur(2px) contrast(400%) grayscale(100%)' };
    case 'seg_threshold': return { filter: 'sepia(100%) hue-rotate(200deg) contrast(500%)' };
    case 'seg_edge': return { filter: 'invert(100%) contrast(500%) sepia(50%)' };
    case 'seg_region': return { filter: 'saturate(500%) contrast(200%) blur(1px)' };
    default: return {};
  }
};

const BASE_THUMBNAIL = "https://images.unsplash.com/photo-1618367588411-d9a90fefa881?q=80&w=200&auto=format&fit=crop";

export default function CommandSidebar({ activeTool, handleSelectTool, isRebuilding }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredCategories = Object.keys(TOOL_CATEGORIES).reduce((acc, cat) => {
    const filteredTools = TOOL_CATEGORIES[cat].filter(tool =>
      tool.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filteredTools.length > 0) acc[cat] = filteredTools;
    return acc;
  }, {});

  return (
    <aside
  className={`${isCollapsed ? 'w-20' : 'w-[280px]'} flex-shrink-0 border-r border-cli-border flex flex-col relative z-20 transition-all duration-300 ease-in-out backdrop-blur-md`}
  style={{
    background: "rgba(7,17,29,.85)",
    boxShadow: "0 0 30px rgba(0,229,255,.06)"
  }}
>
      {/* HEADER & TOGGLE */}
      <div className="p-3 border-b border-cli-border flex justify-between items-center bg-cli-panel h-14">
        {!isCollapsed && <span className="text-xs text-cli-accent font-bold tracking-widest">EFFECTS</span>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-cli-dim hover:text-cli-accent p-1 px-2 border border-transparent hover:border-cli-accent transition-colors font-bold mx-auto"
        >
          {isCollapsed ? ">>" : "<<"}
        </button>
      </div>

      {/* SEARCH BAR (Hanya muncul jika tidak dilipat) */}
      {!isCollapsed && (
        <div className="p-3 border-b border-cli-border bg-[#010408]">
          <input
            type="text"
            placeholder="SEARCH..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cli-bg border border-cli-border p-2 text-xs outline-none focus:border-cli-accent text-cli-text placeholder-cli-dim shadow-inner"
          />
        </div>
      )}

      {/* LIST EFFECT */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 custom-scrollbar">
        {Object.keys(filteredCategories).length === 0 ? (
          <div className="text-[10px] text-cli-dim text-center mt-4 italic">EMPTY.</div>
        ) : (
          Object.keys(filteredCategories).map(category => (
            <div key={category} className="flex flex-col gap-2">
              
              {!isCollapsed && (
                <div className="text-[9px] text-cli-dim uppercase tracking-tighter font-bold opacity-60 mb-1">
                  {category}
                </div>
              )}

              {isCollapsed ? (
                // --- MODE DILIPAT (MINI PIXELATED THUMBNAILS) ---
                <div className="flex flex-col gap-3 items-center">
                  {filteredCategories[category].map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => handleSelectTool(tool)}
                      disabled={isRebuilding}
                      title={tool.label}
                      className={`relative w-12 h-12 border-2 overflow-hidden transition-all group ${
                        activeTool?.id === tool.id 
                          ? 'border-cli-accent shadow-[0_0_15px_rgba(0,170,170,0.8)] scale-110' 
                          : 'border-cli-border opacity-60 hover:opacity-100 hover:border-cli-dim'
                      } disabled:opacity-30`}
                    >
                      <img 
                        src={BASE_THUMBNAIL} 
                        alt={tool.label}
                        style={{ ...getEffectStyle(tool.id), imageRendering: 'pixelated' }} // <--- MENAMBAHKAN PIXELATION
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay Biru saat Aktif */}
                      {activeTool?.id === tool.id && (
                        <div className="absolute inset-0 bg-cli-accent/20"></div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                // --- MODE TERBUKA (CARD GRID DENGAN PIXELATION) ---
                <div className="grid grid-cols-2 gap-3">
                  {filteredCategories[category].map(tool => (
                    <button
                      key={tool.id} onClick={() => handleSelectTool(tool)} disabled={isRebuilding}
                      className={`group flex flex-col items-center justify-between p-2 border transition-all h-[110px] ${
                        activeTool?.id === tool.id 
                          ? 'border-cli-accent bg-[#010408] shadow-[0_0_15px_rgba(0,170,170,0.4)]' 
                          : 'border-cli-border bg-cli-panel hover:border-cli-accent hover:shadow-lg'
                      } disabled:opacity-50`}
                    >
                      <div className={`w-full flex-1 border border-cli-border mb-2 overflow-hidden relative bg-black transition-colors ${activeTool?.id === tool.id ? 'border-cli-accent' : ''}`}>
                         <div className={`absolute inset-0 transition-all duration-300 ${
                           activeTool?.id === tool.id ? 'opacity-100 scale-110' : 'opacity-40 group-hover:opacity-80 group-hover:scale-105'
                         }`}>
                           <img 
                             src={BASE_THUMBNAIL} 
                             alt={tool.label}
                             style={{ ...getEffectStyle(tool.id), imageRendering: 'pixelated' }} // <--- MENAMBAHKAN PIXELATION
                             className="w-full h-full object-cover"
                           />
                         </div>
                         <div className={`absolute inset-0 bg-cli-accent transition-opacity duration-300 ${
                           activeTool?.id === tool.id ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'
                         }`}></div>
                      </div>
                      <span className={`text-[10px] w-full text-center truncate ${
                        activeTool?.id === tool.id ? 'text-cli-accent font-bold' : 'text-cli-text group-hover:text-white'
                      }`}>
                        {tool.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

            </div>
          ))
        )}
      </div>
    </aside>
  );
}