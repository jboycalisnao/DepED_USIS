import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import {
  clearHelpPortalAdminSession,
  finalizeHelpPortalAdminLogin,
  getStoredHelpPortalAdminSession,
  resolveHelpPortalAdminAccess,
  storeHelpPortalAdminSession,
  type HelpPortalAdminSession,
} from '../services/adminAccess';
import { TicketActionModal } from '../components/TicketActionModal';
import {
  deleteHelpTicket,
  loadHelpTickets,
  type HelpTicketRecord,
  type HelpTicketStatus,
  updateHelpTicket,
} from '../../tickets/services/ticketStore';

const toStatusBadgeClass = (status: HelpTicketRecord['status']) => {
  if (status === 'Resolved') return 'success';
  if (status === 'In Review') return 'warning';
  if (status === 'Closed') return 'closed';
  return 'open';
};

const formatDayKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDayLabel = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown day';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTicketTime = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const buildCategoryCounts = (tickets: HelpTicketRecord[]) => {
  return tickets.reduce<Record<string, number>>((counts, ticket) => {
    const key = ticket.category || 'Uncategorized';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
};

const buildStatusCounts = (tickets: HelpTicketRecord[]) => {
  return tickets.reduce<Record<HelpTicketRecord['status'], number>>(
    (counts, ticket) => {
      counts[ticket.status] += 1;
      return counts;
    },
    { Open: 0, 'In Review': 0, Resolved: 0, Closed: 0 },
  );
};

export function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<HelpPortalAdminSession | null>(() => getStoredHelpPortalAdminSession());
  const [records, setRecords] = useState<HelpTicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(getStoredHelpPortalAdminSession()));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | HelpTicketRecord['status']>('All');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [expandedDayKeys, setExpandedDayKeys] = useState<string[]>([]);
  const [ticketStatus, setTicketStatus] = useState<HelpTicketStatus>('Open');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const statusOptions = useMemo(
    () => [
      { label: 'All Status', value: 'All' },
      { label: 'Open', value: 'Open' },
      { label: 'In Review', value: 'In Review' },
      { label: 'Resolved', value: 'Resolved' },
      { label: 'Closed', value: 'Closed' },
    ],
    [],
  );

  const syncTickets = async (forceRefresh: boolean, isActive?: () => boolean) => {
    setIsLoading(true);
    try {
      const nextTickets = await loadHelpTickets({ forceRefresh });
      if (isActive && !isActive()) return;
      setRecords(nextTickets);
      setError('');
    } catch (loadError) {
      if (isActive && !isActive()) return;
      setError(loadError instanceof Error ? loadError.message : 'Unable to load submitted tickets.');
    } finally {
      if (isActive && !isActive()) return;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    void syncTickets(false, () => isMounted);
    const interval = window.setInterval(() => {
      void syncTickets(true, () => isMounted);
    }, 1800000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [session]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          record.referenceNo,
          record.learnerLrn,
          record.learnerName,
          record.category,
          record.subject,
          record.details,
          record.gradeLevel,
          record.section,
          record.contactNo,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [query, records, statusFilter]);

  useEffect(() => {
    if (!filteredRecords.length) {
      setSelectedTicketId(null);
      setIsTicketModalOpen(false);
      setIsSaveConfirmOpen(false);
      setIsDeleteConfirmOpen(false);
      return;
    }

    if (!selectedTicketId || !filteredRecords.some((record) => record.id === selectedTicketId)) {
      setSelectedTicketId(filteredRecords[0].id);
    }
  }, [filteredRecords, selectedTicketId]);

  const selectedTicket = filteredRecords.find((record) => record.id === selectedTicketId) ?? filteredRecords[0] ?? null;

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, HelpTicketRecord[]>();
    filteredRecords.forEach((record) => {
      const dayKey = formatDayKey(record.createdAt) || 'unknown-day';
      const list = groups.get(dayKey);
      if (list) {
        list.push(record);
      } else {
        groups.set(dayKey, [record]);
      }
    });

    return Array.from(groups.entries()).map(([dayKey, tickets]) => ({
      dayKey,
      categoryCounts: buildCategoryCounts(tickets),
      statusCounts: buildStatusCounts(tickets),
      tickets,
    }));
  }, [filteredRecords]);

  useEffect(() => {
    if (!selectedTicket) return;
    setTicketStatus(selectedTicket.status);
    setAdminNotes(selectedTicket.adminNotes || '');
  }, [selectedTicket?.adminNotes, selectedTicket?.id, selectedTicket?.status]);

  useEffect(() => {
    if (!filteredRecords.length) {
      setExpandedDayKeys([]);
      return;
    }

    const nextToday = formatDayKey(new Date());
    setExpandedDayKeys((current) => Array.from(new Set([nextToday, ...current])));
  }, [filteredRecords]);

  const openCount = records.filter((record) => record.status === 'Open').length;
  const reviewCount = records.filter((record) => record.status === 'In Review').length;
  const resolvedCount = records.filter((record) => record.status === 'Resolved').length;
  const closedCount = records.filter((record) => record.status === 'Closed').length;
  const actionOptions = useMemo(
    () => [
      { label: 'Open', value: 'Open' },
      { label: 'In Review', value: 'In Review' },
      { label: 'Resolved', value: 'Resolved' },
      { label: 'Closed', value: 'Closed' },
    ],
    [],
  );

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await resolveHelpPortalAdminAccess(username, password);
      if (result.error || !result.session) {
        setError(result.error || 'Unable to continue to the admin workspace.');
        return;
      }

      try {
        await finalizeHelpPortalAdminLogin(result.session);
      } catch {
        // Non-blocking fallback if write access is limited.
      }

      const nextSession = {
        ...result.session,
        lastLoginAt: new Date().toISOString(),
      };
      setError('');
      storeHelpPortalAdminSession(nextSession);
      setSession(nextSession);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearHelpPortalAdminSession();
    setSession(null);
    setRecords([]);
    setPassword('');
    setError('');
    setIsTicketModalOpen(false);
    setIsSaveConfirmOpen(false);
    setIsDeleteConfirmOpen(false);
  };

  const handleRefreshTickets = async () => {
    await syncTickets(true);
  };

  const handleSaveTicket = async () => {
    if (!session || !selectedTicket) return;
    setIsSavingTicket(true);
    setIsSaveConfirmOpen(false);
    setError('');
    try {
      const updatedTicket = await updateHelpTicket(selectedTicket.id, {
        adminNotes,
        assignedCoordinatorId: session.accountId,
        status: ticketStatus,
      });
      setRecords((current) => [updatedTicket, ...current.filter((ticket) => ticket.id !== updatedTicket.id)]);
      setSelectedTicketId(updatedTicket.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save ticket changes.');
    } finally {
      setIsSavingTicket(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    setIsSavingTicket(true);
    setIsDeleteConfirmOpen(false);
    setError('');
    try {
      await deleteHelpTicket(selectedTicket);
      setRecords((current) => current.filter((ticket) => ticket.id !== selectedTicket.id));
      setSelectedTicketId(null);
      setIsTicketModalOpen(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete ticket.');
    } finally {
      setIsSavingTicket(false);
    }
  };

  const saveSummary = selectedTicket
    ? `Save the status update for ${selectedTicket.referenceNo} as ${ticketStatus}${adminNotes.trim() ? ' with admin notes.' : '.'}`
    : '';

  const deleteSummary = selectedTicket
    ? `Delete ticket ${selectedTicket.referenceNo}? This will remove it from the help portal queue and local cache.`
    : '';

  const toggleDay = (dayKey: string) => {
    setExpandedDayKeys((current) =>
      current.includes(dayKey) ? current.filter((value) => value !== dayKey) : [...current, dayKey],
    );
  };

  return (
    <section className="section-shell">
      {!session ? (
        <UsisLoginModal
          moduleKey="school_help_portal"
          title="School Help Portal Admin"
          username={username}
          password={password}
          isSubmitting={isSubmitting}
          submitLabel="Login"
          noticeTitle="Admin Access"
          noticeMessage={error || null}
          helperContent={<p>Use an active USIS core coordinator account to access the school help desk ticket queue.</p>}
          onDismissNotice={() => setError('')}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onSubmit={handleLogin}
        />
      ) : (
        <div className="school-help-portal-admin-shell">
          <div className="page-intro">
            <p className="page-intro__eyebrow">Admin Workspace</p>
            <h1>Submitted Ticket Queue</h1>
            <p>
              Signed in as {session.coordinatorName}. This page shows all submitted learner help tickets captured through the portal.
            </p>
            <div className="school-help-portal-actions school-help-portal-actions--start">
              <button type="button" className="secondary-button" onClick={() => void handleRefreshTickets()} disabled={isLoading}>
                {isLoading ? 'Refreshing...' : 'Refresh Tickets'}
              </button>
              <button type="button" className="secondary-button" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>

          {error ? (
            <div className="notice-box">
              <strong>Admin Access</strong>
              <span>{error}</span>
            </div>
          ) : null}

          {isLoading ? (
            <article className="section-card">
              <div className="section-card__bar" />
              <div className="section-card__content">
                <p>Loading submitted tickets...</p>
              </div>
            </article>
          ) : (
            <div className="school-help-portal-admin-view">
              <div className="school-help-portal-summary-grid">
                <article className="section-card">
                  <div className="section-card__bar" />
                  <div className="section-card__content">
                    <p className="page-intro__eyebrow">Total Tickets</p>
                    <strong className="school-help-portal-summary-value">{records.length}</strong>
                  </div>
                </article>
                <article className="section-card">
                  <div className="section-card__bar" />
                  <div className="section-card__content">
                    <p className="page-intro__eyebrow">Open</p>
                    <strong className="school-help-portal-summary-value">{openCount}</strong>
                  </div>
                </article>
                <article className="section-card">
                  <div className="section-card__bar" />
                  <div className="section-card__content">
                    <p className="page-intro__eyebrow">In Review</p>
                    <strong className="school-help-portal-summary-value">{reviewCount}</strong>
                  </div>
                </article>
                <article className="section-card">
                  <div className="section-card__bar" />
                  <div className="section-card__content">
                    <p className="page-intro__eyebrow">Resolved</p>
                    <strong className="school-help-portal-summary-value">{resolvedCount}</strong>
                  </div>
                </article>
                <article className="section-card">
                  <div className="section-card__bar" />
                  <div className="section-card__content">
                    <p className="page-intro__eyebrow">Closed</p>
                    <strong className="school-help-portal-summary-value">{closedCount}</strong>
                  </div>
                </article>
              </div>

              <div className="floating-field-grid floating-field-grid--two school-help-portal-filters">
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder=" " />
                    <span>Search tickets</span>
                  </div>
                </label>

                <UsisSearchableSelect
                  ariaLabel="Ticket Status"
                  label="Ticket Status"
                  floatingLabel
                  showLabel={false}
                  allowTyping
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                  options={statusOptions}
                />
              </div>

              {filteredRecords.length === 0 ? (
                <div className="notice-box">
                  <strong>No Tickets</strong>
                  <span>No submitted tickets matched the current search and filter.</span>
                </div>
              ) : (
                <div className="school-help-portal-admin-workspace school-help-portal-admin-workspace--grouped">
                  {groupedRecords.map(({ dayKey, tickets, categoryCounts, statusCounts }) => {
                    const isExpanded = expandedDayKeys.includes(dayKey);
                    return (
                      <section key={dayKey} className="school-help-portal-day-group section-card">
                        <div className="section-card__bar" />
                        <div className="section-card__content school-help-portal-day-group__content">
                          <button
                            type="button"
                            className="school-help-portal-day-group__header"
                            onClick={() => toggleDay(dayKey)}
                            aria-expanded={isExpanded}
                          >
                            <div className="school-help-portal-day-group__title">
                              <p className="section-card__eyebrow">Submitted on</p>
                              <h3>{dayKey === 'unknown-day' ? 'Unknown Day' : formatDayLabel(tickets[0]?.createdAt || '')}</h3>
                              <span>{tickets.length} ticket{tickets.length === 1 ? '' : 's'}</span>
                            </div>
                            <div className="school-help-portal-day-group__chevron">{isExpanded ? '-' : '+'}</div>
                          </button>

                          <div className="school-help-portal-day-group__tags">
                            {Object.entries(categoryCounts).map(([category, count]) => (
                              <span key={`${dayKey}-${category}`} className="school-help-portal-day-group__tag">
                                {category}: {count}
                              </span>
                            ))}
                          </div>

                          <div className="school-help-portal-day-group__tags school-help-portal-day-group__tags--status">
                            <span className="school-help-portal-day-group__tag school-help-portal-day-group__tag--open">
                              Open: {statusCounts.Open}
                            </span>
                            <span className="school-help-portal-day-group__tag school-help-portal-day-group__tag--review">
                              In Review: {statusCounts['In Review']}
                            </span>
                            <span className="school-help-portal-day-group__tag school-help-portal-day-group__tag--resolved">
                              Resolved: {statusCounts.Resolved}
                            </span>
                            <span className="school-help-portal-day-group__tag school-help-portal-day-group__tag--closed">
                              Closed: {statusCounts.Closed}
                            </span>
                          </div>

                          {isExpanded ? (
                            <div className="school-help-portal-day-group__list">
                              {tickets.map((record) => (
                                <button
                                  key={record.id}
                                  type="button"
                                  className={`school-help-portal-ticket-row ${record.id === selectedTicket?.id ? 'school-help-portal-ticket-row--active' : ''}`}
                                  onClick={() => {
                                    setSelectedTicketId(record.id);
                                    setIsTicketModalOpen(true);
                                  }}
                                >
                                  <div className="school-help-portal-ticket-row__bar" />
                                  <div className="school-help-portal-ticket-row__body">
                                    <div className="school-help-portal-ticket-row__main">
                                      <strong>{record.referenceNo}</strong>
                                      <span className={`status-badge status-badge--${toStatusBadgeClass(record.status)}`}>{record.status}</span>
                                    </div>
                                    <div className="school-help-portal-ticket-row__meta">
                                      <span>
                                        Learner
                                        <strong>{record.learnerName || '-'}</strong>
                                      </span>
                                      <span>
                                        Concern
                                        <strong>{record.category || '-'}</strong>
                                      </span>
                                      <span>
                                        Submitted
                                        <strong>{formatTicketTime(record.createdAt)}</strong>
                                      </span>
                                    </div>
                                    <div className="school-help-portal-ticket-row__subject">
                                      {record.subject || 'No subject provided'}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedTicket && isTicketModalOpen ? (
            <TicketActionModal
              adminNotes={adminNotes}
              isSaving={isSavingTicket}
              onAdminNotesChange={setAdminNotes}
              onClose={() => setIsTicketModalOpen(false)}
              onResetStatus={() => setTicketStatus(selectedTicket.status)}
              onRequestDelete={() => setIsDeleteConfirmOpen(true)}
              onRequestSave={() => setIsSaveConfirmOpen(true)}
              onTicketStatusChange={setTicketStatus}
              statusOptions={actionOptions}
              ticket={selectedTicket}
              ticketStatus={ticketStatus}
            />
          ) : null}

          <UsisAlertModal
            open={Boolean(selectedTicket && isSaveConfirmOpen)}
            title="Confirm Ticket Action"
            message={saveSummary}
            tone="warning"
            confirmLabel="Save"
            cancelLabel="Keep Editing"
            onClose={() => setIsSaveConfirmOpen(false)}
            onConfirm={() => void handleSaveTicket()}
          />

          <UsisAlertModal
            open={Boolean(selectedTicket && isDeleteConfirmOpen)}
            title="Delete Ticket"
            message={deleteSummary}
            tone="danger"
            confirmLabel="Delete"
            cancelLabel="Keep Ticket"
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={() => void handleDeleteTicket()}
          />
        </div>
      )}
    </section>
  );
}
