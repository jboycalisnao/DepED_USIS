
import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { FinancialTransaction, TransactionType, Activity, SystemConfig, SignatoryProfile } from '../types';
import { supabase } from '../lib/supabaseClient';
import { SPTA_FINANCIAL_TRANSACTIONS_TABLE, toDbFinancialTransaction } from '../lib/financeTransactionDb';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';

const SCHOOL_ORGS = ['SSLG', 'ENGLISH CLUB', 'MATH CLUB', 'KAMFIL', 'YES-O', 'AP CLUB', 'KPSEP', 'BKD', 'MAPEH CLUB', 'RCY', 'STEP'];

interface FinanceDisbursementProps {
  yearTransactions: FinancialTransaction[];
  selectedFiscalYear: number;
  categories: string[];
  projects: Activity[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  getCategoryBalance: (category: string) => number;
  config?: SystemConfig;
}

export const FinanceDisbursement: React.FC<FinanceDisbursementProps> = ({ 
    yearTransactions, selectedFiscalYear, categories, projects, setTransactions, getCategoryBalance, config
}) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<Partial<FinancialTransaction>>({});
  const [selectedOrg, setSelectedOrg] = useState('');
  const [viewingTransaction, setViewingTransaction] = useState<FinancialTransaction | null>(null);

  // Custom Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({
      isOpen: false, title: '', message: '', onConfirm: () => {}
  });
  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, title: '', message: '' });

  // Signatory State for Print Modal
  const [signatories, setSignatories] = useState<{
      prepared: SignatoryProfile,
      certified: SignatoryProfile,
      approved: SignatoryProfile
  }>({
      prepared: { name: '', title: '' },
      certified: { name: '', title: '' },
      approved: { name: '', title: '' }
  });

  const expenses = yearTransactions.filter(t => t.type === TransactionType.EXPENSE);

  const totalSources = useMemo(() => {
      return yearTransactions
        .filter(t => t.type === TransactionType.COLLECTION && t.status === 'Posted')
        .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  // --- DYNAMIC BALANCE CALCULATION ---
  // Calculates Available Balance for a Category based on Selected Quarter's Collections
  const actualBalance = useMemo(() => {
      if (!expenseForm.category) return 0;
      const cat = expenseForm.category;
      
      // Determine Date Range based on selected Quarter
      let dateRange = null;
      if (expenseForm.quarter && config?.quarterSchedule) {
          const qKey = expenseForm.quarter.toLowerCase();
          // @ts-ignore
          if (config.quarterSchedule[qKey]?.start && config.quarterSchedule[qKey]?.end) {
              // @ts-ignore
              dateRange = config.quarterSchedule[qKey];
          }
      }

      // Filter Collections
      const relevantCollections = yearTransactions.filter(t => {
          if (t.type !== TransactionType.COLLECTION || t.status !== 'Posted') return false;
          // If quarter is selected, strictly filter collections by that quarter's dates
          if (dateRange) {
              return t.date >= dateRange.start && t.date <= dateRange.end;
          }
          return true; // If no quarter selected (or legacy), use all time
      });

      // Parse Collections for Specific Fee Category
      let collectedAmount = 0;
      relevantCollections.forEach(t => {
          if (t.category === 'General Collection' && t.particulars && t.particulars.includes('(Paid:')) {
               const items = t.particulars.split('; ');
               items.forEach(item => {
                   const match = item.match(/(.*?) \(Paid: ([0-9,.]+)/);
                   if (match) {
                       const name = match[1].trim();
                       if (name.includes(cat)) { // Simple match, can be strict if needed
                           const amountStr = match[2].replace(/,/g, '');
                           collectedAmount += parseFloat(amountStr) || 0;
                       }
                   }
               });
          } else if (t.category === cat) {
              collectedAmount += t.amount;
          }
      });

      // --- SCHOOL ORGANIZATION SUB-FUND LOGIC ---
      let availableCollected = collectedAmount;
      if (cat === 'SCHOOL ORGANIZATIONS' && selectedOrg) {
          // Fee is 200. SSLG gets 50, Others get 10. (Example Ratio)
          const ratio = selectedOrg === 'SSLG' ? (50/200) : (10/200);
          availableCollected = collectedAmount * ratio;
      }

      // Filter Expenses (Subtract already spent funds in this context)
      const relevantExpenses = yearTransactions.filter(t => {
          if (t.type !== TransactionType.EXPENSE || t.category !== cat || t.status !== 'Posted') return false;
          
          // Check Sub-Fund Org
          if (cat === 'SCHOOL ORGANIZATIONS' && selectedOrg) {
              if (!t.particulars.startsWith(`[${selectedOrg}]`)) return false;
          }

          if (dateRange) {
              return t.date >= dateRange.start && t.date <= dateRange.end;
          }
          return true;
      }).reduce((s, t) => s + t.amount, 0);

      // Add back current transaction amount if editing (to allow saving same amount)
      let currentEditAmount = 0;
      if (expenseForm.id) {
          const originalTx = yearTransactions.find(t => t.id === expenseForm.id);
          if (originalTx && originalTx.category === expenseForm.category && originalTx.status === 'Posted') {
               // Verify Quarter Match if filtering
               const inRange = dateRange ? (originalTx.date >= dateRange.start && originalTx.date <= dateRange.end) : true;
               if (inRange) {
                   if (cat === 'SCHOOL ORGANIZATIONS' && selectedOrg) {
                       if (originalTx.particulars.startsWith(`[${selectedOrg}]`)) currentEditAmount = originalTx.amount;
                   } else {
                       currentEditAmount = originalTx.amount;
                   }
               }
          }
      }

      return availableCollected - relevantExpenses + currentEditAmount;
  }, [expenseForm.category, expenseForm.quarter, expenseForm.id, yearTransactions, config, selectedOrg]);


  const handleSaveExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      const isUpdate = !!expenseForm.id;
      
      // Strict Check: Cannot save if amount exceeds balance
      if ((expenseForm.amount || 0) > actualBalance) {
          setNotice({ open: true, title: 'Insufficient Funds', message: `Available balance in ${expenseForm.quarter || 'Total'} allocation is ₱${actualBalance.toLocaleString()}.`, tone: 'warning' });
          return;
      }

      let disbursementCode = expenseForm.disbursementCode;
      if (!disbursementCode) {
          const prefix = `DB-${selectedFiscalYear}-`;
          const existingSequences = yearTransactions
              .filter(t => t.disbursementCode && t.disbursementCode.startsWith(prefix))
              .map(t => parseInt(t.disbursementCode!.replace(prefix, ''), 10))
              .filter(n => !isNaN(n));
          
          const nextSeq = existingSequences.length > 0 ? Math.max(...existingSequences) + 1 : 1;
          disbursementCode = `${prefix}${String(nextSeq).padStart(4, '0')}`;
      }

      let finalParticulars = expenseForm.particulars || '';
      if (expenseForm.category === 'SCHOOL ORGANIZATIONS' && selectedOrg) {
          if (!finalParticulars.startsWith(`[${selectedOrg}]`)) {
              finalParticulars = `[${selectedOrg}] ${finalParticulars}`;
          }
      }

      // Ensure date consistency for liquidation - Send null if not liquidated to clear previous dates
      const liquidationDate = expenseForm.liquidationStatus === 'Liquidated' 
          ? (expenseForm.liquidationDate || null)
          : null;

      const newTx: FinancialTransaction = {
          ...expenseForm,
          id: expenseForm.id || Math.random().toString(36).substr(2, 9),
          fiscalYear: selectedFiscalYear,
          status: 'Posted',
          amount: expenseForm.amount || 0,
          date: expenseForm.date || new Date().toISOString().split('T')[0],
          particulars: finalParticulars,
          type: TransactionType.EXPENSE,
          category: expenseForm.category || categories[0],
          payee: expenseForm.payee,
          quarter: expenseForm.quarter || 'Q1',
          liquidationStatus: expenseForm.liquidationStatus || 'Pending',
          liquidationDate: liquidationDate, 
          auditStatus: expenseForm.auditStatus || 'Pending',
          referenceNo: expenseForm.referenceNo || '',
          activityId: expenseForm.activityId || null,
          disbursementCode,
          isDeficit: false
      };
      
      const { error } = await supabase
        .from(SPTA_FINANCIAL_TRANSACTIONS_TABLE)
        .upsert(toDbFinancialTransaction(newTx));
      if(!error) {
          setTransactions(prev => {
              if (isUpdate) return prev.map(t => t.id === newTx.id ? newTx : t);
              return [newTx, ...prev];
          });
          setIsExpenseModalOpen(false);
          setExpenseForm({});
          setSelectedOrg('');
      } else {
          setNotice({ open: true, title: 'Save Failed', message: `Failed to save transaction: ${error.message}`, tone: 'danger' });
      }
  };

  const handleViewDetails = (tx: FinancialTransaction) => {
      setViewingTransaction(tx);
      setIsDetailModalOpen(true);
  };

  const handleEdit = (tx: FinancialTransaction) => {
      let particulars = tx.particulars;
      let org = '';
      if (tx.category === 'SCHOOL ORGANIZATIONS') {
          const match = particulars.match(/^\[(.*?)\]\s/);
          if (match && SCHOOL_ORGS.includes(match[1])) {
              org = match[1];
              particulars = particulars.replace(/^\[(.*?)\]\s/, '');
          }
      }
      setExpenseForm({ ...tx, particulars });
      setSelectedOrg(org);
      setIsExpenseModalOpen(true);
  };

  const handleDelete = (id: string) => {
      setConfirmModal({
          isOpen: true,
          title: "Delete Disbursement",
          message: "Are you sure you want to delete this disbursement record? This cannot be undone.",
          onConfirm: async () => {
              const { error } = await supabase.from(SPTA_FINANCIAL_TRANSACTIONS_TABLE).delete().eq('id', id);
              if(!error) {
                  setTransactions(prev => prev.filter(t => t.id !== id));
                  setConfirmModal(prev => ({...prev, isOpen: false}));
              } else {
                  setNotice({ open: true, title: 'Delete Failed', message: `Error deleting record: ${error.message}`, tone: 'danger' });
              }
          }
      });
  };

  const handleOpenPrintModal = (tx: FinancialTransaction) => {
      setViewingTransaction(tx);
      if (config?.financeSettings?.voucher) {
          setSignatories(config.financeSettings.voucher);
      } else {
          setSignatories({
              prepared: { name: 'PTA Staff', title: 'PTA Staff' },
              certified: { name: 'President Name', title: 'PTA President' },
              approved: { name: 'School Head', title: 'School Principal' }
          });
      }
      setIsPrintModalOpen(true);
  };

  const handlePrint = () => {
      window.print();
  };

  const getFundCode = (category: string) => {
      const map: Record<string, string> = {
          'PTA MEMBERSHIP': 'MEM',
          'PTA PROJECTS': 'PROJ',
          'GIRL SCOUT/BOY SCOUT SUSTAINING FEES': 'GSP-BSP',
          'RED CROSS': 'RED',
          'SCHOOL PUBLICATION': 'PUB',
          'CULTURAL/SPORTS': 'CULT-SPORT',
          'ANTI TB': 'TB',
          'SCHOOL ORGANIZATIONS': 'ORGS',
          'SCHOOL UTILITY': 'UTIL',
          'PTA STAFF': 'STAFF',
          'STE/SPA DEVELOPMENTAL FUND': 'DEV-STE',
          'SENIOR HIGH SCHOOL DEVELOPMENTAL FUND': 'DEV-SHS',
          'Unallocated / General Fund': 'GEN'
      };
      return map[category] || category;
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">receipt_long</span>
                Disbursements
            </h3>
            {totalSources <= 0 ? (
                <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium border border-gray-200 flex items-center gap-2" title="No funds available to disburse">
                    <span className="material-symbols-outlined text-sm">lock</span> No Sources Available
                </div>
            ) : (
                <button onClick={() => { setExpenseForm({}); setSelectedOrg(''); setIsExpenseModalOpen(true); }} className="m3-btn-primary text-sm shadow-sm">
                    <span className="material-symbols-outlined mr-2 text-lg">edit_note</span> Log Disbursement
                </button>
            )}
        </div>

        <div className="overflow-hidden border border-[var(--md-sys-color-outline-variant)] rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-[var(--md-sys-color-outline-variant)]">
                    <tr>
                        <th className="p-4 font-bold text-[var(--md-sys-color-on-surface)]">Code</th>
                        <th className="p-4 font-bold text-[var(--md-sys-color-on-surface)]">Date</th>
                        <th className="p-4 font-bold text-[var(--md-sys-color-on-surface)]">Quarter</th>
                        <th className="p-4 font-bold text-[var(--md-sys-color-on-surface)]">Payee / Particulars</th>
                        <th className="p-4 font-bold text-[var(--md-sys-color-on-surface)]">Category</th>
                        <th className="p-4 font-bold text-[var(--md-sys-color-on-surface)] text-right">Amount</th>
                        <th className="p-4 font-bold text-[var(--md-sys-color-on-surface)] text-center">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {expenses.map(t => (
                        <tr key={t.id} className="hover:bg-[var(--md-sys-color-surface-container)] transition-colors group">
                            <td className="p-4 font-mono text-xs font-bold text-[var(--md-sys-color-primary)]">{t.disbursementCode}</td>
                            <td className="p-4 text-[var(--md-sys-color-on-surface-variant)] whitespace-nowrap">{t.date}</td>
                            <td className="p-4">
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{t.quarter || '-'}</span>
                            </td>
                            <td className="p-4">
                                <div className="font-bold text-[var(--md-sys-color-on-surface)]">{t.payee}</div>
                                <div className="text-xs text-[var(--md-sys-color-outline)] mt-0.5">{t.particulars}</div>
                                {t.liquidationStatus === 'Liquidated' && (
                                    <div className="mt-1 inline-flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                        <span className="material-symbols-outlined text-[10px] text-green-600">verified</span>
                                        <span className="text-[9px] font-bold text-green-700 uppercase">Liquidated {t.liquidationDate ? `(${new Date(t.liquidationDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})})` : ''}</span>
                                    </div>
                                )}
                            </td>
                            <td className="p-4 text-xs">
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">{t.category}</span>
                            </td>
                            <td className="p-4 text-right font-bold text-red-600">-₱{t.amount.toLocaleString()}</td>
                            <td className="p-4 text-center">
                                <div className="flex justify-center gap-1">
                                    <button onClick={() => handleOpenPrintModal(t)} className="text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-full transition-colors" title="Print Voucher">
                                        <span className="material-symbols-outlined text-xl">print</span>
                                    </button>
                                    <button onClick={() => handleViewDetails(t)} className="text-[var(--md-sys-color-secondary)] hover:bg-[var(--md-sys-color-surface-container-high)] p-2 rounded-full transition-colors" title="View Details">
                                        <span className="material-symbols-outlined text-xl">visibility</span>
                                    </button>
                                    <button onClick={() => handleEdit(t)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors" title="Edit">
                                        <span className="material-symbols-outlined text-xl">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors" title="Delete">
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {expenses.length === 0 && (
                        <tr><td colSpan={7} className="p-12 text-center text-[var(--md-sys-color-on-surface-variant)] opacity-50"><span className="material-symbols-outlined text-5xl mb-2">receipt_long</span><p className="text-sm font-medium">No disbursements logged yet.</p></td></tr>
                    )}
                </tbody>
            </table>
        </div>

       {/* Expense Modal */}
       {isExpenseModalOpen && createPortal(
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                   <h3 className="text-xl font-bold mb-6 text-[var(--md-sys-color-on-surface)]">{expenseForm.id ? 'Edit' : 'Log'} Disbursement</h3>
                   <form onSubmit={handleSaveExpense} className="space-y-4">
                       <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                           <div className="grid grid-cols-2 gap-3 mb-2">
                               <div className="floating-field">
                                   <div className="floating-field__control">
                                   <select 
                                        required 
                                        value={expenseForm.category || ''} 
                                        onChange={e => {
                                            setExpenseForm({...expenseForm, category: e.target.value});
                                            setSelectedOrg('');
                                        }}
                                        data-has-value={(expenseForm.category || '').length > 0}
                                    >
                                       <option value="">Select Category...</option>
                                       <option value="Unallocated / General Fund">Unallocated / General Fund</option>
                                       {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                                   <span>Fund Source</span>
                                   </div>
                               </div>
                               <div className="floating-field">
                                   <div className="floating-field__control">
                                   <select 
                                        value={expenseForm.quarter || ''} 
                                        onChange={e => setExpenseForm({...expenseForm, quarter: e.target.value as any})}
                                        data-has-value={(expenseForm.quarter || '').length > 0}
                                        required
                                   >
                                       <option value="">Select Quarter...</option>
                                       <option value="Q1">Q1</option>
                                       <option value="Q2">Q2</option>
                                       <option value="Q3">Q3</option>
                                       <option value="Q4">Q4</option>
                                   </select>
                                   <span>Period</span>
                                   </div>
                               </div>
                           </div>

                           {/* SCHOOL ORGANIZATION SELECTOR */}
                           {expenseForm.category === 'SCHOOL ORGANIZATIONS' && (
                               <div className="floating-field mt-2 animate-fade-in">
                                   <div className="floating-field__control">
                                   <select 
                                        value={selectedOrg}
                                        onChange={e => setSelectedOrg(e.target.value)}
                                        data-has-value={selectedOrg.length > 0}
                                        required
                                   >
                                       <option value="">Select Organization...</option>
                                       {SCHOOL_ORGS.map(o => <option key={o} value={o}>{o}</option>)}
                                   </select>
                                   <span>Organization</span>
                                   </div>
                               </div>
                           )}
                           
                           {/* BALANCE DISPLAY */}
                           {expenseForm.category && (
                               <div className="mt-3">
                                   <div className={`border p-2 rounded flex justify-between items-center ${actualBalance < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                       <div>
                                           <span className={`text-[10px] uppercase font-bold block mb-0.5 ${actualBalance < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                               {selectedOrg ? `Available for ${selectedOrg}` : 'Available Allocation'}
                                               {expenseForm.quarter ? ` (${expenseForm.quarter})` : ' (Total)'}
                                           </span>
                                           <span className={`text-lg font-black ${actualBalance < 0 ? 'text-red-600' : 'text-green-900'}`}>
                                               ₱{actualBalance.toLocaleString()}
                                           </span>
                                       </div>
                                       {actualBalance <= 0 && (
                                           <span className="material-symbols-outlined text-red-400">block</span>
                                       )}
                                   </div>
                                   {!expenseForm.quarter && <p className="text-[10px] text-gray-400 mt-1 italic text-center">Select a Quarter to verify specific allocation.</p>}
                               </div>
                           )}
                       </div>

                       <label className="floating-field">
                           <div className="floating-field__control">
                           <input placeholder=" " required value={expenseForm.payee || ''} onChange={e => setExpenseForm({...expenseForm, payee: e.target.value})} />
                           <span>Payee Name</span>
                           </div>
                       </label>
                       <label className="floating-field">
                           <div className="floating-field__control">
                           <textarea placeholder=" " required rows={2} value={expenseForm.particulars || ''} onChange={e => setExpenseForm({...expenseForm, particulars: e.target.value})} />
                           <span>Particulars / Purpose</span>
                           </div>
                       </label>
                       
                       <div className="grid grid-cols-2 gap-4">
                           <label className="floating-field col-span-1">
                               <div className="floating-field__control">
                               <input type="number" placeholder=" " required value={expenseForm.amount || ''} onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value)})} />
                               <span>Amount</span>
                               </div>
                           </label>
                           <label className="floating-field col-span-1">
                               <div className="floating-field__control">
                               <input type="date" placeholder=" " value={expenseForm.date || ''} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                               <span>Date</span>
                               </div>
                           </label>
                       </div>

                       {/* Liquidation Control */}
                       <div className="pt-4 border-t border-gray-100 mt-2">
                           <div className="flex justify-between items-center mb-2">
                               <label className="text-xs font-bold text-[var(--md-sys-color-outline)] uppercase">Liquidation Status</label>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                               <label className="floating-field">
                                   <div className="floating-field__control">
                                   <select value={expenseForm.liquidationStatus || 'Pending'} onChange={e => setExpenseForm({...expenseForm, liquidationStatus: e.target.value})} data-has-value>
                                   <option value="Pending">Pending</option>
                                   <option value="Liquidated">Liquidated</option>
                                   </select>
                                   <span>Liquidation Status</span>
                                   </div>
                               </label>
                               {expenseForm.liquidationStatus === 'Liquidated' && (
                                   <label className="floating-field">
                                       <div className="floating-field__control">
                                       <input 
                                            type="date" 
                                            placeholder=" "
                                            value={expenseForm.liquidationDate || ''} 
                                            onChange={e => setExpenseForm({...expenseForm, liquidationDate: e.target.value})}
                                            required
                                       />
                                       <span>Liquidation Date</span>
                                       </div>
                                   </label>
                               )}
                           </div>
                       </div>
                       
                       {/* Allocation Error */}
                       {expenseForm.category && (expenseForm.amount || 0) > actualBalance && (
                           <div className="p-3 bg-red-100 border border-red-200 rounded text-xs text-red-800 flex gap-2 animate-pulse">
                               <span className="material-symbols-outlined text-sm">error</span>
                               <div>
                                   <p className="font-bold">Cannot Proceed</p>
                                   <p>Expense exceeds the allocated collection for {expenseForm.quarter || 'this fund'}.</p>
                               </div>
                           </div>
                       )}

                       <div className="flex justify-end gap-2 pt-6">
                           <button type="button" onClick={() => { setIsExpenseModalOpen(false); setExpenseForm({}); setSelectedOrg(''); }} className="m3-btn-tonal text-sm">Cancel</button>
                           <button 
                                type="submit" 
                                className="m3-btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!expenseForm.category || (expenseForm.amount || 0) > actualBalance}
                            >
                               {expenseForm.id ? 'Update' : 'Log'} Disbursement
                           </button>
                       </div>
                   </form>
               </div>
           </div>, document.body
       )}

       {/* Print Preview Modal (Unchanged content wrapper) */}
       {isPrintModalOpen && viewingTransaction && createPortal(
           <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-0 backdrop-blur-md">
               <div className="bg-white w-full h-full md:w-auto md:h-auto md:max-w-6xl md:max-h-[95vh] md:rounded-lg shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
                   <div className="w-full md:w-80 bg-gray-50 border-r border-gray-200 p-6 flex flex-col gap-6 no-print overflow-y-auto">
                       <div><h3 className="font-bold text-lg text-gray-800 mb-1">Print Voucher</h3><p className="text-xs text-gray-500">Configure signatories.</p></div>
                       <div className="space-y-4 flex-1">
                           <div className="p-3 bg-white border border-gray-200 rounded-lg">
                               <p className="text-xs font-bold text-gray-400 uppercase mb-2">Box A: Prepared By</p>
                               <label className="floating-field mb-2">
                                   <div className="floating-field__control">
                                       <input placeholder=" " value={signatories.prepared.name} onChange={e => setSignatories({...signatories, prepared: {...signatories.prepared, name: e.target.value}})} />
                                       <span>Name</span>
                                   </div>
                               </label>
                               <label className="floating-field">
                                   <div className="floating-field__control">
                                       <input placeholder=" " value={signatories.prepared.title} onChange={e => setSignatories({...signatories, prepared: {...signatories.prepared, title: e.target.value}})} />
                                       <span>Title</span>
                                   </div>
                               </label>
                           </div>
                           <div className="p-3 bg-white border border-gray-200 rounded-lg">
                               <p className="text-xs font-bold text-gray-400 uppercase mb-2">Box B: Certified By</p>
                               <label className="floating-field mb-2">
                                   <div className="floating-field__control">
                                       <input placeholder=" " value={signatories.certified.name} onChange={e => setSignatories({...signatories, certified: {...signatories.certified, name: e.target.value}})} />
                                       <span>Name</span>
                                   </div>
                               </label>
                               <label className="floating-field">
                                   <div className="floating-field__control">
                                       <input placeholder=" " value={signatories.certified.title} onChange={e => setSignatories({...signatories, certified: {...signatories.certified, title: e.target.value}})} />
                                       <span>Title</span>
                                   </div>
                               </label>
                           </div>
                           <div className="p-3 bg-white border border-gray-200 rounded-lg">
                               <p className="text-xs font-bold text-gray-400 uppercase mb-2">Box C: Approved By</p>
                               <label className="floating-field mb-2">
                                   <div className="floating-field__control">
                                       <input placeholder=" " value={signatories.approved.name} onChange={e => setSignatories({...signatories, approved: {...signatories.approved, name: e.target.value}})} />
                                       <span>Name</span>
                                   </div>
                               </label>
                               <label className="floating-field">
                                   <div className="floating-field__control">
                                       <input placeholder=" " value={signatories.approved.title} onChange={e => setSignatories({...signatories, approved: {...signatories.approved, title: e.target.value}})} />
                                       <span>Title</span>
                                   </div>
                               </label>
                           </div>
                       </div>
                       <div className="flex gap-2 pt-4 border-t border-gray-200">
                           <button onClick={() => setIsPrintModalOpen(false)} className="flex-1 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg">Close</button>
                           <button onClick={handlePrint} className="flex-1 py-2 text-sm font-bold bg-[var(--md-sys-color-primary)] text-white rounded-lg flex items-center justify-center gap-2"><span className="material-symbols-outlined text-lg">print</span> Print</button>
                       </div>
                   </div>
                   <div className="flex-1 bg-gray-200 p-8 overflow-y-auto flex justify-center print:p-0 print:overflow-visible">
                       <div className="print-area bg-white w-[8.5in] min-h-[5.5in] p-[0.5in] shadow-lg text-black relative print:w-full print:shadow-none print:m-0 flex flex-col justify-between">
                           {config?.logoUrl && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0"><img src={config.logoUrl} className="w-[500px] h-[500px] object-contain grayscale" /></div>}
                           <div className="text-center mb-6 relative z-10">
                               {config?.logoUrl && <div className="flex justify-center mb-2"><img src={config.logoUrl} className="w-20 h-20 object-contain" /></div>}
                               <h2 className="text-lg font-bold uppercase">{config?.schoolName}</h2>
                               <p className="text-xs uppercase tracking-widest">School Parent-Teacher Association</p>
                               <h1 className="text-xl font-bold uppercase mt-4 border-b-2 border-black inline-block pb-1">Disbursement Voucher</h1>
                           </div>
                           <div className="flex justify-between mb-4 text-sm relative z-10">
                               <div className="w-2/3">
                                   <div className="flex mb-1"><span className="w-24 font-bold">Payee:</span> <span className="border-b border-black flex-1">{viewingTransaction.payee}</span></div>
                                   <div className="flex mb-1"><span className="w-24 font-bold">Address:</span> <span className="border-b border-black flex-1">&nbsp;</span></div>
                                   <div className="flex"><span className="w-24 font-bold">Fund Source:</span> <span className="border-b border-black flex-1 font-mono font-bold">{getFundCode(viewingTransaction.category)}</span></div>
                               </div>
                               <div className="w-1/3 pl-8">
                                   <div className="flex mb-1"><span className="w-16 font-bold">No.:</span> <span className="font-mono font-bold text-red-600">{viewingTransaction.disbursementCode}</span></div>
                                   <div className="flex mb-1"><span className="w-16 font-bold">Date:</span> <span>{viewingTransaction.date}</span></div>
                                   {viewingTransaction.quarter && <div className="flex"><span className="w-16 font-bold">Quarter:</span> <span className="font-bold">{viewingTransaction.quarter}</span></div>}
                               </div>
                           </div>
                           <div className="border border-black mb-4 flex-1 relative z-10">
                               <div className="flex border-b border-black bg-gray-100 text-xs font-bold text-center uppercase">
                                   <div className="flex-1 p-1 border-r border-black">Particulars</div><div className="w-32 p-1">Amount</div>
                               </div>
                               <div className="flex h-40">
                                   <div className="flex-1 p-2 border-r border-black text-sm whitespace-pre-wrap">{viewingTransaction.particulars}</div>
                                   <div className="w-32 p-2 text-right font-bold text-sm">₱{viewingTransaction.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                               </div>
                               <div className="flex border-t border-black text-sm">
                                   <div className="flex-1 p-1 text-right font-bold pr-4">Total Amount Due</div>
                                   <div className="w-32 p-1 text-right font-bold">₱{viewingTransaction.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                               </div>
                           </div>
                           <div className="grid grid-cols-3 gap-0 border border-black text-xs relative z-10">
                               <div className="border-r border-black p-2"><p className="font-bold mb-6">A. Certified Correct:</p><div className="text-center mt-8"><p className="font-bold uppercase border-b border-black inline-block min-w-[80%]">{signatories.certified.name}</p><p>{signatories.certified.title}</p></div></div>
                               <div className="border-r border-black p-2"><p className="font-bold mb-6">B. Approved for Payment:</p><div className="text-center mt-8"><p className="font-bold uppercase border-b border-black inline-block min-w-[80%]">{signatories.approved.name}</p><p>{signatories.approved.title}</p></div></div>
                               <div className="p-2"><p className="font-bold mb-6">C. Received Payment:</p><div className="text-center mt-8"><p className="font-bold uppercase border-b border-black inline-block min-w-[80%]">&nbsp;</p><p>Signature over Printed Name</p><p className="text-[10px] mt-1 text-left">Date: ____________</p></div></div>
                           </div>
                           <div className="mt-8 pt-4 border-t-2 border-dotted border-gray-300 flex justify-between items-center no-break relative z-10">
                                <div className="text-[10px] text-gray-500"><p>Generated via {config?.appName || 'SPTA System'}</p><p>Prepared by: {signatories.prepared.name}</p></div>
                                <div className="flex items-center gap-2 border border-gray-200 p-1 rounded bg-white">
                                    <QRCodeCanvas value={`${window.location.origin}/verify/finance/${viewingTransaction.id}`} size={48} />
                                    <div className="text-[9px] uppercase font-bold text-gray-400 leading-tight">Scan to<br/>Verify</div>
                                </div>
                           </div>
                       </div>
                   </div>
               </div>
           </div>, document.body
       )}

       <UsisAlertModal
          open={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          tone="danger"
          cancelLabel="Cancel"
          confirmLabel="Confirm"
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
       />
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

