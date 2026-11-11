import React from 'react';
import { createPortal } from 'react-dom';
import type { SccServiceRequest } from '../../../types';

interface ViewServiceRequestModalProps {
  request: SccServiceRequest | null;
  onClose: () => void;
}

export function ViewServiceRequestModal({ request, onClose }: ViewServiceRequestModalProps) {
  if (!request) return null;

  const getStatusBadge = (status: SccServiceRequest['status']) => {
    switch (status) {
      case 'provisioned':
        return <span className="scc-badge scc-badge--success">Provisioned / Active</span>;
      case 'approved':
        return <span className="scc-badge scc-badge--info">Approved by Coordinator</span>;
      case 'under_review':
        return <span className="scc-badge scc-badge--warning">Under Review</span>;
      case 'rejected':
        return <span className="scc-badge scc-badge--danger">Rejected</span>;
      case 'cancelled':
        return <span className="scc-badge scc-badge--neutral">Cancelled</span>;
      default:
        return <span className="scc-badge scc-badge--pending">Pending Review</span>;
    }
  };

  const specs: Array<{ label: string; value: string; mono?: boolean }> = [];
  const d = request.details;
  if (d) {
    if (request.serviceKey === 'email_account' && d.requestedMailboxAlias) {
      specs.push({
        label: 'Requested Mailbox',
        value: `${d.requestedMailboxAlias}@leonnhs.edu.ph`,
        mono: true,
      });
    }
    if (request.serviceKey === 'cloud_storage' && d.storageCapacity) {
      specs.push({ label: 'Storage Tier', value: d.storageCapacity });
    }
    if (request.serviceKey === 'digital_id_pass') {
      if (d.eventTitle) specs.push({ label: 'Event Name', value: d.eventTitle });
      if (d.eventDate) specs.push({ label: 'Event Date', value: d.eventDate });
      if (d.estimatedAttendees) {
        specs.push({ label: 'Estimated Participants', value: `${d.estimatedAttendees} attendees` });
      }
    }
    if (request.serviceKey === 'broadcast_notice') {
      if (d.broadcastHeadline) specs.push({ label: 'Broadcast Headline', value: d.broadcastHeadline });
      if (d.broadcastChannels && d.broadcastChannels.length > 0) {
        specs.push({ label: 'Broadcast Channels', value: d.broadcastChannels.join(', ') });
      }
    }
    if (request.serviceKey === 'virtual_conferencing' && d.meetingPlatform) {
      specs.push({ label: 'Conferencing Platform', value: d.meetingPlatform });
    }
    if (d.customNotes) {
      specs.push({ label: 'Additional Notes', value: d.customNotes });
    }
  }

  return createPortal(
    <div className="modal-overlay modal-overlay--high scc-usis-modal-wrap" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scc-view-req-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <div className="modal-record__meta">
              <span className="scc-tracking-code">{request.trackingNumber}</span>
              {getStatusBadge(request.status)}
            </div>
            <h3 id="scc-view-req-title">{request.title}</h3>
            <p className="scc-modal-subtitle">
              Service: <strong>{request.serviceTitle}</strong> • Organization:{' '}
              <strong>{request.organizationName}</strong>
            </p>
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

        <div className="modal-dialog__body">
          <div className="modal-record">
            {/* Provisioned credentials highlight banner */}
            {request.status === 'provisioned' && request.provisionedData ? (
              <div className="notice-box scc-provision-notice">
                <div className="scc-provision-notice__head">
                  <span className="material-symbols-outlined scc-provision-notice__icon" aria-hidden="true">
                    verified
                  </span>
                  <div>
                    <strong>Service Provisioned Successfully</strong>
                    <span className="scc-provision-notice__sub">
                      Provisioned by {request.provisionedData.provisionedBy || 'School ICT Coordinator'} on{' '}
                      {new Date(
                        request.provisionedData.provisionedAt || request.updatedAt,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="modal-record__fields">
                  {request.provisionedData.assignedEmail ? (
                    <div className="modal-record__field">
                      <span>Assigned Institutional Email</span>
                      <strong>{request.provisionedData.assignedEmail}</strong>
                    </div>
                  ) : null}

                  {request.provisionedData.tempPassword ? (
                    <div className="modal-record__field">
                      <span>Temporary Access Password</span>
                      <strong>{request.provisionedData.tempPassword}</strong>
                    </div>
                  ) : null}

                  {request.provisionedData.driveUrl ? (
                    <div className="modal-record__field">
                      <span>Shared Drive Link</span>
                      <strong>
                        <a
                          href={request.provisionedData.driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="scc-link"
                        >
                          {request.provisionedData.driveUrl}
                        </a>
                      </strong>
                    </div>
                  ) : null}
                </div>

                {request.provisionedData.setupInstructions ? (
                  <p className="scc-provision-notice__instructions">
                    {request.provisionedData.setupInstructions}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Core Metadata */}
            <div className="modal-record__fields scc-modal-meta-4col">
              <div className="modal-record__field">
                <span>Submitted By</span>
                <strong>{request.requesterName}</strong>
                <small className="scc-meta-sub">{request.requesterPosition}</small>
              </div>
              <div className="modal-record__field">
                <span>Date Submitted</span>
                <strong>{new Date(request.createdAt).toLocaleDateString()}</strong>
                <small className="scc-meta-sub">
                  {new Date(request.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              </div>
              <div className="modal-record__field">
                <span>Priority Level</span>
                <div style={{ marginTop: '6px' }}>
                  <span className={`scc-priority-pill scc-priority-pill--${request.priority}`}>
                    {request.priority.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="modal-record__field">
                <span>Adviser Endorsement</span>
                <strong className="scc-endorsement-status" style={{ marginTop: '6px' }}>
                  <span className="material-symbols-outlined scc-check-icon" aria-hidden="true">
                    {request.adviserEndorsement ? 'check_circle' : 'schedule'}
                  </span>
                  {request.adviserEndorsement ? 'Certified Endorsed' : 'Pending Endorsement'}
                </strong>
              </div>
            </div>

            {/* Operational Justification */}
            <div className="modal-record__section">
              <h4>Operational Justification</h4>
              <div className="notice-box">
                <span>{request.justification || 'No justification provided.'}</span>
              </div>
            </div>

            {/* Service Specifications */}
            {specs.length > 0 ? (
              <div className="modal-record__section">
                <h4>Service Specifications</h4>
                <div className="modal-record__fields">
                  {specs.map((item) => (
                    <div key={item.label} className="modal-record__field">
                      <span>{item.label}</span>
                      <strong className={item.mono ? 'scc-mono-text' : undefined}>
                        {item.value}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Coordinator Review Section */}
            {request.reviewerRemarks ? (
              <div className="modal-record__section">
                <h4>Coordinator Review Remarks</h4>
                <div className="notice-box scc-review-notice">
                  <p className="scc-review-notice__text">{request.reviewerRemarks}</p>
                  <div className="scc-review-notice__meta">
                    <span>
                      Reviewed by: <strong>{request.reviewedBy || 'Coordinator'}</strong>
                    </span>
                    {request.reviewedAt ? (
                      <span>Date: {new Date(request.reviewedAt).toLocaleDateString()}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
