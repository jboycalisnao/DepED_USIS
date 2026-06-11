
import { useState, useEffect, useMemo, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useSerial } from './hooks/useSerial';
import { useLearners } from './hooks/useLearners';
import { useAttendance } from './hooks/useAttendance';
import { useSettings } from './hooks/useSettings';
import { ScanResult, AttendanceType, TimeSlotSettings } from './types';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
import KioskMode from './components/KioskMode';
import PairingConsole from './components/PairingConsole';
import LearnerDirectory from './components/LearnerDirectory';
import Terminal from './components/Terminal';
import AttendanceLogs from './components/AttendanceLogs';
import Settings from './components/Settings';
import AttendanceSummaryPage from './features/reports/components/AttendanceSummaryPage';
import { normalizeRfidValue } from './utils/rfid';
import AttendanceLandingPage from './features/auth/components/AttendanceLandingPage';
import {
  clearStoredAttendanceAccess,
  getStoredAttendanceAccess,
  type AttendanceAccessRecord,
} from './features/auth/utils/attendanceAccess';
import {
  ATTENDANCE_DEFAULT_PATH,
  ATTENDANCE_LAST_PATH_KEY,
  resolveAttendancePath,
} from './utils/attendanceRoutePersistence';

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

function App() {
  const [access, setAccess] = useState<AttendanceAccessRecord | null>(() => getStoredAttendanceAccess());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const monitor1 = useSerial(0);
  const monitor2 = useSerial(1);
  const monitor3 = useSerial(2);
  
  const monitors = [monitor1, monitor2, monitor3];

  const {
    settings,
    updateSettings,
    activeSchoolYear,
    isSchoolYearsLoading,
    schoolYears,
    selectedSchoolYearId,
    setSelectedSchoolYearId,
  } = useSettings();
  const {
    learners,
    isLoading,
    isSyncing,
    fetchedCount,
    getFiltered,
    saveLearnerRfid,
    clearLearnerRfid,
    registerLearner,
    loadLearners,
    hasCachedRoster,
    lastSyncedAt,
  } = useLearners(selectedSchoolYearId);
  const {
    uidMappings,
    adminUids,
    attendanceLogs,
    addMapping,
    removeMapping,
    toggleAdmin,
    logAttendance,
    addManualAttendanceRecord,
    deleteRecord,
    querySummaryByDateRange,
    refreshAttendanceStatusByRange,
  } = useAttendance();

  const [isStandbyMode, setIsStandbyMode] = useState(false);
  const currentView: 'registrar' | 'attendance' | 'summary' | 'settings' = useMemo(() => {
    if (location.pathname.startsWith('/records')) return 'attendance';
    if (location.pathname.startsWith('/summary')) return 'summary';
    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'registrar';
  }, [location.pathname]);

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
  const usbRfidBufferRef = useRef('');
  const usbRfidTimerRef = useRef<number | null>(null);
  const restoredAttendancePath = useMemo(() => {
    if (typeof window === 'undefined') return '/registrar';
    const savedPath = window.localStorage.getItem(ATTENDANCE_LAST_PATH_KEY) || ATTENDANCE_DEFAULT_PATH;
    return resolveAttendancePath(savedPath, ATTENDANCE_DEFAULT_PATH);
  }, []);

  useEffect(() => {
    if (!selectedLearnerId) return;
    if (learners.some((learner) => learner.id === selectedLearnerId)) return;
    setSelectedLearnerId(null);
  }, [learners, selectedLearnerId]);

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

  useEffect(() => {
    const clearUsbTimer = () => {
      if (usbRfidTimerRef.current) {
        window.clearTimeout(usbRfidTimerRef.current);
        usbRfidTimerRef.current = null;
      }
    };

    const finalizeUsbUid = () => {
      clearUsbTimer();
      const raw = usbRfidBufferRef.current.trim();
      usbRfidBufferRef.current = '';
      if (!raw) return;

      const scannedUid = normalizeRfidValue(raw);
      if (!scannedUid) return;

      if (adminUids.includes(scannedUid)) {
        setScanFlash(true);
        setTimeout(() => setScanFlash(false), 300);
        const entering = !isStandbyMode;
        setIsStandbyMode(entering);
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

          if (!isDuplicate) {
            logAttendance(learner.id, type);
          }

          setLastScanResults(prev => {
            const next = [...prev];
            next[0] = {
              learner,
              type,
              uid: scannedUid,
              isDuplicate,
              time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            return next;
          });
          setUnknownTags(prev => {
            const next = [...prev];
            next[0] = null;
            return next;
          });
        } else {
          setUnknownTags(prev => {
            const next = [...prev];
            next[0] = scannedUid;
            return next;
          });
          setLastScanResults(prev => {
            const next = [...prev];
            next[0] = null;
            return next;
          });
        }
        return;
      }

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
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;

      if (event.key === 'Enter') {
        finalizeUsbUid();
        return;
      }

      if (event.key === 'Backspace') {
        usbRfidBufferRef.current = usbRfidBufferRef.current.slice(0, -1);
        return;
      }

      if (event.key.length === 1 && /[0-9a-fA-F]/.test(event.key)) {
        usbRfidBufferRef.current += event.key.toUpperCase();
        clearUsbTimer();
        usbRfidTimerRef.current = window.setTimeout(finalizeUsbUid, 120);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearUsbTimer();
    };
  }, [adminUids, attendanceLogs, isStandbyMode, learners, logAttendance, settings, uidMappings]);

  const handleSaveMapping = async () => {
    if (!selectedLearnerId || !activeRfid || conflictWarning) return;
    const persist = await saveLearnerRfid(selectedLearnerId, activeRfid);
    if (!persist.ok) {
      setConflictWarning(persist.error);
      return;
    }
    addMapping(selectedLearnerId, activeRfid);
    setActiveRfid('');
    setSelectedLearnerId(null);
    setConflictWarning(null);
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 400);
  };

  const handleUnlinkMapping = async (learnerId: string) => {
    const result = await clearLearnerRfid(learnerId);
    if (!result.ok) {
      setConflictWarning(result.error);
      return;
    }
    removeMapping(learnerId);
    if (selectedLearnerId === learnerId) {
      setSelectedLearnerId(null);
    }
  };

  const filteredLearners = useMemo(() => 
    getFiltered(searchQuery, uidMappings), 
    [searchQuery, learners, uidMappings, getFiltered]
  );

  const selectedLearner = learners.find(l => l.id === selectedLearnerId) || null;
  const profileInitials = String(access?.displayName || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('') || 'US';
  const currentSectionLabel =
    currentView === 'registrar'
      ? 'Registrar'
      : currentView === 'attendance'
        ? 'Attendance Records'
        : currentView === 'summary'
          ? 'Attendance Summary'
          : 'Settings';

  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (profileMenuRef.current.contains(event.target as Node)) return;
      setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      ATTENDANCE_LAST_PATH_KEY,
      resolveAttendancePath(`${location.pathname}${location.search}${location.hash}`, ATTENDANCE_DEFAULT_PATH)
    );
  }, [location.hash, location.pathname, location.search]);

  if (isStandbyMode) {
    return (
      <>
        <UsisPortalGate moduleKey="attendance" />
        <KioskMode 
          onExit={() => setIsStandbyMode(false)} 
          lastScanResults={lastScanResults} 
          unknownTags={unknownTags} 
          settings={settings}
        />
      </>
    );
  }

  if (!access) {
    return (
      <>
        <UsisPortalGate moduleKey="attendance" />
        <AttendanceLandingPage onAuthenticated={setAccess} />
      </>
    );
  }

  return (
    <div className="attendance-app min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900">
      <UsisPortalGate moduleKey="attendance" />
      <header className="site-chrome attendance-chrome">
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
          </div>
        </div>
      </header>
      <div className="attendance-shell flex-grow">
        <section className="attendance-page-intro" aria-label="Current attendance page">
          <p className="attendance-breadcrumb">
            <span className="attendance-breadcrumb__root">Attendance Portal</span>
            <span className="attendance-breadcrumb__sep" aria-hidden="true">/</span>
            <span className="attendance-breadcrumb__current">{currentSectionLabel}</span>
          </p>
          <div className="attendance-header__actions">
            <div className="attendance-profile-menu" ref={profileMenuRef}>
              <button
                type="button"
                className="attendance-profile-chip"
                title={access.displayName}
                aria-label={`Signed in as ${access.displayName}`}
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((current) => !current)}
              >
                {profileInitials}
              </button>
              {isProfileOpen ? (
                <div className="attendance-profile-popover" role="menu" aria-label="Profile menu">
                  <div className="attendance-profile-popover__avatar" aria-hidden="true">
                    {profileInitials}
                  </div>
                  <p className="attendance-profile-popover__name">{access.displayName}</p>
                  <p className="attendance-profile-popover__meta">{access.schoolName}</p>
                  <div className="attendance-profile-popover__divider" />
                  <button
                    type="button"
                    className="attendance-profile-popover__logout"
                    onClick={() => {
                      clearStoredAttendanceAccess();
                      setAccess(null);
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="attendance-logout-icon">
                      <path d="M3 4.5h10v15H3v-15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M13 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="m18 8 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
        <div className="attendance-layout">
          <aside className="attendance-side-nav" aria-label="Attendance sections">
            <nav className="attendance-side-nav__menu">
              <button
                type="button"
                className={`attendance-side-nav__link ${currentView === 'registrar' ? 'attendance-side-nav__link--active' : ''}`}
                onClick={() => navigate('/registrar')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">badge</span>
                Registrar
              </button>
              <button
                type="button"
                className={`attendance-side-nav__link ${currentView === 'attendance' ? 'attendance-side-nav__link--active' : ''}`}
                onClick={() => navigate('/records')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">event_note</span>
                Attendance Records
              </button>
              <button
                type="button"
                className={`attendance-side-nav__link ${currentView === 'summary' ? 'attendance-side-nav__link--active' : ''}`}
                onClick={() => navigate('/summary')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">query_stats</span>
                Attendance Summary
              </button>
              <button
                type="button"
                className={`attendance-side-nav__link ${currentView === 'settings' ? 'attendance-side-nav__link--active' : ''}`}
                onClick={() => navigate('/settings')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">settings</span>
                Settings
              </button>
            </nav>
            <div className="attendance-side-nav__footer">
              <button
                className="attendance-side-nav__logout"
                type="button"
                onClick={() => {
                  clearStoredAttendanceAccess();
                  setAccess(null);
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">logout</span>
                Sign Out
              </button>
            </div>
          </aside>
          <div className="attendance-content space-y-8">
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
            <main className="attendance-main animate-in fade-in duration-700">
              <Routes>
                <Route
                  path="/registrar"
                  element={
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

                        <section className="bg-white rounded-md p-6 shadow-sm border border-gray-200">
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
                                <div className="h-32 rounded-md overflow-hidden bg-gray-50 border border-gray-200">
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
                          rosterLearners={learners}
                          activeRfid={activeRfid}
                          uidMappings={uidMappings}
                          selectedId={selectedLearnerId}
                          onSelect={setSelectedLearnerId}
                          onUnlink={handleUnlinkMapping}
                          onLoadRoster={() => void loadLearners()}
                          onRegisterLearner={registerLearner}
                          isLoading={isLoading}
                          isSearching={searchQuery.trim().length > 0}
                          isSyncing={isSyncing}
                          fetchedCount={fetchedCount}
                          hasCachedRoster={hasCachedRoster}
                          lastSyncedAt={lastSyncedAt}
                        />
                      </div>
                    </div>
                  }
                />
                <Route
                  path="/records"
                  element={
                    <AttendanceLogs
                      logs={attendanceLogs}
                      learners={learners}
                      onDelete={deleteRecord}
                      onAddManualRecord={addManualAttendanceRecord}
                      refreshAttendanceStatusByRange={refreshAttendanceStatusByRange}
                    />
                  }
                />
                <Route
                  path="/summary"
                  element={<AttendanceSummaryPage onQuerySummaryRange={querySummaryByDateRange} />}
                />
                <Route
                  path="/settings"
                  element={
                    <Settings
                      activeSchoolYearLabel={activeSchoolYear?.label || ''}
                      isSchoolYearsLoading={isSchoolYearsLoading}
                      onSchoolYearChange={setSelectedSchoolYearId}
                      onUpdate={updateSettings}
                      schoolYears={schoolYears}
                      selectedSchoolYearId={selectedSchoolYearId}
                      settings={settings}
                    />
                  }
                />
                <Route path="/" element={<Navigate to={restoredAttendancePath} replace />} />
                <Route path="*" element={<Navigate to={restoredAttendancePath} replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>

      <UsisGlobalFooter />
    </div>
  );
}

export default App;
