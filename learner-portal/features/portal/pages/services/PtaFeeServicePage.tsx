import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import { fetchLearnerPtaFeeSnapshot, type LearnerPtaFeeSnapshot } from '../../services/ptaFeeService';
import { fetchEnrollmentSnapshot } from '../../services/enrollmentHistoryService';
import { openSoaPrintWindow } from '../../../../../common/utils/statementOfAccountPrint';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';

type PtaFeeServicePageProps = {
  session: LearnerPortalAccessRecord;
};

const formatCurrency = (value: number) =>
  `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type ParticularRow = {
  fee: string;
  paid: number;
  balance: number;
};

const parseParticulars = (particulars: string): ParticularRow[] => {
  if (!particulars) return [];
  return particulars
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(.*?)\s*\(Paid:\s*([0-9,.]+)\s*,\s*Bal:\s*([0-9,.]+)\)/i);
      if (!match) {
        return { fee: entry, paid: 0, balance: 0 };
      }
      return {
        fee: match[1].trim(),
        paid: Number(String(match[2]).replace(/,/g, '')) || 0,
        balance: Number(String(match[3]).replace(/,/g, '')) || 0,
      };
    });
};

export function PtaFeeServicePage({ session }: PtaFeeServicePageProps) {
  const [snapshot, setSnapshot] = useState<LearnerPtaFeeSnapshot | null>(null);
  const [enrolledSchoolYears, setEnrolledSchoolYears] = useState<string[]>([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<LearnerPtaFeeSnapshot['transactions'][number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const enrollmentSnapshot = await fetchEnrollmentSnapshot({ learnerId: session.learnerId, lrn: session.lrn });
        if (cancelled) return;
        const years = Array.from(
          new Set(
            enrollmentSnapshot.history
              .map((entry) => String(entry.schoolYear || '').trim())
              .filter(Boolean)
          )
        ).sort((a, b) => b.localeCompare(a));
        setEnrolledSchoolYears(years);
        if (!selectedSchoolYear && years.length > 0) setSelectedSchoolYear(years[0]);
      } catch {
        if (!cancelled) setEnrolledSchoolYears([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchLearnerPtaFeeSnapshot({
          learnerId: session.learnerId,
          lrn: session.lrn,
          schoolYear: selectedSchoolYear || undefined,
        });
        if (!cancelled) setSnapshot(next);
      } catch (fetchError: any) {
        if (!cancelled) setError(fetchError?.message || 'Unable to load PTA fee records.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn, selectedSchoolYear]);

  const settledCount = useMemo(() => snapshot?.breakdown.filter((row) => row.balance <= 0).length || 0, [snapshot]);
  const paymentProgress = useMemo(() => {
    if (!snapshot || snapshot.totalAssessed <= 0) return 0;
    return Math.min(100, Math.round((snapshot.totalPaid / snapshot.totalAssessed) * 100));
  }, [snapshot]);
  const selectedParticularRows = useMemo(
    () => parseParticulars(selectedTransaction?.particulars || ''),
    [selectedTransaction]
  );

  const handlePrintSoa = () => {
    if (!snapshot) return;
    const feeRows = snapshot.breakdown.map((row) => ({
      name: row.name,
      assessed: row.amount,
      paid: row.paid,
      balance: row.balance,
    }));
    const paymentHistoryRows = snapshot.transactions.map((tx) => ({
      date: tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A',
      referenceNo: tx.referenceNo || '-',
      particulars: tx.particulars || '-',
      amount: tx.amount || 0,
    }));

    openSoaPrintWindow({
      learnerName: snapshot.learnerName || session.learnerName || 'N/A',
      lrn: snapshot.lrn || session.lrn || 'N/A',
      gradeSection: `${snapshot.gradeLevel || 'N/A'}${snapshot.sectionName ? ` - ${snapshot.sectionName}` : ''}`,
      parentOrGuardian: 'N/A',
      schoolName: 'LEON NATIONAL HIGH SCHOOL',
      schoolYear: snapshot.schoolYear || 'N/A',
      issuedBy: 'Learner Portal',
      feeRows,
      paymentHistoryRows,
      watermarkText: 'Learner Copy',
    });
  };

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>PTA Fee</h2>
          <p>Review your PTA transactions, fee breakdown, and remaining balances.</p>
        </header>
      </div>

      {isLoading ? <p className="learner-services-history__state">Loading PTA fee records.</p> : null}
      {error ? <p className="learner-services-history__state">{error}</p> : null}

      {!isLoading && !error && snapshot ? (
        <>
          <section className="learner-services-history pta-fee-summary" aria-label="PTA fee summary">
            <header className="learner-services-history__header pta-fee-summary__header">
              <div className="pta-fee-summary__title-block">
                <h3>PTA Financial Summary</h3>
                <p>
                  School Year: <strong>{snapshot.schoolYear || 'N/A'}</strong>
                </p>
              </div>
              <div className="pta-fee-summary__actions" role="group" aria-label="PTA summary actions">
                {enrolledSchoolYears.length > 0 ? (
                  <div className="pta-fee-summary__year-select">
                    <UsisSearchableSelect
                      allowTyping={false}
                      ariaLabel="Select enrolled school year"
                      floatingLabel
                      label="School Year"
                      value={selectedSchoolYear || snapshot.schoolYear || ''}
                      onChange={setSelectedSchoolYear}
                      options={enrolledSchoolYears.map((year) => ({ label: year, value: year }))}
                    />
                  </div>
                ) : null}
                <button type="button" className="pta-fee-details-btn pta-fee-details-btn--print" onClick={handlePrintSoa}>
                  Print Statement of Account
                </button>
              </div>
            </header>
            <article className="pta-fee-identity-card">
              <p>
                <span>Learner</span>
                <strong>{snapshot.learnerName || session.learnerName || 'N/A'}</strong>
              </p>
              <p>
                <span>LRN</span>
                <strong>{snapshot.lrn || session.lrn || 'N/A'}</strong>
              </p>
              <p>
                <span>Class Section</span>
                <strong>{snapshot.gradeLevel || 'N/A'} {snapshot.sectionName ? `- ${snapshot.sectionName}` : ''}</strong>
              </p>
              <p>
                <span>Program</span>
                <strong>{snapshot.strand || 'Regular'}</strong>
              </p>
            </article>
            <div className="pta-fee-kpis">
              <article className="pta-fee-kpi">
                <span>Total Assessed</span>
                <strong>{formatCurrency(snapshot.totalAssessed)}</strong>
              </article>
              <article className="pta-fee-kpi">
                <span>Total Paid</span>
                <strong>{formatCurrency(snapshot.totalPaid)}</strong>
              </article>
              <article className="pta-fee-kpi pta-fee-kpi--balance">
                <span>Outstanding Balance</span>
                <strong>{formatCurrency(snapshot.totalBalance)}</strong>
              </article>
              <article className="pta-fee-kpi">
                <span>Settled Fees</span>
                <strong>{settledCount} / {snapshot.breakdown.length}</strong>
              </article>
            </div>
            <div className="pta-fee-progress" aria-label="Payment progress">
              <div className="pta-fee-progress__label">
                <span>Payment Progress</span>
                <strong>{paymentProgress}%</strong>
              </div>
              <div className="pta-fee-progress__track">
                <span className="pta-fee-progress__fill" style={{ width: `${paymentProgress}%` }} />
              </div>
            </div>
          </section>

          <section className="learner-services-history pta-fee-table-wrap" aria-label="PTA fee breakdown">
            <header className="learner-services-history__header pta-fee-section-head">
              <div>
                <h3>Fee Breakdown</h3>
                <p>
                  Developmental fees are applied based on your grade/program (same computation as SPTA portal).
                </p>
              </div>
              <span className="pta-fee-section-badge">{snapshot.breakdown.length} Fee Items</span>
            </header>
            <div className="overflow-x-auto pta-fee-table-scroll">
              <table className="pta-fee-table pta-fee-table--ledger pta-fee-table--fees">
                <colgroup>
                  <col style={{ width: '46%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Fee</th>
                    <th>Assessed</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.breakdown.map((row) => (
                    <tr key={row.name}>
                      <td className="pta-fee-cell--name">
                        {row.name}
                        {row.isWaived ? <span className="pta-fee-chip pta-fee-chip--waived">Waived</span> : null}
                      </td>
                      <td className="pta-fee-cell--amount">{formatCurrency(row.amount)}</td>
                      <td className="pta-fee-cell--amount">{formatCurrency(row.paid)}</td>
                      <td className={`pta-fee-cell--amount pta-fee-cell--balance ${row.balance > 0 ? 'pta-fee-balance--pending' : 'pta-fee-balance--settled'}`}>
                        {formatCurrency(row.balance)}
                      </td>
                      <td className="pta-fee-cell--status">
                        <span className={`pta-fee-status-chip ${row.balance > 0 ? 'pta-fee-status-chip--pending' : 'pta-fee-status-chip--settled'}`}>
                          {row.balance > 0 ? 'Pending' : 'Settled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Totals</th>
                    <th>{formatCurrency(snapshot.totalAssessed)}</th>
                    <th>{formatCurrency(snapshot.totalPaid)}</th>
                    <th>{formatCurrency(snapshot.totalBalance)}</th>
                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="learner-services-history pta-fee-table-wrap" aria-label="PTA transaction history">
            <header className="learner-services-history__header pta-fee-section-head">
              <div>
                <h3>PTA Transaction History</h3>
                <p>Posted collection transactions linked to your learner account.</p>
              </div>
              <span className="pta-fee-section-badge">{snapshot.transactions.length} Posted Entries</span>
            </header>

            {snapshot.transactions.length === 0 ? (
              <p className="learner-services-history__state">No PTA transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto pta-fee-table-scroll">
                <table className="pta-fee-table pta-fee-table--ledger pta-fee-table--txn">
                  <colgroup>
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference No.</th>
                      <th>Amount</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}</td>
                        <td className="pta-fee-cell--ref">{tx.referenceNo || '-'}</td>
                        <td className="pta-fee-cell--amount">{formatCurrency(tx.amount)}</td>
                        <td className="pta-fee-cell--status">
                          <button type="button" className="pta-fee-details-btn" onClick={() => setSelectedTransaction(tx)}>
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {selectedTransaction
        ? createPortal(
            <div className="modal-overlay modal-overlay--high" role="presentation">
              <div className="modal-backdrop" onClick={() => setSelectedTransaction(null)} />
              <div className="modal-dialog modal-dialog--wide pta-payment-modal" role="dialog" aria-modal="true" aria-label="Payment Details">
                <div className="modal-dialog__header">
                  <div className="modal-dialog__title-group">
                    <p className="modal-dialog__eyebrow">PTA Transaction</p>
                    <h3>Payment Details</h3>
                  </div>
                  <button type="button" className="modal-dialog__close" onClick={() => setSelectedTransaction(null)} aria-label="Close details modal">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="modal-dialog__body">
                  <div className="pta-payment-modal__summary-grid">
                      <article className="pta-payment-modal__summary-card">
                        <span>Date</span>
                        <strong>{selectedTransaction.date ? new Date(selectedTransaction.date).toLocaleDateString() : 'N/A'}</strong>
                      </article>
                      <article className="pta-payment-modal__summary-card">
                        <span>Reference No.</span>
                        <strong>{selectedTransaction.referenceNo || '-'}</strong>
                      </article>
                      <article className="pta-payment-modal__summary-card">
                        <span>Amount</span>
                        <strong>{formatCurrency(selectedTransaction.amount)}</strong>
                      </article>
                  </div>

                  <div className="pta-payment-modal__particulars">
                    <h4>Particulars Breakdown</h4>
                    {selectedParticularRows.length === 0 ? (
                      <p className="learner-services-history__state">No particulars available for this transaction.</p>
                    ) : (
                      <div className="overflow-x-auto pta-fee-table-scroll">
                        <table className="pta-fee-table pta-fee-table--ledger pta-fee-table--particulars">
                          <colgroup>
                            <col style={{ width: '56%' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '22%' }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>Fee / Particular</th>
                              <th>Paid</th>
                              <th>Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedParticularRows.map((row, index) => (
                              <tr key={`${row.fee}-${index}`}>
                                <td>{row.fee}</td>
                                <td className="pta-fee-cell--amount">{formatCurrency(row.paid)}</td>
                                <td className={`pta-fee-cell--amount ${row.balance > 0 ? 'pta-fee-balance--pending' : 'pta-fee-balance--settled'}`}>
                                  {formatCurrency(row.balance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-dialog__actions">
                  <button type="button" className="modal-dialog__blue" onClick={() => setSelectedTransaction(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
