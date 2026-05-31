
import React, { useState, useEffect } from 'react';
import { ScanResult, AttendanceType, TimeSlotSettings } from '../types';

interface KioskModeProps {
  onExit: () => void;
  lastScanResults: (ScanResult | null)[];
  unknownTags: (string | null)[];
  settings: TimeSlotSettings;
}

const KioskMode: React.FC<KioskModeProps> = ({ onExit, lastScanResults, unknownTags, settings }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getSessionInfo = () => {
    const timeStr = currentTime.getHours().toString().padStart(2, '0') + ':' + currentTime.getMinutes().toString().padStart(2, '0');
    
    if (timeStr >= settings.amIn.start && timeStr <= settings.amIn.end) 
      return { label: 'Morning Entry', range: `${settings.amIn.start} — ${settings.amIn.end}` };
    if (timeStr >= settings.amOut.start && timeStr <= settings.amOut.end) 
      return { label: 'Morning Exit', range: `${settings.amOut.start} — ${settings.amOut.end}` };
    if (timeStr >= settings.pmIn.start && timeStr <= settings.pmIn.end) 
      return { label: 'Afternoon Entry', range: `${settings.pmIn.start} — ${settings.pmIn.end}` };
    if (timeStr >= settings.pmOut.start && timeStr <= settings.pmOut.end) 
      return { label: 'Afternoon Exit', range: `${settings.pmOut.start} — ${settings.pmOut.end}` };
    
    return { label: 'Out of Session', range: 'Archiving as Unscheduled' };
  };

  const session = getSessionInfo();

  const getStatusColor = (result: ScanResult) => {
    if (result.isDuplicate) return 'text-accent-600 bg-accent-50 border-accent-100';
    
    switch (result.type) {
      case 'AM_IN': return 'text-success-600 bg-success-50 border-success-100';
      case 'AM_OUT': return 'text-accent-600 bg-accent-50 border-accent-100';
      case 'PM_IN': return 'text-primary-600 bg-primary-50 border-primary-100';
      case 'PM_OUT': return 'text-primary-600 bg-primary-50 border-primary-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 text-gray-900 flex flex-col items-center z-[2000] overflow-hidden select-none font-sans">
      {/* Subtle Background Decorative Blur */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-[40vmax] h-[40vmax] bg-primary-100 rounded-md blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[40vmax] h-[40vmax] bg-accent-100 rounded-md blur-[120px] translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Exit Button */}
      <button 
        onClick={onExit}
        className="absolute top-6 left-6 bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 text-gray-500 hover:text-primary-600 px-5 py-2.5 rounded-md font-bold text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 z-50 group"
      >
        <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform leading-none">arrow_back</span>
        Return
      </button>

      {/* Top Section: Clock & Session */}
      <div className="w-full flex flex-col items-center gap-2 py-10 z-10 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="text-[10vh] font-black text-primary-600 font-mono tracking-tighter tabular-nums leading-none drop-shadow-sm">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>
        <div className="flex items-center justify-center gap-3 px-8 py-3 bg-white/80 backdrop-blur-md rounded-md border border-gray-200 shadow-sm">
          <span className="material-symbols-outlined text-accent-600 text-xl leading-none">event_seat</span>
          <span className="text-[12px] font-black text-gray-700 uppercase tracking-widest">{session.label}</span>
          <span className="w-1.5 h-1.5 bg-gray-300 rounded-md" />
          <span className="text-[12px] font-black text-primary-600 uppercase tracking-widest">{session.range}</span>
        </div>
      </div>

      {/* Main Content Area: 3 Columns */}
      <div className="w-full flex-1 flex gap-6 px-6 pb-10 z-10 overflow-hidden">
        {[0, 1, 2].map(index => {
          const result = lastScanResults[index];
          const unknown = unknownTags[index];

          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-center relative bg-white/60 backdrop-blur-sm rounded-md border border-white/40 shadow-xl overflow-hidden transition-all duration-500">
              <div className="absolute top-8 left-8 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-md bg-primary-500 animate-pulse" />
                <span className="text-[14px] font-black text-primary-600 uppercase tracking-[0.25em]">STATION {index + 1}</span>
              </div>

              {!result && !unknown ? (
                <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-700">
                  <div className="w-[20vh] h-[20vh] bg-white rounded-md flex items-center justify-center relative border border-gray-100 shadow-2xl">
                    <div className="absolute inset-0 bg-primary-100 rounded-md animate-ping opacity-20" />
                    <span className="material-symbols-outlined text-[10vh] text-primary-600/30 leading-none">contactless</span>
                  </div>
                  <div className="text-center">
                    <h2 className="text-[4vh] font-black tracking-tighter text-gray-300 uppercase leading-none">READY FOR SCAN</h2>
                  </div>
                </div>
              ) : result ? (
                <div className="w-full h-full p-10 flex flex-col justify-center text-center space-y-8 animate-in slide-in-from-bottom-10 duration-500 border-t-[12px] border-success-600 bg-white">
                  <div className="flex justify-center">
                    <div className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-md ${getStatusColor(result)} font-black shadow-sm border`}>
                      <span className="material-symbols-outlined text-base leading-none">
                        {result.isDuplicate ? 'history' : 'check_circle'}
                      </span>
                      <span className="text-[12px] font-black uppercase tracking-widest">
                        {result.isDuplicate ? 'ALREADY LOGGED' : 'Verified'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-8">
                    {/* Learner Photo Placeholder */}
                    <div className="relative">
                      <div className="w-[22vh] h-[22vh] rounded-md overflow-hidden border-8 border-gray-50 shadow-2xl">
                        <img 
                          src={`https://picsum.photos/seed/${result.learner.id}/400/400`} 
                          alt="Learner" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-success-500 rounded-md border-4 border-white flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-white text-[20px] font-bold">check</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-[4.5vh] font-black text-gray-900 leading-none uppercase tracking-tighter break-words">
                          {result.learner.first_name}<br/>{result.learner.last_name}
                        </h3>
                        <div className="inline-block text-[12px] font-black text-gray-500 uppercase tracking-[0.2em] bg-gray-50 px-6 py-2.5 rounded-md border border-gray-200">
                          {result.learner.grade_level} • {result.learner.section_name}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center gap-3 text-primary-600 font-black tracking-widest text-2xl">
                        <span className="material-symbols-outlined text-2xl leading-none">schedule</span>
                        {result.time}
                      </div>
                    </div>
                  </div>

                  {result.isDuplicate && (
                    <div className="bg-accent-50 rounded-md py-3 px-6 inline-block border border-accent-100">
                      <p className="text-accent-700 text-[10px] font-black uppercase tracking-widest">Duplicate Entry</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full p-10 flex flex-col justify-center text-center space-y-8 animate-in shake duration-500 border-b-[12px] border-accent-600 bg-white">
                  <div className="w-[15vh] h-[15vh] bg-accent-50 rounded-md flex items-center justify-center mx-auto border border-accent-100 shadow-inner">
                    <span className="material-symbols-outlined text-[8vh] text-accent-600 leading-none">warning</span>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-[4vh] font-black text-gray-900 uppercase leading-tight tracking-tighter">Access Restricted</h3>
                    <div className="space-y-2">
                      <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest font-mono">UID: {unknown}</p>
                      <div className="h-1.5 w-16 bg-accent-100 rounded-md mx-auto" />
                      <p className="text-[12px] font-black text-accent-600 uppercase tracking-widest">Unknown ID</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="w-full flex justify-center items-center py-6 flex-shrink-0 z-10 opacity-40">
        <p className="text-[12px] font-black text-gray-400 uppercase tracking-[0.8em]">Multi-Station Hub Active</p>
      </div>
    </div>
  );
};

export default KioskMode;

