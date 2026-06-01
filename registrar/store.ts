
import { useState, useEffect } from 'react';
import { Student, SchoolYear, EnrollmentStatus, GradeLevel, Section, AcademicProgram } from './types';
import { SCHOOL_YEARS } from './constants';
import { supabase } from './lib/supabase';
import {
  clearStoredRegistrarAccess,
  getStoredRegistrarAccess,
  resolveRegistrarCoordinatorAccess,
  storeRegistrarAccess,
  type RegistrarAuthDebug,
  type RegistrarCoordinatorAccess,
} from './features/auth/coordinatorAccess';

/**
 * DATABASE SCHEMA REQUIREMENT:
 * Run schema.sql in your Supabase SQL Editor to resolve PGRST204 errors.
 */

export interface SystemUser {
  id: string;
  username: string;
  password: string;
  displayName: string;
}

const STORAGE_KEY_GL = 'leon_nhs_active_gls';
const STORAGE_KEY_STRANDS = 'leon_nhs_strands';
const STORAGE_KEY_PROGRAMS = 'leon_nhs_special_programs';
const REGISTRAR_TABLES = {
  users: 'usis_core_coordinators',
  learners: 'registrar_learners',
  submissions: 'registrar_public_enrollment_submissions',
  sections: 'registrar_sections',
  strands: 'registrar_strands',
  specialPrograms: 'registrar_special_programs',
  schoolYears: 'registrar_school_years',
  gradeLevels: 'registrar_grade_levels',
} as const;

// Shared State
let learners: Student[] = []; 
let sections: Section[] = [];
let schoolYears: SchoolYear[] = [...SCHOOL_YEARS].sort((a, b) => b.label.localeCompare(a.label));
let users: SystemUser[] = [];

let availableStrands: AcademicProgram[] = JSON.parse(localStorage.getItem(STORAGE_KEY_STRANDS) || '[]');
let availableSpecialPrograms: AcademicProgram[] = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRAMS) || '[]');
let activeSchoolYear: SchoolYear = schoolYears[0];
let activeGradeLevels: GradeLevel[] = JSON.parse(localStorage.getItem(STORAGE_KEY_GL) || '[]');

let hasConnectionError = false;
let isFirstLoad = true;
const existingAccess = getStoredRegistrarAccess();
let isAuthenticated = Boolean(existingAccess);
let registrarAccess: RegistrarCoordinatorAccess | null = existingAccess;
let isGlobalLoading = false;
let lastSyncTime = 0;

// Listeners
let learnersListeners: Array<(l: Student[]) => void> = [];
let sectionsListeners: Array<(s: Section[]) => void> = [];
let syListListeners: Array<(s: SchoolYear[]) => void> = [];
let usersListeners: Array<(u: SystemUser[]) => void> = [];
let strandsListeners: Array<(s: AcademicProgram[]) => void> = [];
let programsListeners: Array<(p: AcademicProgram[]) => void> = [];
let syListeners: Array<(sy: SchoolYear) => void> = [];
let glListeners: Array<(gl: GradeLevel[]) => void> = [];
let connectionListeners: Array<(err: boolean) => void> = [];
let authListeners: Array<(auth: boolean) => void> = [];
let loadingListeners: Array<(load: boolean) => void> = [];
let registrarAccessListeners: Array<(access: RegistrarCoordinatorAccess | null) => void> = [];
let registrarLoginDebug: RegistrarAuthDebug | null = null;
let registrarLoginDebugListeners: Array<(debug: RegistrarAuthDebug | null) => void> = [];

const notifyGradeLevels = () => glListeners.forEach(l => l([...activeGradeLevels]));
const notifyStrands = () => {
  localStorage.setItem(STORAGE_KEY_STRANDS, JSON.stringify(availableStrands));
  strandsListeners.forEach(l => l([...availableStrands]));
};
const notifyPrograms = () => {
  localStorage.setItem(STORAGE_KEY_PROGRAMS, JSON.stringify(availableSpecialPrograms));
  programsListeners.forEach(l => l([...availableSpecialPrograms]));
};
const notifyLoading = () => loadingListeners.forEach(l => l(isGlobalLoading));
const setGlobalLoading = (val: boolean) => { isGlobalLoading = val; notifyLoading(); };
const createId = () => Math.random().toString(36).substr(2, 9);

