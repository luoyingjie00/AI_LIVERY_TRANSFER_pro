import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MoveHorizontalIcon } from './Icons';

interface ImageCompareProps {
  beforeImage: string;
  afterImage: string;
}

const ImageCompare: React.FC<ImageCompareProps> = ({ beforeImage, afterImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderPosition(percentage);
    }
  }, []);

  const onMouseDown = () => setIsDragging(true);
  const onMouseUp = () => setIsDragging(false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) return;
    handleMove(e.clientX);
  };

  useEffect(() => {
    const handleWindowMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };
    const handleWindowUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX));
    window.addEventListener('touchend', handleWindowUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
    };
  }, [isDragging, handleMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden group cursor-crosshair font-mono"
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    >
      {/* Grid Overlay for tech feel */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10" 
           style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
      </div>

      {/* Background Image (Target / Before) */}
      <img 
        src={beforeImage} 
        alt="Original" 
        className="absolute inset-0 w-full h-full object-contain p-8 opacity-50 grayscale"
        draggable={false}
      />
      <div className="absolute bottom-4 left-4 bg-black/60 text-neutral-400 font-bold text-[9px] px-2 py-1 rounded backdrop-blur-md border border-white/10 tracking-widest uppercase z-10">
        源数据 / RAW
      </div>

      {/* Foreground Image (Result / After) - Clipped */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <div className="absolute inset-0 w-full h-full bg-blue-900/20 pointer-events-none mix-blend-overlay"></div>
        <img 
          src={afterImage} 
          alt="Result" 
          className="absolute inset-0 w-full h-full object-contain p-8 max-w-none" 
          style={{ width: containerRef.current?.clientWidth, height: containerRef.current?.clientHeight }}
          draggable={false}
        />
        <div className="absolute bottom-4 right-4 bg-blue-600 text-white font-bold text-[9px] px-2 py-1 rounded shadow-lg tracking-widest uppercase z-20">
          渲染层 / RENDER
        </div>
      </div>

      {/* Slider Line */}
      <div 
        className="absolute inset-y-0 w-0.5 bg-white z-10 flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.5)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 bg-black border border-white rounded flex items-center justify-center text-white cursor-col-resize hover:scale-110 transition-transform">
          <MoveHorizontalIcon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

export default ImageCompare;