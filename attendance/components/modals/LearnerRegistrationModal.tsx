import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Learner } from '../../types';
import { UsisSearchableSelect } from '../ui/UsisSearchableSelect';
import { RegisterLearnerPayload } from '../../hooks/useLearners';

interface LearnerRegistrationModalProps {
  isOpen: boolean;
  learners: Learner[];
  selectedLearnerId?: string | null;
  readerValue: string;
  isSubmitting?: boolean;
  isUnlinking?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (value: RegisterLearnerPayload) => Promise<void> | void;
  onUnlinkLearner?: (learnerId: string) => Promise<void> | void;
  onReaderValueChange?: (value: string) => void;
}

const formatLearnerLabel = (learner: Learner) => {
  const name = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim();
  const section = [learner.grade_level, learner.section_name].filter(Boolean).join(' | ');
  const lrn = learner.lrn ? `LRN ${learner.lrn}` : 'LRN unavailable';
  return [name || learner.id, section, lrn].filter(Boolean).join(' | ');
};

export default function LearnerRegistrationModal({
  isOpen,
  learners,
  selectedLearnerId = null,
  readerValue,
  isSubmitting = false,
  isUnlinking = false,
  errorMessage = null,
  onClose,
  onSubmit,
  onUnlinkLearner,
  onReaderValueChange,
}: LearnerRegistrationModalProps) {
  const [form, setForm] = useState<RegisterLearnerPayload>({
    learnerId: selectedLearnerId || learners[0]?.id || '',
    rfid: readerValue || '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      learnerId: selectedLearnerId || learners[0]?.id || '',
      rfid: readerValue || '',
    });
  }, [isOpen, learners, readerValue, selectedLearnerId]);

  useEffect(() => {
    if (!isOpen) return;
    setForm((current) => ({
      ...current,
      rfid: readerValue || '',
    }));
  }, [isOpen, readerValue]);

  const selectedLearner = useMemo(
    () => learners.find((learner) => learner.id === form.learnerId) || null,
    [form.learnerId, learners],
  );

  const learnerOptions = useMemo(
    () =>
      learners.map((learner) => ({
        value: learner.id,
        label: formatLearnerLabel(learner),
      })),
    [learners],
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="Close learner registration modal" />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="learner-registration-modal-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Learner Registration</p>
            <h3 id="learner-registration-modal-title">Register Learner RFID</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close learner registration modal">
            <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="modal-dialog__body">
          <div className="form-grid attendance-manual-modal__grid">
            <UsisSearchableSelect
              ariaLabel="Learner"
              floatingLabel
              label="Learner"
              showLabel={false}
              value={form.learnerId}
              onChange={(value) => setForm((current) => ({ ...current, learnerId: value }))}
              options={learnerOptions}
              placeholder="Search cached learners"
              emptyQueryMessage={learners.length === 0 ? 'No cached learners available' : 'No matching learner'}
              allowCustomValue={false}
              allowTyping
              forceInlineMenu
            />

            <label className="floating-field">
              <small>Reader Value</small>
              <div className="floating-field__control">
                <input
                  type="text"
                  value={readerValue}
                  onChange={(event) => onReaderValueChange?.(event.target.value)}
                  placeholder=" "
                  autoComplete="off"
                  data-has-value={readerValue ? 'true' : 'false'}
                />
                <span>RFID Reader Log</span>
              </div>
              <small>{readerValue ? 'Ready to link.' : 'Click this field, then tap or scan RFID.'}</small>
            </label>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Assignment Target</label>
            <div
              className={`p-8 rounded-md border-2 transition-all duration-300 ${
                selectedLearner ? 'bg-white border-primary-600/20 shadow-lg shadow-primary-600/5' : 'bg-gray-50 border-gray-200 border-dashed'
              }`}
            >
              {selectedLearner ? (
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-primary-600 text-white rounded-md flex items-center justify-center font-bold text-xl shadow-lg shadow-primary-600/20 flex-shrink-0">
                    {selectedLearner.last_name?.charAt(0) || 'L'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-gray-900 text-lg leading-tight truncate">
                      {selectedLearner.last_name}, {selectedLearner.first_name}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        LRN: {selectedLearner.lrn || 'INTERNAL'}
                      </div>
                      <div className="text-[9px] text-primary-600/60 font-bold uppercase tracking-wider truncate">
                        {selectedLearner.grade_level} • {selectedLearner.section_name}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-gray-200 text-5xl leading-none">person_search</span>
                  <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">Select Student</p>
                </div>
              )}
            </div>

            {selectedLearner && selectedLearner.rfid ? (
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <p className="text-[11px] text-gray-500">
                  Current RFID: <span className="font-semibold text-gray-700">{selectedLearner.rfid}</span>
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-[#f4cfd6] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#b4233d] transition hover:bg-[#fff4f6] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onUnlinkLearner?.(selectedLearner.id)}
                  disabled={isSubmitting || isUnlinking}
                >
                  <span className="material-symbols-outlined text-[16px] leading-none">link_off</span>
                  {isUnlinking ? 'Unlinking...' : 'Unlink RFID'}
                </button>
              </div>
            ) : null}
          </div>

          {errorMessage ? <p className="attendance-manual-modal__error">{errorMessage}</p> : null}
        </div>

        <div className="modal-dialog__actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-dialog__blue"
            disabled={isSubmitting || !form.learnerId || !String(readerValue || form.rfid || '').trim()}
            onClick={() =>
              void onSubmit({
                learnerId: form.learnerId,
                rfid: readerValue || form.rfid,
              })
            }
          >
            {isSubmitting ? 'Registering...' : 'Complete Link'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
