import { useEffect, useState, type FormEvent } from 'react';
import type {
  IaMailboxAvailabilityResult,
  IaSccOrganization,
  IaSccRequestStatus,
  IaSccServiceRequest,
} from '../types';
import {
  checkIaMailboxAvailability,
  formatIaDuplicateEmailMessage,
  provisionGoogleWorkspaceAccount,
  reviewIaSccRequest,
  sendOfficerEmailNotification,
} from '../services/iaSccService';
import { useOfficerRecipients } from '../hooks/useOfficerRecipients';
import { OfficerNotificationBox } from '../components/OfficerNotificationBox';
import { buildServiceRequestNotificationEmail } from '../utils/sccNotificationTemplates';
import type { SccGoogleAccountSuccessInfo } from './SccGoogleAccountSuccessModal';

export type SccRequestModalMode = 'view' | 'provision' | 'reject';

type SccRequestActionModalProps = {
  request: IaSccServiceRequest | null;
  mode: SccRequestModalMode;
  reviewerName: string;
  organizations?: IaSccOrganization[];
  onClose: () => void;
  onUpdated: (updated: IaSccServiceRequest) => void;
  onGoogleSuccess?: (info: SccGoogleAccountSuccessInfo) => void;
  onNotifyOutcome?: (outcome: {
    statusLabel: string;
    trackingNumber: string;
    sentTo: string[];
    ccSent?: string[];
    error?: string;
  }) => void;
};

