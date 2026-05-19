
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Login from './components/Login';
import IdentityConfirmation from './components/IdentityConfirmation';
import Ballot from './components/Ballot';
import Confirmation from './components/Confirmation';
import Results from './components/Results';
import PublicResults from './components/PublicResults';
import PublicTurnout from './components/PublicTurnout';
import FeaturePlaceholder from './components/FeaturePlaceholder';
import ElectionRegistrationPage from './components/ElectionRegistrationPage';
import Footer from './components/Footer';
import AdminPanel from './components/admin/AdminPanel';
import NotificationModal, { ModalConfig } from './components/NotificationModal';
import CandidateAuditView from './components/CandidateAuditView';
import LiveTallyMonitor from './components/admin/dashboard/LiveTallyMonitor';
import SystemAlerts from './components/SystemAlerts';
import MaterialIconAdapter from './components/MaterialIconAdapter';
import { UsisLoginModal } from '../common/components/UsisLoginModal';
import { hasCoordinatorModuleAccess } from '../common/auth/moduleAccess';
import { Candidate, AppView, User, ElectionConfig, ElectionStatus, Position, GradeLevel } from './types';
import { DEPED_SEAL_URL, DEPED_LOGO_URL, LEON_NHS_LOGO_URL, LG_COMEA_LOGO_URL } from './constants';
import { useStore } from './supabaseStore';
import { supabase } from './lib/supabase';
import { cacheBrandingImages } from './utils/imagePersistence';
import {
  getCurrentElectionPath,
  getElectionNavigationEvent,
  navigateToElectionPath,
  normalizeElectionPath,
} from './utils/navigation';
import {
  getStoredElectionRegistrationAccess,
  getStoredElectionRegistration,
} from './utils/electionRegistration';
import { DEMO_LRN, DEMO_USER, DEMO_CANDIDATES, DemoBanner } from './components/DemoMode';

