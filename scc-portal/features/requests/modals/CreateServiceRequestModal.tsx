import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import type { SccSession, SccServiceKey, SccPriority, SccServiceRequest } from '../../../types';
import { SCC_DIGITAL_SERVICES } from '../../services/constants';
import {
  checkSccMailboxAvailability,
  createSccRequest,
  fetchSccOrganizations,
  formatEmailAlreadyRegisteredMessage,
  normalizeMailboxAlias,
  type MailboxAvailabilityResult,
} from '../../../services/sccSupabase';

interface CreateServiceRequestModalProps {
  isOpen: boolean;
  session: SccSession;
  initialServiceKey?: SccServiceKey;
  onClose: () => void;
  onCreated: (newRequest: SccServiceRequest) => void;
}

export function CreateServiceRequestModal({
  isOpen,
  session,
  initialServiceKey = 'email_account',
  onClose,
  onCreated,
}: CreateServiceRequestModalProps) {
  const [selectedServiceKey, setSelectedServiceKey] = useState<SccServiceKey>(initialServiceKey);
  const [title, setTitle] = useState('');
  const [justification, setJustification] = useState('');
  const [priority, setPriority] = useState<SccPriority>('normal');
  const [adviserEndorsement, setAdviserEndorsement] = useState(true);

  // Dynamic service parameters
  const [requestedAlias, setRequestedAlias] = useState(
    session.organizationAcronym.toLowerCase().replace(/[^a-z0-9]/g, ''),
  );
  const [storageCapacity, setStorageCapacity] = useState('50GB');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [estimatedAttendees, setEstimatedAttendees] = useState(100);
  const [broadcastHeadline, setBroadcastHeadline] = useState('');
  const [broadcastChannels, setBroadcastChannels] = useState<string[]>([
    'Learner Portal Dashboard',
    'USIS Mobile Feed',
  ]);
  const [meetingPlatform, setMeetingPlatform] = useState<'Google Meet' | 'Zoom'>('Google Meet');
  const [meetingDate, setMeetingDate] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingAlias, setIsCheckingAlias] = useState(false);
  const [aliasAvailability, setAliasAvailability] = useState<MailboxAvailabilityResult | null>(null);
  const [liveAdviserName, setLiveAdviserName] = useState(session.adviserName);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLiveAdviserName(session.adviserName);
    void fetchSccOrganizations()
      .then((orgs) => {
        if (cancelled) return;
        const matched = orgs.find(
          (o) =>
            o.id === session.organizationId ||
            o.acronym.toLowerCase() === session.organizationAcronym.toLowerCase(),
        );
        if (matched?.adviserName) {
          setLiveAdviserName(matched.adviserName);
        }
      })
      .catch(() => {
        // keep session.adviserName fallback
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, session.organizationId, session.organizationAcronym, session.adviserName]);

  const normalizedAlias = normalizeMailboxAlias(requestedAlias);

  useEffect(() => {
    if (!isOpen || selectedServiceKey !== 'email_account') {
      setAliasAvailability(null);
      setIsCheckingAlias(false);
      return;
    }

    if (!normalizedAlias) {
      setAliasAvailability(null);
      setIsCheckingAlias(false);
      return;
    }

    let cancelled = false;
    setIsCheckingAlias(true);
    const timer = window.setTimeout(() => {
      void checkSccMailboxAvailability(normalizedAlias)
        .then((result) => {
          if (!cancelled) setAliasAvailability(result);
        })
        .finally(() => {
          if (!cancelled) setIsCheckingAlias(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, normalizedAlias, selectedServiceKey]);

  if (!isOpen) return null;

  const currentService =
    SCC_DIGITAL_SERVICES.find((s) => s.key === selectedServiceKey) || SCC_DIGITAL_SERVICES[0];

  const handleToggleChannel = (channel: string) => {
    setBroadcastChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please provide a descriptive title for this service request.');
      return;
    }
    if (!justification.trim()) {
      setErrorMessage('Please state the purpose / operational justification.');
      return;
    }
    if (!adviserEndorsement) {
      setErrorMessage('Club requests must be endorsed by the designated Teacher Adviser.');
      return;
    }
    if (selectedServiceKey === 'email_account') {
      if (!normalizedAlias) {
        setErrorMessage('Please enter a valid desired email prefix / mailbox alias.');
        return;
      }
      const check = await checkSccMailboxAvailability(normalizedAlias);
      setAliasAvailability(check);
      if (!check.available) {
        setErrorMessage(formatEmailAlreadyRegisteredMessage(check.email, check.registeredTo));
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const request = await createSccRequest({
        organizationId: session.organizationId,
        organizationName: session.organizationName,
        organizationAcronym: session.organizationAcronym,
        requesterAccountId: session.userId,
        requesterName: session.fullName,
        requesterPosition: session.role === 'club_president' ? 'President' : 'Council Officer',
        serviceKey: selectedServiceKey,
        serviceTitle: currentService.title,
        title: title.trim(),
        justification: justification.trim(),
        priority,
        adviserEndorsement,
        details: {
          ...(selectedServiceKey === 'email_account'
            ? { requestedMailboxAlias: requestedAlias.trim() }
            : {}),
          ...(selectedServiceKey === 'cloud_storage' ? { storageCapacity } : {}),
          ...(selectedServiceKey === 'digital_id_pass'
            ? {
                eventTitle: eventTitle.trim(),
                eventDate,
                estimatedAttendees,
              }
            : {}),
          ...(selectedServiceKey === 'broadcast_notice'
            ? {
                broadcastHeadline: broadcastHeadline.trim(),
                broadcastChannels,
              }
            : {}),
          ...(selectedServiceKey === 'virtual_conferencing'
            ? {
                meetingPlatform,
                meetingDate,
              }
            : {}),
          ...(customNotes.trim() ? { customNotes: customNotes.trim() } : {}),
        },
      });

      onCreated(request);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit service request. Please try again.');
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
        aria-labelledby="scc-create-req-title"
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">
              {session.organizationName} ({session.organizationAcronym})
            </p>
            <h3 id="scc-create-req-title">Request School Digital Service</h3>
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
          {errorMessage ? (
            <div className="scc-alert scc-alert--danger" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {/* Service Picker */}
          <div className="scc-form-group">
            <span className="scc-label">Select Digital Service</span>
            <UsisSearchableSelect
              ariaLabel="Select Digital Service"
              forcePortalMenu
              value={selectedServiceKey}
              onChange={(val) => {
                const newKey = val as SccServiceKey;
                setSelectedServiceKey(newKey);
                const s = SCC_DIGITAL_SERVICES.find((it) => it.key === newKey);
                if (s && !title) {
                  setTitle(`Request for ${s.title} (${session.organizationAcronym})`);
                }
              }}
              options={SCC_DIGITAL_SERVICES.map((srv) => ({
                value: srv.key,
                label: `${srv.title} — SLA: ${srv.slaTurnaround}`,
              }))}
            />
          </div>

          {/* Service Info Banner */}
          <div className="scc-service-banner">
            <div className="scc-service-banner__icon">
              <span className="material-symbols-outlined">{currentService.icon}</span>
            </div>
            <div className="scc-service-banner__body">
              <span className="scc-service-banner__title">{currentService.title}</span>
              <p className="scc-service-banner__desc">{currentService.description}</p>
              <span className="scc-service-banner__sla">
                Estimated Turnaround: <strong>{currentService.slaTurnaround}</strong>
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="scc-form-group">
            <label className="scc-label" htmlFor="scc-req-title">
              Request Title / Purpose Summary *
            </label>
            <input
              id="scc-req-title"
              type="text"
              className="scc-input"
              required
              placeholder={`e.g. Official ${session.organizationAcronym} Google Workspace Mailbox 2026-2027`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Specific fields depending on service type */}
          {selectedServiceKey === 'email_account' ? (
            <div className="scc-card scc-card--light">
              <h4 className="scc-card-title">Email Configuration Details</h4>
              <div className="scc-form-grid">
                <div className="scc-form-group">
                  <label className="scc-label" htmlFor="scc-email-alias">
                    Desired Email Prefix / Mailbox Alias *
                  </label>
                  <div className="scc-input-group">
                    <input
                      id="scc-email-alias"
                      type="text"
                      className="scc-input"
                      value={requestedAlias}
                      onChange={(e) => setRequestedAlias(e.target.value)}
                    />
                    <span className="scc-input-addon">@leonnhs.edu.ph</span>
                  </div>
                  <span className="scc-helper">Standard club naming convention: [club]@leonnhs.edu.ph</span>
                  {isCheckingAlias ? (
                    <span className="scc-helper scc-helper--checking">
                      Checking email availability...
                    </span>
                  ) : aliasAvailability && !aliasAvailability.available ? (
                    <span className="scc-helper scc-helper--danger" role="alert">
                      {formatEmailAlreadyRegisteredMessage(
                        aliasAvailability.email,
                        aliasAvailability.registeredTo,
                      )}
                    </span>
                  ) : aliasAvailability?.available ? (
                    <span className="scc-helper scc-helper--success">
                      <strong>{aliasAvailability.email}</strong> is available.
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {selectedServiceKey === 'cloud_storage' ? (
            <div className="scc-card scc-card--light">
              <h4 className="scc-card-title">Shared Drive Tier</h4>
              <div className="scc-form-group">
                <span className="scc-label">Required Annual Archival Storage</span>
                <UsisSearchableSelect
                  ariaLabel="Required Annual Archival Storage"
                  forcePortalMenu
                  value={storageCapacity}
                  onChange={setStorageCapacity}
                  options={[
                    { value: '25GB', label: '25 GB (Standard Club Projects & Minutes)' },
                    { value: '50GB', label: '50 GB (High Resolution Media & Event Photo Archives)' },
                    { value: '100GB', label: '100 GB (Comprehensive Student Government & Council Archive)' },
                  ]}
                />
              </div>
            </div>
          ) : null}

          {selectedServiceKey === 'digital_id_pass' ? (
            <div className="scc-card scc-card--light">
              <h4 className="scc-card-title">Event & Activity Pass Details</h4>
              <div className="scc-form-grid">
                <div className="scc-form-group">
                  <label className="scc-label" htmlFor="scc-event-title">
                    Event / Assembly Title *
                  </label>
                  <input
                    id="scc-event-title"
                    type="text"
                    className="scc-input"
                    placeholder="e.g. Annual Club Leadership Induction"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                  />
                </div>
                <div className="scc-form-group">
                  <label className="scc-label" htmlFor="scc-event-date">
                    Event Date *
                  </label>
                  <input
                    id="scc-event-date"
                    type="date"
                    className="scc-input"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div className="scc-form-group">
                  <label className="scc-label" htmlFor="scc-attendees">
                    Estimated Participants *
                  </label>
                  <input
                    id="scc-attendees"
                    type="number"
                    min="10"
                    max="1500"
                    className="scc-input"
                    value={estimatedAttendees}
                    onChange={(e) => setEstimatedAttendees(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {selectedServiceKey === 'broadcast_notice' ? (
            <div className="scc-card scc-card--light">
              <h4 className="scc-card-title">Broadcast Broadcast Specs</h4>
              <div className="scc-form-group">
                <label className="scc-label" htmlFor="scc-broadcast-hl">
                  Official Announcement Headline *
                </label>
                <input
                  id="scc-broadcast-hl"
                  type="text"
                  className="scc-input"
                  placeholder="e.g. Call for General Membership Registration"
                  value={broadcastHeadline}
                  onChange={(e) => setBroadcastHeadline(e.target.value)}
                />
              </div>
              <div className="scc-form-group">
                <label className="scc-label">Distribution Channels</label>
                <div className="scc-checkbox-group">
                  {['Learner Portal Dashboard', 'USIS Mobile Feed', 'Campus Digital Bulletin'].map((ch) => (
                    <label key={ch} className="scc-checkbox-label">
                      <input
                        type="checkbox"
                        checked={broadcastChannels.includes(ch)}
                        onChange={() => handleToggleChannel(ch)}
                      />
                      <span>{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {selectedServiceKey === 'meeting_license' ? (
            <div className="scc-card scc-card--light">
              <h4 className="scc-card-title">Virtual Conference Specifications</h4>
              <div className="scc-form-grid">
                <div className="scc-form-group">
                  <span className="scc-label">Virtual Platform</span>
                  <UsisSearchableSelect
                    ariaLabel="Virtual Platform"
                    forcePortalMenu
                    value={meetingPlatform}
                    onChange={(val) => setMeetingPlatform(val as any)}
                    options={[
                      { value: 'Google Meet', label: 'Google Meet (Institutional Enterprise)' },
                      { value: 'Zoom', label: 'Zoom Pro (High Capacity)' },
                    ]}
                  />
                </div>
                <div className="scc-form-group">
                  <label className="scc-label" htmlFor="scc-meet-date">
                    Scheduled Date & Time
                  </label>
                  <input
                    id="scc-meet-date"
                    type="datetime-local"
                    className="scc-input"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Justification */}
          <div className="scc-form-group">
            <label className="scc-label" htmlFor="scc-justification">
              Operational Justification & Intended Use *
            </label>
            <textarea
              id="scc-justification"
              className="scc-textarea"
              rows={3}
              required
              placeholder="State the reason this digital service is required for organization activities and school operations..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>

          {/* Priority & Endorsement */}
          <div className="scc-form-grid">
            <div className="scc-form-group">
              <span className="scc-label">Urgency Level</span>
              <UsisSearchableSelect
                ariaLabel="Urgency Level"
                forcePortalMenu
                value={priority}
                onChange={(val) => setPriority(val as SccPriority)}
                options={[
                  { value: 'normal', label: 'Normal (Standard SLA)' },
                  { value: 'high', label: 'High (Upcoming School Activity)' },
                  { value: 'urgent', label: 'Urgent (Immediate DepEd Compliance / Division Activity)' },
                ]}
              />
            </div>

            <div className="scc-form-group">
              <label className="scc-label">Teacher Adviser Endorsement</label>
              <label className="scc-checkbox-label scc-endorsement-box">
                <input
                  type="checkbox"
                  checked={adviserEndorsement}
                  onChange={(e) => setAdviserEndorsement(e.target.checked)}
                />
                <span>
                  I certify that Teacher Adviser <strong>{liveAdviserName || session.adviserName}</strong> has duly endorsed this digital service request.
                </span>
              </label>
            </div>
            </div>
          </div>

          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="modal-dialog__blue"
              disabled={
                isSubmitting ||
                (selectedServiceKey === 'email_account' &&
                  (isCheckingAlias || !normalizedAlias || aliasAvailability?.available === false))
              }
            >
              {isSubmitting ? 'Submitting Request...' : 'Submit Service Request'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
