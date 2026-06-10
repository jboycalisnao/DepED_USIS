import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import type { ManagedSection, SectionTrack, SubjectSchedulePresetRecord } from '../services/subjectsManagementService';
import {
  deleteSubjectSchedulePreset,
  isSubjectSchedulePresetsTableAvailable,
  loadJhsSpecialPrograms,
  loadSubjectSchedulePresets,
  saveSubjectSchedulePreset,
} from '../services/subjectsManagementService';

type Props = {
  onClose: () => void;
  sections: ManagedSection[];
};

const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((value) => ({ label: value, value }));
const gradeOptions = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((value) => ({ label: value, value }));
const getGradeNumber = (value: string) => {
  const match = String(value || '').match(/\b(7|8|9|10|11|12)\b/);
  return match ? Number(match[1]) : null;
};
const plusOneHour = (time: string) => {
  if (!/^\d{2}:\d{2}$/.test(time)) return '';
  const [h, m] = time.split(':').map((v) => Number(v));
  const nextH = (h + 1) % 24;
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export function SubjectSchedulesModal({ onClose, sections }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTableReady, setIsTableReady] = useState(true);
  const [rows, setRows] = useState<SubjectSchedulePresetRecord[]>([]);
  const [jhsPrograms, setJhsPrograms] = useState<Array<{ label: string; value: string }>>([]);
  const [editingId, setEditingId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 7');
  const [programScope, setProgramScope] = useState<SectionTrack>('regular');
  const [strand, setStrand] = useState('');
  const [programName, setProgramName] = useState('');
  const [label, setLabel] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [alert, setAlert] = useState<{ message: string; title: string; tone: 'danger' | 'success' | 'info' }>({
    message: '',
    title: '',
    tone: 'info',
  });

  const strandOptions = useMemo(() => {
    const source = sections
      .filter((row) => row.track === 'senior_high_school' && row.strand)
      .map((row) => row.strand);
    return Array.from(new Set(source)).sort((a, b) => a.localeCompare(b)).map((value) => ({ label: value, value }));
  }, [sections]);
  const jhsProgramOptions = useMemo(
    () => {
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
        if (!key) return;
        if (!merged.has(key)) merged.set(key, row);
      });

      return [{ label: 'Regular', value: 'regular' }, ...Array.from(merged.values()).map((row) => ({ label: row.label, value: `special::${row.value}` }))];
    },
    [jhsPrograms, sections],
  );
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
      const [presetRows, programRows] = await Promise.all([
        loadSubjectSchedulePresets(),
        loadJhsSpecialPrograms(),
      ]);
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
    if (programScope === 'senior_high_school') {
      setProgramScope('regular');
    }
    setStrand('');
  }, [isShsGrade]);

  const clearForm = () => {
    setEditingId('');
    setGradeLevel('Grade 7');
    setProgramScope('regular');
    setProgramName('');
    setStrand('');
    setLabel('');
    setDayOfWeek('Monday');
    setStartTime('');
    setEndTime('');
    setRoom('');
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide ia-subjects-modal" role="dialog" aria-modal="true" aria-label="Subject schedule presets">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Grades and Subjects</p>
            <h3>Subject Time Schedule Presets</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body">
          {!isTableReady ? (
            <p className="registry-copy">Subject schedule presets table is not yet deployed in Supabase. Run the latest IA schema SQL to enable scheduling presets.</p>
          ) : null}
          {isLoading ? <p>Loading presets...</p> : (
            <div className="registry-table-wrap">
              <table className="registry-table ia-registry-table--enhanced">
                <thead><tr><th>Grade</th><th>Program</th><th>Strand</th><th>Slot</th><th>Day</th><th>Time</th><th>Room</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.gradeLevel}</td>
                      <td>{row.programScope === 'special_program_ste' ? 'STE / Special' : row.programScope === 'senior_high_school' ? 'SHS' : 'Regular'}</td>
                      <td>{row.strand || '--'}</td>
                      <td>{row.label || '--'}</td>
                      <td>{row.dayOfWeek}</td>
                      <td>{row.startTime} - {row.endTime}</td>
                      <td>{row.room || '--'}</td>
                      <td>
                        <div className="registry-table__actions">
                          <button type="button" className="registry-icon-btn" onClick={() => {
                            setEditingId(row.id);
                            setGradeLevel(row.gradeLevel);
                            setProgramScope(row.programScope === 'senior_high_school' ? 'senior_high_school' : row.programScope);
                            setProgramName(row.programName || (row.programScope === 'special_program_ste' ? row.programName : ''));
                            setStrand(row.strand || '');
                            setLabel(row.label || '');
                            setDayOfWeek(row.dayOfWeek);
                            setStartTime(row.startTime);
                            setEndTime(row.endTime);
                            setRoom(row.room || '');
                          }}><span className="material-symbols-outlined">edit</span></button>
                          <button type="button" className="registry-icon-btn registry-icon-btn--danger" onClick={async () => {
                            setIsSubmitting(true);
                            try {
                              await deleteSubjectSchedulePreset(row.id);
                              await reload();
                              setAlert({ title: 'Deleted', message: 'Preset deleted.', tone: 'success' });
                            } catch (error: any) {
                              setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to delete preset.', tone: 'danger' });
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}><span className="material-symbols-outlined">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? <tr><td colSpan={8}>No presets yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          )}
          <form className="floating-field-grid form-grid" onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              if (isShsGrade && !strand.trim()) {
                setAlert({ title: 'Selection Required', message: 'Strand is required for SHS presets.', tone: 'info' });
                return;
              }
              if (!isShsGrade && programScope === 'special_program_ste' && !programName.trim()) {
                setAlert({ title: 'Selection Required', message: 'Choose a JHS special program.', tone: 'info' });
                return;
              }
              setIsSubmitting(true);
              try {
                await saveSubjectSchedulePreset({
                  dayOfWeek,
                  endTime,
                  gradeLevel,
                  id: editingId || undefined,
                  label,
                  programName,
                  programScope: isShsGrade ? 'senior_high_school' : programScope,
                  room,
                  startTime,
                  strand,
                });
                clearForm();
                await reload();
                setAlert({ title: 'Saved', message: 'Schedule preset saved.', tone: 'success' });
              } catch (error: any) {
                setAlert({ title: 'Save Failed', message: error?.message || 'Unable to save preset.', tone: 'danger' });
              } finally {
                setIsSubmitting(false);
              }
            })();
          }}>
            <UsisSearchableSelect ariaLabel="Grade Level" allowTyping={false} floatingLabel forcePortalMenu label="Grade Level" onChange={setGradeLevel} options={gradeOptions} required value={gradeLevel} />
            {isShsGrade ? (
              <>
                <UsisSearchableSelect
                  ariaLabel="Program Scope"
                  allowTyping={false}
                  disabled
                  floatingLabel
                  forcePortalMenu
                  label="Program Scope"
                  onChange={() => {}}
                  options={[{ label: 'Senior High School', value: 'senior_high_school' }]}
                  value="senior_high_school"
                />
                <UsisSearchableSelect ariaLabel="SHS Strand" floatingLabel forcePortalMenu label="SHS Strand" onChange={setStrand} options={strandOptions} required value={strand} />
              </>
            ) : (
              <>
                <UsisSearchableSelect
                  ariaLabel="Program Scope"
                  allowTyping={false}
                  floatingLabel
                  forcePortalMenu
                  label="Program Scope"
                  onChange={(value) => {
                    if (value === 'regular') {
                      setProgramScope('regular');
                      setProgramName('');
                      return;
                    }
                    const special = value.replace('special::', '').trim();
                    setProgramScope('special_program_ste');
                    setProgramName(special);
                  }}
                  options={jhsProgramOptions}
                  required
                  value={programScope === 'regular' ? 'regular' : `special::${programName}`}
                />
                <label className="floating-field"><div className="floating-field__control"><input value="Not Applicable for Grade 7-10" placeholder=" " disabled /><span>SHS Strand</span></div></label>
              </>
            )}
            <label className="floating-field"><div className="floating-field__control"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder=" " required /><span>Slot Label</span></div></label>
            <UsisSearchableSelect ariaLabel="Day" allowTyping={false} floatingLabel forcePortalMenu label="Day" onChange={setDayOfWeek} options={dayOptions} required value={dayOfWeek} />
            <label className="floating-field"><div className="floating-field__control"><input type="time" value={startTime} onChange={(e) => { const nextStart = e.target.value; setStartTime(nextStart); setEndTime(plusOneHour(nextStart)); }} placeholder=" " required /><span>Start Time</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder=" " required /><span>End Time</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input value={room} onChange={(e) => setRoom(e.target.value)} placeholder=" " /><span>Room</span></div></label>
            <div className="modal-dialog__actions ia-subjects-modal__actions">
              <button type="button" onClick={clearForm} disabled={isSubmitting || !isTableReady}>Clear</button>
              <button type="submit" className="modal-dialog__blue" disabled={isSubmitting || !isTableReady}>{isSubmitting ? 'Saving...' : editingId ? 'Update Preset' : 'Save Preset'}</button>
            </div>
          </form>
        </div>
      </div>
      <UsisAlertModal open={Boolean(alert.message)} title={alert.title} message={alert.message} tone={alert.tone} onClose={() => setAlert({ title: '', message: '', tone: 'info' })} />
    </div>
  );
}
