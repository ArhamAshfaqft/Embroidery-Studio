import React from 'react';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  length: number;
  zoom: number;
  offset: number;
  cursorPos?: number;
}

export const Ruler: React.FC<RulerProps> = ({
  orientation,
  length,
  zoom,
  offset,
  cursorPos
}) => {
  const isHorizontal = orientation === 'horizontal';

  // Major tick step in pixels
  const desired = 80 / Math.max(0.001, zoom);
  const magnitude = 10 ** Math.floor(Math.log10(desired));
  const step = ([1, 2, 5, 10].find(n => n * magnitude >= desired) ?? 10) * magnitude;
  const ticks = [];

  const startVal = Math.floor(-offset / (step * zoom)) * step;
  const endVal = startVal + (length / zoom) + step * 2;

  for (let val = startVal; val <= endVal; val += step) {
    const pos = offset + val * zoom;
    if (pos >= 0 && pos <= length) {
      ticks.push({ val, pos });
    }
  }

  if (isHorizontal) {
    return (
      <div className="h-4 bg-[#141418] border-b border-white/[0.08] relative overflow-hidden select-none font-mono text-[8px] text-neutral-500">
        {ticks.map((t) => (
          <div
            key={t.val}
            className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
            style={{ left: `${t.pos}px` }}
          >
            <div className="w-[1px] h-2.5 bg-neutral-600" />
            <span className="transform -translate-x-1/2 -translate-y-0.5 leading-none">
              {t.val}
            </span>
          </div>
        ))}
        {cursorPos !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-[1px] bg-red-500/80 pointer-events-none z-10"
            style={{ left: `${cursorPos}px` }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-4 bg-[#141418] border-r border-white/[0.08] relative overflow-hidden select-none font-mono text-[8px] text-neutral-500">
      {ticks.map((t) => (
        <div
          key={t.val}
          className="absolute left-0 right-0 flex items-center justify-between pointer-events-none"
          style={{ top: `${t.pos}px` }}
        >
          <div className="h-[1px] w-2.5 bg-neutral-600" />
          <span className="transform -translate-y-1/2 leading-none origin-left rotate-90 scale-75">
            {t.val}
          </span>
        </div>
      ))}
      {cursorPos !== undefined && (
        <div
          className="absolute left-0 right-0 h-[1px] bg-red-500/80 pointer-events-none z-10"
          style={{ top: `${cursorPos}px` }}
        />
      )}
    </div>
  );
};
