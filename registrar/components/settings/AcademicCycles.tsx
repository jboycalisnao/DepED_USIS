import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { SchoolYear } from '../../types';
import ConfirmationModal from '../ConfirmationModal';
import AcademicCycleCreateModal from './academic-cycles/AcademicCycleCreateModal';
import { getAcademicCycleYearOptions } from './academic-cycles/academicCycleOptions';

const AcademicCycles: React.FC = () => {
  const { schoolYears, activeSchoolYear, addSchoolYear, removeSchoolYear, setActiveSchoolYear, copySectionsBetweenSchoolYears, lockSchoolYear, loading, sections } = useStore();

  const latestStartYear = useMemo(() => {
    if (schoolYears.length === 0) return new Date().getFullYear();
    return Math.max(...schoolYears.map((sy) => parseInt(sy.label.slice(0, 4), 10) || 0));
  }, [schoolYears]);

  const [selectedStartYear, setSelectedStartYear] = useState<number>(latestStartYear + 1);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [pendingSYDelete, setPendingSYDelete] = useState<SchoolYear | null>(null);
  const [pendingSYActive, setPendingSYActive] = useState<SchoolYear | null>(null);
  const [pendingSYLock, setPendingSYLock] = useState<SchoolYear | null>(null);
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [sourceSchoolYearId, setSourceSchoolYearId] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => setSelectedStartYear(latestStartYear + 1), [latestStartYear]);

  const generatedLabel = `${selectedStartYear}-${selectedStartYear + 1}`;
  const isDuplicate = schoolYears.some((sy) => sy.label === generatedLabel);
  const getSectionsInSY = (syId: string) => sections.filter((s) => s.schoolYearId === syId).length;

  const yearSelectOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return getAcademicCycleYearOptions(current);
  }, []);

  const availableSourceSchoolYears = useMemo(() => schoolYears.filter((schoolYear) => schoolYear.id !== activeSchoolYear.id), [activeSchoolYear.id, schoolYears]);

  const handleSwitchCycle = async (strategy: 'none' | 'copy') => {
    if (!pendingSYActive) return;
    setSwitchError(null);
    const result = await setActiveSchoolYear(pendingSYActive.id, strategy);
    if (result?.error) return setSwitchError(result.error);
    setPendingSYActive(null);
    window.location.reload();
  };

  const handleCopyIntoActive = async () => {
    if (!sourceSchoolYearId) return setCopyError('Select a source cycle first.');
    setCopyError(null);
    const result = await copySectionsBetweenSchoolYears(sourceSchoolYearId, activeSchoolYear.id);
    if (result?.error) return setCopyError(result.error);
    setCopyModalOpen(false);
    setSourceSchoolYearId('');
    window.location.reload();
  };

  const handleCreateCycle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDuplicate || loading) return;
    const result = await addSchoolYear(generatedLabel);
    if (result?.error) {
      setErrorFeedback(`Sync Warning: ${result.error}`);
      return;
    }
    setErrorFeedback(null);
    setCreateModalOpen(false);
  };

  return (
    <section className="settings-cycles">
      <header className="settings-cycles__head">
        <div>
          <h4>Academic Cycles (School Years)</h4>
          <p>Manage institutional yearly registry</p>
        </div>
        <div className="settings-cycles__head-actions">
          <button type="button" className="primary-button" onClick={() => setCreateModalOpen(true)}>
            <span className="material-symbols-outlined">add</span>
            Add Cycle
          </button>
        </div>
      </header>

      <div className="settings-cycles__grid">
        {[...schoolYears].sort((a, b) => b.label.localeCompare(a.label)).map((sy) => (
          <article key={sy.id} className={`settings-cycles__card ${sy.isActive ? 'is-active' : ''} ${sy.isLocked ? 'is-locked' : ''}`}>
            <div className="settings-cycles__card-head">
              <div className="settings-cycles__card-icon"><span className="material-symbols-outlined">{sy.isActive ? 'verified' : sy.isLocked ? 'lock' : 'calendar_today'}</span></div>
              <div className="settings-cycles__card-actions">
                {!sy.isActive && !sy.isLocked && <button type="button" onClick={() => setPendingSYActive(sy)}><span className="material-symbols-outlined">check_circle</span></button>}
                {sy.isActive && <button type="button" onClick={() => { setCopyModalOpen(true); setCopyError(null); }}><span className="material-symbols-outlined">content_copy</span></button>}
                <button type="button" onClick={() => setPendingSYLock(sy)}><span className="material-symbols-outlined">{sy.isLocked ? 'lock_open' : 'lock'}</span></button>
                {!sy.isActive && <button type="button" onClick={() => setPendingSYDelete(sy)}><span className="material-symbols-outlined">delete</span></button>}
              </div>
            </div>
            <h5>{sy.label}</h5>
            <footer>
              <span>{getSectionsInSY(sy.id)} Sections Linked</span>
              {sy.isActive ? <span className="status">Active Cycle</span> : sy.isLocked ? <span className="status">Archived</span> : null}
            </footer>
          </article>
        ))}
      </div>

      {pendingSYActive && (
        <div className="modal-overlay modal-overlay--high">
          <div className="modal-backdrop" onClick={() => { setPendingSYActive(null); setSwitchError(null); }} />
          <div className="modal-dialog" role="dialog" aria-modal="true">
            <div className="modal-dialog__header"><div className="modal-dialog__title-group"><h3>Switch Active Cycle</h3></div><button type="button" className="modal-dialog__close" onClick={() => { setPendingSYActive(null); setSwitchError(null); }}><span className="material-symbols-outlined">close</span></button></div>
            <div className="modal-dialog__body">
              <p>Set {pendingSYActive.label} as active and choose what to do with current sections.</p>
              {switchError && <p>{switchError}</p>}
              <div className="settings-cycles__switch-actions">
                <button type="button" onClick={() => handleSwitchCycle('none')} disabled={loading}>Switch Only</button>
                <button type="button" onClick={() => handleSwitchCycle('copy')} disabled={loading}>Copy Sections</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {copyModalOpen && (
        <div className="modal-overlay modal-overlay--high">
          <div className="modal-backdrop" onClick={() => { setCopyModalOpen(false); setCopyError(null); setSourceSchoolYearId(''); }} />
          <div className="modal-dialog" role="dialog" aria-modal="true">
            <div className="modal-dialog__header"><div className="modal-dialog__title-group"><h3>Copy Sections Into Active Cycle</h3></div><button type="button" className="modal-dialog__close" onClick={() => { setCopyModalOpen(false); setCopyError(null); setSourceSchoolYearId(''); }}><span className="material-symbols-outlined">close</span></button></div>
            <div className="modal-dialog__body">
              <label>Source Cycle</label>
              <select value={sourceSchoolYearId} onChange={(e) => setSourceSchoolYearId(e.target.value)}>
                <option value="">Select source cycle</option>
                {availableSourceSchoolYears.map((schoolYear) => <option key={schoolYear.id} value={schoolYear.id}>{schoolYear.label}</option>)}
              </select>
              {copyError && <p>{copyError}</p>}
            </div>
            <div className="modal-dialog__actions"><button type="button" onClick={() => { setCopyModalOpen(false); setCopyError(null); setSourceSchoolYearId(''); }}>Cancel</button><button type="button" className="modal-dialog__blue" disabled={!sourceSchoolYearId || loading} onClick={handleCopyIntoActive}>Copy Sections</button></div>
          </div>
        </div>
      )}

      <AcademicCycleCreateModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setErrorFeedback(null);
        }}
        loading={loading}
        isDuplicate={isDuplicate}
        selectedStartYear={selectedStartYear}
        setSelectedStartYear={setSelectedStartYear}
        yearSelectOptions={yearSelectOptions}
        generatedLabel={generatedLabel}
        errorFeedback={errorFeedback}
        onSubmit={handleCreateCycle}
      />

      <ConfirmationModal isOpen={!!pendingSYLock} title={pendingSYLock?.isLocked ? 'Unlock' : 'Archive'} message={`Update SY ${pendingSYLock?.label} lock status?`} type={pendingSYLock?.isLocked ? 'primary' : 'accent'} confirmLabel="Update" onConfirm={async () => { if (pendingSYLock) await lockSchoolYear(pendingSYLock.id, !pendingSYLock.isLocked); setPendingSYLock(null); }} onCancel={() => setPendingSYLock(null)} isLoading={loading} />
      <ConfirmationModal isOpen={!!pendingSYDelete} title="Deregister Year" message={`Remove ${pendingSYDelete?.label}?`} type="danger" confirmLabel="Delete" onConfirm={async () => { if (pendingSYDelete) { const linkedSections = getSectionsInSY(pendingSYDelete.id); if (linkedSections > 0) setDeleteBlockedMessage(`Remove ${linkedSections} linked sections before deregistering this school year.`); else await removeSchoolYear(pendingSYDelete.id); } setPendingSYDelete(null); }} onCancel={() => setPendingSYDelete(null)} isLoading={loading} />
      <ConfirmationModal isOpen={!!deleteBlockedMessage} title="Cycle In Use" message={deleteBlockedMessage || ''} type="accent" confirmLabel="Understood" hideCancel onConfirm={() => setDeleteBlockedMessage(null)} />
    </section>
  );
};

export default AcademicCycles;
