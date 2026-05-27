import { useEffect, useState } from 'react';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import type { ManagedSection, SectionSubjectRecord, SubjectCatalogRecord, SubjectSchedulePresetRecord } from '../services/subjectsManagementService';
import { assignCatalogSubjectToSection, deleteSectionSubject, isSectionSubjectsTableAvailable, loadApplicableSchedulePresetsForSection, loadAssignableSubjectsForSection, loadSectionSubjects } from '../services/subjectsManagementService';

type Props = {
  onClose: () => void;
  onSaved: () => Promise<void>;
  section: ManagedSection;
};

export function SectionSubjectsModal({ onClose, onSaved, section }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<SectionSubjectRecord[]>([]);
  const [catalogSubjects, setCatalogSubjects] = useState<SubjectCatalogRecord[]>([]);
  const [schedulePresets, setSchedulePresets] = useState<SubjectSchedulePresetRecord[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [alert, setAlert] = useState<{ message: string; title: string; tone: 'danger' | 'success' | 'info' }>({
    message: '',
    title: '',
    tone: 'info',
  });
  const [isTableReady, setIsTableReady] = useState(true);

  const reload = async () => {
    setIsLoading(true);
    try {
      setIsTableReady(await isSectionSubjectsTableAvailable());
      const [sectionRows, catalogRows] = await Promise.all([
        loadSectionSubjects(section.id),
        loadAssignableSubjectsForSection(section),
      ]);
      setSubjects(sectionRows);
      setCatalogSubjects(catalogRows);
      setSchedulePresets(await loadApplicableSchedulePresetsForSection(section));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [section.id]);

  const clearForm = () => {
    setSelectedCatalogId('');
    setSelectedPresetId('');
  };
  const assignedCodes = new Set(subjects.map((row) => row.subjectCode.toUpperCase()));
  const availableCatalogSubjects = catalogSubjects.filter((row) => !assignedCodes.has(row.subjectCode.toUpperCase()));
  const selectedCatalogSubject = availableCatalogSubjects.find((row) => row.id === selectedCatalogId) || null;
  const selectedPreset = schedulePresets.find((row) => row.id === selectedPresetId) || null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide ia-subjects-modal" role="dialog" aria-modal="true" aria-label="Section subjects">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Grades and Subjects</p>
            <h3>{section.gradeLevel} - {section.name} Subjects</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body">
          {!isTableReady ? (
            <p className="registry-copy">Subject management table is not yet deployed in Supabase. Run the latest IA schema SQL to enable add/edit/delete.</p>
          ) : null}
          {isLoading ? <p>Loading subjects...</p> : (
            <div className="registry-table-wrap">
              <table className="registry-table">
                <thead><tr><th>Code</th><th>Title</th><th>Type</th><th>Actions</th></tr></thead>
                <tbody>
                  {subjects.map((row) => (
                    <tr key={row.id}>
                      <td>{row.subjectCode}</td>
                      <td>{row.subjectTitle}</td>
                      <td><span className="modal-record__chip">{row.isCore ? 'Core' : 'Elective'}</span></td>
                      <td>
                        <div className="registry-table__actions">
                          <button type="button" className="registry-icon-btn registry-icon-btn--danger" onClick={async () => {
                            if (!isTableReady) return;
                            setIsSubmitting(true);
                            try {
                              await deleteSectionSubject(row.id);
                              await reload();
                              await onSaved();
                            } catch (error: any) {
                              setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to delete subject.', tone: 'danger' });
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}><span className="material-symbols-outlined">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subjects.length === 0 ? <tr><td colSpan={4}>No subjects set for this section yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          )}

          <form className="floating-field-grid ia-teaching-credential-form-grid ia-subjects-modal__form" onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              if (!selectedCatalogSubject) {
                setAlert({ title: 'Selection Required', message: 'Choose a subject from Subject Management first.', tone: 'info' });
                return;
              }
              if (schedulePresets.length > 0 && !selectedPreset) {
                setAlert({ title: 'Time Slot Required', message: 'Choose a time slot preset for this section program.', tone: 'info' });
                return;
              }
              setIsSubmitting(true);
              try {
                await assignCatalogSubjectToSection({
                  preset: selectedPreset,
                  section,
                  subject: selectedCatalogSubject,
                });
                clearForm();
                await reload();
                await onSaved();
                setAlert({ title: 'Saved', message: 'Subject assigned to section.', tone: 'success' });
              } catch (error: any) {
                setAlert({ title: 'Save Failed', message: error?.message || 'Unable to assign section subject.', tone: 'danger' });
              } finally {
                setIsSubmitting(false);
              }
            })();
          }}>
            <UsisSearchableSelect
              ariaLabel="Subject"
              floatingLabel
              forcePortalMenu
              label="Choose Subject from Subject Management"
              onChange={setSelectedCatalogId}
              options={availableCatalogSubjects.map((row) => ({
                label: `${row.subjectCode} - ${row.subjectTitle} (${row.subjectType === 'core' ? 'Core' : 'Elective'})`,
                value: row.id,
              }))}
              required
              value={selectedCatalogId}
            />
            <UsisSearchableSelect
              ariaLabel="Time Slot Preset"
              floatingLabel
              forcePortalMenu
              label="Time Slot Preset"
              onChange={setSelectedPresetId}
              options={schedulePresets.map((row) => ({
                label: `${row.label || 'Slot'} - ${row.dayOfWeek} ${row.startTime}-${row.endTime}${row.room ? ` (${row.room})` : ''}`,
                value: row.id,
              }))}
              value={selectedPresetId}
            />
            <div className="modal-dialog__actions ia-subjects-modal__actions">
              <button type="button" onClick={clearForm} disabled={isSubmitting || !isTableReady}>Clear</button>
              <button type="submit" className="modal-dialog__blue" disabled={isSubmitting || !isTableReady || availableCatalogSubjects.length === 0}>
                {isSubmitting ? 'Saving...' : 'Assign Subject'}
              </button>
            </div>
          </form>
          {availableCatalogSubjects.length === 0 ? (
            <p className="registry-copy">No more available subjects for this section. Add more in Subject Management or remove assigned entries above.</p>
          ) : null}
          {schedulePresets.length === 0 ? (
            <p className="registry-copy">No schedule presets found for this section program. Create presets using the Subject Schedule button first.</p>
          ) : null}
        </div>
      </div>
      <UsisAlertModal open={Boolean(alert.message)} title={alert.title} message={alert.message} tone={alert.tone} onClose={() => setAlert({ title: '', message: '', tone: 'info' })} />
    </div>
  );
}
