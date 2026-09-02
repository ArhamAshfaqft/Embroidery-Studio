import React from 'react';
import { ToolType } from '../types';
import { Hand, ZoomIn } from 'lucide-react';

interface ToolboxProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({
  activeTool,
  onSelectTool
}) => {
  const tools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string; hint: string }[] = [
    { id: 'hand', label: 'Hand Tool', icon: <Hand size={15} />, shortcut: 'H', hint: 'Pan canvas (or hold Space)' },
    { id: 'zoom', label: 'Zoom Tool', icon: <ZoomIn size={15} />, shortcut: 'Z', hint: 'Zoom in / out' }
  ];

  return (
    <div className="w-10 bg-[#141418] border-r border-white/[0.07] flex flex-col items-center py-2.5 space-y-1.5 select-none z-30 shrink-0">
      {tools.map((t) => {
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all relative group ${
              isActive
                ? 'bg-[#27272f] text-white shadow-sm border border-white/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05]'
            }`}
          >
            {t.icon}
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#1c1c22] border border-white/[0.12] rounded-md text-[11px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-2xl z-50">
              <div className="font-semibold flex items-center space-x-1">
                <span>{t.label}</span>
                <span className="text-neutral-400 font-mono text-[10px]">({t.shortcut})</span>
              </div>
              <div className="text-[9px] text-neutral-400 mt-0.5">{t.hint}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