const mapLearnerToDb = (data: Partial<Student>) => {
  const sId = data.sectionId ? String(data.sectionId).trim() : null;
  return {
    id: data.id || Math.random().toString(36).substr(2, 9),
    lrn: data.lrn ? String(data.lrn).trim() : null,
    first_name: data.firstName || null,
    last_name: data.lastName || null,
    middle_name: data.middleName || null,
    birth_date: data.birthDate || null,
    gender: data.gender || null,
    address: data.address || null,
    contact_number: data.contactNumber || null,
    email: data.email || null,
    guardian_name: data.guardian_name || null,
    father_name: data.father_name || null,
    mother_name: data.mother_name || null,
    status: data.status || EnrollmentStatus.ENROLLED,
    section_id: sId,
    is_sslg: !!data.isSSLG,
    is_club_officer: !!data.isClubOfficer,
    is_athlete: !!data.isAthlete,
    is_artist: !!data.isArtist,
    is_4ps: !!data.is4Ps,
    is_indigent: !!data.isIndigent,
    login_username: data.loginUsername || null,
    login_password_plain: data.loginPassword || null,
    login_status: data.loginStatus || null,
    last_login_at: data.lastLoginAt || null,
    microsoft_user_id: data.microsoftUserId || null,
    microsoft_upn: data.microsoftUpn || null,
    microsoft_mail_nickname: data.microsoftMailNickname || null,
    microsoft_account_status: data.microsoftAccountStatus || null,
    microsoft_license_sku_id: data.microsoftLicenseSkuId || null,
    microsoft_created_at: data.microsoftCreatedAt || null,
    microsoft_last_synced_at: data.microsoftLastSyncedAt || null,
    org_affiliations: Array.isArray(data.orgAffiliations) ? data.orgAffiliations : [],
    enrollment_history: Array.isArray(data.enrollments) ? data.enrollments : []
  };
};

const mapDbToLearner = (l: any): Student => ({
  id: String(l.id).trim(),
  lrn: l.lrn,
  loginUsername: l.login_username || l.portal_username || l.username || l.lrn || '',
  loginPassword: l.login_password_plain || l.portal_password_plain || l.login_password || l.portal_password || '',
  loginStatus: l.login_status || (l.is_login_active === false ? 'Disabled' : 'Active'),
  lastLoginAt: l.last_login_at || '',
  microsoftUserId: l.microsoft_user_id || '',
  microsoftUpn: l.microsoft_upn || '',
  microsoftMailNickname: l.microsoft_mail_nickname || '',
  microsoftAccountStatus: l.microsoft_account_status || '',
  microsoftLicenseSkuId: l.microsoft_license_sku_id || '',
  microsoftCreatedAt: l.microsoft_created_at || '',
  microsoftLastSyncedAt: l.microsoft_last_synced_at || '',
  firstName: l.first_name || l.firstName || '',
  lastName: l.last_name || l.lastName || '',
  middleName: l.middle_name || l.middleName || '',
  birthDate: l.birth_date || l.birthDate || '',
  gender: l.gender,
  address: l.address,
  contactNumber: l.contact_number || l.contactNumber || '',
  email: l.email || '',
  guardian_name: l.guardian_name,
  father_name: l.father_name,
  mother_name: l.mother_name,
  status: l.status,
  sectionId: String(l.section_id || l.sectionId || '').trim(),
  isSSLG: !!(l.is_sslg ?? l.isSSLG),
  isClubOfficer: !!(l.is_club_officer ?? l.isClubOfficer),
  isAthlete: !!(l.is_athlete ?? l.isAthlete),
  isArtist: !!(l.is_artist ?? l.isArtist),
  is4Ps: !!(l.is_4ps ?? l.is4Ps),
  isIndigent: !!(l.is_indigent ?? l.isIndigent),
  orgAffiliations: l.org_affiliations || l.orgAffiliations || [],
  enrollments: l.enrollment_history || l.enrollments || []
});

const mapDbToSection = (s: any): Section => ({
  id: String(s.id).trim(),
  name: s.name || 'Unnamed Section',
  gradeLevel: (s.grade_level || s.gradeLevel || GradeLevel.GRADE_7) as GradeLevel,
  adviserName: s.adviser_name || s.adviserName || '',
  strand: s.strand || '',
  schoolYearId: String(s.school_year_id || s.schoolYearId || activeSchoolYear.id).trim()
});

