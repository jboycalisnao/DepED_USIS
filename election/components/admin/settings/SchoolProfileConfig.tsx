import React, { useEffect, useMemo, useState } from 'react';
import { ElectionConfig, SchoolYear } from '../../../types';
import { useStore } from '../../../supabaseStore';
import { SchoolYearSearchableSelect } from './SchoolYearSearchableSelect';
import { FloatingField } from '../../ui/FloatingField';

interface SchoolProfileConfigProps {
  schoolYears: SchoolYear[];
  electionConfig: ElectionConfig;
  onSaveElectionName: (value: string) => Promise<void> | void;
  showAlert: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
}

const SchoolProfileConfig: React.FC<SchoolProfileConfigProps> = ({ schoolYears, electionConfig, onSaveElectionName, showAlert }) => {
  const store = useStore();
  const [draftElectionName, setDraftElectionName] = useState(electionConfig.electionName || 'Learner Government Election');
  const [isSaving, setIsSaving] = useState(false);

  const selectedSchoolYear = useMemo(
    () => schoolYears.find((schoolYear) => schoolYear.id === store.activeSchoolYear.id) || null,
    [schoolYears, store.activeSchoolYear.id],
  );

  useEffect(() => {
    setDraftElectionName(electionConfig.electionName || 'Learner Government Election');
  }, [electionConfig.electionName]);

  const handleSaveElectionName = async () => {
    const nextName = draftElectionName.trim() || 'Learner Government Election';
    try {
      setIsSaving(true);
      await Promise.resolve(onSaveElectionName(nextName));
      showAlert('Settings Saved', 'The election name has been updated successfully.', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="election-page__control-card election-settings__profile-card">
      <div className="election-settings__section-header">
        <div className="election-settings__section-copy">
          <p className="election-settings__section-kicker">School Profile</p>
          <h3 className="election-settings__section-title">Global system branding and current term</h3>
          <div className="election-settings__tag-row">
            <span className="election-settings__tag">Active Term</span>
            <span className="election-settings__tag election-settings__tag--accent">
              {selectedSchoolYear ? `SY ${selectedSchoolYear.label}` : 'School Year'}
            </span>
          </div>
        </div>
      </div>

      <div className="election-settings__profile-grid">
        <div className="election-settings__profile-field">
          <SchoolYearSearchableSelect schoolYears={schoolYears} />
        </div>
        <div className="election-settings__profile-field election-settings__profile-field--inline-action">
          <FloatingField
            as="input"
            label="Election Name"
            value={draftElectionName}
            onChange={(event) => setDraftElectionName(event.target.value)}
            placeholder=" "
          />
          <button
            type="button"
            onClick={handleSaveElectionName}
            className="primary-button election-settings__profile-save-button"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Election Name'}
          </button>
        </div>
      </div>

      <div className="election-settings__helper-note">
        <span className="material-symbols-outlined" aria-hidden="true">
          info
        </span>
        <p>
          Changing the active school year switches election data, candidate lists, and voter registries to the selected term. Existing ballots remain saved in their respective terms.
        </p>
      </div>
    </section>
  );
};

export default SchoolProfileConfig;
