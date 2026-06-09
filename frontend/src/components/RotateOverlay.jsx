import { useState, useEffect } from "react";

export default function RotateOverlay({
  angle = 0,
  onChange
}) {
  const [isRotating, setIsRotating] = useState(false);

  const startRotate = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsRotating(true);
  };

  useEffect(() => {
    if (!isRotating) return;

    const handleMove = (e) => {
      const wrapper = document.getElementById("crop-wrapper");

      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();

      const centerX =
        rect.left + rect.width / 2;

      const centerY =
        rect.top + rect.height / 2;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const radians = Math.atan2(
        mouseY - centerY,
        mouseX - centerX
      );

      let degrees =
        radians * (180 / Math.PI);

      degrees += 90;

      if (degrees < 0) {
        degrees += 360;
      }

      onChange(
        Math.round(degrees)
      );
    };

    const handleUp = () => {
      setIsRotating(false);
    };

    window.addEventListener(
      "mousemove",
      handleMove
    );

    window.addEventListener(
      "mouseup",
      handleUp
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMove
      );

      window.removeEventListener(
        "mouseup",
        handleUp
      );
    };
  }, [isRotating, onChange]);

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* Bounding Box */}
      <div
        className="
          absolute
          inset-0
          border
          border-cli-accent
          shadow-[0_0_15px_rgba(0,0,170,0.5)]
        "
      />

      {/* Line */}
      <div
        className="
          absolute
          left-1/2
          -translate-x-1/2
          -top-10
          w-[1px]
          h-10
          bg-cli-accent
        "
      />

      {/* Rotate Handle */}
      <div
        className="
          absolute
          left-1/2
          -translate-x-1/2
          -top-14
          w-6
          h-6
          rounded-full
          bg-cli-accent
          cursor-grab
          pointer-events-auto
          shadow-[0_0_10px_rgba(0,0,170,0.8)]
        "
        onMouseDown={startRotate}
      />

      {/* Angle Label */}
      <div
        className="
          absolute
          top-2
          left-2
          bg-black/80
          px-2
          py-1
          text-xs
          text-cli-accent
          border
          border-cli-accent
        "
      >
        {angle}°
      </div>
    </div>
  );
}