const mapDbToUser = (u: any): SystemUser => ({
  id: String(u.id).trim(),
  username: u.username,
  password: u.password_plain || u.password_hash || '',
  displayName:
    [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ').trim() ||
    u.display_name ||
    u.displayName ||
    'System User'
});

const mapDbToProgram = (p: any): AcademicProgram => ({
  id: String(p.id).trim(),
  acronym: p.acronym || p.name || 'UNK',
  fullName: p.full_name || p.fullName || p.description || 'Unknown'
});

const updateConnectionStatus = (err: boolean) => {
  hasConnectionError = err;
  connectionListeners.forEach(l => l(hasConnectionError));
};

const fetchAllFromTable = async (
  tableName: string,
  updateFn: (data: any[]) => void,
  retryWhenOffline = false
) => {
  if (hasConnectionError && !retryWhenOffline) {
    return;
  }

  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
      updateConnectionStatus(true);
      return;
    }
    updateConnectionStatus(false);
    updateFn(data || []);
  } catch (err) {
    updateConnectionStatus(true);
  }
};

const fetchUsers = async () => {
  if (!registrarAccess?.schoolUuid) {
    users = [];
    usersListeners.forEach((listener) => listener(users));
    return;
  }

  if (hasConnectionError) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from(REGISTRAR_TABLES.users)
      .select('*')
      .eq('school_id', registrarAccess.schoolUuid)
      .order('created_at', { ascending: false });

    if (error) {
      updateConnectionStatus(true);
      return;
    }

    updateConnectionStatus(false);
    users = (data || []).map(mapDbToUser);
    usersListeners.forEach((listener) => listener(users));
  } catch {
    updateConnectionStatus(true);
  }
};

const fetchLearners = () => fetchAllFromTable(REGISTRAR_TABLES.learners, (data) => {
  learners = data.map(mapDbToLearner);
  isFirstLoad = false;
  learnersListeners.forEach(l => l(learners));
});

const fetchSections = () => fetchAllFromTable(REGISTRAR_TABLES.sections, (data) => {
  sections = data.map(mapDbToSection);
  sectionsListeners.forEach(l => l(sections));
});

const fetchSchoolYears = (retryWhenOffline = false) => fetchAllFromTable(REGISTRAR_TABLES.schoolYears, (data) => {
  const mapped = data.map(sy => ({
    id: String(sy.id).trim(),
    label: sy.label,
    isActive: !!(sy.is_active ?? sy.isActive),
    isLocked: !!(sy.is_locked ?? sy.isLocked)
  })).sort((a, b) => b.label.localeCompare(a.label));

  if (mapped.length > 0) {
    schoolYears = mapped;
    const active = schoolYears.find(sy => sy.isActive);
    if (active) {
      activeSchoolYear = active;
      syListeners.forEach(l => l(activeSchoolYear));
    }
  }
  syListListeners.forEach(l => l(schoolYears));
}, retryWhenOffline);

const fetchGradeLevels = () => fetchAllFromTable(REGISTRAR_TABLES.gradeLevels, (data) => {
  if (data && data.length > 0) {
    activeGradeLevels = data
      .filter(gl => !!(gl.is_active ?? gl.isActive))
      .map(gl => gl.id as GradeLevel);
    localStorage.setItem(STORAGE_KEY_GL, JSON.stringify(activeGradeLevels));
  }
  notifyGradeLevels();
});

const fetchStrands = () => fetchAllFromTable(REGISTRAR_TABLES.strands, (data) => {
  availableStrands = data.map(mapDbToProgram).sort((a, b) => a.acronym.localeCompare(b.acronym));
  notifyStrands();
});

const fetchPrograms = () => fetchAllFromTable(REGISTRAR_TABLES.specialPrograms, (data) => {
  availableSpecialPrograms = data.map(mapDbToProgram).sort((a, b) => a.acronym.localeCompare(b.acronym));
  notifyPrograms();
});

// Parallel Hydration on startup
const initializeStore = async () => {
  setGlobalLoading(true);
  try {
    await fetchSchoolYears(true); // Probe backend first to avoid repeated DNS failures.
    if (hasConnectionError) {
      return;
    }
    await Promise.allSettled([
      fetchUsers(),
      fetchLearners(),
      fetchSections(),
      fetchStrands(),
      fetchPrograms(),
      fetchGradeLevels()
    ]);
    lastSyncTime = Date.now();
  } finally {
    setGlobalLoading(false);
  }
};

