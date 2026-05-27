import { useEffect, useMemo, useState, type FormEvent } from 'react';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import { UsisAlertModal } from '../../../../../../common/components/UsisAlertModal';
import { useSubjectsManagement } from '../../hooks/useSubjectsManagement';
import type { SectionTrack, SubjectSchedulePresetRecord } from '../../services/subjectsManagementService';
import { deleteSubjectSchedulePreset, isSubjectSchedulePresetsTableAvailable, loadJhsSpecialPrograms, loadSubjectSchedulePresets, saveSubjectSchedulePreset } from '../../services/subjectsManagementService';
import { TimeSlotsEditorModal } from '../components/TimeSlotsEditorModal';
import { TimeSlotsGradeProgramList } from '../components/TimeSlotsGradeProgramList';
import { getGradeNumber } from '../utils/timeSlotHelpers';

export function TimeSlotsPage() {
  const { isLoading: isSectionLoading, rows: sections } = useSubjectsManagement();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTableReady, setIsTableReady] = useState(true);
  const [rows, setRows] = useState<SubjectSchedulePresetRecord[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isInheritedContextLocked, setIsInheritedContextLocked] = useState(false);
  const [draftRowsByGroup, setDraftRowsByGroup] = useState<Record<string, number>>({});
  const [pendingDraftGroupKey, setPendingDraftGroupKey] = useState('');
  const [lastExpandedGradeKey, setLastExpandedGradeKey] = useState('');
  const [lastExpandedSectionKey, setLastExpandedSectionKey] = useState('');
  const [jhsPrograms, setJhsPrograms] = useState<Array<{ label: string; value: string }>>([]);
  const [editingId, setEditingId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 7');
  const [programScope, setProgramScope] = useState<SectionTrack>('regular');
  const [programName, setProgramName] = useState('');
  const [strand, setStrand] = useState('');
  const [label, setLabel] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday']);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [alert, setAlert] = useState<{ message: string; title: string; tone: 'danger' | 'success' | 'info' }>({ message: '', title: '', tone: 'info' });

  const strandOptions = useMemo(() => {
    const source = sections.filter((row) => row.track === 'senior_high_school' && row.strand).map((row) => row.strand);
    return Array.from(new Set(source)).sort((a, b) => a.localeCompare(b)).map((value) => ({ label: value, value }));
  }, [sections]);

  const jhsProgramOptions = useMemo(() => {
    const sectionPrograms = Array.from(
      new Set(
        sections
          .filter((row) => {
            const grade = getGradeNumber(row.gradeLevel);
            return grade !== null && grade >= 7 && grade <= 10;
          })
          .map((row) => (row.specialProgram || '').trim())
          .filter(Boolean),
      ),
    ).map((value) => ({ label: value, value }));
    const merged = new Map<string, { label: string; value: string }>();
    [...jhsPrograms, ...sectionPrograms].forEach((row) => {
      const key = row.value.trim().toLowerCase();
      if (!key || merged.has(key)) return;
      merged.set(key, row);
    });
    return [{ label: 'Regular', value: 'regular' }, ...Array.from(merged.values()).map((row) => ({ label: row.label, value: `special::${row.value}` }))];
  }, [jhsPrograms, sections]);

  const gradeNo = getGradeNumber(gradeLevel);
  const isShsGrade = gradeNo === 11 || gradeNo === 12;
  const reload = async () => {
    setIsLoading(true);
    try {
      const ready = await isSubjectSchedulePresetsTableAvailable();
      setIsTableReady(ready);
      if (!ready) {
        setRows([]);
        return;
      }
      const [presetRows, programRows] = await Promise.all([loadSubjectSchedulePresets(), loadJhsSpecialPrograms()]);
      setRows(presetRows);
      setJhsPrograms(programRows);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (isShsGrade) {
      setProgramScope('senior_high_school');
      return;
    }
    if (programScope === 'senior_high_school') setProgramScope('regular');
    setStrand('');
  }, [isShsGrade]);

  const clearForm = () => {
    setEditingId('');
    setGradeLevel('Grade 7');
    setProgramScope('regular');
    setProgramName('');
    setStrand('');
    setLabel('');
    setSelectedDays(['Monday']);
    setStartTime('');
    setEndTime('');
    setRoom('');
    setIsInheritedContextLocked(false);
  };

  const toGroupKey = (seed: { gradeLevel: string; programName?: string; programScope: SectionTrack; strand?: string }) =>
    `${seed.gradeLevel}|${seed.programScope}|${(seed.programName || '').toLowerCase()}|${(seed.strand || '').toLowerCase()}`;
  const toSectionKey = (label: string) => label.toLowerCase().replace(/\s+/g, '-');
  const toProgramLabelFromSeed = (seed: { gradeLevel: string; programName?: string; programScope: SectionTrack; strand?: string }) => {
    if (seed.programScope === 'regular') return 'Regular';
    if (seed.programScope === 'special_program_ste') return seed.programName || 'Special Program';
    return `SHS - ${seed.strand || 'No Strand'}`;
  };
  const toProgramLabelFromRow = (row: SubjectSchedulePresetRecord) => {
    if (row.programScope === 'regular') return 'Regular';
    if (row.programScope === 'special_program_ste') return row.programName || 'Special Program';
    return `SHS - ${row.strand || 'No Strand'}`;
  };

  const openCreateModal = (day?: string, seed?: { gradeLevel: string; programName?: string; programScope: SectionTrack; strand?: string }, slotLabel?: string) => {
    clearForm();
    if (seed) {
      setGradeLevel(seed.gradeLevel || 'Grade 7');
      setProgramScope(seed.programScope || 'regular');
      setProgramName(seed.programName || '');
      setStrand(seed.strand || '');
      setLastExpandedGradeKey(seed.gradeLevel || '');
      setLastExpandedSectionKey(toSectionKey(toProgramLabelFromSeed(seed)));
    }
    if (day) setSelectedDays([day]);
    if (slotLabel) setLabel(slotLabel);
    setIsInheritedContextLocked(Boolean(day && seed));
    setIsEditorOpen(true);
  };

  const handleCreateRow = (seed: { gradeLevel: string; programName?: string; programScope: SectionTrack; strand?: string }) => {
    const key = toGroupKey(seed);
    setDraftRowsByGroup((current) => ({ ...current, [key]: (current[key] || 0) + 1 }));
  };

  const handleAssignFromMatrixCell = (day: string, seed: { gradeLevel: string; programName?: string; programScope: SectionTrack; strand?: string }, slotLabel: string, fromDraftRow = false) => {
    openCreateModal(day, seed, slotLabel);
    setPendingDraftGroupKey(fromDraftRow ? toGroupKey(seed) : '');
  };

  const openEditModal = (row: SubjectSchedulePresetRecord) => {
    setEditingId(row.id);
    setGradeLevel(row.gradeLevel);
    setProgramScope(row.programScope === 'senior_high_school' ? 'senior_high_school' : row.programScope);
    setProgramName(row.programName || '');
    setStrand(row.strand || '');
    setLabel(row.label || '');
    setSelectedDays([row.dayOfWeek]);
    setStartTime(row.startTime);
    setEndTime(row.endTime);
    setRoom(row.room || '');
    setLastExpandedGradeKey(row.gradeLevel || '');
    setLastExpandedSectionKey(toSectionKey(toProgramLabelFromRow(row)));
    setIsInheritedContextLocked(false);
    setIsEditorOpen(true);
  };

  const handleDeletePreset = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteSubjectSchedulePreset(id);
      await reload();
      setAlert({ title: 'Deleted', message: 'Preset deleted.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to delete preset.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePreset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (async () => {
      if (selectedDays.length === 0) return setAlert({ title: 'Selection Required', message: 'Select at least one day.', tone: 'info' });
      if (isShsGrade && !strand.trim()) return setAlert({ title: 'Selection Required', message: 'Strand is required for SHS presets.', tone: 'info' });
      if (!isShsGrade && programScope === 'special_program_ste' && !programName.trim()) return setAlert({ title: 'Selection Required', message: 'Choose a JHS special program.', tone: 'info' });
      setIsSubmitting(true);
      try {
        const normalizedDays = Array.from(new Set(selectedDays));
        for (let index = 0; index < normalizedDays.length; index += 1) {
          const dayOfWeek = normalizedDays[index];
          await saveSubjectSchedulePreset({
            dayOfWeek,
            endTime,
            gradeLevel,
            id: editingId && index === 0 ? editingId : undefined,
            label,
            programName,
            programScope: isShsGrade ? 'senior_high_school' : programScope,
            room,
            startTime,
            strand,
          });
        }
        clearForm();
        setIsEditorOpen(false);
        if (pendingDraftGroupKey) {
          setDraftRowsByGroup((current) => {
            const count = current[pendingDraftGroupKey] || 0;
            if (count <= 1) {
              const next = { ...current };
              delete next[pendingDraftGroupKey];
              return next;
            }
            return { ...current, [pendingDraftGroupKey]: count - 1 };
          });
          setPendingDraftGroupKey('');
        }
        await reload();
        setAlert({ title: 'Saved', message: 'Schedule preset saved.', tone: 'success' });
      } catch (error: any) {
        setAlert({ title: 'Save Failed', message: error?.message || 'Unable to save preset.', tone: 'danger' });
      } finally {
        setPendingDraftGroupKey('');
        setIsSubmitting(false);
      }
    })();
  };

  if (isSectionLoading || isLoading) return <UsisPageLoader message="Loading time slot presets..." />;

  return (
    <div className="admin-panel registry-page--unified">
      <div className="registry-layout">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <div className="ia-subjects-page__header">
              <p className="section-card__eyebrow">Grades and Subjects</p>
              <h3>Time Slots</h3>
              <p className="registry-copy">Create preset schedule slots per grade/program and SHS strand. Section subject assignment will use these presets.</p>
            </div>
            <div className="ia-time-slots-page__actions">
              <button type="button" className="registry-action-button" onClick={openCreateModal} disabled={!isTableReady}>
                Add Time Slot Preset
              </button>
            </div>
            {!isTableReady ? <p className="registry-copy">Subject schedule presets table is not yet deployed in Supabase. Run the latest IA schema SQL to enable scheduling presets.</p> : null}
            <TimeSlotsGradeProgramList
              autoExpandGradeKey={lastExpandedGradeKey}
              autoExpandSectionKey={lastExpandedSectionKey}
              draftRowsByGroup={draftRowsByGroup}
              rows={rows}
              sections={sections}
              onEdit={openEditModal}
              onDelete={handleDeletePreset}
              onCreateRow={handleCreateRow}
              onAssignCell={handleAssignFromMatrixCell}
              isSubmitting={isSubmitting}
            />
          </div>
        </article>
      </div>
      {isEditorOpen ? <TimeSlotsEditorModal
        editingId={editingId}
        endTime={endTime}
        gradeLevel={gradeLevel}
        isShsGrade={isShsGrade}
        isSubmitting={isSubmitting}
        isTableReady={isTableReady}
        isInheritedContextLocked={isInheritedContextLocked}
        jhsProgramOptions={jhsProgramOptions}
        label={label}
        onClear={clearForm}
        onClose={() => setIsEditorOpen(false)}
        onSubmit={handleSavePreset}
        programName={programName}
        programScope={programScope}
        room={room}
        selectedDays={selectedDays}
        setSelectedDays={setSelectedDays}
        setEndTime={setEndTime}
        setGradeLevel={setGradeLevel}
        setLabel={setLabel}
        setProgramName={setProgramName}
        setProgramScope={setProgramScope}
        setRoom={setRoom}
        setStartTime={setStartTime}
        setStrand={setStrand}
        startTime={startTime}
        strand={strand}
        strandOptions={strandOptions}
      /> : null}
      <UsisAlertModal open={Boolean(alert.message)} title={alert.title} message={alert.message} tone={alert.tone} onClose={() => setAlert({ title: '', message: '', tone: 'info' })} />
    </div>
  );
}
