
import { useState, useEffect } from 'react';
import { AttendanceRecord, AttendanceType } from '../types';
import { normalizeRfidValue } from '../utils/rfid';

export const useAttendance = () => {
  const [uidMappings, setUidMappings] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('rfid_mappings');
    if (!saved) return {};

    const parsed = JSON.parse(saved) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).map(([learnerId, uid]) => [learnerId, normalizeRfidValue(uid)])
    );
  });

  const [adminUids, setAdminUids] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin_uids');
    if (!saved) return [];

    return (JSON.parse(saved) as string[]).map(uid => normalizeRfidValue(uid));
  });

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('attendance_logs');
    const logs = saved ? JSON.parse(saved) : [];
    // Migration: Ensure all records have an ID
    return logs.map((log: any) => ({
      ...log,
      id: log.id || crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11)
    }));
  });

  useEffect(() => {
    localStorage.setItem('rfid_mappings', JSON.stringify(uidMappings));
  }, [uidMappings]);

  useEffect(() => {
    localStorage.setItem('admin_uids', JSON.stringify(adminUids));
  }, [adminUids]);

  useEffect(() => {
    localStorage.setItem('attendance_logs', JSON.stringify(attendanceLogs));
  }, [attendanceLogs]);

  const addMapping = (learnerId: string, uid: string) => {
    setUidMappings(prev => ({ ...prev, [learnerId]: normalizeRfidValue(uid) }));
  };

  const toggleAdmin = (uid: string) => {
    const normalizedUid = normalizeRfidValue(uid);
    setAdminUids(prev => 
      prev.includes(normalizedUid) ? prev.filter(u => u !== normalizedUid) : [...prev, normalizedUid]
    );
  };

  const logAttendance = (learnerId: string, type: AttendanceType) => {
    setAttendanceLogs(prev => [...prev, {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11),
      learnerId,
      type,
      timestamp: new Date().toISOString()
    }]);
  };

  const deleteRecord = (id: string) => {
    setAttendanceLogs(prev => prev.filter(log => log.id !== id));
  };

  const removeMapping = (learnerId: string) => {
    setUidMappings(prev => {
      const next = { ...prev };
      delete next[learnerId];
      return next;
    });
  };

  return { uidMappings, adminUids, attendanceLogs, addMapping, removeMapping, toggleAdmin, logAttendance, deleteRecord };
};