const App: React.FC = () => {
  const store = useStore();
  const pendingAuthRef = useRef(false);
  
  const [view, setView] = useState<AppView | 'audit' | 'monitoring'>('login');
  const [auditCandidateId, setAuditCandidateId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [turnoutByPosition, setTurnoutByPosition] = useState<Record<string, number>>({});
  const [votedLrns, setVotedLrns] = useState<string[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAccessError, setAdminAccessError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeElectionRegistration, setActiveElectionRegistration] = useState(() =>
    getStoredElectionRegistration(),
  );
  const [registrationStep, setRegistrationStep] = useState<'access' | 'setup'>(() =>
    getStoredElectionRegistrationAccess() ? 'setup' : 'access',
  );
  
  const [electionConfig, setElectionConfig] = useState<ElectionConfig>({
    status: ElectionStatus.MANUAL_OPEN,
    startTime: null,
    endTime: null,
    schoolName: 'Leon National High School',
    publicResultsEnabled: false,
    publicTurnoutEnabled: false
  });
  
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const getElectionYearLabel = () => {
    const activeLabel = store.activeSchoolYear?.label;
    if (!activeLabel) return '';
    return activeLabel.replace(/\d{4}/g, (year) => (parseInt(year) + 1).toString());
  };

  const electionYearLabel = getElectionYearLabel();

  const refreshElectionData = async () => {
    try {
      const activeSyId = store.activeSchoolYear?.id;
      if (!activeSyId) return;

      const [res, config, participation] = await Promise.all([
        store.fetchCandidates(),
        store.fetchElectionConfig(),
        store.fetchParticipation(activeSyId)
      ]);
      setCandidates(res.candidates || []);
      setTurnoutByPosition(res.turnoutByPosition || {});
      setElectionConfig(config || { status: ElectionStatus.MANUAL_OPEN, startTime: null, endTime: null, schoolName: 'Leon National High School', publicResultsEnabled: false, publicTurnoutEnabled: false });
      setVotedLrns(participation || []);
    } catch (err) {
      console.error("Data synchronization error:", err);
    }
  };

  useEffect(() => {
    const legacyHash = window.location.hash.replace(/^#\/?/, '/');
    if (legacyHash) {
      navigateToElectionPath(legacyHash, true);
      return;
    }

    if (normalizeElectionPath(window.location.pathname) === '/login') {
      navigateToElectionPath('/', true);
    }
  }, []);

  useEffect(() => {
    cacheBrandingImages({
      'deped_seal': DEPED_SEAL_URL,
      'deped_logo': DEPED_LOGO_URL,
      'leon_nhs_logo': LEON_NHS_LOGO_URL,
      'lg_comea_logo': LG_COMEA_LOGO_URL
    });
    refreshElectionData();
  }, [store.activeSchoolYear?.id]);

  useEffect(() => {
    if (currentUser) {
      pendingAuthRef.current = false;
    }
  }, [currentUser]);

  useEffect(() => {
    const handleRouteChange = () => {
      const pathname = getCurrentElectionPath();
      const parts = pathname.split('/').filter(Boolean);
      const mainView = (parts[0] || 'login') as AppView | 'audit' | 'monitoring';
      const validViews: string[] = [
        'login',
        'identity-confirmation',
        'ballot',
        'confirmation',
        'results',
        'election-registration',
        'tally-results',
        'admin',
        'admin-access',
        'audit',
        'monitoring',
        'public-results',
        'public-turnout',
      ];

      if (pathname === '/') {
        setView('login');
        return;
      }

      if (validViews.includes(mainView)) {
        if (mainView === 'audit') {
          setAuditCandidateId(parts[1] || null);
          setView('audit');
          return;
        }

        if (mainView === 'monitoring') {
          setView('monitoring');
          return;
        }

        if (mainView === 'public-results') {
          setView('public-results');
          return;
        }

        if (mainView === 'public-turnout') {
          setView('public-turnout');
          return;
        }

        if (mainView === 'results') {
          setView('results-page');
          return;
        }
        
        if (mainView === 'admin-access') {
          setView('admin-access');
          return;
        }

        if (mainView === 'election-registration') {
          const hasAccess = !!getStoredElectionRegistrationAccess();
          const nextStep = parts[1] === 'setup' ? 'setup' : 'access';

          if (nextStep === 'setup' && !hasAccess) {
            navigateToElectionPath('/election-registration', true);
            setRegistrationStep('access');
            setView('election-registration');
            return;
          }

          setRegistrationStep(nextStep);
          setView('election-registration');
          return;
        }

        if (mainView === 'tally-results' && !currentUser?.isAdmin) {
          navigateToElectionPath('/', true);
          setView('login');
          return;
        }
        
        if (['identity-confirmation', 'ballot', 'confirmation', 'admin'].includes(mainView) && !currentUser && !pendingAuthRef.current) {
          navigateToElectionPath('/', true);
          setView('login');
        } else {
          setView(mainView as any);
        }
      } else {
        navigateToElectionPath('/', true);
        setView('login');
      }
    };
    const navigationEvent = getElectionNavigationEvent();
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener(navigationEvent, handleRouteChange);
    handleRouteChange();
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener(navigationEvent, handleRouteChange);
    };
  }, [currentUser]);

  const updateView = (newView: string) => {
    const nextPath = newView === 'login' ? '/' : `/${newView.replace(/^\/+/, '')}`;
    navigateToElectionPath(nextPath);
  };

  const showAlert = (title: string, message: string, type: ModalConfig['type'] = 'info', onConfirm?: () => void) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  };

  const handleUpdateElectionConfig = (newConfig: ElectionConfig) => {
    setElectionConfig(newConfig);
    store.saveElectionConfig(newConfig);
  };

  const handleAddCandidate = async (candidate: Partial<Candidate>, syId: string) => {
    await store.addCandidateToDb(candidate, syId);
    await refreshElectionData();
  };

  const handleUpdateCandidate = async (id: string, candidate: Partial<Candidate>) => {
    await store.updateCandidateInDb(id, candidate);
    await refreshElectionData();
  };

  const handleDeleteCandidate = async (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
    try {
      await store.deleteCandidateFromDb(id);
      refreshElectionData();
    } catch (err) {
      refreshElectionData();
      throw err;
    }
  };

  const handleDeleteBallot = async (lrn: string) => {
    await store.deleteVoterBallot(lrn, store.activeSchoolYear?.id || '');
    await refreshElectionData();
  };

  const handleReset = () => {
    showAlert(
      "Confirm System Reset",
      "Permanently wipe records?",
      "confirm",
      () => store.resetAllElectionData(store.activeSchoolYear?.id || '').then(refreshElectionData),
    );
  };

  const handleMigrateLegacyData = async () => {
    try {
      const result = await store.migrateLegacyElectionData(electionConfig);
      await refreshElectionData();
      showAlert(
        'Legacy Migration Completed',
        `Schools created: ${result.schoolCreated ? 1 : 0}, election events created: ${result.electionCreated ? 1 : 0}, candidates migrated: ${result.candidatesMigrated}, ballots migrated: ${result.ballotsMigrated}, participation migrated: ${result.participationMigrated}, partylists migrated: ${result.partylistsMigrated}.`,
        'success',
      );
    } catch (error: any) {
      showAlert(
        'Legacy Migration Failed',
        error?.message || 'The legacy migration could not be completed. Review the new schema objects first.',
        'error',
      );
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lrn = username.trim();
    const passwordValue = password.trim();

    if (lrn.toLowerCase() === 'admin') {
      updateView('admin-access');
      return;
    }

    if (lrn === DEMO_LRN) {
      setIsDemoMode(true);
      setCurrentUser(DEMO_USER);
      updateView('identity-confirmation');
      return;
    }

    if (!passwordValue) {
      showAlert('Missing Password', 'Enter your password to continue.', 'warning');
      return;
    }

    const { data: credentialRecord, error: credentialError } = await supabase
      .from('registrar_learners')
      .select('lrn,login_username,login_password_plain,login_status')
      .or(`login_username.eq.${lrn},lrn.eq.${lrn}`)
      .limit(1)
      .maybeSingle();

    const credentialPassword = String(credentialRecord?.login_password_plain || '').trim();
    const loginStatus = String(credentialRecord?.login_status || 'Active').trim().toLowerCase();
    const credentialsDisabled = loginStatus === 'disabled' || loginStatus === 'inactive';

    if (
      credentialError ||
      !credentialRecord ||
      !credentialPassword ||
      credentialPassword !== passwordValue ||
      credentialsDisabled
    ) {
      showAlert('Invalid Credentials', 'The username or password is incorrect.', 'error');
      setPassword('');
      return;
    }

    const learnerLrn = String(credentialRecord.lrn || '').trim();
    const learnersList = store.learners || [];
    const learner = learnersList.find(l => String(l.lrn || '').trim() === learnerLrn);
    if (!learner) {
      showAlert("Voter Not Found", "This learner is not in the active voter registry for the selected school year.", "error");
      setUsername('');
      setPassword('');
      return;
    }

    const section = (store.sections || []).find(s => s.id === learner.sectionId);
    
    if (section?.gradeLevel === GradeLevel.GRADE_12) {
      showAlert(
        "Non-Voter Status", 
        "Grade 12 students are graduating and are excluded from the current Learner Government election cycle.", 
        "warning"
      );
      setUsername('');
      setPassword('');
      return;
    }

    const alreadyVoted = await store.checkIfVoted(lrn, store.activeSchoolYear?.id || '');
    if (alreadyVoted) {
      showAlert("Duplicate Record", "Our records show that this student has already successfully cast a ballot.", "warning");
      setUsername('');
      setPassword('');
      return;
    }
    
    let detectedStrand = section?.strand || '';
    if (section?.name) {
      const nameNormalized = section.name.toUpperCase().replace(/\s/g, '');
      if (nameNormalized.includes('STE') || nameNormalized.includes('SCIENCE')) {
        detectedStrand = 'STE';
      } else if (nameNormalized.includes('SPA') || nameNormalized.includes('ARTS')) {
        detectedStrand = 'SPA';
      }
    }

    const middleNameStr = learner.middleName ? ` ${learner.middleName}` : '';
    const wholeName = `${learner.firstName}${middleNameStr} ${learner.lastName}`.toUpperCase();

    pendingAuthRef.current = true;
    setIsDemoMode(false);
    setCurrentUser({
      studentId: lrn,
      name: wholeName,
      firstName: learner.firstName.toUpperCase(),
      lastName: learner.lastName.toUpperCase(),
      middleName: learner.middleName?.toUpperCase(),
      hasVoted: false,
      isAdmin: false,
      gradeLevel: section?.gradeLevel,
      sectionName: section?.name,
      strand: detectedStrand
    });
    
    setView('identity-confirmation');
    updateView('identity-confirmation');
  };

  const handleVoteSubmission = async () => {
    if (!currentUser || isSubmitting) return;
    
    setIsSubmitting(true);
    if (isDemoMode) {
      setCurrentUser({ ...currentUser, hasVoted: true });
      updateView('confirmation');
      setIsSubmitting(false);
      return;
    }

    if (!store.activeSchoolYear?.id) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      await store.submitBallot(currentUser.studentId, selections, store.activeSchoolYear.id);
      setCurrentUser({ ...currentUser, hasVoted: true });
      await refreshElectionData();
      updateView('confirmation');
    } catch (err) {
      showAlert("Submission Failed", "There was an error transmitting your ballot to the secure cloud. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setSelections({});
    setIsDemoMode(false);
    updateView('login');
  };

  const handleAdminAccessLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = adminUsername.trim().toLowerCase();
    const normalizedPassword = adminPassword.trim();

    if (!normalizedUsername || !normalizedPassword) {
      setAdminAccessError('Enter both username and password.');
      return;
    }

    const coordinatorsResponse = await supabase
      .from('usis_core_coordinators')
      .select('id,first_name,last_name,role,password_hash,is_active')
      .eq('username', normalizedUsername)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    let coordinatorData = coordinatorsResponse.data as any;
    let coordinatorError = coordinatorsResponse.error as any;

    if (coordinatorError) {
      setAdminAccessError('Unable to contact the coordinator registry in Supabase.');
      return;
    }

    if (!coordinatorData) {
      setAdminAccessError('No active coordinator account matches these credentials.');
      return;
    }

    const validPassword = normalizedPassword === String(coordinatorData.password_hash || '');

    if (!validPassword) {
      setAdminAccessError('No active coordinator account matches these credentials.');
      return;
    }

    const hasElectionAccess =
      coordinatorData.role === 'system_admin' ||
      coordinatorData.role === 'school_usis_coordinator' ||
      hasCoordinatorModuleAccess(coordinatorData.id, 'election');

    if (!hasElectionAccess) {
      setAdminAccessError('Access denied. This coordinator account is not granted Election module access.');
      return;
    }

    const displayName =
      [coordinatorData.first_name, coordinatorData.last_name].filter(Boolean).join(' ') ||
      'System Administrator';

    pendingAuthRef.current = true;
    setCurrentUser({
      studentId: 'admin',
      name: displayName,
      hasVoted: false,
      isAdmin: true,
    });
    setAdminAccessError(null);
    setAdminUsername('');
    setAdminPassword('');
    setView('admin');
    updateView('admin/dashboard');
  };

  const voters: User[] = (votedLrns || []).map(lrn => ({
    studentId: lrn,
    name: 'Verified Voter', 
    hasVoted: true,
    isAdmin: false
  }));
  const isIdentityFocusView = view === 'identity-confirmation' && !!currentUser;

  if (view === 'monitoring') {
    return (
      <div className="h-screen w-screen bg-slate-50 overflow-hidden">
        <LiveTallyMonitor 
          voters={voters} 
          learnerDatabase={store.learners || []} 
          sections={store.sections || []} 
        />
      </div>
    );
  }

  return (
    <div className={`election-app flex min-h-screen flex-col bg-[#f8fafc]${isIdentityFocusView ? ' election-app--identity-focus' : ''}`}>
      <MaterialIconAdapter />
      <SystemAlerts isOnline={store.online} isSyncing={store.loading || isSubmitting} hasError={store.connError} />
      <NotificationModal config={modalConfig} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />
      
      {!isIdentityFocusView && (
        <Header 
          onLogout={currentUser ? handleLogout : undefined} 
          currentUser={currentUser?.name} 
          schoolName={electionConfig.schoolName} 
          electionYear={electionYearLabel}
          currentView={view}
        />
      )}

      {isDemoMode && !isIdentityFocusView && <DemoBanner />}
      
      <main className={`election-main flex-grow flex flex-col page-fade-in relative bg-[#f8fafc]${isIdentityFocusView ? ' election-main--identity-focus' : ''}`}>
        {view === 'login' && (
          <Login
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            onLogin={handleLogin}
            isLoadingLearners={store.loading}
            fetchProgress={100}
            config={electionConfig}
          />
        )}
        {view === 'admin-access' && !currentUser && (
          <section className="flex-grow bg-[#f8fafc]">
            <div className="w-full px-[var(--page-inset)] py-4 md:py-6">
              <div className="mx-auto flex w-full max-w-[720px] flex-col items-center">
                <UsisLoginModal
                  title="Admin Access"
                  username={adminUsername}
                  password={adminPassword}
                  submitLabel="Login"
                  noticeTitle="Access Denied"
                  noticeMessage={adminAccessError}
                  onDismissNotice={() => setAdminAccessError(null)}
                  onUsernameChange={setAdminUsername}
                  onPasswordChange={setAdminPassword}
                  onSubmit={handleAdminAccessLogin}
                />
              </div>
            </div>
          </section>
        )}
        {view === 'identity-confirmation' && currentUser && <IdentityConfirmation user={currentUser} onConfirm={() => updateView('ballot')} onCancel={handleLogout} />}
        {view === 'ballot' && (
          <Ballot 
            candidates={isDemoMode ? DEMO_CANDIDATES : candidates} 
            selections={selections} 
            onSelect={(pos, ids) => setSelections({...selections, [pos]: ids})} 
            onSubmit={handleVoteSubmission} 
            currentUser={currentUser} 
          />
        )}
        {view === 'confirmation' && <Confirmation candidates={isDemoMode ? DEMO_CANDIDATES : candidates} selections={selections} onLogout={handleLogout} user={currentUser} />}
        {view === 'results-page' && (
          <FeaturePlaceholder
            label="Results"
            title="Election Results"
            message="The new election results page will be added here using the DepED-Web-Kit template and the updated election portal standards."
          />
        )}
        {view === 'election-registration' && (
          <ElectionRegistrationPage
            schoolName={electionConfig.schoolName || 'Leon National High School'}
            schoolYearLabel={store.activeSchoolYear?.label || '----'}
            onRegistrationGenerated={setActiveElectionRegistration}
            onStepChange={setRegistrationStep}
            step={registrationStep}
            adminWorkspace={
              registrationStep === 'setup' ? (
                <AdminPanel 
                  candidates={candidates || []} 
                  turnoutByPosition={turnoutByPosition}
                  onAddCandidate={handleAddCandidate}
                  onUpdateCandidate={handleUpdateCandidate}
                  onDeleteCandidate={handleDeleteCandidate}
                  onDeleteBallot={handleDeleteBallot}
                  voters={voters}
                  learnerDatabase={store.learners}
                  sections={store.sections}
                  electionConfig={electionConfig}
                  setElectionConfig={handleUpdateElectionConfig}
                  onMigrateLegacyData={handleMigrateLegacyData}
                  onReset={handleReset}
                  onLogout={handleLogout}
                  showAlert={showAlert}
                  schoolYears={store.schoolYears}
                  variant="embedded"
                />
              ) : null
            }
          />
        )}
        {view === 'tally-results' && <Results candidates={candidates} turnoutByPosition={turnoutByPosition} />}
        {view === 'public-results' && (
          <PublicResults 
            candidates={candidates} 
            turnoutByPosition={turnoutByPosition} 
            config={electionConfig}
            schoolYearLabel={store.activeSchoolYear?.label || '----'}
          />
        )}
        {view === 'public-turnout' && (
          <PublicTurnout 
            voters={voters} 
            learnerDatabase={store.learners || []} 
            sections={store.sections || []} 
            config={electionConfig}
            schoolYearLabel={store.activeSchoolYear?.label || '----'}
          />
        )}
        {view === 'audit' && <CandidateAuditView candidate={candidates.find(c => c.id === auditCandidateId) || null} onBack={handleLogout} />}
        {view === 'admin' && (
          <AdminPanel 
            candidates={candidates || []} 
            turnoutByPosition={turnoutByPosition}
            onAddCandidate={handleAddCandidate}
            onUpdateCandidate={handleUpdateCandidate}
            onDeleteCandidate={handleDeleteCandidate}
            onDeleteBallot={handleDeleteBallot}
            voters={voters || []} 
            learnerDatabase={store.learners || []} 
            sections={store.sections || []} 
            onReset={handleReset}
            onLogout={handleLogout} 
            showAlert={showAlert} 
            electionConfig={electionConfig} 
            setElectionConfig={handleUpdateElectionConfig}
            onMigrateLegacyData={handleMigrateLegacyData}
            schoolYears={store.schoolYears || []}
            currentUserName={currentUser?.name}
            currentUserRole="System Administrator"
          />
        )}
      </main>

      {!isIdentityFocusView && <Footer schoolYearLabel={store.activeSchoolYear?.label} />}
    </div>
  );
};

export default App;
