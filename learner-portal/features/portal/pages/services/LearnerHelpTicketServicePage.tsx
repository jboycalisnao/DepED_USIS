import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import { fetchLearnerProfile } from '../../services/learnerProfile';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import {
  addLearnerHelpTicket,
  getLearnerHelpTicketStatusTone,
  loadLearnerHelpTickets,
  type LearnerHelpTicketDraft,
  type LearnerHelpTicketRecord,
} from '../../services/learnerHelpTicketService';
import { LearnerHelpTicketSuccessModal } from './components/LearnerHelpTicketSuccessModal';

const concernCategories = [
  'Merch/ Uniform Refund',
  'School Information',
  'Records Assistance',
  'Enrollment Follow-up',
  'Learner Support',
  'Technical Help',
  'Other Concern',
];

const initialDraft: LearnerHelpTicketDraft = {
  category: '',
  contactNo: '',
  details: '',
  gradeLevel: '',
  learnerId: '',
  learnerLrn: '',
  learnerName: '',
  section: '',
  subject: '',
};

const toDisplayName = (firstName: string, middleName: string, lastName: string) =>
  [firstName, middleName ? `${middleName.charAt(0).toUpperCase()}.` : '', lastName].filter(Boolean).join(' ').trim();

const toStatusTone = (status: LearnerHelpTicketRecord['status']) => {
  if (status === 'Resolved') return 'success';
  if (status === 'In Review') return 'warning';
  if (status === 'Closed') return 'closed';
  return 'open';
};

const formatTicketDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const buildMainInfoCorrectionDetails = (input: { fullName: string; lrn: string; birthDate: string }) => {
  return [
    'Please correct my main learner information in the registrar record.',
    '',
    `Learner Name: ${input.fullName || 'N/A'}`,
    `LRN: ${input.lrn || 'N/A'}`,
    `Birth Date: ${input.birthDate || 'N/A'}`,
    '',
    'Requested correction: Please review and update the record only through registrar verification.',
  ].join('\n');
};

