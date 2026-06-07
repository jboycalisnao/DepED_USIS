import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { UsisSearchableSelect } from './ui/UsisSearchableSelect';
import { AttendanceType, Learner } from '../types';

type ManualAttendanceFormValue = {
  learnerId: string;
  type: AttendanceType;
  date: string;
  time: string;
};

interface ManualAttendanceModalProps {
  isOpen: boolean;
  learners: Learner[];
  defaultLearnerId?: string | null;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (value: ManualAttendanceFormValue) => void;
}

const ATTENDANCE_TYPES: AttendanceType[] = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT', 'UNSCHEDULED'];

const ATTENDANCE_TYPE_OPTIONS = ATTENDANCE_TYPES.map((type) => ({
  value: type,
  label: type.replace(/_/g, ' '),
}));

const getTodayLocalIsoDate = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, '0');
  const dd = `${now.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getCurrentLocalTime = () => {
  const now = new Date();
  return `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`;
};

const toLearnerLabel = (learner: Learner) => {
  const name = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim();
  const lrn = learner.lrn ? `LRN ${learner.lrn}` : 'LRN unavailable';
  const section = [learner.grade_level, learner.section_name].filter(Boolean).join(' | ');
  return [name || learner.id, section, lrn].filter(Boolean).join(' | ');
};

export function ManualAttendanceModal({
  isOpen,
  learners,
  defaultLearnerId = null,
  isSubmitting = false,
  errorMessage = null,
  onClose,
  onSubmit,
}: ManualAttendanceModalProps) {
  const [form, setForm] = useState<ManualAttendanceFormValue>({
    learnerId: defaultLearnerId || learners[0]?.id || '',
    type: 'AM_IN',
    date: getTodayLocalIsoDate(),
    time: getCurrentLocalTime(),
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      learnerId: defaultLearnerId || learners[0]?.id || '',
      type: 'AM_IN',
      date: getTodayLocalIsoDate(),
      time: getCurrentLocalTime(),
    });
  }, [defaultLearnerId, isOpen, learners]);

  const selectedLearner = useMemo(
    () => learners.find((learner) => learner.id === form.learnerId) || null,
    [learners, form.learnerId],
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="Close manual attendance modal" />
      <div className="modal-dialog modal-dialog--wide attendance-manual-modal" role="dialog" aria-modal="true" aria-label="Manual Attendance Entry">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Attendance Records</p>
            <h3>Manual Attendance Entry</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close manual attendance modal">
            <span aria-hidden="true">x</span>
          </button>
        </div>

        <div className="modal-dialog__body">
          <div className="notice-box">
            <strong>Manual entry</strong>
            <span>Add a tap event for a specific learner using a chosen date and time.</span>
          </div>

          <div className="form-grid attendance-manual-modal__grid">
            <UsisSearchableSelect
              ariaLabel="Learner"
              floatingLabel
              label="Learner"
              showLabel={false}
              value={form.learnerId}
              onChange={(value) => setForm((prev) => ({ ...prev, learnerId: value }))}
              options={learners.map((learner) => ({
                value: learner.id,
                label: toLearnerLabel(learner),
              }))}
              placeholder="Search learner"
              emptyQueryMessage={learners.length === 0 ? 'No learners available' : 'No learners match your search'}
              allowCustomValue={false}
              allowTyping
              forceInlineMenu
            />

            <UsisSearchableSelect
              ariaLabel="Attendance Type"
              floatingLabel
              label="Attendance Type"
              showLabel={false}
              value={form.type}
              onChange={(value) => setForm((prev) => ({ ...prev, type: value as AttendanceType }))}
              options={ATTENDANCE_TYPE_OPTIONS}
              placeholder="Search attendance type"
              allowCustomValue={false}
              allowTyping
              forceInlineMenu
            />

            <label className="floating-field">
              <small>Date</small>
              <div className="floating-field__control">
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
                <span>Date</span>
              </div>
            </label>

            <label className="floating-field">
              <small>Time</small>
              <div className="floating-field__control">
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                />
                <span>Time</span>
              </div>
            </label>
          </div>

          <div className="attendance-manual-modal__preview notice-box">
            <strong>Preview</strong>
            <span>
              {selectedLearner ? `${selectedLearner.last_name}, ${selectedLearner.first_name}` : 'No learner selected'} | {form.date} {form.time || '--:--'} | {form.type.replace('_', ' ')}
            </span>
          </div>

          {errorMessage ? <p className="attendance-manual-modal__error">{errorMessage}</p> : null}
        </div>

        <div className="modal-dialog__actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !form.learnerId || !form.date || !form.time}
            onClick={() => onSubmit(form)}
            className="primary-button"
          >
            {isSubmitting ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type { ManualAttendanceFormValue };
