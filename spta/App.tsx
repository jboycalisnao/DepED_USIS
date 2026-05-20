import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { learnerClient, adminClient } from './lib/supabaseClient';
import {
  SystemConfig,
  User,
  Learner,
  Section,
  FinancialTransaction,
  Activity
} from './types';
import { LoadingScreen } from './components/shell/LoadingScreen';
import { renderPublicRoutes } from './components/routes/PublicRoutes';
import { renderAdminRoutes } from './components/routes/AdminRoutes';
import { DEFAULT_CONFIG, LOCAL_FALLBACK_USER, applyUpdatedFinanceConfig } from './config/systemDefaults';
import { KioskDisplay } from './components/KioskDisplay';
import usisFavicon from '../common/assets/USIS_Icon.png';
import { type CoordinatorAccessRecord } from '../coordinator/features/auth/utils/coordinatorAccess';

const ACCESS_STORAGE_KEY = 'spta_access_record';

const mapAccessToUser = (access: CoordinatorAccessRecord): User => ({
  id: access.userId,
  username: access.coordinatorName,
  fullName: access.coordinatorName,
  role: access.coordinatorRole as User['role'],
  status: 'Active',
});

const UnauthorizedHandler = ({ onRedirectAccess }: { onRedirectAccess: () => void }) => {
  useEffect(() => { onRedirectAccess(); }, [onRedirectAccess]);
  return <Navigate to="/" replace />;
};

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(Date.now());

  const [learners, setLearners] = useState<Learner[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [projects, setProjects] = useState<Activity[]>([]);

  const fetchLearnerAndSectionData = useCallback(async () => {
    const readFirstExistingTable = async (candidates: string[]) => {
      for (const table of candidates) {
        const result = await learnerClient.from(table).select('*');
        if (!result.error) return result;
      }
      return { data: null, error: { message: `No available tables: ${candidates.join(', ')}` } };
    };

    const [sectionsRes, adminRes] = await Promise.all([
      readFirstExistingTable(['registrar_sections', 'sections']),
      adminClient.from('sections').select('*')
    ]);

    const learnerSections =
      (sectionsRes.data && sectionsRes.data.length > 0 ? sectionsRes.data : []) || [];
    const adminSections = adminRes.data || [];

    let mergedSections: Section[] = [];

    if (learnerSections.length > 0) {
      mergedSections = learnerSections.map((ls: any) => {
        const lName = ls.name;
        const lGrade = ls.gradeLevel || ls.grade_level;

        const matchedAdmin = adminSections.find((as: any) => {
          const aName = as.name;
          const aGrade = as.gradeLevel || as.grade_level;
          return aName === lName && aGrade === lGrade;
        });

        return {
          id: ls.id,
          name: lName,
          gradeLevel: lGrade,
          adviserName: matchedAdmin?.adviserName || matchedAdmin?.adviser_name || ls.adviserName || ls.adviser_name,
          roomNumber: ls.roomNumber || ls.room_number,
          strand: ls.strand,
          accessCode: matchedAdmin?.accessCode || matchedAdmin?.access_code || null
        };
      });
    } else if (adminSections.length > 0) {
      mergedSections = adminSections.map((as: any) => ({
        id: as.id,
        name: as.name,
        gradeLevel: as.gradeLevel || as.grade_level,
        adviserName: as.adviserName || as.adviser_name,
        roomNumber: as.roomNumber || as.room_number,
        strand: as.strand,
        accessCode: as.accessCode || as.access_code
      }));
    }

    setSections(mergedSections);

    let allLearners: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    const learnerTable =
      (await learnerClient.from('registrar_learners').select('id').limit(1)).error
        ? 'learners'
        : 'registrar_learners';

    while (hasMore) {
      const { data, error } = await learnerClient
        .from(learnerTable)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error || !data || data.length === 0) {
        hasMore = false;
      } else {
        allLearners = [...allLearners, ...data];
        if (data.length < pageSize) hasMore = false;
        else page++;
      }
    }

    if (allLearners.length > 0) {
      setLearners(allLearners.map((l: any) => ({
        ...l,
        guardianName: l.guardian_name || l.guardianName || '',
        fatherName: l.father_name || l.fatherName || '',
        motherName: l.mother_name || l.motherName || '',
        firstName: l.first_name || l.firstName,
        lastName: l.last_name || l.lastName,
        middleName: l.middle_name || l.middleName,
        sectionId: l.section_id || l.sectionId || l.section,
        contactNumber: l.contact_number || l.contactNumber,
        birthDate: l.birth_date || l.birthDate,
        status: l.status || l.enrollment_status || 'Enrolled'
      })) as Learner[]);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    let allTransactions: any[] = [];
    let txPage = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await adminClient
        .from('financial_transactions')
        .select('*')
        .range(txPage * pageSize, (txPage + 1) * pageSize - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
      } else {
        allTransactions = [...allTransactions, ...data];
        if (data.length < pageSize) hasMore = false;
        else txPage++;
      }
    }

    setTransactions(allTransactions as FinancialTransaction[]);
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data: userData } = await adminClient.from('app_users').select('*');
    if (userData) {
      const mergedUsers = [...userData];
      if (!mergedUsers.find((user: any) => user.username === LOCAL_FALLBACK_USER.username)) {
        mergedUsers.push({ ...LOCAL_FALLBACK_USER });
      }
      setUsers(mergedUsers as User[]);
    } else {
      setUsers([{ ...LOCAL_FALLBACK_USER } as User]);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    const { data } = await adminClient.from('activities').select('*');
    setProjects((data || []) as Activity[]);
  }, []);

  const fetchConfig = useCallback(async () => {
    const { data: configData } = await adminClient.from('system_config').select('config').single();
    if (configData?.config) {
      setConfig(applyUpdatedFinanceConfig(configData.config));
    } else {
      setConfig(DEFAULT_CONFIG);
    }
  }, []);

  const fetchInitialLocalState = useCallback(async () => {
    try {
      await Promise.all([fetchConfig(), fetchUsers(), fetchProjects(), fetchTransactions()]);
    } catch (err) {
      console.error('Local app state initialization error', err);
    }
  }, [fetchConfig, fetchProjects, fetchTransactions, fetchUsers]);

  const fetchData = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsDataRefreshing(true);
    }

    try {
      await Promise.all([
        fetchLearnerAndSectionData(),
        fetchTransactions()
      ]);
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error('Initialization Error', err);
    } finally {
      if (isBackground) {
        setIsDataRefreshing(false);
      }
    }
  }, [fetchLearnerAndSectionData, fetchTransactions]);

  useEffect(() => {
    const rawAccess = sessionStorage.getItem(ACCESS_STORAGE_KEY);
    if (rawAccess) {
      try {
        const access = JSON.parse(rawAccess) as CoordinatorAccessRecord;
        setCurrentUser(mapAccessToUser(access));
      } catch {
        sessionStorage.removeItem(ACCESS_STORAGE_KEY);
      }
    }

    let isMounted = true;
    (async () => {
      await fetchInitialLocalState();
      if (isMounted) setIsBootstrapping(false);
      fetchData(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [fetchData, fetchInitialLocalState]);

  useEffect(() => {
    const dailyRefreshInterval = setInterval(() => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - lastFetchTime > oneDay) {
        fetchData(true);
      }
    }, 3600000);

    return () => {
      clearInterval(dailyRefreshInterval);
    };
  }, [fetchData, lastFetchTime]);

  useEffect(() => {
    document.title = 'DepED USIS - SPTA';
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = usisFavicon;
  }, []);

  const handleAccessSuccess = useCallback((access: CoordinatorAccessRecord) => {
    sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(access));
    setCurrentUser(mapAccessToUser(access));
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(ACCESS_STORAGE_KEY);
    navigate('/access');
  };

  if (isBootstrapping) return <LoadingScreen config={config} />;

  return (
    <div className="spta-usis bg-slate-100 min-h-screen">
      {isDataRefreshing && (
        <div className="fixed right-4 top-4 z-[120] rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-md">
          Syncing records...
        </div>
      )}
      <Routes>
        <Route path="/kiosk" element={<KioskDisplay />} />

        {renderPublicRoutes({
          config,
          learners,
          sections,
          transactions,
          onAccessSuccess: handleAccessSuccess
        })}

        {renderAdminRoutes({
          currentUser,
          config,
          onLogout: handleLogout,
          transactions,
          setTransactions,
          learners,
          setLearners,
          sections,
          setSections,
          projects,
          users,
          setUsers,
          setConfig,
          lastFetchTime,
          unauthorizedElement: <UnauthorizedHandler onRedirectAccess={() => navigate('/access')} />
        })}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </BrowserRouter>
  );
}
