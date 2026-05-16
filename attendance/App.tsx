
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSerial } from './hooks/useSerial';
import { useLearners } from './hooks/useLearners';
import { useAttendance } from './hooks/useAttendance';
import { useSettings } from './hooks/useSettings';
import { ScanResult, AttendanceType, TimeSlotSettings } from './types';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import KioskMode from './components/KioskMode';
import PairingConsole from './components/PairingConsole';
import LearnerDirectory from './components/LearnerDirectory';
import Terminal from './components/Terminal';
import AttendanceLogs from './components/AttendanceLogs';
import Settings from './components/Settings';
import { normalizeRfidValue } from './utils/rfid';
import AttendanceLandingPage from './features/auth/components/AttendanceLandingPage';
import {
  clearStoredAttendanceAccess,
  getStoredAttendanceAccess,
  type AttendanceAccessRecord,
} from './features/auth/utils/attendanceAccess';

const extractUid = (text: string): string | null => {
  const clean = text.trim().toUpperCase();
  if (clean.startsWith('UID:')) {
    return normalizeRfidValue(clean.replace('UID:', '').trim());
  }
  const decimalMatch = clean.match(/\b\d{10}\b/);
  if (decimalMatch) {
    return decimalMatch[0];
  }
  // Fallback for general hex patterns
  const hexPattern = /[0-9A-F]{2}(?:[\s:-]?[0-9A-F]{2}){6}/;
  const match = clean.match(hexPattern);
  if (match) return normalizeRfidValue(match[0]);
  return null;
};

const determineAttendanceType = (now: Date, settings: TimeSlotSettings): AttendanceType => {
  const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  
  if (time >= settings.amIn.start && time <= settings.amIn.end) return 'AM_IN';
  if (time >= settings.amOut.start && time <= settings.amOut.end) return 'AM_OUT';
  if (time >= settings.pmIn.start && time <= settings.pmIn.end) return 'PM_IN';
  if (time >= settings.pmOut.start && time <= settings.pmOut.end) return 'PM_OUT';
  
  return 'UNSCHEDULED';
};

