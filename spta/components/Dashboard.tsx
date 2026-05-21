import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FinancialTransaction, TransactionType, Activity, Learner, Section, SystemConfig, GradeLevel, User } from '../types';
import { FinanceCollection } from './FinanceCollection';

interface DashboardProps {
  currentUser?: User | null;
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  projects: Activity[];
  learners: Learner[];
  sections: Section[];
  config: SystemConfig;
  lastFetchTime?: number;
}

type ParticularBreakdownRow = {
  fee: string;
  paid: number;
  balance: number;
};

const parseParticulars = (particulars: string): ParticularBreakdownRow[] => {
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

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, transactions, setTransactions, projects, learners, sections, config, lastFetchTime }) => {
  const [isCollectionWindowOpen, setIsCollectionWindowOpen] = useState(false);
  const [detailsTx, setDetailsTx] = useState<FinancialTransaction | null>(null);
  const learnersCount = learners.length;

  const totalCollections = transactions
    .filter(t => t.type === TransactionType.COLLECTION && t.status === 'Posted')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === TransactionType.EXPENSE && t.status === 'Posted')
    .reduce((sum, t) => sum + t.amount, 0);

  const cashOnHand = totalCollections - totalExpenses;

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions]);
  const detailsRows = useMemo(() => parseParticulars(detailsTx?.particulars || ''), [detailsTx]);

  const collectionRate = totalCollections + totalExpenses > 0
    ? (totalCollections / (totalCollections + totalExpenses)) * 100
    : 0;

  const activeProjects = projects.filter(p => p.status === 'Ongoing').length;

  useEffect(() => {
    if (!isCollectionWindowOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCollectionWindowOpen]);

  const handlePrintCollectionReport = () => {
    const gradeOrder = Object.values(GradeLevel);

    const calculateAssessment = (section: Section) => {
      const isSHS = section.gradeLevel === GradeLevel.GRADE_11 || section.gradeLevel === GradeLevel.GRADE_12;
      const isSpecial = !isSHS && (section.strand === 'STE' || section.strand === 'SPA');

      return (config.feeSchedule || []).reduce((sum, fee) => {
        if (fee.type === 'Base') return sum + fee.amount;
        if (fee.type === 'SHS_Only' && isSHS) return sum + fee.amount;
        if (fee.type === 'STE_SPA_Only' && isSpecial) return sum + fee.amount;
        return sum;
      }, 0);
    };

    const sectionStats = sections.map(sec => {
      const assessment = calculateAssessment(sec);
      const sectionLearners = learners.filter(l => l.sectionId === sec.id);

      let totalCollected = 0;
      let fullyPaidCount = 0;

      sectionLearners.forEach(l => {
        const paid = transactions
          .filter(t => t.learnerId === l.id && t.type === TransactionType.COLLECTION && t.status === 'Posted')
          .reduce((sum, t) => sum + t.amount, 0);

        totalCollected += paid;
        if (assessment > 0 && paid >= assessment - 5) fullyPaidCount++;
      });

      const totalExpected = sectionLearners.length * assessment;

      return {
        ...sec,
        studentCount: sectionLearners.length,
        totalExpected,
        totalCollected,
        fullyPaidCount
      };
    });

    const grouped = gradeOrder.map(grade => {
      const secs = sectionStats.filter(s => s.gradeLevel === grade);
      if (secs.length === 0) return null;

      return {
        grade,
        sections: secs.sort((a, b) => a.name.localeCompare(b.name)),
        totalStudents: secs.reduce((s, x) => s + x.studentCount, 0),
        totalExpected: secs.reduce((s, x) => s + x.totalExpected, 0),
        totalCollected: secs.reduce((s, x) => s + x.totalCollected, 0),
        totalFullyPaid: secs.reduce((s, x) => s + x.fullyPaidCount, 0)
      };
    }).filter(Boolean);

    const printWindow = window.open('', '', 'height=900,width=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>Collection Status Report</title>
      <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          h1 { font-size: 18px; text-transform: uppercase; margin: 0; }
          h2 { font-size: 14px; margin: 5px 0; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
          th, td { border: 1px solid #ccc; padding: 6px 4px; }
          th { background-color: #f0f0f0; text-transform: uppercase; font-weight: bold; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .grade-header { background-color: #e0e0e0; font-weight: bold; text-transform: uppercase; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          @media print { @page { size: A4 portrait; margin: 0.5in; } }
      </style>
      </head><body>
          <div class="header">
              ${config.logoUrl ? `<img src="${config.logoUrl}" style="height: 50px; margin-bottom: 5px;" />` : ''}
              <h1>${config.schoolName}</h1>
              <h2>Collection Status Report per Grade Level</h2>
              <div style="font-size:10px; margin-top:5px;">As of ${new Date().toLocaleDateString()}</div>
          </div>
          <table>
              <thead>
                  <tr>
                      <th>Grade / Section</th>
                      <th>Adviser</th>
                      <th class="text-center">Learners</th>
                      <th class="text-right">Expected</th>
                      <th class="text-right">Collected</th>
                      <th class="text-center">% Collection</th>
                      <th class="text-center">Paid Learners</th>
                      <th class="text-center">% Paid</th>
                  </tr>
              </thead>
              <tbody>
    `);

    let grandStudents = 0;
    let grandExpected = 0;
    let grandCollected = 0;
    let grandFullyPaid = 0;

    grouped.forEach((g: any) => {
      printWindow.document.write(`<tr class="grade-header"><td colspan="8">${g.grade}</td></tr>`);

      g.sections.forEach((s: any) => {
        const collectPct = s.totalExpected > 0 ? (s.totalCollected / s.totalExpected) * 100 : 0;
        const paidPct = s.studentCount > 0 ? (s.fullyPaidCount / s.studentCount) * 100 : 0;
        printWindow.document.write(`
          <tr>
              <td style="padding-left: 20px;">${s.name}</td>
              <td>${s.adviserName || '-'}</td>
              <td class="text-center">${s.studentCount}</td>
              <td class="text-right">PHP ${s.totalExpected.toLocaleString()}</td>
              <td class="text-right">PHP ${s.totalCollected.toLocaleString()}</td>
              <td class="text-center">${collectPct.toFixed(1)}%</td>
              <td class="text-center">${s.fullyPaidCount}</td>
              <td class="text-center">${paidPct.toFixed(1)}%</td>
          </tr>
        `);
      });

      const gCollectPct = g.totalExpected > 0 ? (g.totalCollected / g.totalExpected) * 100 : 0;
      const gPaidPct = g.totalStudents > 0 ? (g.totalFullyPaid / g.totalStudents) * 100 : 0;
      printWindow.document.write(`
        <tr class="total-row">
            <td colspan="2" class="text-right">Subtotal (${g.grade})</td>
            <td class="text-center">${g.totalStudents}</td>
            <td class="text-right">PHP ${g.totalExpected.toLocaleString()}</td>
            <td class="text-right">PHP ${g.totalCollected.toLocaleString()}</td>
            <td class="text-center">${gCollectPct.toFixed(1)}%</td>
            <td class="text-center">${g.totalFullyPaid}</td>
            <td class="text-center">${gPaidPct.toFixed(1)}%</td>
        </tr>
      `);

      grandStudents += g.totalStudents;
      grandExpected += g.totalExpected;
      grandCollected += g.totalCollected;
      grandFullyPaid += g.totalFullyPaid;
    });

    const grandCollectPct = grandExpected > 0 ? (grandCollected / grandExpected) * 100 : 0;
    const grandPaidPct = grandStudents > 0 ? (grandFullyPaid / grandStudents) * 100 : 0;

    printWindow.document.write(`
              <tr class="total-row" style="background-color: #ddd; font-size: 12px;">
                  <td colspan="2" class="text-right">GRAND TOTAL</td>
                  <td class="text-center">${grandStudents}</td>
                  <td class="text-right">PHP ${grandExpected.toLocaleString()}</td>
                  <td class="text-right">PHP ${grandCollected.toLocaleString()}</td>
                  <td class="text-center">${grandCollectPct.toFixed(1)}%</td>
                  <td class="text-center">${grandFullyPaid}</td>
                  <td class="text-center">${grandPaidPct.toFixed(1)}%</td>
              </tr>
          </tbody>
      </table>
      <div style="margin-top: 30px; font-size: 10px; text-align: center;">Generated by ${config.appName || 'System'}</div>
      <script>window.onload = function() { window.print(); }<\/script></body></html>
    `);
    printWindow.document.close();
  };

  const statCards = [
    { label: 'Cash on Hand', value: `PHP ${cashOnHand.toLocaleString()}`, icon: 'account_balance_wallet' },
    { label: 'Posted Collections', value: `PHP ${totalCollections.toLocaleString()}`, icon: 'payments' },
    { label: 'Posted Expenses', value: `PHP ${totalExpenses.toLocaleString()}`, icon: 'receipt_long' },
    { label: 'Registered Learners', value: learnersCount.toLocaleString(), icon: 'groups' }
  ];

  return (
    <div className="section-shell spta-admin-dashboard animate-fade-in">
      <div className="section-shell__header">
        <p className="section-shell__eyebrow">Dashboard</p>
        <h2>SPTA Admin Operations</h2>
        <p className="section-shell__description">
          Ledger summary of collections, disbursements, and current cashiering activity.
        </p>
      </div>

      <div className="portal-panel">
        <div className="portal-panel__header flex items-center justify-between gap-3">
          <h2>Counter Summary</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCollectionWindowOpen(true)}
              className="primary-button flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">point_of_sale</span>
              Open Collection Window
            </button>
            <button onClick={handlePrintCollectionReport} className="primary-button flex items-center gap-2">
              <span className="material-symbols-outlined text-base">print</span>
              Print Status Report
            </button>
          </div>
        </div>
        <div className="portal-panel__body">
          <div className="section-grid">
            {statCards.map((card) => (
              <article key={card.label} className="notice-box">
                <strong>{card.label}</strong>
                <span className="flex items-center justify-between">
                  <span>{card.value}</span>
                  <span className="material-symbols-outlined text-slate-400">{card.icon}</span>
                </span>
              </article>
            ))}
          </div>

          <div className="section-grid mt-4">
            <article className="notice-box">
              <strong>System Sync</strong>
              <span>{lastFetchTime ? new Date(lastFetchTime).toLocaleString() : 'No sync data available'}</span>
            </article>
            <article className="notice-box">
              <strong>Inflow Ratio</strong>
              <span>{collectionRate.toFixed(0)}%</span>
            </article>
            <article className="notice-box">
              <strong>Active Projects</strong>
              <span>{activeProjects}</span>
            </article>
          </div>
        </div>
      </div>

      <section className="portal-panel mt-5">
        <div className="portal-panel__header flex items-center justify-between gap-3">
          <h2>Recent Cashiering Activity</h2>
          <span className="text-slate-500 text-sm">Last 10 entries</span>
        </div>

        <div className="portal-panel__body overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100">
              <tr className="text-left text-xs font-bold text-slate-600">
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Payer / Payee</th>
                <th className="px-6 py-4">Cashier</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentTransactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700">{t.referenceNo || t.disbursementCode || 'NO REF'}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{t.type === TransactionType.COLLECTION ? t.learnerName : t.payee}</div>
                    <div className="mt-1 inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold text-slate-500">
                      {t.type === TransactionType.COLLECTION ? 'Collection' : 'Expense'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{t.recordedBy || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <button
                      type="button"
                      onClick={() => setDetailsTx(t)}
                      className="inline-flex items-center rounded-md border border-[var(--deped-line)] bg-[var(--deped-white)] px-3 py-1.5 text-[13px] font-bold text-[var(--deped-blue)] hover:bg-[var(--deped-canvas)]"
                    >
                      Details
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{t.date}</td>
                  <td className={`px-6 py-4 text-right text-base font-bold ${t.type === TransactionType.COLLECTION ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {t.type === TransactionType.COLLECTION ? '+' : '-'}PHP {t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-500">
                    No transaction history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isCollectionWindowOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] bg-[var(--deped-canvas)]">
            <div className="flex h-full w-full flex-col">
              <div className="flex items-center justify-between border-b border-[var(--deped-line)] bg-[var(--deped-white)] px-5 py-4">
                <div>
                  <p className="text-[13px] font-semibold text-[var(--deped-muted)]">SPTA Collection</p>
                  <h3 className="text-[24px] font-bold text-[var(--deped-ink)]">Collection Window</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCollectionWindowOpen(false)}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--deped-line)] bg-[var(--deped-white)] px-4 py-2 text-[13px] font-bold text-[var(--deped-ink)] hover:bg-[var(--deped-canvas)]"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Close
                </button>
              </div>
              <div className="spta-collection-fullscreen min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
                <FinanceCollection
                  transactions={transactions}
                  setTransactions={setTransactions}
                  learners={learners}
                  sections={sections}
                  config={config}
                  cashierName={currentUser?.fullName || currentUser?.username || undefined}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {detailsTx &&
        createPortal(
          <div className="modal-overlay modal-overlay--high" role="presentation">
            <div className="modal-backdrop" onClick={() => setDetailsTx(null)} />
            <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-label="Transaction Details">
              <div className="modal-dialog__header">
                <div className="modal-dialog__title-group">
                  <p className="modal-dialog__eyebrow">Cashiering Record</p>
                  <h3>Transaction Particulars</h3>
                </div>
                <button type="button" className="modal-dialog__close" onClick={() => setDetailsTx(null)} aria-label="Close transaction details">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-dialog__body">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100">
                      <tr className="text-left text-xs font-bold text-slate-600">
                        <th className="px-4 py-3">Fee / Particular</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {detailsRows.length > 0 ? (
                        detailsRows.map((row, index) => (
                          <tr key={`${row.fee}-${index}`}>
                            <td className="px-4 py-3">{row.fee}</td>
                            <td className="px-4 py-3 text-right font-semibold">PHP {row.paid.toLocaleString()}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${row.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              PHP {row.balance.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                            No particulars available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-dialog__actions">
                <button type="button" className="modal-dialog__blue" onClick={() => setDetailsTx(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

