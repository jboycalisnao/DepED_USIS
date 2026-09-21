import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type {
  SrcyTrainingRecord,
  SrcyTrainingParticipantRecord,
  SrcyParticipationStatus,
} from '../services/srcyTrainingService';
import type { SrcyMemberRecord } from '../../members/services/srcyMembershipService';

type TrainingParticipantsModalProps = {
  open: boolean;
  training: SrcyTrainingRecord | null;
  allMembers: SrcyMemberRecord[];
  participants: SrcyTrainingParticipantRecord[];
  onClose: () => void;
  onAttachMembers: (trainingId: string, memberIds: string[], status?: SrcyParticipationStatus) => Promise<void>;
  onDetachMember: (trainingId: string, memberId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
};

export function TrainingParticipantsModal({
  open,
  training,
  allMembers,
  participants,
  onClose,
  onAttachMembers,
  onDetachMember,
  onRefresh,
}: TrainingParticipantsModalProps) {
  const [search, setSearch] = useState('');
  const [selectedToAttach, setSelectedToAttach] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'add'>('participants');
  const [participationStatus, setParticipationStatus] = useState<SrcyParticipationStatus>('Completed');

  // Map of participant membership IDs for this training
  const participantMap = useMemo(() => {
    if (!training) return new Map<string, SrcyTrainingParticipantRecord>();
    const map = new Map<string, SrcyTrainingParticipantRecord>();
    participants.forEach((p) => {
      if (p.trainingId === training.id) {
        map.set(p.membershipId, p);
      }
    });
    return map;
  }, [training, participants]);

  // Deduplicate allMembers by learner LRN so each unique learner is represented once (using their latest term)
  const { distinctMembers, lrnToMembershipIds } = useMemo(() => {
    const lrnToIds = new Map<string, string[]>();
    allMembers.forEach((m) => {
      const key = m.learnerLrn?.trim() || m.id;
      if (!lrnToIds.has(key)) lrnToIds.set(key, []);
      lrnToIds.get(key)!.push(m.id);
    });

    // Sort latest term first so we display the most current grade, section, and role
    const sorted = [...allMembers].sort((a, b) => {
      const timeA = new Date(a.joinedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.joinedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const uniqueMap = new Map<string, SrcyMemberRecord>();
    for (const m of sorted) {
      const key = m.learnerLrn?.trim() || m.id;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, m);
      }
    }

    return {
      distinctMembers: Array.from(uniqueMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName)),
      lrnToMembershipIds: lrnToIds,
    };
  }, [allMembers]);

  // Find participation record for a learner across any of their historical/current term IDs
  const getLearnerParticipantRecord = (member: SrcyMemberRecord): SrcyTrainingParticipantRecord | undefined => {
    const key = member.learnerLrn?.trim() || member.id;
    const siblingIds = lrnToMembershipIds.get(key) || [member.id];
    for (const id of siblingIds) {
      const rec = participantMap.get(id);
      if (rec) return rec;
    }
    return undefined;
  };

  const isLearnerEnrolled = (member: SrcyMemberRecord): boolean => {
    return !!getLearnerParticipantRecord(member);
  };

  // Unique learners enrolled as participants
  const enrolledMembers = useMemo(() => {
    return distinctMembers.filter((m) => isLearnerEnrolled(m));
  }, [distinctMembers, participantMap, lrnToMembershipIds]);

  // Unique learners available to enroll
  const availableMembers = useMemo(() => {
    return distinctMembers.filter((m) => !isLearnerEnrolled(m));
  }, [distinctMembers, participantMap, lrnToMembershipIds]);

  const filteredEnrolled = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrolledMembers;
    return enrolledMembers.filter((m) =>
      [m.fullName, m.learnerLrn, m.gradeLevel, m.section, m.councilRole].join(' ').toLowerCase().includes(q)
    );
  }, [enrolledMembers, search]);

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableMembers;
    return availableMembers.filter((m) =>
      [m.fullName, m.learnerLrn, m.gradeLevel, m.section, m.councilRole].join(' ').toLowerCase().includes(q)
    );
  }, [availableMembers, search]);

  if (!open || !training) return null;

  const toggleSelectMember = (id: string) => {
    setSelectedToAttach((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredAvailable.map((m) => m.id);
    setSelectedToAttach((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleDeselectAll = () => {
    setSelectedToAttach([]);
  };

  const handleExecuteAttach = async () => {
    if (!selectedToAttach.length) return;
    setIsProcessing(true);
    try {
      await onAttachMembers(training.id, selectedToAttach, participationStatus);
      setSelectedToAttach([]);
      await onRefresh();
      setActiveTab('participants');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteDetach = async (member: SrcyMemberRecord) => {
    setIsProcessing(true);
    try {
      const key = member.learnerLrn?.trim() || member.id;
      const siblingIds = lrnToMembershipIds.get(key) || [member.id];
      // Detach across any recorded term IDs for this training
      for (const id of siblingIds) {
        if (participantMap.has(id)) {
          await onDetachMember(training.id, id);
        }
      }
      await onRefresh();
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide srcy-dom-members-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-participants-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Training Attendance &amp; Certification</p>
            <h3 id="training-participants-title">{training.title}</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isProcessing}
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="modal-dialog__body srcy-dom-members-body">
          {/* Header Details Strip */}
          <div className="srcy-dom-summary-strip">
            <div className="srcy-dom-badge-pill">
              <span>Date:</span>
              <strong>{training.trainingDate}</strong>
            </div>
            <div className="srcy-dom-badge-pill">
              <span>Status:</span>
              <strong>{training.status}</strong>
            </div>
            {training.schoolYear ? (
              <div className="srcy-dom-badge-pill">
                <span>School Year:</span>
                <strong>{training.schoolYear}</strong>
              </div>
            ) : null}
            {training.venue ? (
              <div className="srcy-dom-badge-pill">
                <span>Venue:</span>
                <strong>{training.venue}</strong>
              </div>
            ) : null}
            <div className="srcy-dom-badge-pill">
              <span>Enrolled:</span>
              <strong>{enrolledMembers.length} member(s)</strong>
            </div>
          </div>

          {/* Modal Tab Bar */}
          <div className="srcy-tab-bar">
            <button
              type="button"
              className={`srcy-tab-btn ${activeTab === 'participants' ? 'srcy-tab-btn--active' : ''}`}
              onClick={() => {
                setActiveTab('participants');
                setSearch('');
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">how_to_reg</span>
              Enrolled Participants ({enrolledMembers.length})
            </button>
            <button
              type="button"
              className={`srcy-tab-btn ${activeTab === 'add' ? 'srcy-tab-btn--active' : ''}`}
              onClick={() => {
                setActiveTab('add');
                setSearch('');
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">person_add</span>
              Add Members ({availableMembers.length})
            </button>
          </div>

          {/* Search and Action Row */}
          <div className="srcy-dom-search-row">
            <label className="floating-field" style={{ margin: 0, flex: 1 }}>
              <div className="floating-field__control">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder=" "
                />
                <span>
                  {activeTab === 'participants'
                    ? 'Search enrolled participants by name, LRN, grade, or role'
                    : 'Search available council members to enroll'}
                </span>
              </div>
            </label>

            {activeTab === 'add' && selectedToAttach.length > 0 ? (
              <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <select
                  aria-label="Participation status"
                  style={{
                    height: 38,
                    padding: '0 8px',
                    borderRadius: 6,
                    border: '1px solid var(--deped-border, #cbd5e1)',
                    background: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  value={participationStatus}
                  onChange={(e) => setParticipationStatus(e.target.value as SrcyParticipationStatus)}
                >
                  <option value="Completed">Completed</option>
                  <option value="Attended">Attended</option>
                  <option value="Eligible">Eligible</option>
                  <option value="Incomplete">Incomplete</option>
                  <option value="Excused">Excused</option>
                </select>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleExecuteAttach()}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Enrolling...' : `Enroll (${selectedToAttach.length}) Selected`}
                </button>
              </div>
            ) : null}
          </div>

          {activeTab === 'add' && filteredAvailable.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '-4px 0 4px' }}>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '2px 8px', fontSize: 11, minHeight: 28, height: 28 }}
                onClick={handleSelectAllFiltered}
              >
                Select All ({filteredAvailable.length})
              </button>
              {selectedToAttach.length > 0 ? (
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: '2px 8px', fontSize: 11, minHeight: 28, height: 28 }}
                  onClick={handleDeselectAll}
                >
                  Clear Selection
                </button>
              ) : null}
              <span style={{ fontSize: 12, color: 'var(--deped-muted)' }}>
                <strong>{selectedToAttach.length}</strong> selected
              </span>
            </div>
          ) : null}

          {/* Table Container */}
          <div className="srcy-dom-members-table-wrap">
            {activeTab === 'participants' ? (
              filteredEnrolled.length === 0 ? (
                <div className="srcy-empty-state" style={{ padding: '36px 16px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 44, color: 'var(--deped-border)', display: 'block', marginBottom: 8 }} aria-hidden="true">
                    group_off
                  </span>
                  <p>
                    {search
                      ? 'No enrolled participants found matching your search.'
                      : 'No members are currently enrolled in this council training.'}
                  </p>
                  {!search ? (
                    <button
                      type="button"
                      className="primary-button"
                      style={{ marginTop: '10px' }}
                      onClick={() => setActiveTab('add')}
                    >
                      Enroll Members Now
                    </button>
                  ) : null}
                </div>
              ) : (
                <table className="usis-table srcy-dom-members-table">
                  <thead>
                    <tr>
                      <th>Participant Name</th>
                      <th>LRN</th>
                      <th>Grade &amp; Section</th>
                      <th>Council Role</th>
                      <th>Certification Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnrolled.map((member) => {
                      const part = getLearnerParticipantRecord(member);
                      return (
                        <tr key={member.id}>
                          <td>
                            <strong>{member.fullName}</strong>
                          </td>
                          <td>
                            {member.learnerLrn ? (
                              <code>{member.learnerLrn}</code>
                            ) : (
                              <span style={{ color: 'var(--deped-muted)' }}>-</span>
                            )}
                          </td>
                          <td>
                            {member.gradeLevel} - {member.section}
                          </td>
                          <td>
                            <span className="srcy-role-pill">{member.councilRole || 'Member'}</span>
                          </td>
                          <td>
                            <span className="srcy-status-chip srcy-status-chip--active">
                              {part?.participationStatus || 'Completed'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="secondary-button srcy-row-action-btn srcy-row-action-btn--danger"
                              title="Remove participant from this training"
                              disabled={isProcessing}
                              onClick={() => handleExecuteDetach(member)}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">
                                remove_circle
                              </span>
                              <span className="srcy-row-btn-label">Remove</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : filteredAvailable.length === 0 ? (
              <div className="srcy-empty-state" style={{ padding: '36px 16px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 44, color: 'var(--deped-border)', display: 'block', marginBottom: 8 }} aria-hidden="true">
                  check_circle
                </span>
                <p>
                  {search
                    ? 'No members found matching your search.'
                    : 'All council members are already enrolled in this training!'}
                </p>
              </div>
            ) : (
              <table className="usis-table srcy-dom-members-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>
                      <input
                        type="checkbox"
                        checked={
                          filteredAvailable.length > 0 &&
                          filteredAvailable.every((m) => selectedToAttach.includes(m.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) handleSelectAllFiltered();
                          else handleDeselectAll();
                        }}
                        aria-label="Select all available members"
                      />
                    </th>
                    <th>Member Name</th>
                    <th>LRN</th>
                    <th>Grade &amp; Section</th>
                    <th>Council Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAvailable.map((member) => {
                    const isChecked = selectedToAttach.includes(member.id);
                    return (
                      <tr
                        key={member.id}
                        className={isChecked ? 'srcy-member-row--selected' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleSelectMember(member.id)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectMember(member.id)}
                            aria-label={`Select ${member.fullName}`}
                          />
                        </td>
                        <td>
                          <strong>{member.fullName}</strong>
                        </td>
                        <td>
                          {member.learnerLrn ? (
                            <code>{member.learnerLrn}</code>
                          ) : (
                            <span style={{ color: 'var(--deped-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {member.gradeLevel} - {member.section}
                        </td>
                        <td>
                          <span className="srcy-role-pill">{member.councilRole || 'Member'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="modal-dialog__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
