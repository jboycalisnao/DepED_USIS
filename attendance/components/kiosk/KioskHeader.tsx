import React from 'react';
import { SessionInfo, getSessionToneClasses, getCurrentTimeString } from './kioskUtils';

interface KioskHeaderProps {
  currentTime: Date;
  session: SessionInfo;
  onExit: () => void;
}

const KioskHeader: React.FC<KioskHeaderProps> = ({ currentTime, session, onExit }) => {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_96px] items-start gap-3">
      <div className="flex justify-start">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-[10px] font-bold text-gray-600 shadow-sm transition hover:text-[#123f9c]"
        >
          <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
          Return
        </button>
      </div>

      <div className="justify-self-center text-center">
        <div className="text-[clamp(4.4rem,9.5vw,8.2rem)] font-black leading-none tracking-normal text-[#123f9c] font-mono tabular-nums">
          {getCurrentTimeString(currentTime)}
        </div>
        <div className="mt-3 flex max-w-[92vw] flex-wrap items-center justify-center gap-2">
          {session.items.map((item) => (
            <div
              key={`${item.label}-${item.range}`}
              className={`inline-flex items-center gap-3 rounded-md border px-5 py-3 ${getSessionToneClasses(item.tone)}`}
            >
              <span className="material-symbols-outlined text-[18px] leading-none">event_seat</span>
              <span className="text-[11px] md:text-[12px] font-bold">
                {item.label}
              </span>
              <span className="h-1.5 w-1.5 rounded-md bg-current opacity-25" />
              <span className="text-[11px] md:text-[12px] font-bold">
                {item.range}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden="true" />
    </div>
  );
};

export default KioskHeader;