export function LearnerHelpTicketServicePage({ session }: { session: LearnerPortalAccessRecord }) {
  const location = useLocation();
  const isMainInfoCorrectionRequest = new URLSearchParams(location.search).get('reason') === 'main-info-correction';
  const [draft, setDraft] = useState<LearnerHelpTicketDraft>(initialDraft);
  const [learnerFieldsLocked, setLearnerFieldsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<LearnerHelpTicketRecord | null>(null);
  const [successTicket, setSuccessTicket] = useState<LearnerHelpTicketRecord | null>(null);
  const [tickets, setTickets] = useState<LearnerHelpTicketRecord[]>([]);
  const [error, setError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoadingProfile(true);
      try {
        const profile = await fetchLearnerProfile({ learnerId: session.learnerId, lrn: session.lrn });
        if (cancelled) return;
        const nextDraft: LearnerHelpTicketDraft = {
          category: '',
          contactNo: profile.contactNumber || '',
          details: '',
          gradeLevel: profile.gradeLevel || '',
          learnerId: profile.id || session.learnerId,
          learnerLrn: profile.lrn || session.lrn,
          learnerName: toDisplayName(profile.firstName, profile.middleName, profile.lastName) || session.learnerName,
          section: profile.sectionName || '',
          subject: '',
        };
        if (isMainInfoCorrectionRequest) {
          nextDraft.category = 'Records Assistance';
          nextDraft.subject = 'Main information correction request';
          nextDraft.details = buildMainInfoCorrectionDetails({
            birthDate: profile.birthDate || '',
            fullName: toDisplayName(profile.firstName, profile.middleName, profile.lastName) || session.learnerName,
            lrn: profile.lrn || session.lrn,
          });
        }
        setDraft(nextDraft);
        setLearnerFieldsLocked(true);
        setError('');
      } catch {
        if (cancelled) return;
        setDraft({
          ...initialDraft,
          learnerId: session.learnerId,
          learnerLrn: session.lrn,
          learnerName: session.learnerName,
          category: isMainInfoCorrectionRequest ? 'Records Assistance' : '',
          subject: isMainInfoCorrectionRequest ? 'Main information correction request' : '',
          details: isMainInfoCorrectionRequest
            ? buildMainInfoCorrectionDetails({
                birthDate: '',
                fullName: session.learnerName,
                lrn: session.lrn,
              })
            : '',
        });
        setLearnerFieldsLocked(false);
        setError('Learner profile details could not be loaded right now. You can still complete the ticket manually.');
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isMainInfoCorrectionRequest, session.learnerId, session.learnerName, session.lrn]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoadingTickets(true);
      try {
        const nextTickets = await loadLearnerHelpTickets({ learnerId: session.learnerId, learnerLrn: session.lrn });
        if (!cancelled) {
          setTickets(nextTickets);
        }
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || 'Unable to load submitted help tickets.');
        }
      } finally {
        if (!cancelled) setIsLoadingTickets(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn]);

  const recentTickets = useMemo(() => tickets.slice(0, 4), [tickets]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const nextTicket = await addLearnerHelpTicket(draft);
      setNotice(nextTicket);
      setSuccessTicket(nextTicket);
      setTickets((current) => [nextTicket, ...current]);
      setDraft((current) => ({
        ...current,
        category: '',
        details: '',
        subject: '',
        contactNo: current.contactNo,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Help Ticket</h2>
          <p>Submit a learner help request using your verified school portal profile.</p>
        </header>
      </div>

      <div className="learner-help-ticket-page__grid">
        <article className="portal-panel learner-help-ticket-page__panel">
          <header className="portal-panel__header learner-tab-header">
            <h2>Submit Ticket</h2>
            <p>Your name, grade level, and section are loaded from the registrar record when available.</p>
        </header>
        <div className="portal-panel__body learner-help-ticket-page__body">
          {isMainInfoCorrectionRequest ? (
            <div className="notice-box learner-hint__box">
              <strong>Main Information Correction</strong>
              <span>This ticket is prefilled for name, LRN, or birth date corrections.</span>
            </div>
          ) : null}
          {isLoadingProfile ? <p className="learner-services-history__state">Loading learner details...</p> : null}
          {isLoadingTickets ? <p className="learner-services-history__state">Loading submitted tickets...</p> : null}
          {error ? <div className="notice-box"><strong>Profile Notice</strong><span>{error}</span></div> : null}
          {notice ? (
            <div className="notice-box">
              <strong>Ticket Submitted</strong>
              <span>Reference No. {notice.referenceNo}. Keep this number for follow-up.</span>
              </div>
            ) : null}

            <form className="learner-help-ticket-page__form" onSubmit={handleSubmit}>
              <div className="floating-field-grid floating-field-grid--two">
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={draft.learnerLrn} disabled readOnly placeholder=" " required />
                    <span>Learner LRN</span>
                  </div>
                </label>
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={draft.learnerName} disabled={learnerFieldsLocked} readOnly placeholder=" " required />
                    <span>Learner Name</span>
                  </div>
                </label>
              </div>

              <div className="floating-field-grid floating-field-grid--two">
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={draft.gradeLevel} disabled={learnerFieldsLocked} readOnly placeholder=" " />
                    <span>Grade Level</span>
                  </div>
                </label>
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={draft.section} disabled={learnerFieldsLocked} readOnly placeholder=" " />
                    <span>Section</span>
                  </div>
                </label>
              </div>

              <UsisSearchableSelect
                ariaLabel="Concern Category"
                label="Concern Category"
                floatingLabel
                showLabel={false}
                required
                value={draft.category}
                onChange={(value) => setDraft((current) => ({ ...current, category: value }))}
                options={concernCategories.map((category) => ({ label: category, value: category }))}
              />

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.subject}
                    onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
                    placeholder=" "
                    required
                  />
                  <span>Subject</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <textarea
                    value={draft.details}
                    onChange={(event) => setDraft((current) => ({ ...current, details: event.target.value }))}
                    placeholder=" "
                    rows={4}
                    required
                  />
                  <span>Ticket Details</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={draft.contactNo}
                    onChange={(event) => setDraft((current) => ({ ...current, contactNo: event.target.value }))}
                    placeholder=" "
                  />
                  <span>Contact Number</span>
                </div>
              </label>

              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={isSubmitting || isLoadingProfile}>
                  {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </article>

        <aside className="portal-panel learner-help-ticket-page__panel">
          <header className="portal-panel__header learner-tab-header">
            <h2>Recent Tickets</h2>
            <p>Keep track of the latest requests filed from this browser.</p>
          </header>
          <div className="portal-panel__body learner-help-ticket-page__tickets">
            {recentTickets.length === 0 ? (
              <p className="learner-services-history__state">No tickets filed yet.</p>
            ) : (
              recentTickets.map((ticket) => (
                <article key={ticket.id} className="learner-help-ticket-card">
                  <div className="learner-help-ticket-card__top">
                    <div className="learner-help-ticket-card__heading">
                      <strong>{ticket.referenceNo}</strong>
                      <span>{ticket.subject || 'Ticket update'}</span>
                    </div>
                    <span className={`status-badge status-badge--${toStatusTone(ticket.status)}`}>
                      {getLearnerHelpTicketStatusTone(ticket.status)}
                    </span>
                  </div>

                  <div className="learner-help-ticket-card__meta">
                    <span>
                      Category
                      <strong>{ticket.category || '-'}</strong>
                    </span>
                    <span>
                      Submitted
                      <strong>{formatTicketDate(ticket.createdAt)}</strong>
                    </span>
                    <span>
                      Last Update
                      <strong>{formatTicketDate(ticket.updatedAt || ticket.resolvedAt || ticket.createdAt)}</strong>
                    </span>
                  </div>

                  <div className="learner-help-ticket-card__body">
                    <p>
                      <strong>What is happening:</strong>{' '}
                      {ticket.status === 'Open'
                        ? 'Your request is waiting for review.'
                        : ticket.status === 'In Review'
                          ? 'The help desk is currently reviewing your request.'
                          : ticket.status === 'Resolved'
                            ? 'The help desk marked this request as resolved.'
                            : 'The request is closed.'}
                    </p>
                    {ticket.adminNotes ? (
                      <p>
                        <strong>Admin note:</strong> {ticket.adminNotes}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>

      <LearnerHelpTicketSuccessModal
        open={Boolean(successTicket)}
        referenceNo={successTicket?.referenceNo || ''}
        onClose={() => setSuccessTicket(null)}
      />
    </section>
  );
}