initializeStore();

export const useStore = () => {
  const [currentLearners, setCurrentLearners] = useState<Student[]>(learners);
  const [currentSections, setCurrentSections] = useState<Section[]>(sections);
  const [currentSYList, setCurrentSYList] = useState<SchoolYear[]>(schoolYears);
  const [currentUsers, setCurrentUsers] = useState<SystemUser[]>(users);
  const [currentStrands, setCurrentStrands] = useState<AcademicProgram[]>(availableStrands);
  const [currentPrograms, setCurrentPrograms] = useState<AcademicProgram[]>(availableSpecialPrograms);
  const [currentSY, setCurrentSY] = useState<SchoolYear>(activeSchoolYear);
  const [currentGLs, setCurrentGLs] = useState<GradeLevel[]>(activeGradeLevels);
  const [connectionError, setConnectionError] = useState<boolean>(hasConnectionError);
  const [isAuth, setIsAuth] = useState<boolean>(isAuthenticated);
  const [loading, setLoading] = useState(isGlobalLoading);
  const [currentRegistrarAccess, setCurrentRegistrarAccess] = useState<RegistrarCoordinatorAccess | null>(registrarAccess);
  const [currentRegistrarLoginDebug, setCurrentRegistrarLoginDebug] = useState<RegistrarAuthDebug | null>(registrarLoginDebug);

  useEffect(() => {
    const lListener = (newList: Student[]) => setCurrentLearners([...newList]);
    const sListener = (newSecs: Section[]) => setCurrentSections([...newSecs]);
    const syLListener = (newSYs: SchoolYear[]) => setCurrentSYList([...newSYs]);
    const uListener = (newUsers: SystemUser[]) => setCurrentUsers([...newUsers]);
    const strandListener = (newStrands: AcademicProgram[]) => setCurrentStrands([...newStrands]);
    const progListener = (newProgs: AcademicProgram[]) => setCurrentPrograms([...newProgs]);
    const syListener = (newSY: SchoolYear) => setCurrentSY(newSY);
    const glListener = (newGLs: GradeLevel[]) => setCurrentGLs([...newGLs]);
    const cListener = (err: boolean) => setConnectionError(err);
    const aListener = (auth: boolean) => setIsAuth(auth);
    const loadListener = (load: boolean) => setLoading(load);
    const registrarAccessListener = (access: RegistrarCoordinatorAccess | null) => setCurrentRegistrarAccess(access);
    const registrarLoginDebugListener = (debug: RegistrarAuthDebug | null) => setCurrentRegistrarLoginDebug(debug);
    
    learnersListeners.push(lListener);
    sectionsListeners.push(sListener);
    syListListeners.push(syLListener);
    usersListeners.push(uListener);
    strandsListeners.push(strandListener);
    programsListeners.push(progListener);
    syListeners.push(syListener);
    glListeners.push(glListener);
    connectionListeners.push(cListener);
    authListeners.push(aListener);
    loadingListeners.push(loadListener);
    registrarAccessListeners.push(registrarAccessListener);
    registrarLoginDebugListeners.push(registrarLoginDebugListener);
    
    return () => {
      learnersListeners = learnersListeners.filter(l => l !== lListener);
      sectionsListeners = sectionsListeners.filter(l => l !== sListener);
      syListListeners = syListListeners.filter(l => l !== syLListener);
      usersListeners = usersListeners.filter(l => l !== uListener);
      strandsListeners = strandsListeners.filter(l => l !== strandListener);
      programsListeners = programsListeners.filter(l => l !== progListener);
      syListeners = syListeners.filter(l => l !== syListener);
      glListeners = glListeners.filter(l => l !== glListener);
      connectionListeners = connectionListeners.filter(l => l !== cListener);
      authListeners = authListeners.filter(l => l !== aListener);
      loadingListeners = loadingListeners.filter(l => l !== loadListener);
      registrarAccessListeners = registrarAccessListeners.filter(l => l !== registrarAccessListener);
      registrarLoginDebugListeners = registrarLoginDebugListeners.filter(l => l !== registrarLoginDebugListener);
    };
  }, []);

  const refreshData = async (force: boolean = false) => {
    // Only refresh if data is older than 5 minutes or forced
    if (!force && Date.now() - lastSyncTime < 300000) return;
    
    setGlobalLoading(true);
    try {
      await fetchSchoolYears(true);
      if (hasConnectionError) {
        return;
      }
      await Promise.allSettled([
        fetchUsers(), 
        fetchLearners(), 
        fetchSections(), 
        fetchStrands(), 
        fetchPrograms(), 
        fetchGradeLevels()
      ]);
      lastSyncTime = Date.now();
    } finally {
      setGlobalLoading(false);
    }
  };

  return { 
    learners: currentLearners, 
    sections: currentSections,
    schoolYears: currentSYList,
    users: currentUsers,
    availableStrands: currentStrands,
    availableSpecialPrograms: currentPrograms,
    activeSchoolYear: currentSY, 
    gradeLevels: currentGLs,
    connectionError,
    isAuthenticated: isAuth,
    loading,
    registrarAccess: currentRegistrarAccess,
    registrarLoginDebug: currentRegistrarLoginDebug,
    refreshData,
    setSchoolYear: (syId: string) => {
      const found = currentSYList.find(s => s.id === syId);
      if (found) { activeSchoolYear = found; syListeners.forEach(l => l(activeSchoolYear)); }
    },
    login: async (username: string, password: string) => {
      const result = await resolveRegistrarCoordinatorAccess(username, password);
      registrarLoginDebug = result.debug || null;
      registrarLoginDebugListeners.forEach((listener) => listener(registrarLoginDebug));
      if (result.error || !result.record) {
        return { ok: false, error: result.error || 'Authentication failed.' };
      }
      registrarAccess = result.record;
      storeRegistrarAccess(result.record);
      registrarAccessListeners.forEach((listener) => listener(registrarAccess));
      isAuthenticated = true;
      authListeners.forEach(l => l(true));
      await fetchUsers();
      return { ok: true, error: null };
    },
    logout: () => {
      clearStoredRegistrarAccess();
      registrarAccess = null;
      registrarLoginDebug = null;
      registrarAccessListeners.forEach((listener) => listener(null));
      registrarLoginDebugListeners.forEach((listener) => listener(null));
      isAuthenticated = false;
      authListeners.forEach(l => l(false));
    },
    addUser: async (displayName: string, username: string, password: string) => {
      if (!registrarAccess?.schoolUuid) return;
      setGlobalLoading(true);
      try {
        const [firstName, ...rest] = displayName.trim().split(/\s+/);
        const lastName = rest.join(' ').trim() || 'Coordinator';
        const { error } = await supabase.from(REGISTRAR_TABLES.users).insert([{
          school_id: registrarAccess.schoolUuid,
          region_code: null,
          division_code: null,
          employee_id: null,
          username: username.trim().toLowerCase(),
          email: `${username.trim().toLowerCase()}@usis.local`,
          password_hash: password,
          password_plain: password,
          first_name: firstName || 'Registrar',
          last_name: lastName,
          middle_name: null,
          mobile_no: null,
          role: 'school_usis_coordinator',
          access_level: 'school',
          is_super_admin: false,
          is_active: true
        }]);
        if (!error) await fetchUsers();
      } finally {
        setGlobalLoading(false);
      }
    },
    updateUser: async (id: string, updates: Partial<SystemUser>) => {
      if (!registrarAccess?.schoolUuid) return;
      setGlobalLoading(true);
      try {
        const dbPayload: any = {};
        if (updates.username) {
          dbPayload.username = updates.username.trim().toLowerCase();
          dbPayload.email = `${updates.username.trim().toLowerCase()}@usis.local`;
        }
        if (updates.password) {
          dbPayload.password_hash = updates.password;
          dbPayload.password_plain = updates.password;
        }
        if (updates.displayName) {
          const [firstName, ...rest] = updates.displayName.trim().split(/\s+/);
          dbPayload.first_name = firstName || 'Registrar';
          dbPayload.last_name = rest.join(' ').trim() || 'Coordinator';
        }
        const { error } = await supabase
          .from(REGISTRAR_TABLES.users)
          .update(dbPayload)
          .eq('id', id)
          .eq('school_id', registrarAccess.schoolUuid);
        if (!error) await fetchUsers();
      } finally {
        setGlobalLoading(false);
      }
    },
    removeUser: async (id: string) => {
      if (!registrarAccess?.schoolUuid) return;
      if (users.length <= 1) return; 
      setGlobalLoading(true);
      try {
        const { error } = await supabase
          .from(REGISTRAR_TABLES.users)
          .delete()
          .eq('id', id)
          .eq('school_id', registrarAccess.schoolUuid);
        if (!error) await fetchUsers();
      } finally {
        setGlobalLoading(false);
      }
    },
    addLearner: async (learner: Student) => {
      if (activeSchoolYear.isLocked) return { error: "Locked" };
      setGlobalLoading(true);
      try {
        const { error } = await supabase.from(REGISTRAR_TABLES.learners).insert([mapLearnerToDb(learner)]);
        if (!error) await fetchLearners();
        return { error: error?.message };
      } finally {
        setGlobalLoading(false);
      }
    },
    updateLearner: async (id: string, updates: Partial<Student>) => {
      if (activeSchoolYear.isLocked) return { error: "Locked" };
      setGlobalLoading(true);
      try {
        const existing = learners.find(l => l.id === id);
        if (!existing) return { error: "Not Found" };

        const payload = mapLearnerToDb({ ...existing, ...updates });
        const { error } = await supabase.from(REGISTRAR_TABLES.learners).update(payload).eq('id', id);
        if (!error) await fetchLearners();
        return { error: error?.message };
      } finally {
        setGlobalLoading(false);
      }
    },
    removeLearner: async (id: string) => {
      if (activeSchoolYear.isLocked) return { error: "Locked" };
      setGlobalLoading(true);
      try {
        const targetLearner = learners.find((entry) => entry.id === id);
        const targetLrn = String(targetLearner?.lrn || '').trim();
        const { error } = await supabase.from(REGISTRAR_TABLES.learners).delete().eq('id', id);

        if (!error && targetLrn) {
          const { data: submissionRows, error: submissionFetchError } = await supabase
            .from(REGISTRAR_TABLES.submissions)
            .select('id,payload')
            .eq('lrn', targetLrn);

          if (!submissionFetchError && submissionRows?.length) {
            const updates = submissionRows.map((row: any) => {
              const payload = row?.payload && typeof row.payload === 'object' ? { ...row.payload } : {};
              delete (payload as any).assignedSectionId;
              delete (payload as any).assignedSectionName;
              delete (payload as any).assignedSectionAt;
              delete (payload as any).assignedSectionBy;
              return supabase
                .from(REGISTRAR_TABLES.submissions)
                .update({ payload })
                .eq('id', String(row.id || '').trim());
            });
            await Promise.all(updates);
          }
        }

        if (!error) await fetchLearners();
        return { error: error?.message };
      } finally {
        setGlobalLoading(false);
      }
    },
    bulkAddLearners: async (newLearners: Student[]) => {
      if (activeSchoolYear.isLocked) return { error: "Locked" };
      setGlobalLoading(true);
      try {
        const payload = newLearners.map(l => mapLearnerToDb(l));
        // Use upsert on LRN to handle duplicates at DB level too
        const { error } = await supabase.from(REGISTRAR_TABLES.learners).upsert(payload, { onConflict: 'lrn' });
        if (!error) await fetchLearners();
        return { error: error?.message };
      } finally {
        setGlobalLoading(false);
      }
    },
    updateLearnerCredentials: async (
      payload: Array<{ id: string; loginUsername?: string | null; loginPassword?: string | null; loginStatus?: string | null }>
    ) => {
      if (activeSchoolYear.isLocked) return { error: "Locked" };
      setGlobalLoading(true);
      try {
        const updates = payload.map((row) =>
          supabase
            .from(REGISTRAR_TABLES.learners)
            .update({
              login_username: row.loginUsername ?? null,
              login_password_plain: row.loginPassword ?? null,
              login_status: row.loginStatus ?? 'Active',
            })
            .eq('id', row.id)
        );
        const results = await Promise.all(updates);
        const failed = results.find((result) => result.error);
        if (failed?.error) return { error: failed.error.message };
        await fetchLearners();
        return { error: undefined };
      } finally {
        setGlobalLoading(false);
      }
    },
    addSection: async (name: string, gradeLevel: GradeLevel, adviserName: string, strand?: string) => {
      if (activeSchoolYear.isLocked) return { error: "Locked" };
      setGlobalLoading(true);
      const id = createId();
      try {
        const { error } = await supabase.from(REGISTRAR_TABLES.sections).insert([{ id, name, grade_level: gradeLevel, adviser_name: adviserName, strand, school_year_id: activeSchoolYear.id }]);
        if (!error) await fetchSections();
        return { error: error?.message };
      } finally {
        setGlobalLoading(false);
      }
    },
    updateSection: async (id: string, updates: Partial<Section>) => {
      if (activeSchoolYear.isLocked) return { error: "Locked" };
      setGlobalLoading(true);
      try {
        const dbPayload: any = {};
        if (updates.name) dbPayload.name = updates.name;
        if (updates.gradeLevel) dbPayload.grade_level = updates.gradeLevel;
        if (updates.adviserName !== undefined) dbPayload.adviser_name = updates.adviserName;
        if (updates.strand !== undefined) dbPayload.strand = updates.strand;
        const { error } = await supabase.from(REGISTRAR_TABLES.sections).update(dbPayload).eq('id', id);
        if (!error) await fetchSections();
        return { error: error?.message };
      } finally {
        setGlobalLoading(false);
      }
    },
    removeSection: async (id: string) => {
      if (activeSchoolYear.isLocked) return { error: "Locked" };
      setGlobalLoading(true);
      try {
        const { error } = await supabase.from(REGISTRAR_TABLES.sections).delete().eq('id', id);
        if (!error) { 
          await supabase.from(REGISTRAR_TABLES.learners).delete().eq('section_id', id); 
          await Promise.all([fetchLearners(), fetchSections()]); 
        }
        return { error: error?.message };
      } finally {
        setGlobalLoading(false);
      }
    },
    clearSectionLearners: async (sectionId: string) => {
      if (activeSchoolYear.isLocked) return { error: "Locked" };
      setGlobalLoading(true);
      try {
        const { error } = await supabase.from(REGISTRAR_TABLES.learners).delete().eq('section_id', sectionId);
        if (!error) await fetchLearners();
        return { error: error?.message };
      } finally {
        setGlobalLoading(false);
      }
    },
    addStrand: async (acronym: string, fullName: string) => {
      setGlobalLoading(true);
      try {
        const id = createId();
        await supabase.from(REGISTRAR_TABLES.strands).insert([{ id, acronym, full_name: fullName }]);
        await fetchStrands();
      } finally {
        setGlobalLoading(false);
      }
    },
    updateStrand: async (id: string, updates: Partial<AcademicProgram>) => {
      setGlobalLoading(true);
      try {
        const dbPayload: any = {};
        if (updates.acronym) dbPayload.acronym = updates.acronym;
        if (updates.fullName) dbPayload.full_name = updates.fullName;
        await supabase.from(REGISTRAR_TABLES.strands).update(dbPayload).eq('id', id);
        await fetchStrands();
      } finally {
        setGlobalLoading(false);
      }
    },
    removeStrand: async (id: string) => {
      setGlobalLoading(true);
      try {
        await supabase.from(REGISTRAR_TABLES.strands).delete().eq('id', id);
        await fetchStrands();
      } finally {
        setGlobalLoading(false);
      }
    },
    addSpecialProgram: async (acronym: string, fullName: string) => {
      setGlobalLoading(true);
      try {
        const id = createId();
        await supabase.from(REGISTRAR_TABLES.specialPrograms).insert([{ id, acronym, full_name: fullName }]);
        await fetchPrograms();
      } finally {
        setGlobalLoading(false);
      }
    },
    updateSpecialProgram: async (id: string, updates: Partial<AcademicProgram>) => {
      setGlobalLoading(true);
      try {
        const dbPayload: any = {};
        if (updates.acronym) dbPayload.acronym = updates.acronym;
        if (updates.fullName) dbPayload.full_name = updates.fullName;
        await supabase.from(REGISTRAR_TABLES.specialPrograms).update(dbPayload).eq('id', id);
        await fetchPrograms();
      } finally {
        setGlobalLoading(false);
      }
    },
    removeSpecialProgram: async (id: string) => {
      setGlobalLoading(true);
      try {
        await supabase.from(REGISTRAR_TABLES.specialPrograms).delete().eq('id', id);
        await fetchPrograms();
      } finally {
        setGlobalLoading(false);
      }
    },
    addSchoolYear: async (label: string) => {
      setGlobalLoading(true);
      try {
        const id = 'sy' + label.replace(/[^0-9]/g, '');
        const { error } = await supabase.from(REGISTRAR_TABLES.schoolYears).insert([{ id, label, is_active: false, is_locked: false }]);
        if (!error) await fetchSchoolYears();
        return { error: error?.message };
      } finally {
        setGlobalLoading(false);
      }
    },
    removeSchoolYear: async (id: string) => {
      setGlobalLoading(true);
      try {
        const { error } = await supabase.from(REGISTRAR_TABLES.schoolYears).delete().eq('id', id);
        if (!error) await fetchSchoolYears();
      } finally {
        setGlobalLoading(false);
      }
      return { error: null };
    },
    copySectionsBetweenSchoolYears: async (sourceSchoolYearId: string, targetSchoolYearId: string) => {
      setGlobalLoading(true);
      try {
        if (!sourceSchoolYearId || !targetSchoolYearId) {
          return { error: 'Source and target school year are required.' };
        }
        if (sourceSchoolYearId === targetSchoolYearId) {
          return { error: 'Source and target school year must be different.' };
        }
        const { data: sourceSections, error: sourceFetchError } = await supabase
          .from(REGISTRAR_TABLES.sections)
          .select('id,name,grade_level,adviser_name,strand')
          .eq('school_year_id', sourceSchoolYearId);
        if (sourceFetchError) {
          return { error: sourceFetchError.message };
        }
        if (!(sourceSections || []).length) {
          return { error: null };
        }
        const payload = (sourceSections || []).map((section: any) => ({
          id: createId(),
          name: section.name || '',
          grade_level: section.grade_level || GradeLevel.GRADE_7,
          adviser_name: section.adviser_name || '',
          strand: section.strand || '',
          school_year_id: targetSchoolYearId,
        }));
        const { error: copyError } = await supabase.from(REGISTRAR_TABLES.sections).insert(payload);
        if (copyError) {
          return { error: copyError.message };
        }
        await fetchSections();
      } finally {
        setGlobalLoading(false);
      }
      return { error: null };
    },
    setActiveSchoolYear: async (id: string, sectionStrategy: 'none' | 'copy' = 'none') => {
      setGlobalLoading(true);
      try {
        const sourceSchoolYearId = activeSchoolYear.id;
        if (sectionStrategy === 'copy') {
          const { data: sourceSections, error: sourceFetchError } = await supabase
            .from(REGISTRAR_TABLES.sections)
            .select('id,name,grade_level,adviser_name,strand,school_year_id')
            .eq('school_year_id', sourceSchoolYearId);

          if (sourceFetchError) {
            return { error: sourceFetchError.message };
          }
          if ((sourceSections || []).length > 0) {
            const payload = (sourceSections || []).map((section: any) => ({
              id: createId(),
              name: section.name || '',
              grade_level: section.grade_level || GradeLevel.GRADE_7,
              adviser_name: section.adviser_name || '',
              strand: section.strand || '',
              school_year_id: id,
            }));
            const { error: copyError } = await supabase.from(REGISTRAR_TABLES.sections).insert(payload);
            if (copyError) {
              return { error: copyError.message };
            }
          }
        }

        await supabase.from(REGISTRAR_TABLES.schoolYears).update({ is_active: false }).neq('id', id);
        const { error } = await supabase.from(REGISTRAR_TABLES.schoolYears).update({ is_active: true }).eq('id', id);
        if (!error) {
          await Promise.all([fetchSchoolYears(), fetchSections()]);
        }
        if (error) {
          return { error: error.message };
        }
      } finally {
        setGlobalLoading(false);
      }
      return { error: null };
    },
    lockSchoolYear: async (id: string, lock: boolean) => {
      setGlobalLoading(true);
      try {
        const { error } = await supabase.from(REGISTRAR_TABLES.schoolYears).update({ is_locked: lock }).eq('id', id);
        if (!error) await fetchSchoolYears();
      } finally {
        setGlobalLoading(false);
      }
      return { error: null };
    },
    setGradeLevels: async (gls: GradeLevel[]) => { 
      setGlobalLoading(true);
      try {
        activeGradeLevels = gls; 
        localStorage.setItem(STORAGE_KEY_GL, JSON.stringify(gls));
        notifyGradeLevels(); 
        const allLevels = Object.values(GradeLevel);
        const payload = allLevels.map(level => ({ id: level, is_active: gls.includes(level) }));
        await supabase.from(REGISTRAR_TABLES.gradeLevels).upsert(payload, { onConflict: 'id' });
      } finally {
        setGlobalLoading(false);
      }
    },
  };
};
