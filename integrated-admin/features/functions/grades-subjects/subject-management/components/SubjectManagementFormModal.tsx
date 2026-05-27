import { useEffect, useState } from 'react';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type { ProgramScope, SaveSubjectManagementInput, SubjectManagementRecord, SubjectType } from '../services/subjectManagementService';

type Props = {
  initialValue?: SubjectManagementRecord | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: SaveSubjectManagementInput) => Promise<void>;
  strands: Array<{ label: string; value: string }>;
};

const gradeLevelOptions = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((value) => ({
  label: value,
  value,
}));

export function SubjectManagementFormModal({ initialValue, isSubmitting, onClose, onSubmit, strands }: Props) {
  const [gradeLevel, setGradeLevel] = useState('Grade 7');
  const [programScope, setProgramScope] = useState<ProgramScope>('regular');
  const [subjectType, setSubjectType] = useState<SubjectType>('core');
  const [strand, setStrand] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectTitle, setSubjectTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!initialValue) return;
    setGradeLevel(initialValue.gradeLevel || 'Grade 7');
    setProgramScope(initialValue.programScope || 'regular');
    setSubjectType(initialValue.subjectType || 'core');
    setStrand(initialValue.strand || '');
    setSubjectCode(initialValue.subjectCode || '');
    setSubjectTitle(initialValue.subjectTitle || '');
    setIsActive(initialValue.isActive ?? true);
    setFormError('');
  }, [initialValue?.id]);

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }} />
      <div className="modal-dialog modal-dialog--wide ia-subject-management-modal" role="dialog" aria-modal="true" aria-label="Subject management form">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Grades and Subjects</p>
            <h3>{initialValue?.id ? 'Edit Subject' : 'Create Subject'}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={() => { if (!isSubmitting) onClose(); }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          className="modal-dialog__body registry-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (programScope === 'senior_high_school' && !strand.trim()) {
              setFormError('Strand is required for SHS subjects.');
              return;
            }
            setFormError('');
            void onSubmit({
              gradeLevel,
              id: initialValue?.id,
              isActive,
              programScope,
              strand,
              subjectCode,
              subjectTitle,
              subjectType,
            });
          }}
        >
          <div className="floating-field-grid ia-teaching-credential-form-grid">
            <UsisSearchableSelect
              ariaLabel="Grade Level"
              allowTyping={false}
              floatingLabel
              forcePortalMenu
              label="Grade Level"
              onChange={setGradeLevel}
              options={gradeLevelOptions}
              required
              value={gradeLevel}
            />
            <UsisSearchableSelect
              ariaLabel="Program Scope"
              allowTyping={false}
              floatingLabel
              forcePortalMenu
              label="Program Scope"
              onChange={(value) => setProgramScope(value as ProgramScope)}
              options={[
                { label: 'Regular', value: 'regular' },
                { label: 'STE / Special Program', value: 'special_program_ste' },
                { label: 'Senior High School', value: 'senior_high_school' },
              ]}
              required
              value={programScope}
            />
            <UsisSearchableSelect
              ariaLabel="Subject Type"
              allowTyping={false}
              floatingLabel
              forcePortalMenu
              label="Subject Type"
              onChange={(value) => setSubjectType(value as SubjectType)}
              options={[
                { label: 'Core', value: 'core' },
                { label: 'Elective', value: 'elective' },
              ]}
              required
              value={subjectType}
            />
            <UsisSearchableSelect
              ariaLabel="SHS Strand"
              allowTyping
              floatingLabel
              forcePortalMenu
              label="SHS Strand"
              onChange={setStrand}
              options={strands}
              required={programScope === 'senior_high_school'}
              value={strand}
            />
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={subjectCode} onChange={(event) => setSubjectCode(event.target.value)} placeholder=" " required />
                <span>Subject Code</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={subjectTitle} onChange={(event) => setSubjectTitle(event.target.value)} placeholder=" " required />
                <span>Subject Title</span>
              </div>
            </label>
          </div>
          <div className="registry-form__split">
            <UsisSearchableSelect
              ariaLabel="Status"
              allowTyping={false}
              floatingLabel
              forcePortalMenu
              label="Status"
              onChange={(value) => setIsActive(value === 'active')}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              value={isActive ? 'active' : 'inactive'}
            />
          </div>
          {formError ? <p className="login-card__error">{formError}</p> : null}
          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="modal-dialog__blue" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Subject'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

