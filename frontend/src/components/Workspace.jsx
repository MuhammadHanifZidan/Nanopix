import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../utils/constants";
import CropOverlay from "./CropOverlay";
import RotateOverlay from "./RotateOverlay";

export default function Workspace({
  isBakingAnim,
  isRebuilding,
  isSyncing,
  stackImage,
  livePreviewUrl,
  imgDims,
  activeTool,
  toolParams,
  setToolParams,
  originalSize,
  processedSize
}) {
    
  const [zoom, setZoom] = useState(1);
       const [showZoomIndicator, setShowZoomIndicator] = useState(false);
        const [zoomIndicatorLeaving, setZoomIndicatorLeaving] = useState(false);
        const [spinner, setSpinner] = useState("|");
            const [isSpacePressed, setIsSpacePressed] = useState(false);
        const [isPanning, setIsPanning] = useState(false);

        const [pan, setPan] = useState({
        x: 0,
        y: 0
        });

        const panStart = useRef({
        x: 0,
        y: 0
        });

        const panOrigin = useRef({
        x: 0,
        y: 0
        });
  const viewportRef = useRef(null);
  const zoomTimeout = useRef(null);

        useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      setIsSpacePressed(true);
    }
  };

  const handleKeyUp = (e) => {
    if (e.code === "Space") {
      setIsSpacePressed(false);
      setIsPanning(false);
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}, []);

const startPan = (e) => {
  if (!isSpacePressed) return;

  setIsPanning(true);

  panStart.current = {
    x: e.clientX,
    y: e.clientY
  };

  panOrigin.current = {
    x: pan.x,
    y: pan.y
  };
};

const movePan = (e) => {
  if (!isPanning) return;

  const dx = e.clientX - panStart.current.x;
  const dy = e.clientY - panStart.current.y;

  setPan({
    x: panOrigin.current.x + dx,
    y: panOrigin.current.y + dy
  });
};

const stopPan = () => {
  setIsPanning(false);
};

useEffect(() => {
  window.addEventListener("mousemove", movePan);
  window.addEventListener("mouseup", stopPan);

  return () => {
    window.removeEventListener("mousemove", movePan);
    window.removeEventListener("mouseup", stopPan);
  };
}, [isPanning]);



  useEffect(() => {
    if (!isRebuilding && !isBakingAnim) return;

    const chars = ["|", "/", "-", "\\"];
    let i = 0;

    const interval = setInterval(() => {
      i = (i + 1) % chars.length;
      setSpinner(chars[i]);
    }, 100);

    return () => clearInterval(interval);
  }, [isRebuilding, isBakingAnim]);

useEffect(() => {
  setZoom(1);

  setPan({
    x: 0,
    y: 0
  });
}, [stackImage]);
const showZoom = () => {
  setZoomIndicatorLeaving(false);
  setShowZoomIndicator(true);

  clearTimeout(zoomTimeout.current);

  zoomTimeout.current = setTimeout(() => {
    setZoomIndicatorLeaving(true);

    setTimeout(() => {
      setShowZoomIndicator(false);
    }, 200);
  }, 700);
};

