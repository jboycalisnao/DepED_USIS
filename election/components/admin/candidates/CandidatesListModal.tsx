import React from 'react';
import { createPortal } from 'react-dom';
import { Candidate, ElectionConfig } from '../../../types';
import { POSITIONS, LEON_NHS_LOGO_URL, DEPED_COLORS } from '../../../constants';
import { optimizeImageUrl } from '../../../utils/imageUtils';
import { handleCandidatesPrint } from './candidatesExportHandler';

interface CandidatesListModalProps {
  open: boolean;
  onClose: () => void;
  candidates: Candidate[];
  turnoutByPosition: Record<string, number>;
  electionConfig: ElectionConfig;
  activeSyLabel: string;
  duplicates: Set<string>;
}

const CandidatesListModal: React.FC<CandidatesListModalProps> = ({
  open,
  onClose,
  candidates,
  turnoutByPosition,
  electionConfig,
  activeSyLabel,
  duplicates,
}) => {
  if (!open) return null;

  const formatPositionLabel = (value: string) =>
    value
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const getMissingSummary = (candidate: Candidate) => {
    const missingFields: string[] = [];
    const criticalMissing: string[] = [];

    if (!candidate.firstName) criticalMissing.push('First Name');
    if (!candidate.lastName) criticalMissing.push('Last Name');

    if (!candidate.imageUrl || candidate.imageUrl.includes('placeholder')) missingFields.push('Portrait');
    if (!candidate.birthDate) missingFields.push('Birth Date');
    if (!candidate.gender) missingFields.push('Sex/Gender');
    if (!candidate.age || candidate.age === 0) missingFields.push('Age');
    if (!candidate.homeAddress) missingFields.push('Address');
    if (!candidate.email) missingFields.push('Email');
    if (!candidate.mobileNo) missingFields.push('Mobile');

    return {
      criticalMissing,
      missingFields,
      isComplete: criticalMissing.length === 0 && missingFields.length === 0 && !candidate.remarks,
    };
  };

  const handlePrint = () => {
    handleCandidatesPrint(candidates, electionConfig, activeSyLabel);
  };

  return createPortal(
    <div className="modal-overlay modal-overlay--high">
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="candidates-list-modal-title">
        <div className="grid grid-cols-3" aria-hidden="true">
          <span className="h-[4px] bg-[#0038a8]" />
          <span className="h-[4px] bg-[#fcd116]" />
          <span className="h-[4px] bg-[#ce1126]" />
        </div>

        <header className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Election Modal</p>
            <h3 id="candidates-list-modal-title" className="modal-dialog__header-title">
              Official Candidate Registry
            </h3>
            <p className="modal-dialog__eyebrow">Current registered candidates by position</p>
          </div>
          <button type="button" onClick={onClose} className="modal-dialog__close" aria-label="Close candidates list modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="modal-dialog__body usis-party-modal__content">
          <div className="usis-party-modal__list-head">
            <div>
              <p className="usis-party-modal__section-label">Current Roster</p>
              <h4 className="usis-party-modal__section-title">{candidates.length} Registered Candidates</h4>
            </div>
            <span className="usis-party-modal__badge">{activeSyLabel}</span>
          </div>

          <div className="election-page__list" style={{ padding: 0, background: 'transparent' }}>
            {(POSITIONS || []).map((pos) => {
              const positionCandidates = candidates.filter((candidate) => candidate.position === pos);
              if (positionCandidates.length === 0) return null;

              const posTotalBallots = turnoutByPosition[pos] || 0;

              return (
                <section key={pos} className="election-page__section">
                  <div className="election-page__section-heading">
                    <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                    <div className="election-page__section-heading-copy">
                      <h4 className="election-page__section-title">{formatPositionLabel(pos)}</h4>
                      <span className="election-page__section-subtitle">
                        Audit Tally: {posTotalBallots} ballots verified
                      </span>
                    </div>
                    <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                  </div>

                  <div className="election-page__candidate-table-card">
                    <table className="election-page__candidate-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Party</th>
                          <th>Votes</th>
                          <th>Share</th>
                          <th>Status</th>
                          <th>Platform</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positionCandidates.map((candidate) => {
                          const isDupe = duplicates.has(candidate.id);
                          const votePercentage = posTotalBallots > 0 ? ((candidate.votes || 0) / posTotalBallots) * 100 : 0;
                          const statusSummary = getMissingSummary(candidate);

                          return (
                            <tr key={candidate.id} className={isDupe ? 'election-page__candidate-table-row election-page__candidate-table-row--duplicate' : 'election-page__candidate-table-row'}>
                              <td className="election-page__candidate-table-cell election-page__candidate-table-cell--candidate">
                                {isDupe && (
                                  <span className="election-page__candidate-table-duplicate">
                                    <i className="fa-solid fa-copy" />
                                    Duplicate
                                  </span>
                                )}
                                <div className="election-page__candidate-table-identity">
                                  <div className="election-page__candidate-table-avatar-wrap">
                                    <img
                                      src={candidate.imageUrl ? optimizeImageUrl(candidate.imageUrl, 160) : LEON_NHS_LOGO_URL}
                                      className={`election-page__candidate-table-avatar ${isDupe ? 'election-page__candidate-table-avatar--duplicate' : ''}`}
                                      alt={candidate.name}
                                      onError={(event) => { (event.target as HTMLImageElement).src = LEON_NHS_LOGO_URL; }}
                                    />
                                    <span className={`election-page__candidate-table-votes ${isDupe ? 'election-page__candidate-table-votes--duplicate' : ''}`}>
                                      {candidate.votes || 0}
                                    </span>
                                  </div>
                                  <div className="election-page__candidate-table-copy">
                                    <h5 className={`election-page__candidate-table-name ${isDupe ? 'election-page__candidate-table-name--duplicate' : ''}`}>
                                      {candidate.name}
                                    </h5>
                                    <p className="election-page__candidate-table-subcopy">
                                      {candidate.lastName || ''}{candidate.firstName ? `${candidate.lastName ? ', ' : ''}${candidate.firstName}` : ''}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="election-page__candidate-table-cell">
                                <span className={`election-page__candidate-table-party ${candidate.party === 'Independent' ? 'election-page__candidate-table-party--independent' : 'election-page__candidate-table-party--party'}`}>
                                  {candidate.party}
                                </span>
                              </td>
                              <td className="election-page__candidate-table-cell election-page__candidate-table-cell--votes">
                                {candidate.votes || 0}
                              </td>
                              <td className="election-page__candidate-table-cell election-page__candidate-table-cell--share">
                                <div className="election-page__candidate-table-share">
                                  <div className="election-page__candidate-table-share-head">
                                    <span>{votePercentage.toFixed(1)}%</span>
                                    <span>{candidate.votes || 0}/{posTotalBallots || 0}</span>
                                  </div>
                                  <div className="election-page__candidate-table-track">
                                    <div
                                      className="election-page__candidate-table-fill"
                                      style={{
                                        width: `${votePercentage}%`,
                                        backgroundColor: DEPED_COLORS.blue,
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="election-page__candidate-table-cell election-page__candidate-table-cell--status">
                                <div className="election-page__candidate-table-status">
                                  <span className={`election-page__candidate-table-status-pill ${statusSummary.isComplete ? 'election-page__candidate-table-status-pill--complete' : 'election-page__candidate-table-status-pill--incomplete'}`}>
                                    {statusSummary.isComplete ? 'Verified Complete' : 'Needs Update'}
                                  </span>
                                  <span className="election-page__candidate-table-status-copy">
                                    {statusSummary.isComplete
                                      ? 'All profile fields verified'
                                      : `${statusSummary.criticalMissing.length + statusSummary.missingFields.length} fields missing`}
                                  </span>
                                </div>
                              </td>
                              <td className="election-page__candidate-table-cell election-page__candidate-table-cell--platform">
                                <span className="election-page__candidate-table-platform" title={candidate.vision || 'No platform statement provided.'}>
                                  {candidate.vision || 'No platform statement provided.'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}

            {candidates.length === 0 ? (
              <div className="election-page__empty">
                <i className="fa-solid fa-users-slash election-page__candidate-empty-icon" style={{ fontSize: '56px' }} />
                <p className="election-page__empty-title">No official candidates registered yet</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="modal-dialog__actions">
          <button type="button" onClick={handlePrint} className="modal-dialog__blue w-full">
            <i className="fa-solid fa-print mr-3" />
            Print Candidates List
          </button>
          <button type="button" onClick={onClose} className="w-full">
            Close
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default CandidatesListModal;
