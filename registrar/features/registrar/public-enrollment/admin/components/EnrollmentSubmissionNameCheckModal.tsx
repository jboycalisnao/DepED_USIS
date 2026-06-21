import React, { useEffect, useMemo, useState } from 'react';
import type { PublicEnrollmentSubmission } from '../../types';
import {
  formatSubmissionNameWithCommas,
  matchEnrollmentSubmissionNames,
  parseEnrollmentNameList,
} from '../../utils/enrollmentSubmissionNameMatcher';

type Props = {
  isOpen: boolean;
  schoolYearLabel: string;
  submissions: PublicEnrollmentSubmission[];
  onClose: () => void;
};

export default function EnrollmentSubmissionNameCheckModal({
  isOpen,
  schoolYearLabel,
  submissions,
  onClose,
}: Props) {
  const [rawList, setRawList] = useState('');
  const [analyzedMatches, setAnalyzedMatches] = useState<ReturnType<typeof matchEnrollmentSubmissionNames>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setRawList('');
    setAnalyzedMatches([]);
    setHasAnalyzed(false);
    setIsAnalyzing(false);
  }, [isOpen]);

  const analyzeList = () => {
    const parsedNames = parseEnrollmentNameList(rawList);
    setHasAnalyzed(true);
    setIsAnalyzing(true);
    window.setTimeout(() => {
      const nextMatches = matchEnrollmentSubmissionNames(parsedNames, submissions);
      setAnalyzedMatches(nextMatches);
      setIsAnalyzing(false);
    }, 0);
  };

  const matches = analyzedMatches;

  const summary = useMemo(() => ({
    total: hasAnalyzed ? matches.length : parseEnrollmentNameList(rawList).length,
    exact: matches.filter((item) => item.status === 'exact').length,
    close: matches.filter((item) => item.status === 'close').length,
    none: matches.filter((item) => item.status === 'none').length,
  }), [matches, hasAnalyzed, rawList]);

  const reviewLearners = useMemo(
    () => matches.filter((item) => item.status === 'close' || item.status === 'none'),
    [matches],
  );
  const unmatchedLearners = useMemo(() => reviewLearners.filter((item) => item.status === 'none'), [reviewLearners]);
  const reviewNamesText = useMemo(
    () =>
      reviewLearners
        .map((item) =>
          item.status === 'close'
            ? `${item.inputName} - Close Match, Name on the Submission: ${formatSubmissionNameWithCommas(item.matchedSubmission)}`
            : `${item.inputName} - No Submission Found`,
        )
        .join('\n'),
    [reviewLearners],
  );

  const reviewNamesHtml = useMemo(
    () =>
      reviewLearners
        .map((item) =>
          item.status === 'close'
            ? `<div><strong>${escapeHtml(item.inputName)}</strong> - Close Match, Name on the Submission: ${escapeHtml(formatSubmissionNameWithCommas(item.matchedSubmission))}</div>`
            : `<div><strong>${escapeHtml(item.inputName)}</strong> - No Submission Found</div>`,
        )
        .join(''),
    [reviewLearners],
  );

  const copyReviewNames = async () => {
    if (!reviewNamesText.trim()) return;
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([reviewNamesText], { type: 'text/plain' }),
            'text/html': new Blob([reviewNamesHtml], { type: 'text/html' }),
          }),
        ]);
        return;
      }
      await navigator.clipboard.writeText(reviewNamesText);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = reviewNamesText;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay--high registrar-public-enrollment-submissions" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide registrar-name-check-modal" role="dialog" aria-modal="true" aria-labelledby="enrollment-name-check-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <h3 id="enrollment-name-check-title">Check Section List Against Submissions</h3>
            <p>Paste learner names from a section list and compare them with enrollment submissions for {schoolYearLabel || 'the current school year'}.</p>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close name check modal">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="modal-dialog__body custom-scrollbar">
          <div className="registrar-name-check-modal__layout">
            <section className="registrar-name-check-modal__panel">
              <label className="floating-field registrar-name-check-modal__field">
                <div className="floating-field__control">
                  <textarea
                    value={rawList}
                    onChange={(event) => {
                      setRawList(event.target.value);
                      setHasAnalyzed(false);
                      setAnalyzedMatches([]);
                    }}
                    placeholder=" "
                    rows={16}
                  />
                  <span>Paste learner names, one per line</span>
                </div>
              </label>
              <p className="registrar-name-check-modal__hint">
                Accepts names separated by lines, semicolons, or tabs. The checker uses exact and close-name matching.
              </p>
            </section>

            <aside className="registrar-name-check-modal__summary">
              <div className="registrar-name-check-modal__summary-grid">
                <div><strong>{summary.total}</strong><span>Names pasted</span></div>
                <div><strong>{summary.exact}</strong><span>Exact matches</span></div>
                <div><strong>{summary.close}</strong><span>Close matches</span></div>
                <div><strong>{summary.none}</strong><span>No submission</span></div>
              </div>
              <div className="registrar-name-check-modal__summary-note">
                Showing submissions loaded for {schoolYearLabel || 'the current school year'}.
              </div>
            </aside>
          </div>

          <section className="registrar-name-check-modal__results">
            <div className="registrar-name-check-modal__results-head">
              <div>
                <h4>Learners without submissions</h4>
                <span>
                  {hasAnalyzed
                    ? `${reviewLearners.length} of ${matches.length} entries need follow-up`
                    : 'Paste names, then click Analyze List'}
                </span>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void copyReviewNames()}
                disabled={!reviewNamesText.trim() || isAnalyzing}
              >
                Copy Review List
              </button>
            </div>

            {isAnalyzing ? (
              <div className="registrar-name-check-modal__empty">
                Analyzing pasted names...
              </div>
            ) : !hasAnalyzed ? (
              <div className="registrar-name-check-modal__empty">
                Paste the section list, then click Analyze List to review close matches and missing submissions.
              </div>
            ) : reviewLearners.length ? (
              <div className="registrar-name-check-modal__result-list">
                {reviewLearners.map((match, index) => (
                  <article
                    key={`${match.inputName}-${index}`}
                    className={`registrar-name-check-modal__result-card ${
                      match.status === 'close' ? 'registrar-name-check-modal__result-card--close' : 'registrar-name-check-modal__result-card--unmatched'
                    }`}
                  >
                    {match.status === 'close' ? (
                      <>
                        <strong>{formatSubmissionNameWithCommas(match.matchedSubmission)}</strong>
                        <span>{match.inputName} - Close Match</span>
                      </>
                    ) : (
                      <>
                        <strong>{match.inputName}</strong>
                        <span>No submission found</span>
                      </>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="registrar-name-check-modal__empty">
                No close matches or missing submissions were found in the analyzed list.
              </div>
            )}
          </section>
        </div>

        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__primary" onClick={() => setRawList('')} disabled={!rawList.trim()}>
            Clear List
          </button>
          <button type="button" className="modal-dialog__primary" onClick={analyzeList} disabled={!rawList.trim() || isAnalyzing}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze List'}
          </button>
          <button type="button" className="modal-dialog__blue" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
