import type { FormEvent } from 'react';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import { helpTicketCategories } from '../../shared/data/schoolProfile';
import type { HelpTicketDraft } from '../services/ticketStore';

type Props = {
  draft: HelpTicketDraft;
  learnerFieldsLocked: boolean;
  isSubmitting: boolean;
  onChange: (updater: (current: HelpTicketDraft) => HelpTicketDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TicketForm({ draft, learnerFieldsLocked, isSubmitting, onChange, onSubmit }: Props) {
  return (
    <form className="school-help-portal-form" onSubmit={onSubmit}>
      <div className="floating-field-grid floating-field-grid--two">
        <label className="floating-field">
          <div className="floating-field__control">
            <input
              value={draft.learnerLrn}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  learnerLrn: event.target.value.replace(/\D/g, '').slice(0, 12),
                }))
              }
              inputMode="numeric"
              maxLength={12}
              placeholder=" "
              required
            />
            <span>Learner LRN</span>
          </div>
        </label>
        <label className="floating-field">
          <div className="floating-field__control">
            <input
              value={draft.learnerName}
              onChange={(event) => onChange((current) => ({ ...current, learnerName: event.target.value }))}
              placeholder=" "
              disabled={learnerFieldsLocked}
              required
            />
            <span>Learner Name</span>
          </div>
        </label>
      </div>

      <div className="floating-field-grid floating-field-grid--two">
        <label className="floating-field">
          <div className="floating-field__control">
            <input
              value={draft.gradeLevel}
              onChange={(event) => onChange((current) => ({ ...current, gradeLevel: event.target.value }))}
              placeholder=" "
              disabled={learnerFieldsLocked}
            />
            <span>Grade Level</span>
          </div>
        </label>
        <label className="floating-field">
          <div className="floating-field__control">
            <input
              value={draft.section}
              onChange={(event) => onChange((current) => ({ ...current, section: event.target.value }))}
              placeholder=" "
              disabled={learnerFieldsLocked}
            />
            <span>Section</span>
          </div>
        </label>
        <div className="school-help-portal-form__full-span">
          <UsisSearchableSelect
            ariaLabel="Concern Category"
            label="Concern Category"
            floatingLabel
            showLabel={false}
            required
            value={draft.category}
            onChange={(value) => onChange((current) => ({ ...current, category: value }))}
            options={helpTicketCategories.map((option) => ({ label: option, value: option }))}
          />
        </div>
      </div>

      <label className="floating-field">
        <div className="floating-field__control">
          <input
            value={draft.subject}
            onChange={(event) => onChange((current) => ({ ...current, subject: event.target.value }))}
            placeholder=" "
            required
          />
          <span>Subject</span>
        </div>
      </label>

      <label className="floating-field">
        <div className="floating-field__control">
          <textarea
            value={draft.details}
            onChange={(event) => onChange((current) => ({ ...current, details: event.target.value }))}
            placeholder=" "
            rows={4}
            required
          />
          <span>Ticket Details</span>
        </div>
      </label>

      <label className="floating-field">
        <div className="floating-field__control">
          <input
            value={draft.contactNo}
            onChange={(event) => onChange((current) => ({ ...current, contactNo: event.target.value }))}
            placeholder=" "
          />
          <span>Contact Number</span>
        </div>
      </label>

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </div>
    </form>
  );
}
