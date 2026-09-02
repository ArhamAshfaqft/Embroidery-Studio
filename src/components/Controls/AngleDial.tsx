import React, { useRef, useState, useCallback, useEffect } from 'react';

interface AngleDialProps {
  label: string;
  value: number; // 0 to 360
  onChange: (value: number) => void;
  unit?: string;
}

export const AngleDial: React.FC<AngleDialProps> = ({
  label,
  value,
  onChange,
  unit = '°'
}) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateAngle = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      if (deg < 0) deg += 360;
      onChange(deg);
    },
    [onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    calculateAngle(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        calculateAngle(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, calculateAngle]);

  const rad = (value * Math.PI) / 180;
  const radius = 17;
  const pointerX = 24 + Math.cos(rad) * radius;
  const pointerY = 24 + Math.sin(rad) * radius;

  return (
    <div className="flex items-center justify-between py-2 border-b border-neutral-800/40 last:border-0 group">
      <div className="flex flex-col">
        <span className="text-[12px] font-medium text-neutral-300 group-hover:text-neutral-200 transition-colors tracking-tight">
          {label}
        </span>
        <div className="flex items-center space-x-1 mt-1">
          <input
            type="number"
            min={0}
            max={360}
            value={Math.round(value)}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              onChange(((val % 360) + 360) % 360);
            }}
            className="w-13 bg-[#121215] border border-neutral-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-neutral-200 text-right focus:outline-none focus:border-neutral-500 transition-colors"
          />
          <span className="text-[10px] text-neutral-500 font-mono select-none">{unit}</span>
        </div>
      </div>

      {/* Pro Radial Encoder Dial */}
      <div
        ref={dialRef}
        onMouseDown={handleMouseDown}
        className={`relative w-12 h-12 rounded-full bg-gradient-to-b from-[#18181c] to-[#101014] border cursor-crosshair flex items-center justify-center select-none shadow-inner transition-all ${
          isDragging
            ? 'border-neutral-300 ring-2 ring-neutral-400/20'
            : 'border-neutral-700/80 hover:border-neutral-500'
        }`}
        title="Drag to rotate angle"
      >
        {/* Subtle Radial Marks */}
        <div className="absolute inset-1 rounded-full border border-neutral-800/60 pointer-events-none" />
        
        {/* Needle Line and Indicator */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line
            x1="24"
            y1="24"
            x2={pointerX}
            y2={pointerY}
            stroke="#e4e4e7"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Center Cap */}
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-200 border border-neutral-900 shadow z-10" />

        {/* Pointer Head Dot */}
        <div
          className="absolute w-2 h-2 rounded-full bg-white shadow-md transition-transform duration-75"
          style={{
            left: `${pointerX - 4}px`,
            top: `${pointerY - 4}px`
          }}
        />
      </div>
    </div>
  );
};
