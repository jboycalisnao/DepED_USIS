import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import type { SccSession, SccOfficer } from '../../../types';
import { addSccOfficer } from '../../../services/sccSupabase';

interface AddOfficerModalProps {
  isOpen: boolean;
  session: SccSession;
  onClose: () => void;
  onOfficerAdded: (officer: SccOfficer) => void;
}

export function AddOfficerModal({ isOpen, session, onClose, onOfficerAdded }: AddOfficerModalProps) {
  const [lrn, setLrn] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('Vice President');
  const [gradeLevel, setGradeLevel] = useState('Grade 11');
  const [section, setSection] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isAuthorizedSignatory, setIsAuthorizedSignatory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !position.trim() || !gradeLevel.trim()) {
      setErrorMsg('Please complete all required officer fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const officer = await addSccOfficer({
        organizationId: session.organizationId,
        lrn: lrn.trim() || '116503100000',
        fullName: fullName.trim(),
        position: position.trim(),
        gradeLevel: gradeLevel.trim(),
        section: section.trim() || 'A',
        email: email.trim(),
        contactNumber: contactNumber.trim(),
        termYear: '2026-2027',
        isAuthorizedSignatory,
      });

      onOfficerAdded(officer);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save officer record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay modal-overlay--high scc-usis-modal-wrap" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scc-add-off-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">
              {session.organizationName} • SY 2026-2027
            </p>
            <h3 id="scc-add-off-title">Register Club Officer</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-dialog__body scc-form">
          {errorMsg ? (
            <div className="scc-alert scc-alert--danger" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{errorMsg}</span>
            </div>
          ) : null}

          <div className="scc-form-grid">
            <div className="scc-form-group">
              <label className="scc-label" htmlFor="scc-off-name">
                Full Name *
              </label>
              <input
                id="scc-off-name"
                type="text"
                className="scc-input"
                required
                placeholder="e.g. Juan P. Dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="scc-form-group">
              <label className="scc-label" htmlFor="scc-off-pos">
                Officer Position *
              </label>
              <input
                id="scc-off-pos"
                type="text"
                className="scc-input"
                required
                placeholder="e.g. Vice President, Secretary, Auditor"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
          </div>

          <div className="scc-form-grid">
            <div className="scc-form-group">
              <label className="scc-label" htmlFor="scc-off-lrn">
                Learner Reference Number (LRN)
              </label>
              <input
                id="scc-off-lrn"
                type="text"
                maxLength={12}
                className="scc-input"
                placeholder="12-digit DepEd LRN"
                value={lrn}
                onChange={(e) => setLrn(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="scc-form-group">
              <span className="scc-label">Grade Level *</span>
              <UsisSearchableSelect
                ariaLabel="Grade Level"
                forcePortalMenu
                required
                value={gradeLevel}
                onChange={setGradeLevel}
                options={[
                  { value: 'Grade 7', label: 'Grade 7' },
                  { value: 'Grade 8', label: 'Grade 8' },
                  { value: 'Grade 9', label: 'Grade 9' },
                  { value: 'Grade 10', label: 'Grade 10' },
                  { value: 'Grade 11', label: 'Grade 11' },
                  { value: 'Grade 12', label: 'Grade 12' },
                ]}
              />
            </div>
          </div>

          <div className="scc-form-grid">
            <div className="scc-form-group">
              <label className="scc-label" htmlFor="scc-off-section">
                Class Section
              </label>
              <input
                id="scc-off-section"
                type="text"
                className="scc-input"
                placeholder="e.g. Zara, Curie, Newton"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
            </div>

            <div className="scc-form-group">
              <label className="scc-label" htmlFor="scc-off-contact">
                Contact Phone
              </label>
              <input
                id="scc-off-contact"
                type="tel"
                className="scc-input"
                placeholder="0917-000-0000"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="scc-form-group">
            <label className="scc-label" htmlFor="scc-off-email">
              Personal / Learner Email Address
            </label>
            <input
              id="scc-off-email"
              type="email"
              className="scc-input"
              placeholder="e.g. learner@gmail.com or deped email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="scc-form-group">
            <label className="scc-checkbox-label scc-endorsement-box">
              <input
                type="checkbox"
                checked={isAuthorizedSignatory}
                onChange={(e) => setIsAuthorizedSignatory(e.target.checked)}
              />
              <span>
                Authorized Officer Signatory (Permitted to sign digital service endorsements and official club communications)
              </span>
            </label>
            </div>
          </div>

          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="modal-dialog__blue" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Officer to Roster'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
