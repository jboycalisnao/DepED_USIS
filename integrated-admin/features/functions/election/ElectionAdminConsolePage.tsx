import { useState } from 'react';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import CandidatesTab from '../../../../election/components/admin/candidates/CandidatesTab';
import DashboardTab from '../../../../election/components/admin/dashboard/DashboardTab';
import OrganizationTab from '../../../../election/components/admin/organization/OrganizationTab';
import SettingsTab from '../../../../election/components/admin/settings/SettingsTab';
import VotersTab from '../../../../election/components/admin/voters/VotersTab';
import { useElectionAdminData } from './hooks/useElectionAdminData';

type ElectionTab = 'dashboard' | 'candidates' | 'voters' | 'organization' | 'settings';

type ElectionAdminConsolePageProps = {
  tab: ElectionTab;
};

const TAB_TITLES: Record<ElectionTab, string> = {
  dashboard: 'Dashboard',
  candidates: 'Candidates',
  organization: 'Organization',
  settings: 'Settings',
  voters: 'Voters',
};

export function ElectionAdminConsolePage({ tab }: ElectionAdminConsolePageProps) {
  const [alert, setAlert] = useState<{
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
    onConfirm?: () => void;
  } | null>(null);
  const data = useElectionAdminData();
  const activeSchoolYearLabel = data.schoolYears.find((schoolYear) => schoolYear.isActive || schoolYear.is_active)?.label
    || data.schoolYears[0]?.label
    || '----';

  if (data.isLoading) {
    return <UsisPageLoader message="Loading election administration..." />;
  }

  const showAlert = (
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' | 'confirm' = 'info',
    onConfirm?: () => void,
  ) => {
    setAlert({ title, message, type, onConfirm });
  };

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':
        return (
          <DashboardTab
            candidates={data.candidates}
            voters={data.voters}
            learnerDatabase={data.learnerDatabase}
            sections={data.sections}
          />
        );
      case 'candidates':
        return (
          <CandidatesTab
            candidates={data.candidates}
            turnoutByPosition={data.turnoutByPosition}
            onAddCandidate={data.handleAddCandidate}
            onUpdateCandidate={data.handleUpdateCandidate}
            onDeleteCandidate={data.handleDeleteCandidate}
            showAlert={showAlert}
            schoolYears={data.schoolYears}
            electionConfig={data.electionConfig}
          />
        );
      case 'voters':
        return (
          <VotersTab
            learnerDatabase={data.learnerDatabase}
            voters={data.voters}
            sections={data.sections}
            onDeleteBallot={data.handleDeleteBallot}
            showAlert={showAlert}
          />
        );
      case 'organization':
        return (
          <OrganizationTab
            sections={data.sections}
            learnerDatabase={data.learnerDatabase}
            voters={data.voters}
            schoolName="Leon National High School"
            electionName={data.electionConfig.electionName || 'Learner Government Election'}
            schoolYearLabel={activeSchoolYearLabel}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            candidates={data.candidates}
            onReset={data.handleReset}
            onLogout={() => showAlert(
              'Session Notice',
              'Use the Integrated Admin logout button to exit this subsystem.',
              'info',
            )}
            learnerDatabase={data.learnerDatabase}
            voters={data.voters}
            sections={data.sections}
            electionConfig={data.electionConfig}
            setElectionConfig={data.handleUpdateElectionConfig}
            onMigrateLegacyData={data.handleMigrateLegacyData}
            showAlert={showAlert}
            schoolYears={data.schoolYears}
          />
        );
      default:
        return null;
    }
  };

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Election Admin Console</h2>
      </div>

      <article className="section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <p className="section-card__eyebrow">Election Subpage</p>
          <h3 className="mt-2">{TAB_TITLES[tab]}</h3>

          <div className="mt-4">
            {renderTab()}
          </div>
        </div>
      </article>

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={
          alert?.type === 'success'
            ? 'success'
            : alert?.type === 'warning'
              ? 'warning'
              : alert?.type === 'error'
                ? 'danger'
                : 'info'
        }
        confirmLabel={alert?.type === 'confirm' ? 'Confirm' : 'OK'}
        cancelLabel="Cancel"
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
      />
    </section>
  );
}