const applyZoomPreset = (value) => {
  setZoom(value);
  showZoom();
};

  const handleWheel = (e) => {
    // ALT + SCROLL = ZOOM FOTO
    if (!e.altKey) return;

    e.preventDefault();
    e.stopPropagation();

    setZoom((prev) => {
      const sensitivity = 0.0015;

      const next =
        prev - (e.deltaY * sensitivity);

      return Math.min(
        8,
        Math.max(0.1, next)
      );
    });
    showZoom();
  };
  

  return (
    <section className="flex-1 min-w-0 flex flex-col bg-cli-bg relative p-8">

      <div className="workspace-grid w-full h-full border border-cli-border bg-[#010408] relative overflow-hidden shadow-inner p-4">
        {showZoomIndicator && (
  <div
    className={`
  absolute
  left-1/2
  top-1/2
  z-[999]
  pointer-events-none
  px-3
  py-1
  rounded-xl
  border
  border-cli-accent
  backdrop-blur-md
  text-xs
  tracking-widest
  font-bold
  text-cli-accent
  ${
    zoomIndicatorLeaving
      ? "zoom-indicator-exit"
      : "zoom-indicator-enter"
  }
`}
    style={{
      transform:
        "translate(-50%, -50%)",

      background:
        "rgba(0,0,0,.75)",

      boxShadow:
        "0 0 40px rgba(0,229,255,.25)",

      textShadow:
        "0 0 10px rgba(0,229,255,.7)"
    }}
  >
    {Math.round(zoom * 100)}%
  </div>
)}
        {(isBakingAnim || isRebuilding) && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-4xl text-cli-accent mb-4 font-bold">
              {spinner}
            </div>
          </div>
        )}

        {(stackImage || livePreviewUrl) ? (
        <div
            ref={viewportRef}
            onWheelCapture={handleWheel}
            onMouseDown={startPan}
            className={`w-full h-full flex items-center justify-center overflow-hidden ${
                isSpacePressed
                ? "cursor-grab"
                : ""
            }`}
            >
            <div
              id="crop-wrapper"
              className="relative isolate shrink-0"
              style={{
  transform: `
    translate(${pan.x}px, ${pan.y}px)
    scale(${zoom})
    rotate(${toolParams.angle || 0}deg)
  `,
  transformOrigin: "center center"
}}
            >
              <img
                src={
                  livePreviewUrl
                    ? livePreviewUrl
                    : `${API_BASE_URL}/image/${stackImage}`
                }
                alt="Workspace"
                draggable={false}
                className="block object-contain pointer-events-none select-none"
                style={{
                  maxWidth: "75vw",
                  maxHeight: "70vh",
                  width: "auto",
                  height: "auto"
                }}
              />

              {activeTool?.endpoint === "crop" && (
                <CropOverlay
                  params={toolParams}
                  onChange={(newParams) =>
                    setToolParams((prev) => ({
                      ...prev,
                      ...newParams
                    }))
                  }
                />
              )}


              {activeTool?.endpoint === "rotate" && (
  <RotateOverlay
    angle={toolParams.angle || 0}
    onChange={(angle) =>
      setToolParams((prev) => ({
        ...prev,
        angle
      }))
    }
  />
)}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cli-dim animate-blink">
            AWAITING_INPUT_SIGNAL...
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center text-[11px] text-cli-dim">
        <div className="flex items-center gap-4">
         <div className="flex items-center gap-2">

  <button
    onClick={() => applyZoomPreset(0.25)}
    className="px-2 py-1 border border-cli-border"
  >
    25%
  </button>

  <button
    onClick={() => applyZoomPreset(0.5)}
    className="px-2 py-1 border border-cli-border"
  >
    50%
  </button>

  <button
    onClick={() => applyZoomPreset(1)}
    className="px-2 py-1 border border-cli-border"
  >
    100%
  </button>

  <button
    onClick={() => applyZoomPreset(2)}
    className="px-2 py-1 border border-cli-border"
  >
    200%
  </button>

  <button
    onClick={() => applyZoomPreset(4)}
    className="px-2 py-1 border border-cli-border"
  >
    400%
  </button>

  <span className="text-cli-accent font-bold ml-3">
    {Math.round(zoom * 100)}%
  </span>

</div>

          <span>
            ALT + SCROLL TO ZOOM
          </span>
        </div>

        <span className="flex gap-4">
          <span>
            ORIGINAL:
            <span className="text-cli-accent">
              {" "}
              {originalSize}
            </span>
          </span>

          <span>
            PROCESSED:
            <span className="text-green-400">
              {" "}
              {processedSize}
            </span>
          </span>
        </span>
      </div>
    </section>
  );
}