const STATUS_BADGE_MAP: Record<IaSccRequestStatus, { label: string; tone: string }> = {
  pending: { label: 'Pending', tone: 'warning' },
  under_review: { label: 'Under Review', tone: 'indigo' },
  approved: { label: 'Approved', tone: 'info' },
  provisioned: { label: 'Provisioned', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export function SccRequestActionModal({
  request,
  mode,
  reviewerName,
  organizations = [],
  onClose,
  onUpdated,
  onGoogleSuccess,
  onNotifyOutcome,
}: SccRequestActionModalProps) {
  const [activeMode, setActiveMode] = useState<SccRequestModalMode>(mode);
  const [assignedEmail, setAssignedEmail] = useState('');
  const [tempPassword, setTempPassword] = useState(() => `Leonnhs.${new Date().getFullYear()}`);
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [setupInstructions, setSetupInstructions] = useState(
    'Sign in via Google Workspace (mail.google.com) using your assigned @leonnhs.edu.ph credentials and enable two-factor authentication upon initial access.',
  );
  const [reviewerRemarks, setReviewerRemarks] = useState('');
  const [provisionInGoogleAdmin, setProvisionInGoogleAdmin] = useState(true);
  const [updateIfExists, setUpdateIfExists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingAssignedEmail, setIsCheckingAssignedEmail] = useState(false);
  const [assignedEmailAvailability, setAssignedEmailAvailability] =
    useState<IaMailboxAvailabilityResult | null>(null);

  const matchedOrg = request
    ? organizations.find(
        (org) =>
          org.id === request.organizationId ||
          org.acronym.toLowerCase() === request.organizationAcronym.toLowerCase(),
      ) || null
    : null;

  const notify = useOfficerRecipients({
    organizationId: request?.organizationId,
    organizationAcronym: request?.organizationAcronym,
    organizationName: request?.organizationName,
    adviserEmail: matchedOrg?.adviserEmail,
    enabled: Boolean(request),
    defaultChecked: true,
  });

  useEffect(() => {
    if (!request) return;
    setActiveMode(mode);
    setErrorMsg(null);
    setProvisionInGoogleAdmin(request.serviceKey === 'email_account');
    setUpdateIfExists(false);
    setTempPassword(`Leonnhs.${new Date().getFullYear()}`);
    const cleanAlias = (
      request.details?.requestedMailboxAlias || request.organizationAcronym.toLowerCase()
    )
      .replace(/\.leon$/i, '')
      .replace(/@.*$/, '');
    setAssignedEmail(
      request.serviceKey === 'email_account' ? `${cleanAlias}@leonnhs.edu.ph` : '',
    );
    setDriveFolderUrl(request.provisionedData?.driveFolderUrl || '');
    setReviewerRemarks(
      mode === 'provision'
        ? 'Approved and provisioned via Integrated Admin SCC Desk.'
        : mode === 'reject'
          ? ''
          : request.reviewerRemarks || '',
    );
  }, [mode, request]);

  useEffect(() => {
    if (
      !request ||
      activeMode !== 'provision' ||
      request.serviceKey !== 'email_account' ||
      !assignedEmail.trim().endsWith('@leonnhs.edu.ph')
    ) {
      setAssignedEmailAvailability(null);
      setIsCheckingAssignedEmail(false);
      return;
    }

    let cancelled = false;
    setIsCheckingAssignedEmail(true);
    const timer = window.setTimeout(() => {
      void checkIaMailboxAvailability(assignedEmail.trim(), {
        excludeOrganizationId: request.organizationId,
        excludeRequestId: request.id,
      })
        .then((result) => {
          if (!cancelled) setAssignedEmailAvailability(result);
        })
        .finally(() => {
          if (!cancelled) setIsCheckingAssignedEmail(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [request, activeMode, assignedEmail]);

  if (!request) return null;

  const badge = STATUS_BADGE_MAP[request.status] || STATUS_BADGE_MAP.pending;

  const dispatchStatusNotification = async (params: {
    nextStatus: IaSccRequestStatus;
    remarks: string;
    assignedEmail?: string;
    tempPassword?: string;
    driveFolderUrl?: string;
    setupInstructions?: string;
  }): Promise<SccGoogleAccountSuccessInfo['notificationSummary']> => {
    if (!notify.notifyEnabled || notify.effectiveTo.length === 0) {
      return undefined;
    }
    try {
      const mail = buildServiceRequestNotificationEmail({
        request,
        nextStatus: params.nextStatus,
        reviewerRemarks: params.remarks,
        reviewedBy: reviewerName,
        assignedEmail: params.assignedEmail,
        tempPassword: params.tempPassword,
        driveFolderUrl: params.driveFolderUrl,
        setupInstructions: params.setupInstructions,
      });
      const res = await sendOfficerEmailNotification({
        to: notify.effectiveTo,
        cc: notify.effectiveCc,
        replyTo: matchedOrg?.adviserEmail || undefined,
        subject: mail.subject,
        text: mail.text,
      });
      return { sentTo: res.sentTo, ccSent: res.ccSent };
    } catch (notifyErr: any) {
      return {
        sentTo: notify.effectiveTo,
        error: notifyErr?.message || 'Unable to send notification email.',
      };
    }
  };

  const handleQuickStatus = async (nextStatus: IaSccRequestStatus, remarks: string) => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const updated = await reviewIaSccRequest(request.id, {
        status: nextStatus,
        reviewerRemarks: remarks,
        reviewedBy: reviewerName,
      });
      const summary = await dispatchStatusNotification({
        nextStatus,
        remarks,
      });
      onUpdated(updated);
      onClose();
      if (summary) {
        onNotifyOutcome?.({
          statusLabel: STATUS_BADGE_MAP[nextStatus]?.label || nextStatus,
          trackingNumber: request.trackingNumber,
          sentTo: summary.sentTo,
          ccSent: summary.ccSent,
          error: summary.error,
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to update request status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (activeMode === 'reject') {
      if (!reviewerRemarks.trim()) {
        setErrorMsg('Please provide a clear reason for rejecting this request.');
        return;
      }
      await handleQuickStatus('rejected', reviewerRemarks.trim());
      return;
    }

    if (activeMode === 'provision') {
      if (request.serviceKey === 'email_account' && !assignedEmail.trim().endsWith('@leonnhs.edu.ph')) {
        setErrorMsg('Institutional mailbox must use the @leonnhs.edu.ph domain.');
        return;
      }
      if (request.serviceKey === 'email_account' && provisionInGoogleAdmin && tempPassword.trim().length < 8) {
        setErrorMsg('Google Workspace temporary password must be at least 8 characters.');
        return;
      }

      try {
        setIsSubmitting(true);
        setErrorMsg(null);

        let effectiveRemarks = reviewerRemarks.trim() || 'Provisioned via Integrated Admin.';
        let googleSuccessInfo: SccGoogleAccountSuccessInfo | null = null;

        if (request.serviceKey === 'email_account') {
          const check = await checkIaMailboxAvailability(assignedEmail.trim(), {
            excludeOrganizationId: request.organizationId,
            excludeRequestId: request.id,
          });
          setAssignedEmailAvailability(check);

          if (
            check.existsInDatabase &&
            check.databaseConflictOrgId &&
            check.databaseConflictOrgId !== request.organizationId
          ) {
            setErrorMsg(formatIaDuplicateEmailMessage(check.email, check.registeredTo));
            return;
          }

          if ((!provisionInGoogleAdmin || !updateIfExists) && !check.available) {
            setErrorMsg(formatIaDuplicateEmailMessage(check.email, check.registeredTo));
            return;
          }
        }

        if (request.serviceKey === 'email_account' && provisionInGoogleAdmin) {
          const gResult = await provisionGoogleWorkspaceAccount({
            primaryEmail: assignedEmail.trim(),
            password: tempPassword.trim(),
            organizationAcronym: request.organizationAcronym,
            organizationName: request.organizationName,
            updateIfExists,
            linkToOrganizationId: request.organizationId,
            excludeRequestId: request.id,
          });
          effectiveRemarks = `${effectiveRemarks} [Google Admin: ${gResult.action} ${gResult.user.primaryEmail}]`;
          googleSuccessInfo = {
            action: gResult.action,
            userId: gResult.user.id,
            primaryEmail: gResult.user.primaryEmail,
            tempPassword: tempPassword.trim(),
            orgUnitPath: gResult.user.orgUnitPath,
            trackingNumber: request.trackingNumber,
          };
        }

        const assignedEmailValue =
          request.serviceKey === 'email_account' ? assignedEmail.trim() : undefined;
        const tempPasswordValue =
          request.serviceKey === 'email_account' ? tempPassword.trim() : undefined;
        const driveUrlValue =
          request.serviceKey === 'cloud_storage' ? driveFolderUrl.trim() : undefined;

        const updated = await reviewIaSccRequest(request.id, {
          status: 'provisioned',
          reviewerRemarks: effectiveRemarks,
          reviewedBy: reviewerName,
          provisionedData: {
            assignedEmail: assignedEmailValue,
            tempPassword: tempPasswordValue,
            driveFolderUrl: driveUrlValue,
            setupInstructions: setupInstructions.trim(),
            provisionedAt: new Date().toISOString(),
            provisionedBy: reviewerName,
          },
        });

        const summary = await dispatchStatusNotification({
          nextStatus: 'provisioned',
          remarks: effectiveRemarks,
          assignedEmail: assignedEmailValue,
          tempPassword: tempPasswordValue,
          driveFolderUrl: driveUrlValue,
          setupInstructions: setupInstructions.trim(),
        });

        onUpdated(updated);
        onClose();
        if (googleSuccessInfo) {
          onGoogleSuccess?.({
            ...googleSuccessInfo,
            notificationSummary: summary,
          });
        } else if (summary) {
          onNotifyOutcome?.({
            statusLabel: 'Provisioned',
            trackingNumber: request.trackingNumber,
            sentTo: summary.sentTo,
            ccSent: summary.ccSent,
            error: summary.error,
          });
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to provision service.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-dialog modal-dialog--wide ia-scc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="SCC Service Request Details"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">
              {request.trackingNumber} • {request.organizationAcronym}
            </p>
            <h3>
              {activeMode === 'provision'
                ? 'Provision Digital Service'
                : activeMode === 'reject'
                  ? 'Reject Service Request'
                  : request.serviceTitle}
            </h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <form className="modal-dialog__body ia-scc-modal__body" onSubmit={handleSubmit}>
          {errorMsg ? (
            <div className="ia-scc-alert ia-scc-alert--danger" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{errorMsg}</span>
            </div>
          ) : null}

          <div className="ia-scc-detail-meta">
            <div className="ia-scc-detail-meta__item">
              <span>Organization</span>
              <strong>{request.organizationName} ({request.organizationAcronym})</strong>
            </div>
            <div className="ia-scc-detail-meta__item">
              <span>Submitted By</span>
              <strong>{request.requesterName} ({request.requesterPosition})</strong>
            </div>
            <div className="ia-scc-detail-meta__item">
              <span>Priority & Status</span>
              <div className="ia-scc-inline-tags">
                <span className="ia-status-tag ia-status-tag--neutral">
                  {request.priority.toUpperCase()}
                </span>
                <span className={`ia-status-tag ia-status-tag--${badge.tone}`}>
                  {badge.label}
                </span>
              </div>
            </div>
            <div className="ia-scc-detail-meta__item">
              <span>Adviser Endorsement</span>
              <strong>{request.adviserEndorsement ? 'Endorsed' : 'Pending Endorsement'}</strong>
            </div>
          </div>

          <div className="ia-scc-detail-block">
            <h4>{request.title}</h4>
            <p>{request.justification}</p>
            {request.details?.requestedMailboxAlias ? (
              <p className="ia-scc-detail-spec">
                <strong>Requested Mailbox:</strong>{' '}
                <code>{request.details.requestedMailboxAlias}@leonnhs.edu.ph</code>
              </p>
            ) : null}
            {request.details?.storageCapacity ? (
              <p className="ia-scc-detail-spec">
                <strong>Storage Tier:</strong> {request.details.storageCapacity}
              </p>
            ) : null}
            {request.details?.broadcastHeadline ? (
              <p className="ia-scc-detail-spec">
                <strong>Broadcast Headline:</strong> {request.details.broadcastHeadline}
              </p>
            ) : null}
            {request.details?.eventTitle ? (
              <p className="ia-scc-detail-spec">
                <strong>Event:</strong> {request.details.eventTitle}{' '}
                {request.details.eventDate ? `(${request.details.eventDate})` : ''}
              </p>
            ) : null}
          </div>

          {request.provisionedData && activeMode === 'view' ? (
            <div className="ia-scc-provisioned-box">
              <h5>Provisioned Deliverables</h5>
              {request.provisionedData.assignedEmail ? (
                <p>
                  <strong>Assigned Email:</strong>{' '}
                  <code>{request.provisionedData.assignedEmail}</code>
                </p>
              ) : null}
              {request.provisionedData.driveFolderUrl ? (
                <p>
                  <strong>Shared Drive URL:</strong> {request.provisionedData.driveFolderUrl}
                </p>
              ) : null}
              {request.provisionedData.setupInstructions ? (
                <p>
                  <strong>Instructions:</strong> {request.provisionedData.setupInstructions}
                </p>
              ) : null}
            </div>
          ) : null}

          {activeMode === 'provision' ? (
            <div className="ia-scc-form-stack">
              {request.serviceKey === 'email_account' ? (
                <>
                  <div className="ia-scc-form-grid">
                    <label className="floating-field">
                      <input
                        type="email"
                        placeholder=" "
                        required
                        value={assignedEmail}
                        onChange={(e) => setAssignedEmail(e.target.value)}
                      />
                      <span>Assigned Institutional Email (@leonnhs.edu.ph) *</span>
                    </label>
                    <label className="floating-field">
                      <input
                        type="text"
                        placeholder=" "
                        required
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                      />
                      <span>Temporary Initial Password *</span>
                    </label>
                  </div>

                  {isCheckingAssignedEmail ? (
                    <p className="ia-scc-availability-hint ia-scc-availability-hint--checking">
                      Checking email availability...
                    </p>
                  ) : assignedEmailAvailability && !assignedEmailAvailability.available ? (
                    <p className="ia-scc-availability-hint ia-scc-availability-hint--danger" role="alert">
                      {formatIaDuplicateEmailMessage(
                        assignedEmailAvailability.email,
                        assignedEmailAvailability.registeredTo,
                      )}
                    </p>
                  ) : assignedEmailAvailability?.available ? (
                    <p className="ia-scc-availability-hint ia-scc-availability-hint--success">
                      <strong>{assignedEmailAvailability.email}</strong> is available.
                    </p>
                  ) : null}

                  <div className="ia-scc-form-stack">
                    <label className="ia-scc-checkbox-row">
                      <input
                        type="checkbox"
                        checked={provisionInGoogleAdmin}
                        onChange={(e) => setProvisionInGoogleAdmin(e.target.checked)}
                      />
                      <span>Create mailbox automatically in Google Workspace Admin Console</span>
                    </label>

                    {provisionInGoogleAdmin ? (
                      <label className="ia-scc-checkbox-row">
                        <input
                          type="checkbox"
                          checked={updateIfExists}
                          onChange={(e) => setUpdateIfExists(e.target.checked)}
                        />
                        <span>If mailbox already exists in Google Admin, reset password and link it</span>
                      </label>
                    ) : null}
                  </div>
                </>
              ) : null}

              {request.serviceKey === 'cloud_storage' ? (
                <label className="floating-field">
                  <input
                    type="url"
                    placeholder=" "
                    value={driveFolderUrl}
                    onChange={(e) => setDriveFolderUrl(e.target.value)}
                  />
                  <span>Shared Drive Folder URL</span>
                </label>
              ) : null}

              <label className="floating-field">
                <textarea
                  rows={3}
                  placeholder=" "
                  value={setupInstructions}
                  onChange={(e) => setSetupInstructions(e.target.value)}
                />
                <span>Setup & Access Instructions</span>
              </label>

              <label className="floating-field">
                <input
                  type="text"
                  placeholder=" "
                  value={reviewerRemarks}
                  onChange={(e) => setReviewerRemarks(e.target.value)}
                />
                <span>Coordinator Approval Remarks</span>
              </label>
            </div>
          ) : null}

          {activeMode === 'reject' ? (
            <div className="ia-scc-form-stack">
              <label className="floating-field">
                <textarea
                  rows={3}
                  placeholder=" "
                  required
                  value={reviewerRemarks}
                  onChange={(e) => setReviewerRemarks(e.target.value)}
                />
                <span>Reason for Rejection *</span>
              </label>
            </div>
          ) : null}

          {request.status !== 'provisioned' && request.status !== 'rejected' ? (
            <OfficerNotificationBox
              title={`Notify ${request.organizationAcronym} registered officers via Google SMTP`}
              smtpStatus={notify.smtpStatus}
              recipients={notify.recipients}
              allOfficersCount={notify.allOfficersCount}
              selectedEmails={notify.selectedEmails}
              presetMode={notify.presetMode}
              includeAdviser={notify.includeAdviser}
              adviserEmail={matchedOrg?.adviserEmail}
              manualEmail={notify.manualEmail}
              notifyEnabled={notify.notifyEnabled}
              isLoading={notify.isLoading}
              onToggleNotify={notify.setNotifyEnabled}
              onApplyPreset={notify.applyPreset}
              onToggleEmail={notify.toggleEmail}
              onToggleAdviser={notify.setIncludeAdviser}
              onManualEmailChange={notify.setManualEmail}
            />
          ) : null}

          <div className="modal-dialog__actions ia-scc-modal__actions">
            {activeMode === 'view' ? (
              <>
                <button type="button" className="secondary-btn" onClick={onClose}>
                  Close
                </button>
                {request.status !== 'provisioned' && request.status !== 'rejected' ? (
                  <div className="ia-scc-action-row">
                    {request.status === 'pending' ? (
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={isSubmitting}
                        onClick={() =>
                          void handleQuickStatus(
                            'under_review',
                            'Request moved to Under Review by Integrated Admin.',
                          )
                        }
                      >
                        Mark Under Review
                      </button>
                    ) : null}
                    {request.status !== 'approved' ? (
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={isSubmitting}
                        onClick={() =>
                          void handleQuickStatus(
                            'approved',
                            'Approved for fulfillment by Integrated Admin.',
                          )
                        }
                      >
                        Approve
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="secondary-btn ia-scc-btn--danger"
                      disabled={isSubmitting}
                      onClick={() => {
                        setReviewerRemarks('');
                        setActiveMode('reject');
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={isSubmitting}
                      onClick={() => {
                        setReviewerRemarks('Approved and provisioned via Integrated Admin SCC Desk.');
                        setActiveMode('provision');
                      }}
                    >
                      Provision Service
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setActiveMode('view')}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className={activeMode === 'reject' ? 'primary-btn ia-scc-btn--danger-solid' : 'primary-btn'}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : activeMode === 'provision'
                      ? 'Confirm & Provision'
                      : 'Confirm Rejection'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
