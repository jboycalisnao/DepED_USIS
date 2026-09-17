import { useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  searchRegistrarLearners,
  type RegistrarLearnerSearchResult,
} from '../services/learnerDirectoryService';

type LearnerDirectoryModalProps = {
  open: boolean;
  initialSearchQuery?: string;
  onClose: () => void;
  onSelectLearner: (learner: RegistrarLearnerSearchResult) => void;
};

export function LearnerDirectoryModal({
  open,
  initialSearchQuery = '',
  onClose,
  onSelectLearner,
}: LearnerDirectoryModalProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [results, setResults] = useState<RegistrarLearnerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (open) {
      setSearchTerm(initialSearchQuery);
      if (initialSearchQuery.trim()) {
        void handleSearch(initialSearchQuery.trim());
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }
  }, [open, initialSearchQuery]);

  if (!open) return null;

  const handleSearch = async (queryToSearch?: string) => {
    const term = (queryToSearch ?? searchTerm).trim();
    if (!term) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const found = await searchRegistrarLearners(term);
      setResults(found);
    } catch (err) {
      console.error('[SRCY] Directory lookup error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const onSubmitSearch = (e: FormEvent) => {
    e.preventDefault();
    void handleSearch();
  };

  const handleSelect = (learner: RegistrarLearnerSearchResult) => {
    onSelectLearner(learner);
    onClose();
  };

  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide srcy-directory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learner-directory-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Learner Information System</p>
            <h3 id="learner-directory-title">Learner Directory Search</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="modal-dialog__body srcy-directory-modal__body">
          <form className="srcy-directory-search-form" onSubmit={onSubmitSearch}>
            <label className="floating-field srcy-directory-search-input">
              <div className="floating-field__control">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder=" "
                  autoFocus
                />
                <span>Search by LRN (12 digits) or Full Name</span>
              </div>
            </label>
            <button
              type="submit"
              className="primary-button srcy-directory-search-btn"
              disabled={isSearching || !searchTerm.trim()}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="srcy-directory-results-container">
            {isSearching ? (
              <div className="srcy-directory-loading">
                <span className="material-symbols-outlined spin-icon" aria-hidden="true">sync</span>
                <span>Searching learner directory...</span>
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="srcy-directory-empty">
                <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
                <p>No learners found matching &quot;<strong>{searchTerm}</strong>&quot;.</p>
                <small>Try checking the spelling or searching using the 12-digit LRN.</small>
              </div>
            ) : results.length > 0 ? (
              <div className="srcy-table-wrap">
                <table className="usis-table srcy-directory-table">
                  <thead>
                    <tr>
                      <th>Learner Name</th>
                      <th>LRN</th>
                      <th>Grade &amp; Section</th>
                      <th>Status</th>
                      <th>Contact Info</th>
                      <th className="srcy-text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((learner) => {
                      const isInactive = !learner.isEnrolledInActiveYear;
                      return (
                        <tr
                          key={learner.id}
                          className={isInactive ? 'srcy-directory-row--disabled' : ''}
                        >
                          <td>
                            <strong className="srcy-learner-name">{learner.fullName}</strong>
                            {isInactive && learner.ineligibilityReason ? (
                              <span className="srcy-ineligible-hint">{learner.ineligibilityReason}</span>
                            ) : null}
                          </td>
                          <td>
                            <code className="srcy-lrn-code">{learner.lrn || '-'}</code>
                          </td>
                          <td>
                            {[learner.gradeLevel, learner.section].filter(Boolean).join(' - ') || '-'}
                          </td>
                          <td>
                            {isInactive ? (
                              <span
                                className="srcy-status-chip srcy-status-chip--inactive"
                                title={learner.ineligibilityReason || 'Not enrolled in active school year'}
                              >
                                {learner.status === 'Enrolled' ? 'Inactive S.Y.' : learner.status}
                              </span>
                            ) : (
                              <span className="srcy-status-chip srcy-status-chip--active">
                                {learner.status}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="srcy-contact-line">{learner.contactNo || '-'}</span>
                            {learner.email ? <span className="srcy-contact-sub">{learner.email}</span> : null}
                          </td>
                          <td className="srcy-text-right">
                            {isInactive ? (
                              <button
                                type="button"
                                className="secondary-button srcy-select-learner-btn srcy-select-learner-btn--disabled"
                                disabled
                                title={learner.ineligibilityReason || 'Learner is not enrolled in the active school year'}
                              >
                                Ineligible
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="secondary-button srcy-select-learner-btn"
                                onClick={() => handleSelect(learner)}
                              >
                                Autofill Member
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="srcy-directory-initial">
                <span className="material-symbols-outlined" aria-hidden="true">info</span>
                <p>Enter a learner&apos;s 12-digit LRN or full name above to query the official learner directory.</p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-dialog__actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
