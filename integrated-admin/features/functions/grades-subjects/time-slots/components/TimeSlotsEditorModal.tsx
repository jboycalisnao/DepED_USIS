import type { FormEvent } from 'react';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type { SectionTrack } from '../../services/subjectsManagementService';
import { dayOptions, gradeOptions, plusOneHour } from '../utils/timeSlotHelpers';

type Props = {
  dayOfWeek: string;
  editingId: string;
  endTime: string;
  gradeLevel: string;
  isShsGrade: boolean;
  isSubmitting: boolean;
  isTableReady: boolean;
  jhsProgramOptions: Array<{ label: string; value: string }>;
  label: string;
  onClear: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  programName: string;
  programScope: SectionTrack;
  room: string;
  setDayOfWeek: (value: string) => void;
  setEndTime: (value: string) => void;
  setGradeLevel: (value: string) => void;
  setLabel: (value: string) => void;
  setProgramName: (value: string) => void;
  setProgramScope: (value: SectionTrack) => void;
  setRoom: (value: string) => void;
  setStartTime: (value: string) => void;
  setStrand: (value: string) => void;
  startTime: string;
  strand: string;
  strandOptions: Array<{ label: string; value: string }>;
};

export function TimeSlotsEditorModal({
  dayOfWeek,
  editingId,
  endTime,
  gradeLevel,
  isShsGrade,
  isSubmitting,
  isTableReady,
  jhsProgramOptions,
  label,
  onClear,
  onClose,
  onSubmit,
  programName,
  programScope,
  room,
  setDayOfWeek,
  setEndTime,
  setGradeLevel,
  setLabel,
  setProgramName,
  setProgramScope,
  setRoom,
  setStartTime,
  setStrand,
  startTime,
  strand,
  strandOptions,
}: Props) {
  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }} />
      <div className="modal-dialog modal-dialog--wide ia-subjects-modal ia-time-slots-editor-modal" role="dialog" aria-modal="true" aria-label="Time slot preset form">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Grades and Subjects</p>
            <h3>{editingId ? 'Update Time Slot Preset' : 'Create Time Slot Preset'}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={() => { if (!isSubmitting) onClose(); }} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form className="modal-dialog__body" onSubmit={onSubmit}>
          <div className="floating-field-grid ia-time-slots-editor-modal__grid">
            <UsisSearchableSelect ariaLabel="Grade Level" allowTyping={false} floatingLabel forcePortalMenu label="Grade Level" onChange={setGradeLevel} options={gradeOptions} value={gradeLevel} required />
            {isShsGrade ? (
              <>
                <UsisSearchableSelect ariaLabel="Program Scope" allowTyping={false} disabled floatingLabel forcePortalMenu label="Program Scope" onChange={() => {}} options={[{ label: 'Senior High School', value: 'senior_high_school' }]} value="senior_high_school" />
                <UsisSearchableSelect ariaLabel="SHS Strand" floatingLabel forcePortalMenu label="SHS Strand" onChange={setStrand} options={strandOptions} required value={strand} />
              </>
            ) : (
              <>
                <UsisSearchableSelect ariaLabel="Program Scope" allowTyping={false} floatingLabel forcePortalMenu label="Program Scope" onChange={(value) => {
                  if (value === 'regular') {
                    setProgramScope('regular');
                    setProgramName('');
                  } else {
                    setProgramScope('special_program_ste');
                    setProgramName(value.replace('special::', '').trim());
                  }
                }} options={jhsProgramOptions} value={programScope === 'regular' ? 'regular' : `special::${programName}`} required />
                <label className="floating-field"><div className="floating-field__control"><input value="Not Applicable for Grade 7-10" placeholder=" " disabled /><span>SHS Strand</span></div></label>
              </>
            )}
            <label className="floating-field"><div className="floating-field__control"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder=" " required /><span>Slot Label</span></div></label>
            <UsisSearchableSelect ariaLabel="Day" allowTyping={false} floatingLabel forcePortalMenu label="Day" onChange={setDayOfWeek} options={dayOptions} value={dayOfWeek} required />
            <label className="floating-field"><div className="floating-field__control"><input type="time" value={startTime} onChange={(e) => { const next = e.target.value; setStartTime(next); setEndTime(plusOneHour(next)); }} placeholder=" " required /><span>Start Time</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder=" " required /><span>End Time</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input value={room} onChange={(e) => setRoom(e.target.value)} placeholder=" " /><span>Room</span></div></label>
          </div>
          <div className="modal-dialog__actions ia-time-slots-editor-modal__actions">
            <button type="button" onClick={onClear} disabled={isSubmitting || !isTableReady}>Clear</button>
            <button type="submit" className="modal-dialog__blue" disabled={isSubmitting || !isTableReady}>{isSubmitting ? 'Saving...' : editingId ? 'Update Preset' : 'Save Preset'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
