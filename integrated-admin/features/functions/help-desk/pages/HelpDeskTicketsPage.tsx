import { useEffect, useMemo, useState } from 'react';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import type { IntegratedAdminAccessRecord } from '../../../auth/services/integratedAdminAccess';
import { loadHelpDeskTickets, type HelpDeskTicketRecord, type HelpDeskTicketStatus } from '../services/helpDeskTicketsService';

type HelpDeskTicketsPageProps = {
  session: IntegratedAdminAccessRecord;
};

const STATUS_OPTIONS: Array<{ label: string; value: HelpDeskTicketStatus | 'all' }> = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Open', value: 'Open' },
  { label: 'In Review', value: 'In Review' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
];

const toStatusClass = (status: HelpDeskTicketStatus) => {
  if (status === 'Resolved') return 'success';
  if (status === 'In Review' || status === 'Closed') return 'warning';
  return 'open';
};

const formatDateTime = (value: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export function HelpDeskTicketsPage({ session }: HelpDeskTicketsPageProps) {
  const [tickets, setTickets] = useState<HelpDeskTicketRecord[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<HelpDeskTicketRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HelpDeskTicketStatus>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const nextTickets = await loadHelpDeskTickets();
        if (cancelled) return;
        setTickets(nextTickets);
        setSelectedTicket((current) => current || nextTickets[0] || null);
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || 'Unable to load help desk tickets.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      if (!matchesStatus) return false;
      if (!normalizedQuery) return true;
      return [
        ticket.referenceNo,
        ticket.learnerName,
        ticket.learnerLrn,
        ticket.category,
        ticket.subject,
        ticket.section,
        ticket.gradeLevel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [query, statusFilter, tickets]);

  const summary = useMemo(() => {
    const counts = tickets.reduce(
      (acc, ticket) => {
        acc.total += 1;
        acc[ticket.status] += 1;
        return acc;
      },
      { total: 0, Open: 0, 'In Review': 0, Resolved: 0, Closed: 0 } as Record<'total' | HelpDeskTicketStatus, number>,
    );
    return counts;
  }, [tickets]);

  useEffect(() => {
    if (filteredTickets.length === 0) {
      if (selectedTicket) setSelectedTicket(null);
      return;
    }
    if (!selectedTicket || !filteredTickets.some((ticket) => ticket.id === selectedTicket.id)) {
      setSelectedTicket(filteredTickets[0]);
    }
  }, [filteredTickets, selectedTicket]);

  return (
    <section className="section-shell integrated-admin-workspace">
      <article className="section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <p className="section-card__eyebrow">Help Desk</p>
          <h3>Help Desk Admin Queue</h3>
          <p>Only coordinators granted Help Admin access can view and manage this queue.</p>
          <p>Signed in as {session.coordinatorName}.</p>
        </div>
      </article>

      <div className="portal-panel" style={{ display: 'grid', gap: 16 }}>
        <div className="portal-panel__header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2>All Submitted Tickets</h2>
            <p>Browse every ticket submitted from the learner portal.</p>
          </div>
          <div style={{ display: 'grid', gap: 12, minWidth: 280, width: 'min(100%, 360px)' }}>
            <label className="floating-field">
              <div className="floating-field__control">
                <input
                  type="search"
                  placeholder=" "
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <span>Search reference, learner, or subject</span>
              </div>
            </label>
            <UsisSearchableSelect
              allowTyping={false}
              ariaLabel="Filter by ticket status"
              floatingLabel
              label="Ticket Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as 'all' | HelpDeskTicketStatus)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <article className="section-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <p className="section-card__eyebrow">Total</p>
              <h3>{summary.total}</h3>
            </div>
          </article>
          <article className="section-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <p className="section-card__eyebrow">Open</p>
              <h3>{summary.Open}</h3>
            </div>
          </article>
          <article className="section-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <p className="section-card__eyebrow">In Review</p>
              <h3>{summary['In Review']}</h3>
            </div>
          </article>
          <article className="section-card">
            <div className="section-card__bar" />
            <div className="section-card__content">
              <p className="section-card__eyebrow">Resolved</p>
              <h3>{summary.Resolved}</h3>
            </div>
          </article>
        </div>

        {isLoading ? <p className="registry-copy">Loading submitted tickets...</p> : null}
        {error ? <p className="registry-copy">{error}</p> : null}

        {!isLoading && !error ? (
          <>
            <div className="table-card">
              <table className="usis-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Learner</th>
                    <th>LRN</th>
                    <th>Category</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td><strong>{ticket.referenceNo}</strong></td>
                        <td>{ticket.learnerName || 'N/A'}</td>
                        <td>{ticket.learnerLrn || 'N/A'}</td>
                        <td>{ticket.category || 'N/A'}</td>
                        <td>{ticket.subject || 'N/A'}</td>
                        <td>
                          <span className={`status-badge status-badge--${toStatusClass(ticket.status)}`}>{ticket.status}</span>
                        </td>
                        <td>{formatDateTime(ticket.createdAt)}</td>
                        <td>
                          <button type="button" className="secondary-button" onClick={() => setSelectedTicket(ticket)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>No tickets match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <article className="portal-panel">
              <div className="portal-panel__header">
                <div>
                  <h2>Ticket Details</h2>
                  <p>Detailed record for the selected submission.</p>
                </div>
              </div>
              <div className="portal-panel__body" style={{ display: 'grid', gap: 12 }}>
                {selectedTicket ? (
                  <>
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                      <article className="section-card">
                        <div className="section-card__bar" />
                        <div className="section-card__content">
                          <p className="section-card__eyebrow">Reference</p>
                          <h3>{selectedTicket.referenceNo}</h3>
                          <p>{selectedTicket.status}</p>
                        </div>
                      </article>
                      <article className="section-card">
                        <div className="section-card__bar" />
                        <div className="section-card__content">
                          <p className="section-card__eyebrow">Learner</p>
                          <h3>{selectedTicket.learnerName || 'N/A'}</h3>
                          <p>{selectedTicket.learnerLrn || 'N/A'}</p>
                        </div>
                      </article>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <p><strong>Grade / Section:</strong> {selectedTicket.gradeLevel || 'N/A'} {selectedTicket.section ? `- ${selectedTicket.section}` : ''}</p>
                      <p><strong>Category:</strong> {selectedTicket.category || 'N/A'}</p>
                      <p><strong>Subject:</strong> {selectedTicket.subject || 'N/A'}</p>
                      <p><strong>Contact No.:</strong> {selectedTicket.contactNo || 'N/A'}</p>
                      <p><strong>Submitted:</strong> {formatDateTime(selectedTicket.createdAt)}</p>
                      <p><strong>Last Updated:</strong> {formatDateTime(selectedTicket.updatedAt)}</p>
                      <p><strong>Assigned Coordinator:</strong> {selectedTicket.assignedCoordinatorId || 'Not assigned'}</p>
                      <p><strong>Admin Notes:</strong> {selectedTicket.adminNotes || 'None'}</p>
                      <p style={{ whiteSpace: 'pre-wrap' }}><strong>Details:</strong> {selectedTicket.details || 'N/A'}</p>
                    </div>
                  </>
                ) : (
                  <p className="registry-copy">Select a ticket to inspect the submission details.</p>
                )}
              </div>
            </article>
          </>
        ) : null}
      </div>
    </section>
  );
}