const App: React.FC = () => {
  const [access, setAccess] = useState<AttendanceAccessRecord | null>(() => getStoredAttendanceAccess());
  const monitor1 = useSerial(0);
  const monitor2 = useSerial(1);
  const monitor3 = useSerial(2);
  
  const monitors = [monitor1, monitor2, monitor3];

  const { learners, isLoading, isSyncing, fetchedCount, getFiltered } = useLearners();
  const { uidMappings, adminUids, attendanceLogs, addMapping, removeMapping, toggleAdmin, logAttendance, deleteRecord } = useAttendance();
  const { settings, updateSettings } = useSettings();

  const [currentView, setCurrentView] = useState<'registrar' | 'attendance' | 'settings'>('registrar');
  const [isStandbyMode, setIsStandbyMode] = useState(false);

  const [baudRates, setBaudRates] = useState<number[]>(() => {
    return [0, 1, 2].map(i => {
      const saved = localStorage.getItem(`last_baud_rate_${i}`);
      return saved ? parseInt(saved) : 9600;
    });
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [activeRfid, setActiveRfid] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [scanFlash, setScanFlash] = useState(false);
  
  const [lastScanResults, setLastScanResults] = useState<(ScanResult | null)[]>([null, null, null]);
  const [unknownTags, setUnknownTags] = useState<(string | null)[]>([null, null, null]);
  
  const lastProcessedIds = useRef<(string | null)[]>([null, null, null]);
  const idleTimers = useRef<(number | null)[]>([null, null, null]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const clearIdleTimer = (index: number) => {
    if (idleTimers.current[index]) {
      window.clearTimeout(idleTimers.current[index]!);
      idleTimers.current[index] = null;
    }
  };

  const startIdleTimer = (index: number) => {
    clearIdleTimer(index);
    idleTimers.current[index] = window.setTimeout(() => {
      monitors[index].write('CLEAR');
      // Clear web UI state for this station
      setLastScanResults(prev => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
      setUnknownTags(prev => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    }, 5000); // 5 seconds idle
  };

  // Process logs for each monitor
  useEffect(() => {
    monitors.forEach((monitor, index) => {
      if (monitor.logs.length === 0) return;
      
      const lastLog = monitor.logs[monitor.logs.length - 1];
      if (!lastLog || lastLog.type !== 'in' || lastLog.id === lastProcessedIds.current[index]) return;

      const scannedUid = extractUid(lastLog.text);
      if (!scannedUid) return;

      lastProcessedIds.current[index] = lastLog.id;

      // MASTER KEY LOGIC
      if (adminUids.includes(scannedUid)) {
        setScanFlash(true);
        setTimeout(() => setScanFlash(false), 300);
        
        const entering = !isStandbyMode;
        setIsStandbyMode(entering);
        
        if (entering) {
          speak("Master key authorized. Entering Kiosk mode.");
        } else {
          speak("Master key authorized. System unlocked.");
        }
        return;
      }

      if (isStandbyMode) {
        const learner = learners.find(l => {
          const dbUid = normalizeRfidValue(l.rfid);
          const localUid = normalizeRfidValue(uidMappings[l.id]);
          return dbUid === scannedUid || localUid === scannedUid;
        });
        
        if (learner) {
          const now = new Date();
          const type = determineAttendanceType(now, settings);
          
          const todayStr = now.toDateString();
          const isDuplicate = attendanceLogs.some(log => {
            const logDate = new Date(log.timestamp).toDateString();
            return log.learnerId === learner.id && log.type === type && logDate === todayStr;
          });

          if (isDuplicate) {
            monitor.write('ERROR|Already Logged');
            setLastScanResults(prev => {
              const next = [...prev];
              next[index] = {
                learner, 
                type, 
                uid: scannedUid,
                isDuplicate: true,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
              return next;
            });
          } else {
            logAttendance(learner.id, type);
            monitor.write(`DISPLAY|${learner.last_name}|${learner.first_name}`);
            speak(`Welcome, ${learner.first_name}.`);

            setLastScanResults(prev => {
              const next = [...prev];
              next[index] = {
                learner, 
                type, 
                uid: scannedUid,
                isDuplicate: false,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
              return next;
            });
          }
          setUnknownTags(prev => {
            const next = [...prev];
            next[index] = null;
            return next;
          });
          startIdleTimer(index);
        } else {
          monitor.write('ERROR|Unknown Card');
          setUnknownTags(prev => {
            const next = [...prev];
            next[index] = scannedUid;
            return next;
          });
          setLastScanResults(prev => {
            const next = [...prev];
            next[index] = null;
            return next;
          });
          startIdleTimer(index);
        }
      } else {
        setScanFlash(true);
        setActiveRfid(scannedUid);
        setConflictWarning(null);
        
        const owner = learners.find(l => {
          const dbUid = normalizeRfidValue(l.rfid);
          const localUid = normalizeRfidValue(uidMappings[l.id]);
          return dbUid === scannedUid || localUid === scannedUid;
        });

        if (owner) {
          setConflictWarning(`Tag assigned to: ${owner.last_name}, ${owner.first_name}`);
        }
        setTimeout(() => setScanFlash(false), 500);
      }
    });
  }, [monitor1.logs, monitor2.logs, monitor3.logs, isStandbyMode, uidMappings, adminUids, learners, settings, logAttendance, attendanceLogs]);

  useEffect(() => {
    const hasActive = lastScanResults.some(r => r !== null) || unknownTags.some(t => t !== null);
    if (hasActive) {
      const t = setTimeout(() => { 
        setLastScanResults([null, null, null]); 
        setUnknownTags([null, null, null]); 
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [lastScanResults, unknownTags]);

  const handleSaveMapping = () => {
    if (!selectedLearnerId || !activeRfid || conflictWarning) return;
    addMapping(selectedLearnerId, activeRfid);
    setActiveRfid('');
    setSelectedLearnerId(null);
    setConflictWarning(null);
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 400);
  };

  const filteredLearners = useMemo(() => 
    getFiltered(searchQuery, uidMappings), 
    [searchQuery, learners, uidMappings, getFiltered]
  );

  const selectedLearner = learners.find(l => l.id === selectedLearnerId) || null;

  if (isStandbyMode) {
    return (
      <KioskMode 
        onExit={() => setIsStandbyMode(false)} 
        lastScanResults={lastScanResults} 
        unknownTags={unknownTags} 
        settings={settings}
      />
    );
  }

  if (!access) {
    return <AttendanceLandingPage onAuthenticated={setAccess} />;
  }

  return (
    <div className="attendance-app min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900">
      <header className="site-chrome">
        <div className="content-width">
          <div className="attendance-header">
            <UsisUnifiedHeader
              searchId="attendance-search"
              searchLabel="Search attendance module"
              searchPlaceholder="Keywords"
              onSearchSubmit={(event) => event.preventDefault()}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <nav className="kit-nav" aria-label="Attendance module sections">
              <div className="kit-nav__grid">
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentView('registrar');
                  }}
                  className={`kit-nav__link ${currentView === 'registrar' ? 'kit-nav__link--active' : ''}`}
                >
                  Registrar
                </a>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentView('attendance');
                  }}
                  className={`kit-nav__link ${currentView === 'attendance' ? 'kit-nav__link--active' : ''}`}
                >
                  Attendance Records
                </a>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentView('settings');
                  }}
                  className={`kit-nav__link ${currentView === 'settings' ? 'kit-nav__link--active' : ''}`}
                >
                  Settings
                </a>
              </div>
            </nav>
          </div>
        </div>
      </header>
      <div className="attendance-shell flex-grow space-y-8">
        <div className="attendance-toolbar">
          <button
            onClick={() => setIsStandbyMode(true)}
            className="attendance-toolbar__kiosk"
            type="button"
          >
            Kiosk Mode
          </button>
          <div className="attendance-toolbar__monitors">
            {monitors.map((m, i) => (
              <div key={i} className="attendance-toolbar__monitor">
                <span className="attendance-toolbar__label">M{i + 1}</span>
                <select
                  value={baudRates[i]}
                  onChange={e => {
                    const baudRate = Number(e.target.value);
                    setBaudRates(prev => {
                      const next = [...prev];
                      next[i] = baudRate;
                      return next;
                    });
                    localStorage.setItem(`last_baud_rate_${i}`, baudRate.toString());
                  }}
                >
                  <option value={9600}>9600</option>
                  <option value={115200}>115200</option>
                </select>
                <button
                  onClick={m.status === 'connected' ? () => monitors[i].disconnect() : () => monitors[i].connect({ baudRate: baudRates[i] })}
                  type="button"
                >
                  {m.status === 'connected' ? 'OFF' : 'ON'}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="attendance-session-row">
          <p className="attendance-session-row__text">
            Signed in: <strong>{access.displayName}</strong> | {access.schoolName}
          </p>
          <button
            className="attendance-session-row__logout"
            type="button"
            onClick={() => {
              clearStoredAttendanceAccess();
              setAccess(null);
            }}
          >
            Sign Out
          </button>
        </div>

        <main className="attendance-main animate-in fade-in duration-700">
          {currentView === 'registrar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                <PairingConsole 
                  activeRfid={activeRfid} 
                  selectedLearner={selectedLearner} 
                  conflictWarning={conflictWarning} 
                  scanFlash={scanFlash} 
                  onSave={handleSaveMapping}
                  isAdmin={adminUids.includes(activeRfid)}
                  onToggleAdmin={() => toggleAdmin(activeRfid)}
                />
                
                <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm leading-none">terminal</span>
                      Serial Monitors
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {monitors.map((m, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Monitor {i + 1}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${m.status === 'connected' ? 'bg-success-50 text-success-700 border border-success-600/10' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                            {m.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="h-32 rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
                          <Terminal logs={m.logs.slice(-50)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="lg:col-span-8 space-y-6">
                <LearnerDirectory 
                  learners={filteredLearners} 
                  uidMappings={uidMappings} 
                  selectedId={selectedLearnerId} 
                  onSelect={setSelectedLearnerId} 
                  onUnlink={removeMapping}
                  isLoading={isLoading} 
                  isSearching={searchQuery.trim().length > 0}
                  isSyncing={isSyncing} 
                  fetchedCount={fetchedCount} 
                />
              </div>
            </div>
          )}
          
          {currentView === 'attendance' && (
            <AttendanceLogs logs={attendanceLogs} learners={learners} onDelete={deleteRecord} />
          )}

          {currentView === 'settings' && (
            <Settings settings={settings} onUpdate={updateSettings} />
          )}
        </main>
      </div>

      <UsisGlobalFooter />
    </div>
  );
};

export default App;
