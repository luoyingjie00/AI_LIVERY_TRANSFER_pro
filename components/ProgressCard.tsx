import React from 'react';

interface ProgressCardProps {
  progress: number; // 0-100
  statusText?: string;
}

const ProgressCard: React.FC<ProgressCardProps> = ({ progress, statusText }) => {
  const totalBars = 40;
  const activeBars = Math.floor((progress / 100) * totalBars);

  return (
    <div className="w-full mb-3 pb-3 border-b border-neutral-800/50">
        <div className="flex justify-between items-end mb-1.5">
            <div className="flex flex-col">
                <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest mb-0.5">CURRENT_STATUS</span>
                <span className="text-[10px] text-blue-200 font-mono tracking-wide uppercase">{statusText || "STANDBY"}</span>
            </div>
             <span className="text-sm font-bold text-white font-mono tracking-tighter">
                {Math.round(progress)}<span className="text-[10px] text-neutral-500 ml-0.5">%</span>
            </span>
        </div>
        
        {/* Segmented Progress Bar */}
        <div className="flex gap-[2px] h-1.5 w-full">
          {Array.from({ length: totalBars }).map((_, i) => (
            <div
              key={i}
              className={`
                flex-1 rounded-[1px] transition-all duration-150
                ${i < activeBars 
                  ? 'bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]' 
                  : 'bg-neutral-800'
                }
              `}
            />
          ))}
        </div>
    </div>
  );
};

export default ProgressCard;