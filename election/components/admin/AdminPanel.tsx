import React, { useEffect, useState } from 'react';
import { Candidate, ElectionConfig, SchoolYear, Section, Student, User } from '../../types';
import { ELECTION_TITLE } from '../../constants';
import CandidatesTab from './candidates/CandidatesTab';
import DashboardTab from './dashboard/DashboardTab';
import OrganizationTab from './organization/OrganizationTab';
import SettingsTab from './settings/SettingsTab';
import VotersTab from './voters/VotersTab';
import {
  getCurrentElectionPath,
  getElectionNavigationEvent,
  navigateToElectionPath,
  openElectionPathInNewTab,
} from '../../utils/navigation';

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
  onMigrateLegacyData: () => Promise<void>;
  onReset: () => void;
  onLogout: () => void;
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'warning' | 'error' | 'success' | 'confirm',
    onConfirm?: () => void,
  ) => void;
  schoolYears: SchoolYear[];
  variant?: 'embedded' | 'standalone';
}

type AdminTab = 'dashboard' | 'candidates' | 'voters' | 'organization' | 'settings';

const validTabs: AdminTab[] = ['dashboard', 'candidates', 'voters', 'organization', 'settings'];

const tabs: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
  { id: 'candidates', label: 'Candidates', icon: 'fa-user-tie' },
  { id: 'voters', label: 'Voters', icon: 'fa-users-viewfinder' },
  { id: 'organization', label: 'Organization', icon: 'fa-sitemap' },
  { id: 'settings', label: 'Settings', icon: 'fa-gear' },
];

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const isEmbedded = props.variant === 'embedded';

  useEffect(() => {
    if (isEmbedded) {
      return;
    }

    const syncTabFromPath = () => {
      const pathname = getCurrentElectionPath();
      const parts = pathname.split('/').filter(Boolean);

      if (parts[0] !== 'admin') return;

      const tab = parts[1] as AdminTab | undefined;

      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
        return;
      }

      if (!tab) {
        navigateToElectionPath('/admin/dashboard', true);
      }
    };

    const navigationEvent = getElectionNavigationEvent();
    window.addEventListener('popstate', syncTabFromPath);
    window.addEventListener(navigationEvent, syncTabFromPath);
    syncTabFromPath();

    return () => {
      window.removeEventListener('popstate', syncTabFromPath);
      window.removeEventListener(navigationEvent, syncTabFromPath);
    };
  }, [isEmbedded]);

  const handleTabClick = (tabId: AdminTab) => {
    if (isEmbedded) {
      setActiveTab(tabId);
      return;
    }

    navigateToElectionPath(`/admin/${tabId}`);
  };

  const handleOpenMonitor = () => {
    openElectionPathInNewTab('/monitoring');
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
        return (
          <OrganizationTab
            sections={props.sections}
            learnerDatabase={props.learnerDatabase}
            voters={props.voters}
          />
        );
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
            onMigrateLegacyData={props.onMigrateLegacyData}
            schoolYears={props.schoolYears}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={isEmbedded ? 'w-full py-0' : 'mx-auto w-[min(1180px,calc(100%-32px))] py-6 md:py-8'}>
      <div className={isEmbedded ? '' : 'px-[28px]'}>
        {!isEmbedded && (
          <section className="mb-6 flex flex-col gap-5 border-b border-[rgba(18,35,61,0.12)] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#68758d]">
                  Admin Console
                </p>
                <h2 className="mt-1 text-[24px] font-bold uppercase leading-tight text-[#0038a8]">
                  Election Administration
                </h2>
                <p className="mt-2 max-w-[720px] text-[16px] text-[#4a5568]">
                  Manage candidates, voters, organization records, settings, and reporting for {ELECTION_TITLE}.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenMonitor}
              className="inline-flex items-center justify-center gap-3 self-start rounded-[4px] bg-[#0038a8] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#002f8a]"
            >
              <i className="fa-solid fa-tower-observation text-[13px]"></i>
              <span>Open Live Monitor</span>
            </button>
          </section>
        )}

        <div className={`${isEmbedded ? 'mb-5' : 'mb-6'} border-b border-[rgba(18,35,61,0.12)]`}>
          <nav aria-label="Admin console sections">
            <div className={`flex flex-wrap items-center ${isEmbedded ? 'justify-between gap-4 py-4' : 'gap-5 py-5 md:gap-8 lg:gap-12'}`}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={[
                      'inline-flex items-center gap-3 text-[16px] font-bold uppercase tracking-[0.02em] transition-colors',
                      isActive ? 'text-[#0038a8]' : 'text-[#8a8a8a] hover:text-[#0038a8]',
                    ].join(' ')}
                  >
                    <i className={`fa-solid ${tab.icon} text-[13px]`}></i>
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              <button
                onClick={handleOpenMonitor}
                className={`inline-flex items-center gap-3 text-[16px] font-bold uppercase tracking-[0.02em] text-[#8a8a8a] transition-colors hover:text-[#0038a8] ${isEmbedded ? '' : 'lg:hidden'}`}
              >
                <i className="fa-solid fa-tower-observation text-[13px]"></i>
                <span>Monitor</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      <div className={isEmbedded ? 'page-fade-in' : 'page-fade-in px-[28px]'}>{renderContent()}</div>
    </div>
  );
};

export default AdminPanel;
