import React, { useEffect, useState } from 'react';
import { UsisSideNav, type UsisSideNavItem } from '../../../common/components/UsisSideNav';
import { UsisBreadcrumbBar } from '../../../common/components/UsisBreadcrumbBar';
import { Candidate, ElectionConfig, SchoolYear, Section, Student, User } from '../../types';
import CandidatesTab from './candidates/CandidatesTab';
import DashboardTab from './dashboard/DashboardTab';
import OrganizationTab from './organization/OrganizationTab';
import SettingsTab from './settings/SettingsTab';
import VotersTab from './voters/VotersTab';
import {
  getCurrentElectionPath,
  getElectionNavigationEvent,
  navigateToElectionPath,
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
  currentUserName?: string | null;
  currentUserRole?: string | null;
}

type AdminTab = 'dashboard' | 'candidates' | 'voters' | 'organization' | 'settings';

const validTabs: AdminTab[] = ['dashboard', 'candidates', 'voters', 'organization', 'settings'];

const tabs: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'candidates', label: 'Candidates', icon: 'badge' },
  { id: 'voters', label: 'Voters', icon: 'groups' },
  { id: 'organization', label: 'Organization', icon: 'account_tree' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const isEmbedded = props.variant === 'embedded';
  const activeSchoolYearLabel = props.schoolYears.find((schoolYear) => schoolYear.isActive || schoolYear.is_active)?.label
    || props.schoolYears[0]?.label
    || '2025-2026';

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

  const navItems: UsisSideNavItem[] = tabs.map((tab) => ({
    icon: tab.icon,
    label: tab.label,
    path: tab.id,
  }));

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
            schoolName={props.electionConfig.schoolName || 'Leon National High School'}
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
            schoolName={props.electionConfig.schoolName || 'Leon National High School'}
            electionName={props.electionConfig.electionName || 'Learner Government Election'}
            schoolYearLabel={activeSchoolYearLabel}
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
    <div className={isEmbedded ? 'w-full py-0' : 'w-full pt-2 pb-0 md:pt-3 md:pb-0'}>
      <div className="election-admin-breadcrumb">
        <UsisBreadcrumbBar
          rootLabel="Admin Console"
          currentLabel={tabs.find((tab) => tab.id === activeTab)?.label || 'Dashboard'}
          profileName={props.currentUserName || null}
          profileRole={props.currentUserRole || 'System Administrator'}
          onLogout={props.onLogout}
        />
      </div>
      <div className={isEmbedded ? 'page-fade-in election-admin-shell election-admin-shell--embedded' : 'page-fade-in election-admin-shell'}>
        <UsisSideNav
          items={navItems}
          onLogout={props.onLogout}
          ariaLabel="Election admin sections"
          activePath={activeTab}
          onItemSelect={(path) => handleTabClick(path as AdminTab)}
        />
        <div className="election-admin-shell__content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminPanel;
