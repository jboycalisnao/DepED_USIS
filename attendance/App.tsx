
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useSerial } from './hooks/useSerial';
import { useLearners } from './hooks/useLearners';
import { useAttendance } from './hooks/useAttendance';
import { useSettings } from './hooks/useSettings';
import { AttendanceSmsTestModeAction, AttendanceType, ScanResult } from './types';
import { UsisUnifiedHeader } from '../common/header/UsisUnifiedHeader';
import { UsisGlobalFooter } from '../common/footer/UsisGlobalFooter';
import { UsisPortalGate } from '../common/components/UsisPortalGate';
import KioskMode from './components/KioskMode';
import PairingConsole from './components/PairingConsole';
import LearnerDirectory from './components/LearnerDirectory';
import Terminal from './components/Terminal';
import AttendanceLogs from './components/AttendanceLogs';
import Settings from './components/Settings';
import { normalizeRfidValue } from './utils/rfid';
import AttendanceLandingPage from './features/auth/components/AttendanceLandingPage';
import TeacherAttendanceLandingPage from './features/auth/components/TeacherAttendanceLandingPage';
import SmsNotificationPage from './features/sms/components/SmsNotificationPage';
import { buildAttendanceSmsRequest } from './features/sms/services/buildAttendanceSmsRequest';
import { formatSmsIsoTimestamp } from './features/sms/utils/smsMessageTemplate';
import { useSmsNotificationQueue } from './features/sms/hooks/useSmsNotificationQueue';
import {
  clearStoredAttendanceAccess,
  getStoredAttendanceAccess,
  resolveAttendanceAccess,
  type AttendanceAccessRecord,
} from './features/auth/utils/attendanceAccess';
import {
  clearStoredTeacherAttendanceAccess,
  getStoredTeacherAttendanceAccess,
  type TeacherAttendanceAccessRecord,
} from './features/auth/utils/teacherAttendanceAccess';
import TeacherSectionAttendancePage from './features/teacher/components/TeacherSectionAttendancePage';
import { resolveAttendanceDecision } from './utils/attendanceSchedule';
import {
  ATTENDANCE_BASENAME,
  ATTENDANCE_DEFAULT_PATH,
  ATTENDANCE_KIOSK_PATH,
  ATTENDANCE_LAST_PATH_KEY,
  ATTENDANCE_LAST_NON_KIOSK_PATH_KEY,
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

function App() {
  const [access, setAccess] = useState<AttendanceAccessRecord | null>(() => getStoredAttendanceAccess());
  const [teacherAccess, setTeacherAccess] = useState<TeacherAttendanceAccessRecord | null>(() => getStoredTeacherAttendanceAccess());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [shellExitAuthOpen, setShellExitAuthOpen] = useState(false);
  const [shellExitUsername, setShellExitUsername] = useState('');
  const [shellExitPassword, setShellExitPassword] = useState('');
  const [shellExitError, setShellExitError] = useState<string | null>(null);
  const [isShellExitChecking, setIsShellExitChecking] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const monitor1 = useSerial(0);
  const monitor2 = useSerial(1);
  const monitor3 = useSerial(2);
  
  const monitors = [monitor1, monitor2, monitor3];

  const {
    settings: scheduleConfig,
    updateSettings,
    classDayConfig,
    setClassDayConfig,
    noClassDates,
    setNoClassDates,
    smsSettings,
    setSmsSettings,
    smsRecipientState,
    setSmsRecipientState,
    activeSchoolYear,
    isSettingsLoading,
    isSchoolYearsLoading,
    isSettingsSaving,
    settingsError,
    schoolYears,
    selectedSchoolYearId,
    setSelectedSchoolYearId,
  } = useSettings();
  const {
    queueItems: smsQueueItems,
    logEntries: smsLogEntries,
    enqueueRequests: enqueueSmsRequests,
    retryTodayFailedMessages: retryTodayFailedSmsMessages,
    clearHistory: clearSmsHistory,
    isProcessing: isSmsQueueProcessing,
    stats: smsQueueStats,
  } = useSmsNotificationQueue();
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
    queryAttendanceRecordsByRange,
    refreshAttendanceStatusByRange,
  } = useAttendance();

  const currentView: 'registrar' | 'attendance' | 'settings' | 'sms' = useMemo(() => {
    if (location.pathname.startsWith('/records')) return 'attendance';
    if (location.pathname.startsWith('/settings')) return 'settings';
    if (location.pathname.startsWith('/sms')) return 'sms';
    return 'registrar';
  }, [location.pathname]);
  const isTeacherRoute = location.pathname.startsWith('/teacher');
  const isKioskRoute = location.pathname.startsWith(ATTENDANCE_KIOSK_PATH);

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
  const [kioskSmsTestEnabled, setKioskSmsTestEnabled] = useState(false);
  const [kioskSmsTestAction, setKioskSmsTestAction] = useState<AttendanceSmsTestModeAction>('entry');
  const [isLearnerRegistrationOpen, setIsLearnerRegistrationOpen] = useState(false);
  
  const lastProcessedIds = useRef<(string | null)[]>([null, null, null]);
  const idleTimers = useRef<(number | null)[]>([null, null, null]);
  const previousMonitorStatuses = useRef(monitors.map((monitor) => monitor.status));
  const lastDisconnectEmailAt = useRef<number[]>([0, 0, 0]);
  const usbRfidBufferRef = useRef('');
  const usbRfidTimerRef = useRef<number | null>(null);
  const restoredAttendancePath = useMemo(() => {
    if (typeof window === 'undefined') return '/registrar';
    const savedPath = window.localStorage.getItem(ATTENDANCE_LAST_PATH_KEY) || ATTENDANCE_DEFAULT_PATH;
    return resolveAttendancePath(savedPath, ATTENDANCE_DEFAULT_PATH);
  }, []);
  const kioskSmsTestAttendanceType: AttendanceType = kioskSmsTestAction === 'exit' ? 'PM_OUT' : 'AM_IN';
  const readerDiagnostics = useMemo(
    () =>
      monitors.map((monitor, index) => ({
        index,
        status: monitor.status,
        lastInput: [...monitor.logs].reverse().find((log) => log.type === 'in') || null,
        lastError: [...monitor.logs].reverse().find((log) => log.type === 'error') || null,
      })),
    [monitor1.logs, monitor1.status, monitor2.logs, monitor2.status, monitor3.logs, monitor3.status],
  );

  const openKioskFromReaderTap = useCallback(() => {
    const currentPath = resolveAttendancePath(`${location.pathname}${location.search}${location.hash}`, ATTENDANCE_DEFAULT_PATH);
    window.localStorage.setItem(ATTENDANCE_LAST_NON_KIOSK_PATH_KEY, currentPath);
    navigate(ATTENDANCE_KIOSK_PATH);
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    monitors.forEach((monitor, index) => {
      const previousStatus = previousMonitorStatuses.current[index];
      const latestError = [...monitor.logs].reverse().find((log) => log.type === 'error');
      const isHardwareDisconnect =
        previousStatus === 'connected' &&
        monitor.status === 'disconnected' &&
        Boolean(latestError?.text.toLowerCase().includes('hardware disconnected'));

      if (!isHardwareDisconnect) {
        previousMonitorStatuses.current[index] = monitor.status;
        return;
      }

      const now = Date.now();
      if (now - lastDisconnectEmailAt.current[index] < 5 * 60 * 1000) {
        previousMonitorStatuses.current[index] = monitor.status;
        return;
      }

      lastDisconnectEmailAt.current[index] = now;
      previousMonitorStatuses.current[index] = monitor.status;

      void fetch('/api/kiosk-disconnect-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationName: `Monitor ${index + 1}`,
          status: monitor.status,
          occurredAt: new Date(now).toISOString(),
          details: latestError?.text || `Monitor ${index + 1} serial device disconnected.`,
        }),
      })
        .then(async (response) => {
          if (response.ok) return;
          const payload = await response.json().catch(() => null);
          console.warn(`Monitor ${index + 1} disconnect email notification was not sent:`, payload || response.statusText);
        })
        .catch((error) => {
          console.warn(`Monitor ${index + 1} disconnect email notification failed:`, error);
        });
    });
  }, [monitor1.logs, monitor1.status, monitor2.logs, monitor2.status, monitor3.logs, monitor3.status]);

  const handleRegistrarRfidCapture = useCallback((value: string) => {
    const scannedUid = extractUid(value) || normalizeRfidValue(value);
    if (!scannedUid) return;

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
    window.setTimeout(() => setScanFlash(false), 500);
  }, [learners, uidMappings]);

  useEffect(() => {
    if (isKioskRoute) return;

    const latestReaderSignal = readerDiagnostics
      .map((diagnostic) => diagnostic.lastInput)
      .filter((log): log is NonNullable<typeof log> => Boolean(log))
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())[0];

    const scannedUid = extractUid(latestReaderSignal?.text || '');
    if (!scannedUid || scannedUid === activeRfid) return;

    if (!isLearnerRegistrationOpen) {
      openKioskFromReaderTap();
      return;
    }

    handleRegistrarRfidCapture(scannedUid);
  }, [activeRfid, handleRegistrarRfidCapture, isKioskRoute, isLearnerRegistrationOpen, openKioskFromReaderTap, readerDiagnostics]);

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

      const lastProcessedIndex = monitor.logs.findIndex((log) => log.id === lastProcessedIds.current[index]);
      const newLogs = monitor.logs.slice(lastProcessedIndex + 1);
      if (newLogs.length === 0) return;

      lastProcessedIds.current[index] = newLogs[newLogs.length - 1].id;

      const uidLog = [...newLogs].reverse().find((log) => log.type === 'in' && extractUid(log.text));
      if (!uidLog) return;

      const scannedUid = extractUid(uidLog.text);
      if (!scannedUid) return;

      // MASTER KEY LOGIC
      if (adminUids.includes(scannedUid)) {
        setScanFlash(true);
        setTimeout(() => setScanFlash(false), 300);
        if (isKioskRoute) {
          const fallbackPath = window.localStorage.getItem(ATTENDANCE_LAST_NON_KIOSK_PATH_KEY) || ATTENDANCE_DEFAULT_PATH;
          navigate(resolveAttendancePath(fallbackPath, ATTENDANCE_DEFAULT_PATH));
        } else {
          navigate(ATTENDANCE_KIOSK_PATH);
        }
        return;
      }

      if (isKioskRoute) {
          const learner = learners.find(l => {
          const dbUid = normalizeRfidValue(l.rfid);
          const localUid = normalizeRfidValue(uidMappings[l.id]);
          return dbUid === scannedUid || localUid === scannedUid;
        });
        
        if (learner) {
          const now = new Date();
          const decision = resolveAttendanceDecision(String(learner.grade_level || ''), now, scheduleConfig);
          const type = kioskSmsTestEnabled ? kioskSmsTestAttendanceType : decision.type;

          if (kioskSmsTestEnabled) {
            const smsRequest = buildAttendanceSmsRequest(learner, type, now, smsSettings, smsRecipientState);
            if (smsRequest) {
              enqueueSmsRequests([smsRequest]);
              monitor.write(`DISPLAY|SMS TEST|${kioskSmsTestAction.toUpperCase()}`);
            } else {
              monitor.write('ERROR|SMS Not Ready');
            }

            setLastScanResults(prev => {
              const next = [...prev];
              next[index] = {
                learner,
                type,
                uid: scannedUid,
                isLate: false,
                isDuplicate: false,
                time: formatSmsIsoTimestamp(now)
              };
              return next;
            });
            setUnknownTags(prev => {
              const next = [...prev];
              next[index] = null;
              return next;
            });
            startIdleTimer(index);
            return;
          }
          
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
                isLate: decision.isLate,
                isDuplicate: true,
                time: formatSmsIsoTimestamp(now)
              };
              return next;
            });
          } else {
            logAttendance(learner.id, type, decision.isLate);
            const smsRequest = buildAttendanceSmsRequest(learner, type, now, smsSettings, smsRecipientState);
            if (smsRequest) {
              enqueueSmsRequests([smsRequest]);
            }
            monitor.write(`DISPLAY|${learner.last_name}|${learner.first_name}`);

            setLastScanResults(prev => {
              const next = [...prev];
              next[index] = {
                learner, 
                type, 
                uid: scannedUid,
                isLate: decision.isLate,
                isDuplicate: false,
                time: formatSmsIsoTimestamp(now)
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
        if (!isLearnerRegistrationOpen) {
          openKioskFromReaderTap();
          return;
        }
        handleRegistrarRfidCapture(scannedUid);
      }
    });
  }, [monitor1.logs, monitor2.logs, monitor3.logs, isKioskRoute, uidMappings, adminUids, learners, scheduleConfig, logAttendance, attendanceLogs, navigate, smsSettings, smsRecipientState, enqueueSmsRequests, kioskSmsTestEnabled, kioskSmsTestAttendanceType, kioskSmsTestAction, handleRegistrarRfidCapture, isLearnerRegistrationOpen, openKioskFromReaderTap]);

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

      const scannedUid = extractUid(raw);
      if (!scannedUid) return;

      if (adminUids.includes(scannedUid)) {
        setScanFlash(true);
        setTimeout(() => setScanFlash(false), 300);
        if (isKioskRoute) {
          const fallbackPath = window.localStorage.getItem(ATTENDANCE_LAST_NON_KIOSK_PATH_KEY) || ATTENDANCE_DEFAULT_PATH;
          navigate(resolveAttendancePath(fallbackPath, ATTENDANCE_DEFAULT_PATH));
        } else {
          navigate(ATTENDANCE_KIOSK_PATH);
        }
        return;
      }

      if (isKioskRoute) {
        const learner = learners.find(l => {
          const dbUid = normalizeRfidValue(l.rfid);
          const localUid = normalizeRfidValue(uidMappings[l.id]);
          return dbUid === scannedUid || localUid === scannedUid;
        });

        if (learner) {
          const now = new Date();
          const decision = resolveAttendanceDecision(String(learner.grade_level || ''), now, scheduleConfig);
          const type = kioskSmsTestEnabled ? kioskSmsTestAttendanceType : decision.type;

          if (kioskSmsTestEnabled) {
            const smsRequest = buildAttendanceSmsRequest(learner, type, now, smsSettings, smsRecipientState);
            if (smsRequest) {
              enqueueSmsRequests([smsRequest]);
            }

            setLastScanResults(prev => {
              const next = [...prev];
              next[0] = {
                learner,
                type,
                uid: scannedUid,
                isLate: false,
                isDuplicate: false,
                time: formatSmsIsoTimestamp(now),
              };
              return next;
            });
            setUnknownTags(prev => {
              const next = [...prev];
              next[0] = null;
              return next;
            });
            return;
          }

          const todayStr = now.toDateString();
          const isDuplicate = attendanceLogs.some(log => {
            const logDate = new Date(log.timestamp).toDateString();
            return log.learnerId === learner.id && log.type === type && logDate === todayStr;
          });

          if (!isDuplicate) {
            logAttendance(learner.id, type, decision.isLate);
            const smsRequest = buildAttendanceSmsRequest(learner, type, now, smsSettings, smsRecipientState);
            if (smsRequest) {
              enqueueSmsRequests([smsRequest]);
            }
          }

          setLastScanResults(prev => {
            const next = [...prev];
            next[0] = {
              learner,
              type,
              uid: scannedUid,
              isLate: decision.isLate,
              isDuplicate,
              time: formatSmsIsoTimestamp(now),
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

      if (!isLearnerRegistrationOpen) {
        openKioskFromReaderTap();
        return;
      }

      handleRegistrarRfidCapture(scannedUid);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Tab') {
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

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      clearUsbTimer();
    };
  }, [adminUids, attendanceLogs, isKioskRoute, learners, logAttendance, scheduleConfig, uidMappings, navigate, smsSettings, smsRecipientState, enqueueSmsRequests, kioskSmsTestEnabled, kioskSmsTestAttendanceType, handleRegistrarRfidCapture, isLearnerRegistrationOpen, openKioskFromReaderTap]);

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
        : currentView === 'settings'
            ? 'Settings'
            : 'SMS Notification';

  const goToAttendancePath = (path: string) => {
    const resolvedPath = resolveAttendancePath(path, ATTENDANCE_DEFAULT_PATH);
    const nextUrl = `${ATTENDANCE_BASENAME}${resolvedPath}`;
    if (window.location.pathname === nextUrl) return;
    window.location.assign(nextUrl);
  };

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
    if (isTeacherRoute) return;
    const currentPath = resolveAttendancePath(`${location.pathname}${location.search}${location.hash}`, ATTENDANCE_DEFAULT_PATH);
    window.localStorage.setItem(
      ATTENDANCE_LAST_PATH_KEY,
      currentPath
    );
    if (!isKioskRoute) {
      window.localStorage.setItem(ATTENDANCE_LAST_NON_KIOSK_PATH_KEY, currentPath);
    }
  }, [isKioskRoute, isTeacherRoute, location.hash, location.pathname, location.search]);

  useEffect(() => {
    const shouldWarnBeforeExit = Boolean(access || teacherAccess || isKioskRoute);
    if (!shouldWarnBeforeExit) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Attendance kiosk is still running.';
      return 'Attendance kiosk is still running.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
    return () => window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
  }, [access, teacherAccess, isKioskRoute]);

  useEffect(() => {
    const shellApi = (window as any).usisKioskShell;
    if (!shellApi?.onExitAuthRequest) return;

    return shellApi.onExitAuthRequest(() => {
      setShellExitError(null);
      setShellExitPassword('');
      setShellExitAuthOpen(true);
    });
  }, []);

  const shellExitAuthModal = shellExitAuthOpen ? (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" aria-hidden="true" />
      <form
        className="modal-dialog max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-shell-exit-title"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsShellExitChecking(true);
          setShellExitError(null);
          const result = await resolveAttendanceAccess(shellExitUsername, shellExitPassword);
          setIsShellExitChecking(false);

          if (result.error || !result.record) {
            setShellExitError(result.error || 'Invalid attendance credentials.');
            return;
          }

          setShellExitAuthOpen(false);
          setShellExitUsername('');
          setShellExitPassword('');
          (window as any).usisKioskShell?.approveExit?.();
        }}
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Kiosk Shell</p>
            <h3 id="attendance-shell-exit-title">Authorize Window Close</h3>
          </div>
        </div>
        <div className="modal-dialog__body">
          <div className="form-grid">
            <label className="floating-field">
              <div className="floating-field__control" data-has-value={shellExitUsername.trim() ? 'true' : 'false'}>
                <input
                  type="text"
                  value={shellExitUsername}
                  onChange={(event) => setShellExitUsername(event.target.value)}
                  autoComplete="username"
                  placeholder=" "
                  autoFocus
                />
                <span>Username</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control" data-has-value={shellExitPassword ? 'true' : 'false'}>
                <input
                  type="password"
                  value={shellExitPassword}
                  onChange={(event) => setShellExitPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder=" "
                />
                <span>Password</span>
              </div>
            </label>
          </div>
          {shellExitError ? <p className="attendance-manual-modal__error">{shellExitError}</p> : null}
        </div>
        <div className="modal-dialog__actions">
          <button
            type="button"
            className="modal-dialog__secondary"
            disabled={isShellExitChecking}
            onClick={() => {
              setShellExitAuthOpen(false);
              setShellExitError(null);
              setShellExitPassword('');
              (window as any).usisKioskShell?.denyExit?.();
            }}
          >
            Keep Kiosk Open
          </button>
          <button type="submit" className="modal-dialog__blue" disabled={isShellExitChecking}>
            {isShellExitChecking ? 'Checking...' : 'Close Window'}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  if (isKioskRoute) {
    return (
      <>
        <UsisPortalGate moduleKey="attendance" />
        <KioskMode 
          onExit={() => {
            const fallbackPath = window.localStorage.getItem(ATTENDANCE_LAST_NON_KIOSK_PATH_KEY) || ATTENDANCE_DEFAULT_PATH;
            navigate(resolveAttendancePath(fallbackPath, ATTENDANCE_DEFAULT_PATH));
          }} 
          lastScanResults={lastScanResults} 
          unknownTags={unknownTags} 
          settings={scheduleConfig}
          monitorStatuses={monitors.map((monitor) => monitor.status)}
          smsTestModeEnabled={kioskSmsTestEnabled}
          smsTestModeAction={kioskSmsTestAction}
          onSmsTestModeEnabledChange={setKioskSmsTestEnabled}
          onSmsTestModeActionChange={setKioskSmsTestAction}
        />
        {shellExitAuthModal}
      </>
    );
  }

  if (isTeacherRoute) {
    if (!teacherAccess) {
      return (
        <>
          <UsisPortalGate moduleKey="attendance" />
          <TeacherAttendanceLandingPage
            onAuthenticated={(record) => {
              setTeacherAccess(record);
            }}
          />
          {shellExitAuthModal}
        </>
      );
    }

    return (
      <div className="attendance-app min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900">
        <UsisPortalGate moduleKey="attendance" />
        <TeacherSectionAttendancePage
          access={teacherAccess}
          schoolYearLabel={activeSchoolYear?.label || ''}
          learners={learners}
          scheduleConfig={scheduleConfig}
          classDayConfig={classDayConfig}
          noClassDates={noClassDates}
          onLogout={() => {
            clearStoredTeacherAttendanceAccess();
            setTeacherAccess(null);
            navigate('/teacher', { replace: true });
          }}
          queryAttendanceRecordsByRange={queryAttendanceRecordsByRange}
        />
        {shellExitAuthModal}
      </div>
    );
  }

  if (!access) {
    return (
      <>
        <UsisPortalGate moduleKey="attendance" />
        <AttendanceLandingPage onAuthenticated={setAccess} />
        {shellExitAuthModal}
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
                onClick={() => goToAttendancePath('/registrar')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">badge</span>
                Registrar
              </button>
              <button
                type="button"
                className={`attendance-side-nav__link ${currentView === 'attendance' ? 'attendance-side-nav__link--active' : ''}`}
                onClick={() => goToAttendancePath('/records')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">event_note</span>
                Attendance Records
              </button>
              <button
                type="button"
                className={`attendance-side-nav__link ${currentView === 'settings' ? 'attendance-side-nav__link--active' : ''}`}
                onClick={() => goToAttendancePath('/settings')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">settings</span>
                Settings
              </button>
              <button
                type="button"
                className={`attendance-side-nav__link ${currentView === 'sms' ? 'attendance-side-nav__link--active' : ''}`}
                onClick={() => goToAttendancePath('/sms')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">sms</span>
                SMS Notification
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
                onClick={() => {
                  const currentPath = resolveAttendancePath(`${location.pathname}${location.search}${location.hash}`, ATTENDANCE_DEFAULT_PATH);
                  window.localStorage.setItem(ATTENDANCE_LAST_NON_KIOSK_PATH_KEY, currentPath);
                  navigate(ATTENDANCE_KIOSK_PATH);
                }}
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
              <Routes key={location.pathname}>
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
                          onReaderValueChange={handleRegistrarRfidCapture}
                          readerDiagnostics={readerDiagnostics}
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
                          onReaderValueChange={handleRegistrarRfidCapture}
                          onLoadRoster={() => void loadLearners()}
                          onRegisterLearner={registerLearner}
                          onRegistrationModalOpenChange={setIsLearnerRegistrationOpen}
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
                      scheduleConfig={scheduleConfig}
                      onDelete={deleteRecord}
                      onAddManualRecord={addManualAttendanceRecord}
                      refreshAttendanceStatusByRange={refreshAttendanceStatusByRange}
                    />
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Settings
                      activeSchoolYearLabel={activeSchoolYear?.label || ''}
                      isSettingsLoading={isSettingsLoading}
                      isSchoolYearsLoading={isSchoolYearsLoading}
                      isSettingsSaving={isSettingsSaving}
          classDayConfig={classDayConfig}
          noClassDates={noClassDates}
          onScheduleConfigChange={updateSettings}
          onClassDayConfigChange={setClassDayConfig}
          onNoClassDatesChange={setNoClassDates}
          smsSettings={smsSettings}
          onSmsSettingsChange={setSmsSettings}
          onSchoolYearChange={setSelectedSchoolYearId}
          schoolYears={schoolYears}
                      selectedSchoolYearId={selectedSchoolYearId}
                      scheduleConfig={scheduleConfig}
                      settingsError={settingsError}
                    />
                  }
                />
                <Route
                  path="/sms"
                  element={
                    <SmsNotificationPage
                      learners={learners}
                      smsSettings={smsSettings}
                      smsRecipientState={smsRecipientState}
                      onSmsRecipientStateChange={setSmsRecipientState}
                      queueItems={smsQueueItems}
                      logEntries={smsLogEntries}
                      clearHistory={clearSmsHistory}
                      retryTodayFailedMessages={retryTodayFailedSmsMessages}
                      isProcessing={isSmsQueueProcessing}
                      stats={smsQueueStats}
                      isSettingsLoading={isSettingsLoading}
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
      {shellExitAuthModal}
    </div>
  );
}

export default App;
