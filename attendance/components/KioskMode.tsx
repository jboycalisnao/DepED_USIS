import React, { useEffect, useMemo, useState } from 'react';
import { ScanResult, TimeSlotSettings } from '../types';
import KioskHeader from './kiosk/KioskHeader';
import KioskStationCard from './kiosk/KioskStationCard';
import { getSessionInfo } from './kiosk/kioskUtils';

interface KioskModeProps {
  onExit: () => void;
  lastScanResults: (ScanResult | null)[];
  unknownTags: (string | null)[]; 
  settings: TimeSlotSettings;
}

const KioskMode: React.FC<KioskModeProps> = ({ onExit, lastScanResults, unknownTags, settings }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const session = useMemo(() => getSessionInfo(currentTime, settings), [currentTime, settings]);

  return (
    <div className="fixed inset-0 overflow-auto select-none bg-[#f6f8fc] text-gray-900 font-sans z-[2000]">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col px-4 py-4 md:px-6 md:py-6">
        <KioskHeader currentTime={currentTime} session={session} onExit={onExit} />

        <main className="mt-6 flex flex-1 gap-4 overflow-x-auto pb-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="min-w-[420px] flex-1">
              <KioskStationCard
                index={index}
                result={lastScanResults[index]}
                unknown={unknownTags[index]}
              />
            </div>
          ))}
        </main>

      </div>
    </div>
  );
};

export default KioskMode;
