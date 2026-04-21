
import React, { useState, useEffect } from 'react';
import { Candidate, User, Student, Section, ElectionConfig, SchoolYear } from '../../types';
import DashboardTab from './dashboard/DashboardTab';
import CandidatesTab from './candidates/CandidatesTab';
import VotersTab from './voters/VotersTab';
import OrganizationTab from './organization/OrganizationTab';
import SettingsTab from './settings/SettingsTab';
import { ELECTION_TITLE, DEPED_SEAL_URL, LEON_NHS_LOGO_URL } from '../../constants';

interface AdminPanelProps {
  candidates: Candidate[];
  turnoutByPosition: Record<string, number>;
  onAddCandidate: (candidate: Partial<Candidate>, syId: string) => Promise<void>;
  onUpdateCandidate: (id: string, candidate: Partial<Candidate>) => Promise<void>;
  onDeleteCandidate: (id: string) => Promise<void>;
  onDeleteBallot: (lrn: string) => Promise<void>;
  voters: User[];
  learnerDatabase: Student[];
  sections: Section[];
  electionConfig: ElectionConfig;
  setElectionConfig: (config: ElectionConfig) => void;
  onReset: () => void;
  onLogout: () => void;
  showAlert: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
  schoolYears: SchoolYear[];
}

type AdminTab = 'dashboard' | 'candidates' | 'voters' | 'organization' | 'settings';

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Handle Hash Sync for Sub-routing
  useEffect(() => {
    const syncTabFromHash = () => {
      const hash = window.location.hash.replace('#/', '');
      const parts = hash.split('/');
      
      // We expect paths like admin/voters
      if (parts[0] === 'admin') {
        const tab = parts[1] as AdminTab;
        const validTabs: AdminTab[] = ['dashboard', 'candidates', 'voters', 'organization', 'settings'];
        
        if (tab && validTabs.includes(tab)) {
          setActiveTab(tab);
        } else if (!tab) {
          // If just #/admin, redirect to default tab
          window.location.hash = '#/admin/dashboard';
        }
      }
    };

    window.addEventListener('hashchange', syncTabFromHash);
    syncTabFromHash(); // Initial check

    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);

  const handleTabClick = (tabId: AdminTab) => {
    window.location.hash = `#/admin/${tabId}`;
  };

  const handleOpenMonitor = () => {
    window.open('#/monitoring', '_blank');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab {...props} />;
      case 'candidates':
        return (
          <CandidatesTab 
            candidates={props.candidates} 
            turnoutByPosition={props.turnoutByPosition}
            onAddCandidate={props.onAddCandidate} 
            onUpdateCandidate={props.onUpdateCandidate}
            onDeleteCandidate={props.onDeleteCandidate}
            showAlert={props.showAlert} 
            schoolYears={props.schoolYears}
            electionConfig={props.electionConfig}
          />
        );
      case 'voters':
        return (
          <VotersTab 
            learnerDatabase={props.learnerDatabase} 
            voters={props.voters} 
            sections={props.sections} 
            onDeleteBallot={props.onDeleteBallot}
            showAlert={props.showAlert}
          />
        );
      case 'organization':
        return <OrganizationTab sections={props.sections} learnerDatabase={props.learnerDatabase} voters={props.voters} />;
      case 'settings':
        return (
          <SettingsTab 
            candidates={props.candidates}
            onReset={props.onReset} 
            onLogout={props.onLogout} 
            learnerDatabase={props.learnerDatabase}
            voters={props.voters}
            sections={props.sections}
            showAlert={props.showAlert}
            electionConfig={props.electionConfig}
            setElectionConfig={props.setElectionConfig}
            schoolYears={props.schoolYears}
          />
        );
      default:
        return null;
    }
  };

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
    { id: 'candidates', label: 'Candidates', icon: 'fa-user-tie' },
    { id: 'voters', label: 'Voters', icon: 'fa-users-viewfinder' },
    { id: 'organization', label: 'Organization', icon: 'fa-sitemap' },
    { id: 'settings', label: 'Settings', icon: 'fa-gear' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 md:py-10 px-4">
      {/* Branding Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
             <img src={DEPED_SEAL_URL} className="h-14 w-auto drop-shadow-md" alt="DepEd Seal" />
             <div className="w-px h-10 bg-gray-200"></div>
             <img src={LEON_NHS_LOGO_URL} className="h-16 w-auto drop-shadow-md" alt="LNHS Logo" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-[#034F8B] uppercase tracking-tighter leading-none">
              Admin Console
            </h2>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">
              {ELECTION_TITLE} • Live Data Access
            </p>
          </div>
        </div>
        
        <div className="hidden md:flex flex-col items-end">
          <button 
            onClick={handleOpenMonitor}
            className="flex items-center space-x-3 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 border border-slate-700 active:scale-95"
          >
            <i className="fa-solid fa-tower-observation text-[#fcd116] animate-pulse"></i>
            <span>Launch Live Monitor</span>
            <i className="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-50 ml-2"></i>
          </button>
        </div>
      </div>

      {/* Navigation Redesign */}
      <div className="mb-10">
        <nav className="bg-[#034F8B] p-2 rounded-[1.5rem] shadow-2xl border-b-4 border-[#E11C38] grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-nowrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col lg:flex-row items-center justify-center lg:space-x-3 px-4 py-4 lg:px-6 lg:py-3 rounded-2xl font-black text-[10px] uppercase transition-all tracking-widest flex-1 ${
                activeTab === tab.id 
                  ? 'bg-white text-[#034F8B] shadow-lg scale-[1.03] z-10' 
                  : 'text-blue-200/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-lg lg:text-sm mb-2 lg:mb-0`}></i>
              <span className="text-center">{tab.label}</span>
            </button>
          ))}
          {/* Mobile Launch Monitor button */}
          <button
            onClick={handleOpenMonitor}
            className="flex flex-col lg:hidden items-center justify-center px-4 py-4 rounded-2xl font-black text-[10px] uppercase transition-all tracking-widest flex-1 text-yellow-400 bg-white/5 hover:bg-white/10"
          >
             <i className="fa-solid fa-tower-observation text-lg mb-2"></i>
             <span>Monitor</span>
          </button>
        </nav>
      </div>

      {/* Main Content Area - Applied 80% zoom scale globally */}
      <div className="min-h-[60vh] h-[calc(100vh-350px)] page-fade-in bg-white/40 rounded-[2rem] p-1 border border-transparent scale-[0.8] origin-top">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminPanel;
