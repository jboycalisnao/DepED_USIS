import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { SrcyDomRecord } from '../services/srcyDomService';
import type { SrcyMemberRecord } from '../services/srcyMembershipService';

type DomMembersModalProps = {
  open: boolean;
  dom: SrcyDomRecord | null;
  allMembers: SrcyMemberRecord[];
  onClose: () => void;
  onAttachMembers: (domId: string, memberIds: string[]) => Promise<void>;
  onDetachMember: (memberId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
};

export function DomMembersModal({
  open,
  dom,
  allMembers,
  onClose,
  onAttachMembers,
  onDetachMember,
  onRefresh,
}: DomMembersModalProps) {
  const [search, setSearch] = useState('');
  const [selectedToAttach, setSelectedToAttach] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'attached' | 'attach'>('attached');

  const attachedMembers = useMemo(() => {
    if (!dom) return [];
    return allMembers.filter((m) => m.domId === dom.id);
  }, [allMembers, dom]);

  const availableMembers = useMemo(() => {
    if (!dom) return [];
    return allMembers.filter((m) => m.domId !== dom.id);
  }, [allMembers, dom]);

  const filteredAttached = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attachedMembers;
    return attachedMembers.filter((m) =>
      [m.fullName, m.learnerLrn, m.gradeLevel, m.section, m.councilRole].join(' ').toLowerCase().includes(q)
    );
  }, [attachedMembers, search]);

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableMembers;
    return availableMembers.filter((m) =>
      [m.fullName, m.learnerLrn, m.gradeLevel, m.section, m.councilRole].join(' ').toLowerCase().includes(q)
    );
  }, [availableMembers, search]);

  if (!open || !dom) return null;

  const toggleSelectMember = (id: string) => {
    setSelectedToAttach((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteAttach = async () => {
    if (!selectedToAttach.length) return;
    setIsProcessing(true);
    try {
      await onAttachMembers(dom.id, selectedToAttach);
      setSelectedToAttach([]);
      await onRefresh();
      setActiveTab('attached');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteDetach = async (memberId: string) => {
    setIsProcessing(true);
    try {
      await onDetachMember(memberId);
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
        aria-labelledby="dom-members-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Declaration of Members (DOM) Batch</p>
            <h3 id="dom-members-title">{dom.title}</h3>
          </div>
          <button
            type="button"
            className="modal-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="modal-dialog__body srcy-dom-members-body">
          <div className="srcy-dom-summary-strip">
            <div className="srcy-dom-badge-pill">
              <span>DOM No:</span>
              <strong>{dom.domNumber}</strong>
            </div>
            <div className="srcy-dom-badge-pill">
              <span>School Year:</span>
              <strong>{dom.schoolYear || '-'}</strong>
            </div>
            <div className="srcy-dom-badge-pill">
              <span>Validity:</span>
              <strong>{dom.validFrom} to {dom.validUntil}</strong>
            </div>
            <div className="srcy-dom-badge-pill">
              <span>Members Attached:</span>
              <strong>{attachedMembers.length}</strong>
            </div>
          </div>

          <div className="srcy-tab-bar">
            <button
              type="button"
              className={`srcy-tab-btn ${activeTab === 'attached' ? 'srcy-tab-btn--active' : ''}`}
              onClick={() => {
                setActiveTab('attached');
                setSearch('');
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">group</span>
              Attached Members ({attachedMembers.length})
            </button>
            <button
              type="button"
              className={`srcy-tab-btn ${activeTab === 'attach' ? 'srcy-tab-btn--active' : ''}`}
              onClick={() => {
                setActiveTab('attach');
                setSearch('');
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">person_add</span>
              Attach Existing Members ({availableMembers.length})
            </button>
          </div>

          <div className="srcy-dom-search-row">
            <label className="floating-field" style={{ margin: 0, flex: 1 }}>
              <div className="floating-field__control">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder=" "
                />
                <span>Search by member name, LRN, grade, or role</span>
              </div>
            </label>
            {activeTab === 'attach' && selectedToAttach.length > 0 ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleExecuteAttach()}
                disabled={isProcessing}
              >
                Attach ({selectedToAttach.length}) Selected
              </button>
            ) : null}
          </div>

          <div className="srcy-dom-members-table-wrap">
            {activeTab === 'attached' ? (
              filteredAttached.length === 0 ? (
                <div className="srcy-empty-state" style={{ padding: '32px 16px' }}>
                  <span className="material-symbols-outlined" aria-hidden="true">group_off</span>
                  <p>
                    {search
                      ? 'No attached members found matching your search.'
                      : 'No members are currently attached to this DOM batch.'}
                  </p>
                  {!search ? (
                    <button
                      type="button"
                      className="primary-button"
                      style={{ marginTop: '8px' }}
                      onClick={() => setActiveTab('attach')}
                    >
                      Attach Members Now
                    </button>
                  ) : null}
                </div>
              ) : (
                <table className="usis-table srcy-dom-table">
                  <thead>
                    <tr>
                      <th>Learner Member</th>
                      <th>Grade &amp; Section</th>
                      <th>Council Role</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttached.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.fullName}</strong>
                          {m.learnerLrn ? <code>{m.learnerLrn}</code> : null}
                        </td>
                        <td>{[m.gradeLevel, m.section].filter(Boolean).join(' - ') || '-'}</td>
                        <td>{m.councilRole || 'Member'}</td>
                        <td>
                          <span className={`srcy-status-chip srcy-status-chip--${m.membershipStatus.toLowerCase()}`}>
                            {m.membershipStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="secondary-button srcy-row-action-btn srcy-row-action-btn--danger"
                            onClick={() => void handleExecuteDetach(m.id)}
                            disabled={isProcessing}
                            title="Detach member from this DOM batch"
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">link_off</span>
                            <span>Detach</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : filteredAvailable.length === 0 ? (
              <div className="srcy-empty-state" style={{ padding: '32px 16px' }}>
                <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                <p>
                  {search
                    ? 'No unattached members found matching your search.'
                    : 'All registered SRCY members are already attached to this DOM batch.'}
                </p>
              </div>
            ) : (
              <table className="usis-table srcy-dom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedToAttach.length === filteredAvailable.length && filteredAvailable.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedToAttach(filteredAvailable.map((m) => m.id));
                          } else {
                            setSelectedToAttach([]);
                          }
                        }}
                        aria-label="Select all unattached members"
                      />
                    </th>
                    <th>Learner Member</th>
                    <th>Grade &amp; Section</th>
                    <th>Current Batch</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAvailable.map((m) => {
                    const isChecked = selectedToAttach.includes(m.id);
                    return (
                      <tr
                        key={m.id}
                        className="srcy-member-row--clickable"
                        onClick={() => toggleSelectMember(m.id)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectMember(m.id)}
                            aria-label={`Select ${m.fullName}`}
                          />
                        </td>
                        <td>
                          <strong>{m.fullName}</strong>
                          {m.learnerLrn ? <code>{m.learnerLrn}</code> : null}
                        </td>
                        <td>{[m.gradeLevel, m.section].filter(Boolean).join(' - ') || '-'}</td>
                        <td>
                          {m.domId ? (
                            <span className="srcy-badge-reassign">Reassign from other DOM</span>
                          ) : (
                            <span className="srcy-badge-unattached">Unattached</span>
                          )}
                        </td>
                        <td>
                          <span className={`srcy-status-chip srcy-status-chip--${m.membershipStatus.toLowerCase()}`}>
                            {m.membershipStatus}
                          </span>
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
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
