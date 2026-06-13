import React, { useEffect, useMemo, useState } from 'react';
import { ElectionConfig, ElectionStatus, GradeLevel } from '../../../types';
import { FloatingField } from '../../ui/FloatingField';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';

interface VoterAccessControlProps {
  config: ElectionConfig;
  onUpdate: (newConfig: ElectionConfig) => void;
}

const VoterAccessControl: React.FC<VoterAccessControlProps> = ({ config, onUpdate }) => {
  const gradeLevelOptions = useMemo(
    () => [
      { label: 'All Grades', value: '' },
      ...Object.values(GradeLevel).map((gradeLevel) => ({
        label: gradeLevel,
        value: gradeLevel,
      })),
    ],
    [],
  );
  const [draftAllowedGradeLevel, setDraftAllowedGradeLevel] = useState<string>(config.allowedGradeLevel || '');
  const [lastSavedGradeLevel, setLastSavedGradeLevel] = useState<string>(config.allowedGradeLevel || '');

  useEffect(() => {
    const nextValue = config.allowedGradeLevel || '';
    setDraftAllowedGradeLevel(nextValue);
    setLastSavedGradeLevel(nextValue);
  }, [config.allowedGradeLevel]);

  const handleStatusChange = (status: ElectionStatus) => {
    if (config.status !== status) {
      onUpdate({ ...config, status });
    }
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    onUpdate({ ...config, [field]: value });
  };

  const handleGradeLevelChange = (value: string) => {
    setDraftAllowedGradeLevel(value);
  };

  const handleSaveGradeLevel = () => {
    const nextValue = draftAllowedGradeLevel.trim();
    onUpdate({
      ...config,
      allowedGradeLevel: nextValue ? (nextValue as GradeLevel) : null,
    });
    setLastSavedGradeLevel(nextValue);
  };

  const isScheduleActive = config.status === ElectionStatus.SCHEDULED;

  return (
    <section className="election-page__control-card election-settings__access-card">
      <div className="election-settings__section-header">
        <div className="election-settings__section-copy">
          <p className="election-settings__section-kicker">Voter Access Control</p>
          <h3 className="election-settings__section-title">Manage login availability and scheduling</h3>
          <div className="election-settings__tag-row">
            <span className="election-settings__tag election-settings__tag--accent">
              {isScheduleActive ? 'Schedule Mode' : 'Manual Mode'}
            </span>
          </div>
        </div>
        <span className="election-settings__section-badge">
          {isScheduleActive ? 'Use Schedule' : config.status === ElectionStatus.MANUAL_OPEN ? 'Always Open' : 'Force Closed'}
        </span>
      </div>

      <div className="election-settings__toggle-grid">
        <button
          type="button"
          onClick={() => handleStatusChange(ElectionStatus.MANUAL_OPEN)}
          className={`election-settings__toggle-card ${config.status === ElectionStatus.MANUAL_OPEN ? 'election-settings__toggle-card--active election-settings__toggle-card--open' : ''}`}
        >
          <span className="election-settings__toggle-icon">
            <span className="material-symbols-outlined" aria-hidden="true">
              lock_open
            </span>
          </span>
          <span className="election-settings__toggle-copy">
            <strong>Always Open</strong>
            <small>Manual override that keeps voter login available.</small>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange(ElectionStatus.MANUAL_CLOSED)}
          className={`election-settings__toggle-card ${config.status === ElectionStatus.MANUAL_CLOSED ? 'election-settings__toggle-card--active election-settings__toggle-card--closed' : ''}`}
        >
          <span className="election-settings__toggle-icon">
            <span className="material-symbols-outlined" aria-hidden="true">
              lock
            </span>
          </span>
          <span className="election-settings__toggle-copy">
            <strong>Force Closed</strong>
            <small>Blocks login regardless of schedule state.</small>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange(ElectionStatus.SCHEDULED)}
          className={`election-settings__toggle-card ${config.status === ElectionStatus.SCHEDULED ? 'election-settings__toggle-card--active election-settings__toggle-card--schedule' : ''}`}
        >
          <span className="election-settings__toggle-icon">
            <span className="material-symbols-outlined" aria-hidden="true">
              calendar_clock
            </span>
          </span>
          <span className="election-settings__toggle-copy">
            <strong>Use Schedule</strong>
            <small>Opens and closes voter access by time window.</small>
          </span>
        </button>
      </div>

        <div className={`election-settings__schedule-panel ${!isScheduleActive ? 'election-settings__schedule-panel--disabled' : ''}`}>
        <div className="election-settings__section-header election-settings__section-header--compact">
          <div className="election-settings__section-copy">
            <p className="election-settings__section-kicker">Automation Settings</p>
            <h4 className="election-settings__section-subtitle">Only editable when schedule mode is active</h4>
          </div>
          <span className="election-settings__section-note">
            {isScheduleActive ? 'Schedule Enabled' : 'Schedule Disabled'}
          </span>
        </div>

        <div className="election-settings__schedule-grid">
          <FloatingField
            as="input"
            label="Portal Open Time"
            type="datetime-local"
            value={config.startTime || ''}
            onChange={(event) => handleTimeChange('startTime', event.target.value)}
            disabled={!isScheduleActive}
          />

          <FloatingField
            as="input"
            label="Portal Close Time"
            type="datetime-local"
            value={config.endTime || ''}
            onChange={(event) => handleTimeChange('endTime', event.target.value)}
            disabled={!isScheduleActive}
          />
        </div>

        <div className="election-settings__helper-note election-settings__helper-note--compact">
          <span className="material-symbols-outlined" aria-hidden="true">
            info
          </span>
          <p>
            When schedule mode is active, voters can only access the login form between the configured dates. Outside that window, the portal stays closed.
          </p>
        </div>
      </div>

      <div className="election-settings__schedule-panel">
        <div className="election-settings__section-header election-settings__section-header--compact">
          <div className="election-settings__section-copy">
            <p className="election-settings__section-kicker">Grade-Level Access</p>
            <h4 className="election-settings__section-subtitle">Limit portal login to a single grade level</h4>
          </div>
          <span className="election-settings__section-note">
            {config.allowedGradeLevel ? 'Restricted' : 'Open'}
          </span>
        </div>

        <div className="election-settings__grade-access-row">
          <label className="floating-field election-settings__grade-access-field">
            <UsisSearchableSelect
              ariaLabel="Allowed Grade Level"
              allowTyping={false}
              floatingLabel
              label="Allowed Grade Level"
              onChange={handleGradeLevelChange}
              options={gradeLevelOptions}
              value={draftAllowedGradeLevel}
            />
          </label>

          <button
            type="button"
            className="election-settings__grade-save-button"
            onClick={handleSaveGradeLevel}
            disabled={draftAllowedGradeLevel.trim() === lastSavedGradeLevel.trim()}
          >
            {draftAllowedGradeLevel.trim() === lastSavedGradeLevel.trim() ? 'Saved' : 'Save Access'}
          </button>
        </div>

        <div className="election-settings__helper-note election-settings__helper-note--compact">
          <span className="material-symbols-outlined" aria-hidden="true">
            info
          </span>
          <p>
            Select one grade level to limit election portal login to that group only. Leave it on All Grades to keep the current default access rules.
          </p>
        </div>

        <p className="election-settings__save-status" aria-live="polite">
          {draftAllowedGradeLevel.trim() === lastSavedGradeLevel.trim()
            ? 'Grade-level access is saved.'
            : 'You have unsaved grade-level changes.'}
        </p>
      </div>
    </section>
  );
};

export default VoterAccessControl;
