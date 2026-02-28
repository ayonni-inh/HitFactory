import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  color?: string;
  size?: number;
}

export const Knob: React.FC<KnobProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  onChange, 
  color = 'text-studio-accent',
  size = 48 
}) => {
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number>(0);
  const startValue = useRef<number>(0);

  const percentage = (value - min) / (max - min);
  const rotation = -135 + (percentage * 270);

  const handleStart = (clientY: number) => {
    setDragging(true);
    startY.current = clientY;
    startValue.current = value;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMove = (clientY: number) => {
      if (!dragging) return;
      const deltaY = startY.current - clientY;
      const range = max - min;
      const deltaValue = (deltaY / 200) * range;
      let newValue = startValue.current + deltaValue;
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(newValue);
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    };

    const handleEnd = () => {
      setDragging(false);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragging, min, max, onChange]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div 
        className="relative flex items-center justify-center cursor-ns-resize group touch-none"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Outer Ring Shadow */}
        <div className="absolute inset-0 rounded-full bg-studio-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
        
        {/* Track Ring */}
        <svg width={size} height={size} className="absolute pointer-events-none transform -rotate-90">
          <circle 
            cx={size/2} cy={size/2} r={(size/2) - 4} 
            stroke="#18181b" 
            strokeWidth="3" 
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * ((size/2) - 4) * 0.75} ${2 * Math.PI * ((size/2) - 4) * 0.25}`}
            strokeDashoffset={-(2 * Math.PI * ((size/2) - 4) * 0.125)}
            className="opacity-50"
          />
        </svg>

        {/* Value Ring */}
        <svg width={size} height={size} className="absolute pointer-events-none transform -rotate-90">
             <motion.circle 
            cx={size/2} cy={size/2} r={(size/2) - 4} 
            stroke="currentColor" 
            strokeWidth="3" 
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * ((size/2) - 4)}`}
            animate={{ 
              strokeDashoffset: (2 * Math.PI * ((size/2) - 4)) * (1 - (0.75 * percentage)) + (2 * Math.PI * ((size/2) - 4) * 0.125)
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`${color} drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]`}
          />
        </svg>
        
        {/* Knob Body */}
        <div 
          className="absolute w-[75%] h-[75%] bg-gradient-to-b from-studio-800 to-studio-900 rounded-full shadow-lg border border-studio-700 flex items-center justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="absolute top-1 w-1 h-3 bg-studio-accent rounded-full shadow-[0_0_5px_rgba(139,92,246,0.5)]" />
        </div>
      </div>
      <div className="flex flex-col items-center leading-none">
        <span className="text-[9px] uppercase font-black text-studio-500 tracking-widest select-none">{label}</span>
        <span className="text-[10px] text-white font-mono font-bold select-none mt-0.5">{value.toFixed(1)}</span>
      </div>
    </div>
  );
};
