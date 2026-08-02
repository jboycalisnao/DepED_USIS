import React, { useEffect, useMemo, useState } from 'react';
import { ConnectionStatus, ScanResult, AttendanceScheduleConfig, AttendanceSmsTestModeAction } from '../types';
import KioskHeader from './kiosk/KioskHeader';
import KioskStationCard from './kiosk/KioskStationCard';
import { getSessionInfo } from './kiosk/kioskUtils';

interface KioskModeProps {
  onExit: () => void;
  lastScanResults: (ScanResult | null)[];
  unknownTags: (string | null)[]; 
  settings: AttendanceScheduleConfig;
  monitorStatuses: ConnectionStatus[];
  smsTestModeEnabled: boolean;
  smsTestModeAction: AttendanceSmsTestModeAction;
  onSmsTestModeEnabledChange: (enabled: boolean) => void;
  onSmsTestModeActionChange: (action: AttendanceSmsTestModeAction) => void;
}

const KioskMode: React.FC<KioskModeProps> = ({
  onExit,
  lastScanResults,
  unknownTags,
  settings,
  monitorStatuses,
  smsTestModeEnabled,
  smsTestModeAction,
  onSmsTestModeEnabledChange,
  onSmsTestModeActionChange,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const kioskAlerts = [
    'Do not Unplug the USB Cable',
    'Do not close this laptop',
    'This is remotely controlled laptop, do not disturb',
  ];

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
          <label className={`inline-flex min-h-10 items-center gap-3 rounded-md border px-4 py-2 text-[11px] font-bold ${smsTestModeEnabled ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-600'}`}>
            <input
              type="checkbox"
              checked={smsTestModeEnabled}
              onChange={(event) => onSmsTestModeEnabledChange(event.target.checked)}
            />
            SMS Test
          </label>
          <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white p-1">
            <button
              type="button"
              className={`min-h-8 px-4 text-[11px] font-bold ${smsTestModeAction === 'entry' ? 'rounded bg-blue-700 text-white' : 'text-gray-600'}`}
              onClick={() => onSmsTestModeActionChange('entry')}
              disabled={!smsTestModeEnabled}
            >
              Entry
            </button>
            <button
              type="button"
              className={`min-h-8 px-4 text-[11px] font-bold ${smsTestModeAction === 'exit' ? 'rounded bg-blue-700 text-white' : 'text-gray-600'}`}
              onClick={() => onSmsTestModeActionChange('exit')}
              disabled={!smsTestModeEnabled}
            >
              Exit
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {kioskAlerts.map((alert) => (
            <div
              key={alert}
              className="flex min-h-14 items-center justify-center gap-3 rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-center text-[13px] font-bold text-red-800 shadow-[0_10px_24px_rgba(200,21,43,0.18)]"
            >
              <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden="true">
                warning
              </span>
              <span>{alert}</span>
            </div>
          ))}
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
