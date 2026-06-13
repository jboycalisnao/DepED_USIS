import React, { useState } from 'react';
import VoterChecker from './VoterChecker';
import SectionListExporter from './SectionListExporter';
import VoterAccessControl from './VoterAccessControl';
import SchoolProfileConfig from './SchoolProfileConfig';
import ManualTallyModal from './ManualTallyModal';
import GenderTurnoutAudit from './GenderTurnoutAudit';
import PaperTarpModal from './PaperTarpModal';
import GradeResultsModal from './GradeResultsModal';
import { Student, User, Section, ElectionConfig, SchoolYear, Candidate } from '../../../types';
import { handleResultsPrint } from './resultsExportHandler';
import { handleParticipationPrint } from './participationExportHandler';
import { handleNonVotersPrint } from './nonVotersExportHandler';
import { getElectionAbsoluteUrl } from '../../../utils/navigation';

interface SettingsTabProps {
  candidates: Candidate[];
  onReset: () => void;
  onMigrateLegacyData: () => Promise<void>;
  onLogout: () => void;
  learnerDatabase: Student[];
  voters: User[];
  sections: Section[];
  electionConfig: ElectionConfig;
  setElectionConfig: (config: ElectionConfig) => void;
  showAlert: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
  schoolYears: SchoolYear[];
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  candidates,
  onReset,
  onMigrateLegacyData,
  onLogout,
  learnerDatabase,
  voters,
  sections,
  electionConfig,
  setElectionConfig,
  showAlert,
  schoolYears,
}) => {
  const activeSyLabel = schoolYears.find((sy) => sy.isActive || sy.is_active)?.label || '----';

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isTarpModalOpen, setIsTarpModalOpen] = useState(false);
  const [isGradeResultsOpen, setIsGradeResultsOpen] = useState(false);
  const [isMigratingLegacy, setIsMigratingLegacy] = useState(false);

  const handleTogglePublicResults = () => {
    const nextState = !electionConfig.publicResultsEnabled;
    setElectionConfig({ ...electionConfig, publicResultsEnabled: nextState });
    showAlert(
      nextState ? 'Public Results Enabled' : 'Public Results Disabled',
      `The live results page is now ${nextState ? 'accessible' : 'hidden'} to the general public.`,
      nextState ? 'success' : 'info',
    );
  };

  const handleCopyLink = (type: 'results' | 'turnout') => {
    const route = type === 'results' ? 'results' : 'public-turnout';
    const publicUrl = getElectionAbsoluteUrl(`/${route}`);
    navigator.clipboard.writeText(publicUrl).then(() => {
      showAlert('Link Copied', `The ${type} URL has been copied to your clipboard.`, 'success');
    });
  };

  const handleFinalizeAndPrint = (verifiedCandidates: Candidate[]) => {
    handleResultsPrint(verifiedCandidates, electionConfig, activeSyLabel);
    setIsManualModalOpen(false);
  };

  const handleExportParticipation = () => {
    handleParticipationPrint(learnerDatabase, voters, sections, electionConfig, activeSyLabel);
  };

  const handleExportNonVoters = () => {
    handleNonVotersPrint(learnerDatabase, voters, sections, electionConfig, activeSyLabel);
  };

  const handleMigrateLegacy = async () => {
    try {
      setIsMigratingLegacy(true);
      await onMigrateLegacyData();
    } finally {
      setIsMigratingLegacy(false);
    }
  };

  const handleSaveElectionName = async (nextName: string) => {
    const trimmedName = nextName.trim() || 'Learner Government Election';
    void setElectionConfig({ ...electionConfig, electionName: trimmedName });
  };

  return (
    <div className="election-page election-settings pb-20">
      <ManualTallyModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        candidates={candidates}
        onPrint={handleFinalizeAndPrint}
      />

      <PaperTarpModal
        isOpen={isTarpModalOpen}
        onClose={() => setIsTarpModalOpen(false)}
        candidates={candidates}
        voters={voters}
        learnerDatabase={learnerDatabase}
        sections={sections}
        schoolYear={activeSyLabel}
        schoolName={electionConfig.schoolName || 'Leon National High School'}
      />

      <GradeResultsModal
        isOpen={isGradeResultsOpen}
        onClose={() => setIsGradeResultsOpen(false)}
        learnerDatabase={learnerDatabase}
        sections={sections}
        candidates={candidates}
        electionConfig={electionConfig}
        schoolYear={activeSyLabel}
      />

      <section className="election-page__hero no-print">
        <div className="election-page__hero-bar" aria-hidden="true">
          <span style={{ backgroundColor: '#0038a8' }} />
          <span style={{ backgroundColor: '#fcd116' }} />
          <span style={{ backgroundColor: '#ce1126' }} />
        </div>
        <div className="election-page__hero-content">
          <div className="election-page__header election-settings__hero-header">
            <div className="election-settings__hero-copy">
              <p className="election-page__eyebrow">Election Settings</p>
              <h2 className="election-page__heading">System Settings</h2>
              <p className="election-page__lead">Election configuration and control panel</p>
            </div>
            <div className="election-settings__hero-badge">
              <span className="material-symbols-outlined" aria-hidden="true">
                event
              </span>
              <span>Active SY {activeSyLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="election-page__control-grid no-print">
        <div className="election-page__control-card election-settings__summary-card">
          <div className="election-settings__summary-header">
            <div className="election-settings__summary-copy">
              <p className="election-settings__summary-label">Live Tally Access</p>
              <h3 className="election-settings__summary-title">Broadcast candidate performance</h3>
            </div>
            <button
              type="button"
              onClick={handleTogglePublicResults}
              className={`election-settings__status-pill ${electionConfig.publicResultsEnabled ? 'election-settings__status-pill--active' : 'election-settings__status-pill--muted'}`}
            >
              {electionConfig.publicResultsEnabled ? 'Published' : 'Hidden'}
            </button>
          </div>
          <div className="election-settings__link-row">
            <div className="election-settings__link-field">
              <input type="text" readOnly value={getElectionAbsoluteUrl('/results')} />
            </div>
            <button type="button" onClick={() => handleCopyLink('results')} className="election-settings__copy-button">
              <span className="material-symbols-outlined" aria-hidden="true">
                content_copy
              </span>
            </button>
          </div>
        </div>

        <div className="election-page__control-card election-settings__summary-card">
          <div className="election-settings__summary-header">
            <div className="election-settings__summary-copy">
              <p className="election-settings__summary-label">Participation Dashboard</p>
              <h3 className="election-settings__summary-title">Public engagement statistics</h3>
            </div>
            <span className="election-settings__status-pill election-settings__status-pill--soft">
              Always Online
            </span>
          </div>
          <div className="election-settings__link-row">
            <div className="election-settings__link-field">
              <input type="text" readOnly value={getElectionAbsoluteUrl('/public-turnout')} />
            </div>
            <button type="button" onClick={() => handleCopyLink('turnout')} className="election-settings__copy-button">
              <span className="material-symbols-outlined" aria-hidden="true">
                content_copy
              </span>
            </button>
          </div>
        </div>
      </section>

      <SchoolProfileConfig
        schoolYears={schoolYears}
        electionConfig={electionConfig}
        onSaveElectionName={handleSaveElectionName}
        showAlert={showAlert}
      />
      <VoterAccessControl config={electionConfig} onUpdate={setElectionConfig} />

      <div className="election-settings__records-stack">
        <VoterChecker learnerDatabase={learnerDatabase} voters={voters} sections={sections} />
        <SectionListExporter sections={sections} schoolYear={activeSyLabel} />
      </div>

      <div className="election-page__card election-page__compact-card no-print">
        <div className="election-settings__section-header">
          <div className="election-settings__section-copy">
            <p className="election-settings__section-kicker">Advanced Election Controls</p>
            <h3 className="election-settings__section-title">Authorized access only</h3>
          </div>
          <span className="election-settings__section-note">Operations panel</span>
        </div>

        <div className="election-page__utility-tile-grid">
          <button type="button" onClick={() => setIsManualModalOpen(true)} className="election-page__utility-tile">
            <div className="election-page__utility-tile-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                receipt_long
              </span>
            </div>
            <span className="election-page__utility-tile-label">Results Tally</span>
            <span className="election-page__utility-tile-copy">Verify and print the official tally</span>
          </button>

          <button type="button" onClick={() => setIsGradeResultsOpen(true)} className="election-page__utility-tile">
            <div className="election-page__utility-tile-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                school
              </span>
            </div>
            <span className="election-page__utility-tile-label">Grade Tally</span>
            <span className="election-page__utility-tile-copy">Export grade results as PDF</span>
          </button>

          <button type="button" onClick={handleExportParticipation} className="election-page__utility-tile">
            <div className="election-page__utility-tile-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                pie_chart
              </span>
            </div>
            <span className="election-page__utility-tile-label">Participation Audit</span>
            <span className="election-page__utility-tile-copy">Voter turnout analysis</span>
          </button>

          <GenderTurnoutAudit
            learnerDatabase={learnerDatabase}
            voters={voters}
            sections={sections}
            schoolYear={activeSyLabel}
            schoolName={electionConfig.schoolName || 'Leon National High School'}
          />

          <button
            type="button"
            onClick={handleExportNonVoters}
            className="election-page__utility-tile election-page__utility-tile--danger"
          >
            <div className="election-page__utility-tile-icon election-page__utility-tile-icon--danger">
              <span className="material-symbols-outlined" aria-hidden="true">
                person_off
              </span>
            </div>
            <span className="election-page__utility-tile-label">Non-Voters List</span>
            <span className="election-page__utility-tile-copy">Official record of non-participation</span>
          </button>

          <button type="button" onClick={() => setIsTarpModalOpen(true)} className="election-page__utility-tile">
            <div className="election-page__utility-tile-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                image
              </span>
            </div>
            <span className="election-page__utility-tile-label">Report Image</span>
            <span className="election-page__utility-tile-copy">High-resolution PNG infographic export</span>
          </button>

          <button
            type="button"
            onClick={handleMigrateLegacy}
            disabled={isMigratingLegacy}
            className="election-page__utility-tile"
          >
            <div className="election-page__utility-tile-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                database
              </span>
            </div>
            <span className="election-page__utility-tile-label">Legacy Migration</span>
            <span className="election-page__utility-tile-copy">
              {isMigratingLegacy ? 'Migrating legacy records...' : 'Enforce legacy ballots and candidates'}
            </span>
          </button>
        </div>
      </div>

      <div className="election-settings__danger-card no-print">
        <div className="election-settings__danger-header">
          <div className="election-settings__danger-icon">
            <span className="material-symbols-outlined" aria-hidden="true">
              warning
            </span>
          </div>
          <div className="election-settings__danger-copy">
            <p className="election-settings__section-kicker">Emergency Protocol</p>
            <h3 className="election-settings__section-title">Clear election records</h3>
          </div>
        </div>

        <p className="election-settings__danger-note">
          Warning: data wipes are permanent and are intended for system recovery only.
        </p>

        <button type="button" onClick={onReset} className="election-settings__danger-action">
          Clear Election Records
        </button>
      </div>

      <div className="election-settings__logout no-print">
        <button type="button" onClick={onLogout} className="election-settings__logout-button">
          <span className="material-symbols-outlined" aria-hidden="true">
            logout
          </span>
          Deauthorize Administrator Access
        </button>
      </div>

    </div>
  );
};

export default SettingsTab;
