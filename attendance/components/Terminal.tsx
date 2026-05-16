
import React, { useEffect, useRef } from 'react';
import { SerialLog } from '../types';

interface TerminalProps {
  logs: SerialLog[];
}

const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogStyle = (type: SerialLog['type']) => {
    switch (type) {
      case 'in': return 'text-success-400 font-bold';
      case 'out': return 'text-primary-400';
      case 'error': return 'text-error-400 font-bold underline';
      case 'info': return 'text-gray-500 italic';
      default: return 'text-gray-600';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });
  };

  return (
    <div 
      ref={scrollRef}
      className="h-full w-full p-6 overflow-y-auto font-mono text-[12px] leading-relaxed no-scrollbar bg-gray-900"
    >
      {logs.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-700 gap-3">
          <span className="material-symbols-outlined text-3xl leading-none">sensors_off</span>
          <p className="font-bold uppercase tracking-widest text-[10px]">No Signal</p>
        </div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="flex gap-4 py-1 border-b border-white/5 hover:bg-white/5 transition-colors group">
            <span className="text-gray-600 group-hover:text-gray-500 select-none whitespace-nowrap text-[10px] tabular-nums">
              [{formatTimestamp(log.timestamp)}]
            </span>
            <span className={`whitespace-pre-wrap break-all ${getLogStyle(log.type)}`}>
              {log.text}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

export default Terminal;
