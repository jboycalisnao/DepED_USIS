import React, { useState } from 'react';
import { useStore } from '../../store';
import { GradeLevel } from '../../types';
import ConfirmationModal from '../ConfirmationModal';

const GradeLevelManagement: React.FC = () => {
  const { gradeLevels, setGradeLevels, loading } = useStore();
  const [pendingToggle, setPendingToggle] = useState<GradeLevel | null>(null);

  const executeToggle = async () => {
    if (!pendingToggle || loading) return;

    let newLevels: GradeLevel[];
    if (gradeLevels.includes(pendingToggle)) {
      if (gradeLevels.length <= 1) {
        setPendingToggle(null);
        return;
      }
      newLevels = gradeLevels.filter((g) => g !== pendingToggle);
    } else {
      newLevels = [...gradeLevels, pendingToggle].sort((a, b) => Object.values(GradeLevel).indexOf(a) - Object.values(GradeLevel).indexOf(b));
    }

    setPendingToggle(null);
    await setGradeLevels(newLevels);
  };

  return (
    <section className="settings-grades">
      <header className="settings-grades__head">
        <div>
          <h4>Offered Grade Levels</h4>
          <p>Institutional academic scope registry</p>
        </div>
        <div className="settings-grades__meta">
          {loading && <span className="settings-grades__sync"><span className="material-symbols-outlined">sync</span> Syncing</span>}
          <span className="settings-grades__count">{gradeLevels.length} Levels Active</span>
        </div>
      </header>

      <div className="settings-grades__grid">
        {Object.values(GradeLevel).map((grade) => {
          const isActive = gradeLevels.includes(grade);
          return (
            <button key={grade} type="button" onClick={() => !loading && setPendingToggle(grade)} disabled={loading} className={`settings-grades__item ${isActive ? 'is-active' : ''}`}>
              <span>{grade}</span>
              <span className="settings-grades__item-icon"><span className="material-symbols-outlined">{isActive ? 'check' : 'close'}</span></span>
            </button>
          );
        })}
      </div>

      <ConfirmationModal
        isOpen={!!pendingToggle}
        title={pendingToggle && gradeLevels.includes(pendingToggle) ? 'Deactivate Level' : 'Activate Level'}
        message={`Confirm updating the institutional registry for ${pendingToggle}? This affects enrollment options across the system.`}
        confirmLabel="Update Registry"
        type={pendingToggle && gradeLevels.includes(pendingToggle) ? 'danger' : 'primary'}
        onConfirm={executeToggle}
        onCancel={() => setPendingToggle(null)}
        isLoading={loading}
      />
    </section>
  );
};

export default GradeLevelManagement;
