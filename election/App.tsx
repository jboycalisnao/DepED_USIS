
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './components/Login';
import IdentityConfirmation from './components/IdentityConfirmation';
import Ballot from './components/Ballot';
import Confirmation from './components/Confirmation';
import Results from './components/Results';
import PublicResults from './components/PublicResults';
import PublicTurnout from './components/PublicTurnout';
import Footer from './components/Footer';
import AdminPanel from './components/admin/AdminPanel';
import NotificationModal, { ModalConfig } from './components/NotificationModal';
import AdminAccessModal from './components/AdminAccessModal';
import CandidateAuditView from './components/CandidateAuditView';
import LiveTallyMonitor from './components/admin/dashboard/LiveTallyMonitor';
import SystemAlerts from './components/SystemAlerts';
import { Candidate, AppView, User, ElectionConfig, ElectionStatus, Position, GradeLevel } from './types';
import { DEPED_SEAL_URL, DEPED_LOGO_URL, LEON_NHS_LOGO_URL, LG_COMEA_LOGO_URL } from './constants';
import { useStore } from './supabaseStore';
import { cacheBrandingImages } from './utils/imagePersistence';
import { DEMO_LRN, DEMO_USER, DEMO_CANDIDATES, DemoBanner } from './components/DemoMode';

const App: React.FC = () => {
  const store = useStore();
  
  const [view, setView] = useState<AppView | 'audit' | 'monitoring'>('login');
  const [auditCandidateId, setAuditCandidateId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [turnoutByPosition, setTurnoutByPosition] = useState<Record<string, number>>({});
  const [votedLrns, setVotedLrns] = useState<string[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    cacheBrandingImages({
      'deped_seal': DEPED_SEAL_URL,
      'deped_logo': DEPED_LOGO_URL,
      'leon_nhs_logo': LEON_NHS_LOGO_URL,
      'lg_comea_logo': LG_COMEA_LOGO_URL
    });
    refreshElectionData();
  }, [store.activeSchoolYear?.id]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      const parts = hash.split('/');
      const mainView = parts[0] as AppView | 'audit' | 'monitoring';
      const validViews: string[] = ['login', 'identity-confirmation', 'ballot', 'confirmation', 'results', 'admin', 'audit', 'monitoring', 'public-results', 'public-turnout'];
      
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

        if (mainView === 'results' && !currentUser?.isAdmin) {
            window.location.hash = '#/login';
            setView('login');
            return;
        }
        
        if (['identity-confirmation', 'ballot', 'confirmation', 'admin'].includes(mainView) && !currentUser) {
          window.location.hash = '#/login';
          setView('login');
        } else {
          setView(mainView as any);
        }
      } else {
        window.location.hash = '#/login';
        setView('login');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  const updateView = (newView: string) => {
    window.location.hash = `#/${newView}`;
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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lrn = studentId.trim();

    if (lrn.toLowerCase() === 'admin') {
      setIsAdminModalOpen(true);
      return;
    }

    if (lrn === DEMO_LRN) {
      setIsDemoMode(true);
      setCurrentUser(DEMO_USER);
      updateView('identity-confirmation');
      return;
    }

    const learnersList = store.learners || [];
    const learner = learnersList.find(l => l.lrn === lrn);
    if (!learner) {
      showAlert("Voter Not Found", "The LRN you entered is not recognized in our official records.", "error");
      setStudentId('');
      return;
    }

    const section = (store.sections || []).find(s => s.id === learner.sectionId);
    
    if (section?.gradeLevel === GradeLevel.GRADE_12) {
      showAlert(
        "Non-Voter Status", 
        "Grade 12 students are graduating and are excluded from the current Learner Government election cycle.", 
        "warning"
      );
      setStudentId('');
      return;
    }

    const alreadyVoted = await store.checkIfVoted(lrn, store.activeSchoolYear?.id || '');
    if (alreadyVoted) {
      showAlert("Duplicate Record", "Our records show that this student has already successfully cast a ballot.", "warning");
      setStudentId('');
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
    setStudentId('');
    setSelections({});
    setIsDemoMode(false);
    updateView('login');
  };

  const voters: User[] = (votedLrns || []).map(lrn => ({
    studentId: lrn,
    name: 'Verified Voter', 
    hasVoted: true,
    isAdmin: false
  }));

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

  if (view === 'public-results') {
    return (
      <PublicResults 
        candidates={candidates} 
        turnoutByPosition={turnoutByPosition} 
        config={electionConfig}
        schoolYearLabel={store.activeSchoolYear?.label || '----'}
      />
    );
  }

  if (view === 'public-turnout') {
    return (
      <PublicTurnout 
        voters={voters} 
        learnerDatabase={store.learners || []} 
        sections={store.sections || []} 
        config={electionConfig}
        schoolYearLabel={store.activeSchoolYear?.label || '----'}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <SystemAlerts isOnline={store.online} isSyncing={store.loading || isSubmitting} hasError={store.connError} />
      <NotificationModal config={modalConfig} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />
      <AdminAccessModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} onConfirm={(code) => {
        if (code === '456456') {
          setCurrentUser({ studentId: 'admin', name: 'System Administrator', hasVoted: false, isAdmin: true });
          setIsAdminModalOpen(false);
          updateView('admin/dashboard');
        } else {
          showAlert("Access Denied", "Incorrect administrative code.", "error");
        }
      }} />
      
      <Header 
        onLogout={currentUser ? handleLogout : undefined} 
        currentUser={currentUser?.name} 
        onAdminClick={!currentUser ? () => setIsAdminModalOpen(true) : undefined} 
        schoolName={electionConfig.schoolName} 
        electionYear={electionYearLabel}
      />

      {isDemoMode && <DemoBanner />}
      
      <main className="flex-grow flex flex-col page-fade-in relative overflow-hidden bg-[#f8fafc]">
        {view === 'login' && <Login studentId={studentId} setStudentId={setStudentId} onLogin={handleLogin} isLoadingLearners={store.loading} fetchProgress={100} config={electionConfig} />}
        {view === 'identity-confirmation' && currentUser && <IdentityConfirmation user={currentUser} onConfirm={() => updateView('ballot')} onCancel={handleLogout} />}
        {view === 'ballot' && (
          <div className="overflow-y-auto h-full no-scrollbar">
            <Ballot 
              candidates={isDemoMode ? DEMO_CANDIDATES : candidates} 
              selections={selections} 
              onSelect={(pos, ids) => setSelections({...selections, [pos]: ids})} 
              onSubmit={handleVoteSubmission} 
              currentUser={currentUser} 
            />
          </div>
        )}
        {view === 'confirmation' && <Confirmation candidates={isDemoMode ? DEMO_CANDIDATES : candidates} selections={selections} onLogout={handleLogout} user={currentUser} />}
        {view === 'results' && <div className="overflow-y-auto h-full"><Results candidates={candidates} turnoutByPosition={turnoutByPosition} /></div>}
        {view === 'audit' && <CandidateAuditView candidate={candidates.find(c => c.id === auditCandidateId) || null} onBack={handleLogout} />}
        {view === 'admin' && (
          <div className="overflow-y-auto h-full">
            <AdminPanel 
              candidates={candidates || []} 
              turnoutByPosition={turnoutByPosition}
              onAddCandidate={handleAddCandidate}
              onUpdateCandidate={handleUpdateCandidate}
              onDeleteCandidate={handleDeleteCandidate}
              onDeleteBallot={async (lrn) => {
                await store.deleteVoterBallot(lrn, store.activeSchoolYear?.id || '');
                await refreshElectionData();
              }}
              voters={voters || []} 
              learnerDatabase={store.learners || []} 
              sections={store.sections || []} 
              onReset={() => showAlert("Confirm System Reset", "Permanently wipe records?", "confirm", () => store.resetAllElectionData(store.activeSchoolYear?.id || '').then(refreshElectionData))} 
              onLogout={handleLogout} 
              showAlert={showAlert} 
              electionConfig={electionConfig} 
              setElectionConfig={handleUpdateElectionConfig}
              schoolYears={store.schoolYears || []}
            />
          </div>
        )}
      </main>

      <Footer schoolYearLabel={store.activeSchoolYear?.label} />
    </div>
  );
};

export default App;
