import React, { useEffect, useMemo, useState } from 'react';
import { ConnectionStatus, ScanResult, AttendanceScheduleConfig } from '../types';
import KioskHeader from './kiosk/KioskHeader';
import KioskStationCard from './kiosk/KioskStationCard';
import { getSessionInfo } from './kiosk/kioskUtils';

interface KioskModeProps {
  onExit: () => void;
  lastScanResults: (ScanResult | null)[];
  unknownTags: (string | null)[]; 
  settings: AttendanceScheduleConfig;
  monitorStatuses: ConnectionStatus[];
}

const KioskMode: React.FC<KioskModeProps> = ({ onExit, lastScanResults, unknownTags, settings, monitorStatuses }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const session = useMemo(() => getSessionInfo(currentTime, settings), [currentTime, settings]);
  const connectedCount = monitorStatuses.filter((status) => status === 'connected').length;

  return (
    <div className="fixed inset-0 overflow-auto select-none bg-[#f6f8fc] text-gray-900 font-sans z-[2000]">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col px-4 py-4 md:px-6 md:py-6">
        <KioskHeader currentTime={currentTime} session={session} onExit={onExit} />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-bold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {connectedCount} / {monitorStatuses.length} devices connected
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-[11px] font-bold text-gray-600">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-300" aria-hidden="true" />
            Disconnected stations are disabled automatically
          </div>
        </div>

        <main className="mt-6 flex flex-1 gap-4 overflow-x-auto pb-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="min-w-[420px] flex-1">
              <KioskStationCard
                index={index}
                result={lastScanResults[index]}
                unknown={unknownTags[index]}
                isConnected={monitorStatuses[index] === 'connected'}
              />
            </div>
          ))}
        </main>

      </div>
    </div>
  );
};

export default KioskMode;
