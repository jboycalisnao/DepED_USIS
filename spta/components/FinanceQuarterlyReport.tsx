
import React, { useMemo } from 'react';
import { FinancialTransaction, SystemConfig, TransactionType } from '../types';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';

// Constants for distribution logic
const ORG_FEE_NAME = 'SCHOOL ORGANIZATIONS';
const ORG_TOTAL_FEE = 200;
const ORG_DISTRIBUTION = [
    { name: 'SSLG', amount: 50 },
    { name: 'ENGLISH CLUB', amount: 15 },
    { name: 'MATH CLUB', amount: 15 },
    { name: 'KAMFIL', amount: 15 },
    { name: 'YES-O', amount: 15 },
    { name: 'AP CLUB', amount: 15 },
    { name: 'KPSEP', amount: 15 },
    { name: 'BKD', amount: 15 },
    { name: 'MAPEH CLUB', amount: 15 },
    { name: 'RCY', amount: 15 },
    { name: 'STEP', amount: 15 },
];

interface FinanceQuarterlyReportProps {
  transactions: FinancialTransaction[];
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
}

export const FinanceQuarterlyReport: React.FC<FinanceQuarterlyReportProps> = ({ transactions, config, setConfig }) => {
  const [notice, setNotice] = React.useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, title: '', message: '' });
  const quarterData = useMemo(() => {
      const sched = config.quarterSchedule;
      const quarters = ['q1', 'q2', 'q3', 'q4'] as const;
      
      return quarters.map(qKey => {
          const range = sched?.[qKey];
          if (!range || !range.start || !range.end) {
              return { 
                  name: qKey.toUpperCase(), 
                  label: 'Not Configured', 
                  collections: 0, 
                  expenses: 0, 
                  net: 0,
                  breakdown: [] 
              };
          }

          const qTransactions = transactions.filter(t => 
              t.status === 'Posted' && t.date >= range.start && t.date <= range.end
          );

          const collections = qTransactions
              .filter(t => t.type === TransactionType.COLLECTION)
              .reduce((sum, t) => sum + t.amount, 0);

          const expenses = qTransactions
              .filter(t => t.type === TransactionType.EXPENSE)
              .reduce((sum, t) => sum + t.amount, 0);

          // Calculate Fee Breakdown
          const breakdownMap: Record<string, number> = {};
          
          qTransactions.filter(t => t.type === TransactionType.COLLECTION).forEach(t => {
              // If it's a General Collection from the Fees Module, try to parse particulars
              if (t.category === 'General Collection' && t.particulars && t.particulars.includes('(Paid:')) {
                  const items = t.particulars.split('; ');
                  items.forEach(item => {
                      // Regex to extract Name and Paid amount (handling commas)
                      const match = item.match(/(.*?) \(Paid: ([0-9,.]+)/);
                      if (match) {
                          const name = match[1].trim();
                          const amountStr = match[2].replace(/,/g, ''); // Remove commas
                          const amount = parseFloat(amountStr);
                          if (!isNaN(amount) && amount > 0) {
                              breakdownMap[name] = (breakdownMap[name] || 0) + amount;
                          }
                      }
                  });
              } else {
                  // Fallback for direct income or unparsed particulars: use Category or 'Other'
                  const cat = t.category || 'Other Income';
                  breakdownMap[cat] = (breakdownMap[cat] || 0) + t.amount;
              }
          });

          const breakdown = Object.entries(breakdownMap)
              .sort((a, b) => b[1] - a[1]) // Sort Descending
              .map(([name, amount]) => ({ name, amount }));

          return {
              name: qKey.toUpperCase(),
              label: `${new Date(range.start).toLocaleDateString()} - ${new Date(range.end).toLocaleDateString()}`,
              collections,
              expenses,
              net: collections - expenses,
              breakdown
          };
      });
  }, [config.quarterSchedule, transactions]);

  const handlePrintReport = (q: any) => {
      const printWindow = window.open('', '', 'height=800,width=1000');
      if (!printWindow) { setNotice({ open: true, title: 'Pop-up Blocked', message: 'Please allow pop-ups to print the quarterly report.', tone: 'warning' }); return; }

      // Calculate logic for School Orgs if present in breakdown
      const orgFeeTotal = q.breakdown.find((b: any) => b.name === ORG_FEE_NAME)?.amount || 0;
      // Estimate distinct payers based on total / base fee amount
      // Note: This is an estimation. If partial payments are allowed, this count might be fractional, which is fine for allocation calculation but 'approx payers' is just for info.
      const countPaid = orgFeeTotal > 0 ? orgFeeTotal / ORG_TOTAL_FEE : 0;

      printWindow.document.write(`
        <html><head><title>${q.name} Collection Report</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #000; max-width: 8.5in; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .school-name { font-weight: 800; font-size: 16pt; text-transform: uppercase; }
            .rpt-title { font-weight: 800; font-size: 14pt; text-transform: uppercase; margin-top: 10px; }
            .rpt-meta { font-size: 11pt; margin-top: 5px; color: #444; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10pt; }
            th, td { border: 1px solid #000; padding: 8px; }
            th { background-color: #f0f0f0; text-transform: uppercase; font-weight: 800; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .section-head { font-weight: 800; font-size: 12pt; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #000; display: inline-block; }
            .total-row td { font-weight: 800; background-color: #fafafa; }
            .signatories { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; page-break-inside: avoid; }
            .sig-box { text-align: center; }
            .sig-line { border-top: 1px solid #000; width: 80%; margin: 40px auto 5px auto; font-weight: bold; text-transform: uppercase; }
            @media print { body { padding: 0; } }
        </style>
        </head><body>
            <div class="header">
                ${config.logoUrl ? `<img src="${config.logoUrl}" style="height: 60px; margin-bottom: 10px;" />` : ''}
                <div class="school-name">${config.schoolName}</div>
                <div>Parent-Teacher Association</div>
                <div class="rpt-title">Quarterly Collection Report (${q.name})</div>
                <div class="rpt-meta">Period: ${q.label}</div>
            </div>

            <div class="section-head">I. General Collection Summary</div>
            <table>
                <thead>
                    <tr>
                        <th>Fee Description / Particulars</th>
                        <th class="text-right">Total Amount Collected</th>
                    </tr>
                </thead>
                <tbody>
                    ${q.breakdown.map((item: any) => `
                        <tr>
                            <td>${item.name}</td>
                            <td class="text-right">₱${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td>TOTAL COLLECTIONS</td>
                        <td class="text-right">₱${q.collections.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                </tbody>
            </table>

            ${orgFeeTotal > 0 ? `
                <div class="section-head" style="margin-top: 20px;">II. School Organizations Fund Allocation</div>
                <div style="font-size: 10pt; margin-bottom: 10px;">
                    Basis: ₱${orgFeeTotal.toLocaleString()} collected from "School Organizations" fee (Allocated based on ₱${ORG_TOTAL_FEE} per student).
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Organization</th>
                            <th class="text-center">Allocation per Student</th>
                            <th class="text-right">Total Allocation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ORG_DISTRIBUTION.map(org => {
                            const totalAllocated = countPaid * org.amount;
                            return `
                                <tr>
                                    <td>${org.name}</td>
                                    <td class="text-center">₱${org.amount.toFixed(2)}</td>
                                    <td class="text-right">₱${totalAllocated.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            `;
                        }).join('')}
                        <tr class="total-row">
                            <td colspan="2">TOTAL ALLOCATED</td>
                            <td class="text-right">₱${(countPaid * ORG_TOTAL_FEE).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
            ` : ''}

            <div class="signatories">
                <div class="sig-box">
                    <div>Prepared by:</div>
                    <div class="sig-line">${config.ptaTreasurerName || 'Treasurer'}</div>
                    <div>PTA Staff</div>
                </div>
                <div class="sig-box">
                    <div>Audited by:</div>
                    <div class="sig-line">${config.financeSettings?.audit?.examined?.name || 'Auditor'}</div>
                    <div>PTA Auditor</div>
                </div>
                <div class="sig-box" style="grid-column: span 2; margin-top: 30px;">
                    <div>Noted by:</div>
                    <div class="sig-line" style="width: 40%;">${config.ptaPresidentName || 'President'}</div>
                    <div>PTA President</div>
                </div>
            </div>
            <script>window.onload = function() { setTimeout(function(){ window.print(); }, 500); }<\/script>
        </body></html>
      `);
      printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-bold text-gray-800">Quarterly Analysis</h3>
                <p className="text-sm text-gray-500">Track collections and disbursements per quarter period.</p>
            </div>
        </div>

        {!config.quarterSchedule ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">event_busy</span>
                <p className="text-gray-600 mb-4">Quarter dates have not been set up yet. Configure them in Settings.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quarterData.map(q => (
                    <div key={q.name} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-xl text-[var(--md-sys-color-primary)]">{q.name}</h4>
                                    <button 
                                        onClick={() => handlePrintReport(q)} 
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Print Detailed Report"
                                        disabled={q.label === 'Not Configured'}
                                    >
                                        <span className="material-symbols-outlined text-lg">print</span>
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500">{q.label}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${q.net >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                Net: {q.net >= 0 ? '+' : ''}₱{q.net.toLocaleString()}
                            </span>
                        </div>

                        <div className="space-y-4 flex-1">
                            {/* Collections Section with Breakdown */}
                            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-xs font-bold text-green-800 uppercase">Total Collected</p>
                                        <p className="text-2xl font-bold text-green-900">₱{q.collections.toLocaleString()}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-green-200 text-3xl">savings</span>
                                </div>
                                
                                {q.breakdown.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-green-200">
                                        <p className="text-[10px] font-bold text-green-700 uppercase mb-2">Fee Breakdown</p>
                                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                            {q.breakdown.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs text-green-900">
                                                    <span className="truncate pr-2" title={item.name}>{item.name}</span>
                                                    <span className="font-bold whitespace-nowrap">₱{item.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                                <p className="text-xs font-bold text-red-800 uppercase mb-1">Total Disbursed</p>
                                <p className="text-2xl font-bold text-red-900">₱{q.expenses.toLocaleString()}</p>
                                <p className="text-[10px] text-red-700 mt-1">Expenses recorded in this period</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
        <UsisAlertModal
          open={notice.open}
          title={notice.title}
          message={notice.message}
          tone={notice.tone}
          onClose={() => setNotice(prev => ({ ...prev, open: false }))}
        />
    </div>
  );
};
