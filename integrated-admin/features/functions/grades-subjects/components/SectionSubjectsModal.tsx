import { useEffect, useState } from 'react';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import type { CoordinatorTeacherOption, ManagedSection, SectionSubjectRecord, SectionSubjectScheduleRecord, SubjectCatalogRecord, SubjectSchedulePresetRecord } from '../services/subjectsManagementService';
import { assignCatalogSubjectToSection, isSectionSubjectsTableAvailable, loadApplicableSchedulePresetsForSection, loadAssignableSubjectsForSection, loadCoordinatorTeacherAccountOptions, loadSectionSubjectSchedules, loadSectionSubjects, loadSubjectSchedulePresets, saveSectionSubject, saveSectionSubjectSchedule } from '../services/subjectsManagementService';

type Props = {
  initialPresetId?: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  section: ManagedSection;
};

export function SectionSubjectsModal({ initialPresetId = '', onClose, onSaved, section }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<SectionSubjectRecord[]>([]);
  const [catalogSubjects, setCatalogSubjects] = useState<SubjectCatalogRecord[]>([]);
  const [schedulePresets, setSchedulePresets] = useState<SubjectSchedulePresetRecord[]>([]);
  const [sectionSchedules, setSectionSchedules] = useState<SectionSubjectScheduleRecord[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<CoordinatorTeacherOption[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherQuery, setTeacherQuery] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState('');
  const [alert, setAlert] = useState<{ message: string; title: string; tone: 'danger' | 'success' | 'info' }>({
    message: '',
    title: '',
    tone: 'info',
  });
  const [isTableReady, setIsTableReady] = useState(true);
  const isPresetLockedFromContext = Boolean(initialPresetId);

  const reload = async () => {
    setIsLoading(true);
    try {
      setIsTableReady(await isSectionSubjectsTableAvailable());
      const [sectionRows, catalogRows, scheduleRows, coordinatorTeachers] = await Promise.all([
        loadSectionSubjects(section.id),
        loadAssignableSubjectsForSection(section),
        loadSectionSubjectSchedules([section.id]),
        loadCoordinatorTeacherAccountOptions(),
      ]);
      setSubjects(sectionRows);
      setCatalogSubjects(catalogRows);
      setSectionSchedules(scheduleRows);
      setTeacherOptions(coordinatorTeachers);
      setSchedulePresets(await loadApplicableSchedulePresetsForSection(section));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [section.id]);

  useEffect(() => {
    if (!editingSubjectId) {
      setSelectedPresetId(initialPresetId || '');
    }
  }, [initialPresetId, editingSubjectId]);

  const clearForm = () => {
    setSelectedCatalogId('');
    setSelectedTeacherId('');
    setTeacherQuery('');
    setSelectedPresetId(isPresetLockedFromContext ? initialPresetId : '');
    setEditingSubjectId('');
  };
  const editingRow = subjects.find((row) => row.id === editingSubjectId) || null;
  const availableCatalogSubjects = catalogSubjects;
  const selectedCatalogSubject = availableCatalogSubjects.find((row) => row.id === selectedCatalogId) || null;
  const selectedTeacher = teacherOptions.find((row) => row.value === selectedTeacherId) || null;
  const selectedPreset = schedulePresets.find((row) => row.id === selectedPresetId) || null;
  const matchingDepartmentTeachers = selectedCatalogSubject
    ? teacherOptions.filter((row) => row.departmentId && row.departmentId === selectedCatalogSubject.departmentId)
    : [];
  const defaultTeacherPool = matchingDepartmentTeachers.length > 0 ? matchingDepartmentTeachers : teacherOptions;
  const teacherSelectOptions = (teacherQuery.trim().length > 0
    ? teacherOptions
    : defaultTeacherPool
  ).map((row) => ({ label: row.label, value: row.value }));

  useEffect(() => {
    if (!selectedCatalogSubject) return;
    if (selectedTeacherId && teacherOptions.some((row) => row.value === selectedTeacherId)) return;
    if (matchingDepartmentTeachers.length > 0) {
      setSelectedTeacherId(matchingDepartmentTeachers[0].value);
    }
  }, [selectedCatalogSubject?.id, matchingDepartmentTeachers.length, selectedTeacherId, teacherOptions]);
  const programContext = section.track === 'regular'
    ? 'Regular'
    : section.track === 'special_program_ste'
      ? (section.specialProgram || 'Special Program')
      : `SHS - ${section.strand || 'No Strand'}`;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide ia-subjects-modal ia-section-subjects-modal" role="dialog" aria-modal="true" aria-label="Section subjects">
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
          {isLoading ? <p>Loading subjects...</p> : null}

          <form className="floating-field-grid ia-teaching-credential-form-grid ia-subjects-modal__form" onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              if (!selectedCatalogSubject) {
                setAlert({ title: 'Selection Required', message: 'Choose a subject from Subject Management first.', tone: 'info' });
                return;
              }
              if (!selectedTeacher) {
                setAlert({ title: 'Teacher Required', message: 'Select the teacher in charge for this section subject.', tone: 'info' });
                return;
              }
              if (!selectedCatalogSubject.departmentId) {
                setAlert({ title: 'Department Required', message: 'The selected subject has no department. Update it in Subject Management first.', tone: 'info' });
                return;
              }
              if (!editingSubjectId && schedulePresets.length > 0 && !selectedPreset) {
                setAlert({ title: 'Time Slot Required', message: 'Choose a time slot preset for this section program.', tone: 'info' });
                return;
              }
              setIsSubmitting(true);
              try {
                const existingRow = subjects.find((row) => row.subjectCode.toUpperCase() === selectedCatalogSubject.subjectCode.toUpperCase()) || null;

                if (editingSubjectId || existingRow) {
                  await saveSectionSubject({
                    departmentId: selectedCatalogSubject.departmentId,
                    id: (editingSubjectId || existingRow?.id) as string,
                    isCore: selectedCatalogSubject.subjectType === 'core',
                    programScope: section.track,
                    sectionId: section.id,
                    subjectCode: selectedCatalogSubject.subjectCode,
                    subjectTitle: selectedCatalogSubject.subjectTitle,
                    teacherAccountId: selectedTeacher.value,
                    teacherName: selectedTeacher.label,
                  });
                  if (selectedPreset) {
                    const allPresets = await loadSubjectSchedulePresets();
                    const selectedProgramName = String(selectedPreset.programName || '').trim().toLowerCase();
                    const selectedStrand = String(selectedPreset.strand || '').trim().toLowerCase();
                    const scheduleBundle = allPresets
                      .filter((row) => row.isActive)
                      .filter((row) => String(row.gradeLevel || '').trim() === String(selectedPreset.gradeLevel || '').trim())
                      .filter((row) => row.programScope === selectedPreset.programScope)
                      .filter((row) => String(row.label || '').trim().toLowerCase() === String(selectedPreset.label || '').trim().toLowerCase())
                      .filter((row) => {
                        if (selectedPreset.programScope === 'senior_high_school') {
                          return String(row.strand || '').trim().toLowerCase() === selectedStrand;
                        }
                        if (selectedPreset.programScope === 'special_program_ste') {
                          return String(row.programName || '').trim().toLowerCase() === selectedProgramName;
                        }
                        return true;
                      });

                    for (const row of (scheduleBundle.length ? scheduleBundle : [selectedPreset])) {
                      try {
                        await saveSectionSubjectSchedule({
                          dayOfWeek: row.dayOfWeek,
                          endTime: row.endTime,
                          presetId: row.id || selectedPreset.id,
                          room: row.room,
                          sectionId: section.id,
                          sectionName: section.name,
                          startTime: row.startTime,
                          subjectCode: selectedCatalogSubject.subjectCode,
                          subjectTitle: selectedCatalogSubject.subjectTitle,
                        });
                      } catch (error: any) {
                        const message = String(error?.message || '').toLowerCase();
                        if (!message.includes('duplicate key')) throw error;
                      }
                    }
                  }
                } else {
                  await assignCatalogSubjectToSection({
                    preset: selectedPreset,
                    section,
                    subject: selectedCatalogSubject,
                    teacherAccountId: selectedTeacher.value,
                    teacherName: selectedTeacher.label,
                  });
                }
                await onSaved();
                onClose();
                return;
              } catch (error: any) {
                setAlert({ title: 'Save Failed', message: error?.message || (editingSubjectId ? 'Unable to update section subject.' : 'Unable to assign section subject.'), tone: 'danger' });
              } finally {
                setIsSubmitting(false);
              }
            })();
          }}>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={programContext} placeholder=" " disabled />
                <span>Program</span>
              </div>
            </label>
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
              ariaLabel="Teacher in Charge"
              floatingLabel
              forcePortalMenu
              label="Teacher in Charge"
              onChange={setSelectedTeacherId}
              onQueryChange={setTeacherQuery}
              options={teacherSelectOptions}
              required
              value={selectedTeacherId}
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
              disabled={isPresetLockedFromContext}
              value={selectedPresetId}
            />
            <div className="modal-dialog__actions ia-section-subjects-modal__actions">
              <button type="button" onClick={clearForm} disabled={isSubmitting || !isTableReady}>Clear</button>
              <button type="submit" className="modal-dialog__blue" disabled={isSubmitting || !isTableReady || availableCatalogSubjects.length === 0}>
                {isSubmitting ? 'Saving...' : editingSubjectId ? 'Update Subject' : 'Assign Subject'}
              </button>
            </div>
          </form>
          {schedulePresets.length === 0 ? (
            <p className="registry-copy">No schedule presets found for this section program. Create presets using the Subject Schedule button first.</p>
          ) : null}
        </div>
      </div>
      <UsisAlertModal open={Boolean(alert.message)} title={alert.title} message={alert.message} tone={alert.tone} onClose={() => setAlert({ title: '', message: '', tone: 'info' })} />
    </div>
  );
}
