import React, { useState, useMemo } from 'react';
import { Candidate, SchoolYear, ElectionConfig } from '../../../types';
import { POSITIONS, LEON_NHS_LOGO_URL, DEPED_COLORS } from '../../../constants';
import { optimizeImageUrl } from '../../../utils/imageUtils';
import ManagePartylistsModal from './ManagePartylistsModal';
import CandidatesListModal from './CandidatesListModal';
import RegisterCandidateModal from './RegisterCandidateModal';
import { handlePrintEncodingSlip } from './encodingSlipExportHandler';

interface CandidatesTabProps {
  candidates: Candidate[];
  turnoutByPosition: Record<string, number>;
  onAddCandidate: (candidate: Partial<Candidate>, syId: string) => Promise<void>;
  onUpdateCandidate: (id: string, candidate: Partial<Candidate>) => Promise<void>;
  onDeleteCandidate: (id: string) => Promise<void>;
  showAlert: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
  schoolYears: SchoolYear[];
  electionConfig: ElectionConfig;
}

const CandidatesTab: React.FC<CandidatesTabProps> = ({
  candidates = [],
  turnoutByPosition = {},
  onAddCandidate,
  onUpdateCandidate,
  onDeleteCandidate,
  showAlert,
  schoolYears = [],
  electionConfig
}) => {
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isCandidatesListOpen, setIsCandidatesListOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const activeSyLabel = schoolYears.find(sy => sy.isActive || sy.is_active)?.label || '----';

  const formatPositionLabel = (value: string) =>
    value
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const filteredCandidates = useMemo(() => {
    if (!searchTerm.trim()) return candidates;
    const term = searchTerm.toLowerCase().trim();
    return candidates.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.party.toLowerCase().includes(term) ||
      c.position.toLowerCase().includes(term)
    );
  }, [candidates, searchTerm]);

  const duplicates = useMemo(() => {
    const nameMap = new Map<string, string[]>();
    candidates.forEach(c => {
      const normalizedName = c.name.toUpperCase().trim();
      if (!nameMap.has(normalizedName)) nameMap.set(normalizedName, []);
      nameMap.get(normalizedName)!.push(c.id);
    });

    const dupeIds = new Set<string>();
    nameMap.forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => dupeIds.add(id));
      }
    });
    return dupeIds;
  }, [candidates]);

  const handleOpenEditCandidate = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setIsCandidateModalOpen(true);
  };

  const handleSaveCandidate = async (data: any) => {
    try {
      setIsProcessing(true);
      if (editingCandidate) {
        await onUpdateCandidate(editingCandidate.id, data);
        showAlert('Update Successful', `${data.name}'s profile has been updated.`, 'success');
      } else {
        await onAddCandidate(data, data.schoolYearId);
        showAlert('Registration Successful', `${data.name} is now an official candidate for ${data.position}.`, 'success');
      }
      setIsCandidateModalOpen(false);
      setEditingCandidate(null);
    } catch (err) {
      showAlert('Database Error', 'We could not save the candidate. Please check your connection.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCandidate = (id: string, name: string) => {
    showAlert(
      'Confirm Removal',
      `Are you sure you want to remove ${name}? This action is permanent and clears all votes for this candidate.`,
      'confirm',
      async () => {
        try {
          setIsProcessing(true);
          await onDeleteCandidate(id);
          showAlert('Candidate Removed', 'Database updated successfully.', 'info');
        } catch (err) {
          showAlert('Deletion Failed', 'Could not remove the candidate.', 'error');
        } finally {
          setIsProcessing(false);
        }
      }
    );
  };

  const handlePrintSlip = (candidate: Candidate) => {
    handlePrintEncodingSlip(candidate, activeSyLabel);
  };

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

  return (
    <div className="election-page no-print">
      <section className="election-page__hero">
        <div className="election-page__hero-bar" aria-hidden="true">
          <span style={{ backgroundColor: '#0038a8' }} />
          <span style={{ backgroundColor: '#fcd116' }} />
          <span style={{ backgroundColor: '#ce1126' }} />
        </div>
        <div className="election-page__hero-content">
          <div className="election-page__header">
            <div>
              <h3 className="election-page__heading">
                <i className="fa-solid fa-id-card-clip" style={{ marginRight: '12px', color: '#0038a8' }} />
                Official Candidate Registry
              </h3>
              <p className="election-page__lead">
                {(candidates || []).length} Registered Candidates
                {duplicates.size > 0 ? ` · ${duplicates.size} Registry Duplicates Found` : ''}
              </p>
            </div>

            <div className="election-page__toolbar">
              <button
                onClick={() => setIsCandidatesListOpen(true)}
                disabled={candidates.length === 0}
                className="election-page__action-button"
              >
                <i className="fa-solid fa-print" style={{ marginRight: '8px' }} />
                Candidates List
              </button>

              <button
                onClick={() => setIsPartyModalOpen(true)}
                disabled={isProcessing}
                className="election-page__action-button"
              >
                <i className="fa-solid fa-flag" style={{ marginRight: '8px' }} />
                Partylists
              </button>

              <button
                onClick={() => {
                  setEditingCandidate(null);
                  setIsCandidateModalOpen(true);
                }}
                disabled={isProcessing}
                className="election-page__action-button election-page__action-button--primary"
              >
                <i className="fa-solid fa-user-plus" style={{ marginRight: '8px' }} />
                New Candidate
              </button>
            </div>
          </div>
        </div>
      </section>

      <ManagePartylistsModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        schoolYearId={schoolYears.find(sy => sy.isActive || sy.is_active)?.id || ''}
        showAlert={showAlert}
      />

      <CandidatesListModal
        open={isCandidatesListOpen}
        onClose={() => setIsCandidatesListOpen(false)}
        candidates={candidates}
        turnoutByPosition={turnoutByPosition}
        electionConfig={electionConfig}
        activeSyLabel={activeSyLabel}
        duplicates={duplicates}
      />

      <RegisterCandidateModal
        isOpen={isCandidateModalOpen}
        onClose={() => {
          setIsCandidateModalOpen(false);
          setEditingCandidate(null);
        }}
        onSave={handleSaveCandidate}
        schoolYears={schoolYears}
        initialData={editingCandidate || undefined}
      />

      <div className="election-page__search-card">
        <label className="floating-field w-full">
          <div className="floating-field__control">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder=" "
            />
            <span>Search candidate by name, party, or position</span>
          </div>
        </label>
      </div>

      <div className="election-page__list">
        {(POSITIONS || []).map(pos => {
          const positionCandidates = (filteredCandidates || []).filter(c => c.position === pos);
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionCandidates.map((c) => {
                      const isDupe = duplicates.has(c.id);
                      const votePercentage = posTotalBallots > 0 ? ((c.votes || 0) / posTotalBallots) * 100 : 0;
                      const statusSummary = getMissingSummary(c);

                      return (
                        <tr key={c.id} className={isDupe ? 'election-page__candidate-table-row election-page__candidate-table-row--duplicate' : 'election-page__candidate-table-row'}>
                          <td className="election-page__candidate-table-cell election-page__candidate-table-cell--candidate" data-label="Candidate">
                            {isDupe && (
                              <span className="election-page__candidate-table-duplicate">
                                <i className="fa-solid fa-copy" />
                                Duplicate
                              </span>
                            )}
                            <div className="election-page__candidate-table-identity">
                              <div className="election-page__candidate-table-avatar-wrap">
                                <img
                                  src={c.imageUrl ? optimizeImageUrl(c.imageUrl, 160) : LEON_NHS_LOGO_URL}
                                  className={`election-page__candidate-table-avatar ${isDupe ? 'election-page__candidate-table-avatar--duplicate' : ''}`}
                                  alt={c.name}
                                  onError={(e) => { (e.target as HTMLImageElement).src = LEON_NHS_LOGO_URL; }}
                                />
                                <span className={`election-page__candidate-table-votes ${isDupe ? 'election-page__candidate-table-votes--duplicate' : ''}`}>
                                  {c.votes || 0}
                                </span>
                              </div>
                              <div className="election-page__candidate-table-copy">
                                <h5 className={`election-page__candidate-table-name ${isDupe ? 'election-page__candidate-table-name--duplicate' : ''}`}>
                                  {c.name}
                                </h5>
                                <p className="election-page__candidate-table-subcopy">
                                  {c.lastName || ''}{c.firstName ? `${c.lastName ? ', ' : ''}${c.firstName}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="election-page__candidate-table-cell" data-label="Party">
                            <span className={`election-page__candidate-table-party ${c.party === 'Independent' ? 'election-page__candidate-table-party--independent' : 'election-page__candidate-table-party--party'}`}>
                              {c.party}
                            </span>
                          </td>
                          <td className="election-page__candidate-table-cell election-page__candidate-table-cell--votes" data-label="Votes">
                            {c.votes || 0}
                          </td>
                          <td className="election-page__candidate-table-cell election-page__candidate-table-cell--share" data-label="Share">
                            <div className="election-page__candidate-table-share">
                              <div className="election-page__candidate-table-share-head">
                                <span>{votePercentage.toFixed(1)}%</span>
                                <span>{c.votes || 0}/{posTotalBallots || 0}</span>
                              </div>
                              <div className="election-page__candidate-table-track">
                                <div
                                  className="election-page__candidate-table-fill"
                                  style={{
                                    width: `${votePercentage}%`,
                                    backgroundColor: DEPED_COLORS.blue
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="election-page__candidate-table-cell election-page__candidate-table-cell--status" data-label="Status">
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
                          <td className="election-page__candidate-table-cell election-page__candidate-table-cell--platform" data-label="Platform">
                            <span className="election-page__candidate-table-platform" title={c.vision || 'No platform statement provided.'}>
                              {c.vision || 'No platform statement provided.'}
                            </span>
                          </td>
                          <td className="election-page__candidate-table-cell election-page__candidate-table-cell--actions" data-label="Actions">
                            <div className="election-page__candidate-table-actions">
                              <button
                                type="button"
                                onClick={() => handlePrintSlip(c)}
                                title="Print Encoding Slip"
                                className="election-page__candidate-table-action election-page__candidate-table-action--audit"
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">print</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditCandidate(c)}
                                disabled={isProcessing}
                                className="election-page__candidate-table-action election-page__candidate-table-action--edit"
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCandidate(c.id, c.name)}
                                disabled={isProcessing}
                                className="election-page__candidate-table-action election-page__candidate-table-action--duplicate"
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                              </button>
                            </div>
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

        {filteredCandidates.length === 0 && candidates.length > 0 && (
          <div className="election-page__empty">
            <i className="fa-solid fa-magnifying-glass election-page__candidate-empty-icon" />
            <p className="election-page__empty-title">No candidates match your search "{searchTerm}"</p>
            <button
              onClick={() => setSearchTerm('')}
              className="election-page__candidate-empty-action"
            >
              Clear Search
            </button>
          </div>
        )}

        {(candidates || []).length === 0 && (
          <div className="election-page__empty">
            <i className="fa-solid fa-users-slash election-page__candidate-empty-icon" style={{ fontSize: '56px' }} />
            <p className="election-page__empty-title">No official candidates registered yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatesTab;
