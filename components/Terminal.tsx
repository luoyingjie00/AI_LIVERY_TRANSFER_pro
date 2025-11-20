import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import ProgressCard from './ProgressCard';

interface TerminalProps {
  logs: LogEntry[];
  progress: number;
  statusText: string;
}

const Terminal: React.FC<TerminalProps> = ({ logs, progress, statusText }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500 font-bold';
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-neutral-400';
      default: return 'text-neutral-400';
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      
      {/* Integrated Progress Header */}
      <ProgressCard progress={progress} statusText={statusText} />

      {/* Log Content */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 custom-scrollbar pr-2 min-h-0">
        {logs.length === 0 ? (
          <div className="text-neutral-700 italic flex flex-col h-full pt-2 opacity-50">
             <span className="">> 系统就绪 / SYSTEM READY</span>
             <span className="">> 等待指令 / AWAITING...</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-3 border-l-2 border-transparent hover:border-neutral-700 pl-2 py-0.5 transition-colors">
              <span className="text-neutral-600 shrink-0 select-none w-[50px]">
                {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' })}
              </span>
              <span className={`${getLogColor(log.type)} break-all`}>
                {log.type === 'success' && '>> '}
                {log.type === 'error' && '!! '}
                {log.type === 'warning' && 'WARN: '}
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Terminal;