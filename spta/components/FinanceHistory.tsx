
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FinancialTransaction, Learner, Section, TransactionType, SystemConfig, GradeLevel } from '../types';
import { supabase } from '../lib/supabaseClient';
import { UsisSearchableSelect } from '../../common/components/ui/UsisSearchableSelect';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';

interface FinanceHistoryProps {
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  learners: Learner[];
  sections: Section[];
  config: SystemConfig;
}

export const FinanceHistory: React.FC<FinanceHistoryProps> = ({ transactions, setTransactions, learners, sections, config }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState('');
  
  // Collapsible State
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Report State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printGradeLevel, setPrintGradeLevel] = useState<string>('All');
  const [printSectionId, setPrintSectionId] = useState('');
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [dailyReportDate, setDailyReportDate] = useState(new Date().toISOString().split('T')[0]);

  // View/CRUD State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTx, setViewingTx] = useState<FinancialTransaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinancialTransaction | null>(null);
  // Edit Collection Specific State
  const [editSelectedFees, setEditSelectedFees] = useState<Set<string>>(new Set());
  const [editAmount, setEditAmount] = useState<number>(0);
  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, title: '', message: '' });

  const filteredTransactions = useMemo(() => {
      return transactions
        .filter(t => {
            // Filter by Type
            if (filterType === 'Collection' && t.type !== TransactionType.COLLECTION) return false;
            if (filterType === 'Expense' && t.type !== TransactionType.EXPENSE) return false;
            
            // Filter by Search
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                (t.learnerName && t.learnerName.toLowerCase().includes(searchLower)) ||
                (t.payee && t.payee.toLowerCase().includes(searchLower)) ||
                (t.referenceNo && t.referenceNo.toLowerCase().includes(searchLower)) ||
                (t.particulars && t.particulars.toLowerCase().includes(searchLower));
            
            // Filter by Date
            const matchesDate = dateFilter ? t.date === dateFilter : true;

            return matchesSearch && matchesDate;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterType, dateFilter]);

  // Group Transactions by Date
  const groupedTransactions = useMemo(() => {
      const groups: Record<string, FinancialTransaction[]> = {};
      filteredTransactions.forEach(tx => {
          if (!groups[tx.date]) groups[tx.date] = [];
          groups[tx.date].push(tx);
      });
      return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredTransactions]);

  useEffect(() => {
      const today = new Date().toISOString().split('T')[0];
      setExpandedDates(prev => {
          const newSet = new Set(prev);
          newSet.add(today);
          return newSet;
      });
  }, []);

  const toggleDateExpansion = (date: string) => {
      setExpandedDates(prev => {
          const newSet = new Set(prev);
          if (newSet.has(date)) newSet.delete(date);
          else newSet.add(date);
          return newSet;
      });
  };

  const parseParticulars = (text: string) => {
      if (!text) return [];
      const items = text.includes('; ') ? text.split('; ') : text.split(', ');
      return items.map(item => {
          const match = item.match(/(.*?) \(Paid: (.*?), Bal: (.*?)\)/);
          if (match) {
              return { name: match[1], paid: match[2], bal: match[3] };
          }
          return { name: item, paid: '-', bal: '-' };
      });
  };

  const handleDelete = async () => {
      if (!confirmDeleteId) return;
      
      const { error } = await supabase.from('financial_transactions').delete().eq('id', confirmDeleteId);
      
      if (!error) {
          // Instant update: Remove from local state immediately
          setTransactions(prev => prev.filter(t => t.id !== confirmDeleteId));
          setConfirmDeleteId(null);
      } else {
          setNotice({ open: true, title: 'Delete Failed', message: `Error deleting transaction: ${error.message}`, tone: 'danger' });
      }
  };

  const handleEditClick = (tx: FinancialTransaction) => {
      setEditingTx({ ...tx });
      setEditAmount(tx.amount);
      
      // If collection, analyze particulars to pre-check fees
      if (tx.type === TransactionType.COLLECTION) {
          const parsed = parseParticulars(tx.particulars);
          const checked = new Set<string>();
          
          if (parsed.length > 0) {
              parsed.forEach(p => {
                  const paidVal = parseFloat(p.paid.replace(/,/g, ''));
                  // Check if paid > 0 OR if it's explicitly listed (even if 0 paid but implies part of this receipt)
                  // Usually particulars only list items involved in this receipt.
                  if (!isNaN(paidVal) || p.paid !== '-') checked.add(p.name);
              });
          } else {
              // Fallback for old/manual text: try to match fee names
              (config.feeSchedule || []).forEach(f => {
                  if (tx.particulars.includes(f.name)) checked.add(f.name);
              });
          }
          setEditSelectedFees(checked);
      }
      
      setIsEditModalOpen(true);
  };

  // --- EDIT LOGIC HELPERS ---
  const learnerContext = useMemo(() => {
      if (!editingTx || !editingTx.learnerId || editingTx.type !== TransactionType.COLLECTION) return null;
      
      const learner = learners.find(l => l.id === editingTx.learnerId);
      if (!learner) return null;

      const section = sections.find(s => s.id === learner.sectionId);
      const isSHS = section?.gradeLevel === GradeLevel.GRADE_11 || section?.gradeLevel === GradeLevel.GRADE_12;
      const isSpecial = !isSHS && (section?.strand === 'STE' || section?.strand === 'SPA');

      // 1. Applicable Fees
      const applicableFees = (config.feeSchedule || []).filter(fee => {
          if (fee.type === 'Base') return true;
          if (fee.type === 'SHS_Only' && isSHS) return true;
          if (fee.type === 'STE_SPA_Only' && isSpecial) return true;
          return false;
      });

      // 2. Prior Payments (Total Paid History MINUS Current Editing Transaction)
      const priorPayments: Record<string, number> = {};
      const historyTxs = transactions.filter(t => 
          t.learnerId === learner.id && 
          t.type === TransactionType.COLLECTION && 
          t.status === 'Posted' &&
          t.id !== editingTx.id // EXCLUDE CURRENT
      );

      historyTxs.forEach(tx => {
          if (tx.particulars) {
              const items = tx.particulars.split('; ');
              items.forEach(item => {
                  const match = item.match(/(.*?) \(Paid: ([0-9,.]+)/);
                  if (match) {
                      const feeName = match[1].trim();
                      const amountPaid = parseFloat(match[2].replace(/,/g, ''));
                      if (!isNaN(amountPaid)) {
                          priorPayments[feeName] = (priorPayments[feeName] || 0) + amountPaid;
                      }
                  }
              });
          }
      });

      return { applicableFees, priorPayments };
  }, [editingTx, learners, sections, config.feeSchedule, transactions]);

  // Recalculate Allocation based on Edit State
  const allocationPreview = useMemo(() => {
      if (!learnerContext) return null;
      
      let remainingCash = editAmount || 0;
      const breakdown: { name: string, due: number, prior: number, current: number, bal: number }[] = [];

      learnerContext.applicableFees.forEach(fee => {
          const prior = learnerContext.priorPayments[fee.name] || 0;
          const due = Math.max(0, fee.amount - prior);
          
          let current = 0;
          if (editSelectedFees.has(fee.name) && due > 0) {
              if (remainingCash >= due) {
                  current = due;
                  remainingCash -= due;
              } else if (remainingCash > 0) {
                  current = remainingCash;
                  remainingCash = 0;
              }
          }

          const bal = Math.max(0, fee.amount - (prior + current));
          breakdown.push({ name: fee.name, due: fee.amount, prior, current, bal });
      });

      return { breakdown, excess: remainingCash };
  }, [learnerContext, editAmount, editSelectedFees]);

  const toggleEditFee = (feeName: string) => {
      const newSet = new Set(editSelectedFees);
      if (newSet.has(feeName)) newSet.delete(feeName);
      else newSet.add(feeName);
      setEditSelectedFees(newSet);
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTx) return;

      let finalParticulars = editingTx.particulars;
      
      // If Collection, reconstruct particulars from allocationPreview
      if (editingTx.type === TransactionType.COLLECTION && allocationPreview) {
          const parts: string[] = [];
          allocationPreview.breakdown.forEach(item => {
              // Format: Fee Name (Paid: 50, Bal: 50)
              parts.push(`${item.name} (Paid: ${item.current.toLocaleString()}, Bal: ${item.bal.toLocaleString()})`);
          });
          if (allocationPreview.excess > 0) {
              parts.push(`Unallocated Excess (Paid: ${allocationPreview.excess.toLocaleString()}, Bal: 0)`);
          }
          finalParticulars = parts.join('; ');
      }

      const { error } = await supabase
          .from('financial_transactions')
          .update({
              date: editingTx.date,
              amount: editAmount, // Use the state amount
              particulars: finalParticulars, // Use reconstructed particulars
              referenceNo: editingTx.referenceNo,
              disbursementCode: editingTx.disbursementCode,
              learnerName: editingTx.learnerName,
              payee: editingTx.payee
          })
          .eq('id', editingTx.id);

      if (!error) {
          setTransactions(prev => prev.map(t => t.id === editingTx.id ? { ...editingTx, amount: editAmount, particulars: finalParticulars } : t));
          setIsEditModalOpen(false);
          setEditingTx(null);
      } else {
          setNotice({ open: true, title: 'Update Failed', message: `Error updating transaction: ${error.message}`, tone: 'danger' });
      }
  };

  const handlePrintReceipt = (tx: FinancialTransaction) => {
      const learner = learners.find(l => l.id === tx.learnerId);
      const parsedItems = parseParticulars(tx.particulars);

      const printWindow = window.open('', '', 'height=600,width=900');
      if (!printWindow) { setNotice({ open: true, title: 'Pop-up Blocked', message: 'Please allow pop-ups to print the receipt.', tone: 'warning' }); return; }

      const lrnParam = learner?.lrn ? `?lrn=${learner.lrn}` : '';
      const portalUrl = `${window.location.origin}/parent${lrnParam}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(portalUrl)}`;

      printWindow.document.write('<html><head><title>Official Receipt</title>');
      printWindow.document.write(`
        <style>
            @media print { 
                @page { size: 8.5in 5.5in; margin: 0.75in; }
                body { padding: 0 !important; margin: 0 !important; }
            }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; box-sizing: border-box; background: white; font-size: 10px; }
            .container { display: flex; gap: 20px; height: 100%; }
            .col-left { width: 40%; display: flex; flex-direction: column; justify-content: flex-start; border-right: 1px dashed #999; padding-right: 15px; }
            .col-right { flex: 1; display: flex; flex-direction: column; }
            .header { text-align: center; margin-bottom: 15px; }
            .school-name { font-weight: 800; font-size: 11px; text-transform: uppercase; margin: 0; line-height: 1.2; color: #000; }
            .sub-text { font-size: 8px; text-transform: uppercase; margin: 2px 0 0 0; color: #444; letter-spacing: 0.5px; }
            .title { font-size: 14px; font-weight: 900; text-transform: uppercase; margin-top: 8px; letter-spacing: 1px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 2px; }
            .meta-row { display: flex; justify-content: space-between; align-items: center; font-size: 9px; margin-bottom: 4px; }
            .meta-label { font-weight: 700; color: #555; text-transform: uppercase; }
            .meta-val { font-weight: 700; color: #000; }
            .ref-no { color: #cc0000; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 800; }
            .payer-box { margin-top: 10px; border: 1px solid #ccc; padding: 8px; border-radius: 4px; background: #fff; }
            .info-row { display: flex; flex-direction: column; margin-bottom: 6px; }
            .info-label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: #666; margin-bottom: 1px; }
            .info-val { font-size: 10px; font-weight: 700; color: #000; border-bottom: 1px dotted #ccc; padding-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .portal-box { margin-top: 15px; border: 2px solid #000; padding: 8px; border-radius: 6px; background: #f0f0f0; display: flex; align-items: center; gap: 10px; }
            .portal-head { font-weight: 800; text-transform: uppercase; font-size: 9px; margin-bottom: 2px; }
            .portal-url { font-size: 7px; color: #333; margin-bottom: 2px; word-break: break-all; line-height: 1.1; }
            .portal-creds { font-size: 10px; font-weight: bold; margin-top: 2px; }
            .qr-img { width: 50px; height: 50px; border: 2px solid white; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: auto; }
            th { text-align: left; border-bottom: 1px solid #000; padding: 4px; text-transform: uppercase; font-size: 8px; font-weight: 800; }
            td { border-bottom: 1px dashed #eee; padding: 4px; vertical-align: top; }
            .text-right { text-align: right; }
            .total-section { border-top: 2px solid #000; padding-top: 6px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 10px; font-weight: 800; text-transform: uppercase; }
            .total-amount { font-size: 16px; font-weight: 900; color: #000; }
            .footer { margin-top: auto; font-size: 7px; color: #888; text-align: center; padding-top: 10px; }
            .sig-box { margin-top: 25px; text-align: center; width: 100%; }
            .sig-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 2px; font-weight: 700; text-transform: uppercase; font-size: 9px; color: #000; }
            .sig-label { font-size: 7px; text-transform: uppercase; color: #666; }
        </style>
        <body>
        <div class="container">
            <div class="col-left">
                <div>
                    <div class="header">
                        ${config.logoUrl ? `<img src="${config.logoUrl}" style="height: 40px; margin-bottom: 5px; object-fit: contain;" />` : ''}
                        <h1 class="school-name">${config.schoolName}</h1>
                        <p class="sub-text">Parent-Teacher Association</p>
                        <div class="title">Official Receipt</div>
                    </div>
                    <div class="meta-row"><span class="meta-label">Date Issued</span><span class="meta-val">${new Date(tx.date).toLocaleDateString()}</span></div>
                    <div class="meta-row"><span class="meta-label">Receipt No.</span><span class="meta-val ref-no">${tx.referenceNo || tx.id.substring(0,8).toUpperCase()}</span></div>
                    <div class="payer-box">
                        <div class="info-row"><span class="info-label">Received From</span><span class="info-val">${tx.learnerName}</span></div>
                        <div class="info-row"><span class="info-label">Grade / Section</span><span class="info-val">${tx.gradeSection}</span></div>
                        <div class="info-row"><span class="info-label">Student LRN</span><span class="info-val">${learner?.lrn || '-'}</span></div>
                    </div>
                    <div class="portal-box">
                        <img src="${qrApiUrl}" class="qr-img" />
                        <div><div class="portal-head">Parent Portal Access</div><div class="portal-url">${portalUrl}</div><div class="portal-creds">LRN: ${learner?.lrn || 'N/A'}</div></div>
                    </div>
                </div>
                <div class="footer"><div>System ID: ${tx.id} • Generated: ${new Date().toLocaleString()}</div><div style="margin-top:2px;">This document serves as proof of payment.</div></div>
            </div>
            <div class="col-right">
                <table>
                    <thead><tr><th>Particulars / Fee Description</th><th class="text-right" width="60">Paid</th><th class="text-right" width="60">Balance</th></tr></thead>
                    <tbody>${parsedItems.map(item => {
                        const paidVal = parseFloat(item.paid.replace(/,/g, ''));
                        return `<tr><td>${item.name}</td><td class="text-right">${(!isNaN(paidVal) && paidVal > 0) ? item.paid : '-'}</td><td class="text-right">${item.bal}</td></tr>`;
                    }).join('')}</tbody>
                </table>
                <div class="total-section"><span class="total-label">Total Amount Paid</span><span class="total-amount">₱${tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                <div class="sig-box"><div class="sig-line">${config.ptaTreasurerName || 'PTA Staff'}</div><div class="sig-label">PTA Staff / Collecting Officer</div></div>
            </div>
        </div>
        <script>window.onload = function() { setTimeout(function(){ window.print(); }, 500); }<\/script>
        </body></html>
      `);
      printWindow.document.close();
  };

  const handlePrintSectionReport = () => {
      const section = sections.find(s => s.id === printSectionId);
      if (!section) return;

      const sectionLearners = learners.filter(l => l.sectionId === printSectionId);
      
      // Calculate Assessment
      const isSHS = section.gradeLevel === GradeLevel.GRADE_11 || section.gradeLevel === GradeLevel.GRADE_12;
      const isSpecial = !isSHS && (section.strand === 'STE' || section.strand === 'SPA');
      const applicableFees = (config.feeSchedule || []).filter(fee => {
          if (fee.type === 'Base') return true;
          if (fee.type === 'SHS_Only' && isSHS) return true;
          if (fee.type === 'STE_SPA_Only' && isSpecial) return true;
          return false;
      });
      const totalAssessment = applicableFees.reduce((sum, f) => sum + f.amount, 0);

      const data = sectionLearners.map(l => {
          const totalPaid = transactions
            .filter(t => t.learnerId === l.id && t.type === TransactionType.COLLECTION && t.status === 'Posted')
            .reduce((sum, t) => sum + t.amount, 0);
          const balance = Math.max(0, totalAssessment - totalPaid);
          return { ...l, totalPaid, balance };
      });

      const males = data.filter(l => l.gender === 'Male').sort((a, b) => a.lastName.localeCompare(b.lastName));
      const females = data.filter(l => l.gender === 'Female').sort((a, b) => a.lastName.localeCompare(b.lastName));

      const printWindow = window.open('', '', 'height=900,width=800');
      if (!printWindow) { setNotice({ open: true, title: 'Pop-up Blocked', message: 'Please allow pop-ups to print the section report.', tone: 'warning' }); return; }

      printWindow.document.write(`
        <html><head><title>Collection Report</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            h1 { font-size: 18px; text-transform: uppercase; margin: 0; }
            h2 { font-size: 14px; margin: 5px 0; font-weight: normal; }
            .meta-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ccc; padding: 6px 4px; }
            th { background-color: #f0f0f0; text-transform: uppercase; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .group-header { background-color: #e0e0e0; font-weight: bold; text-transform: uppercase; padding: 8px; }
            .summary { margin-top: 20px; border: 1px solid #000; padding: 10px; width: 300px; }
            .signatories { display: flex; justify-content: space-between; margin-top: 50px; page-break-inside: avoid; }
            .sig-box { text-align: center; width: 200px; }
            .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-weight: bold; text-transform: uppercase; font-size: 12px; }
            @media print { @page { size: A4 portrait; margin: 0.5in; } body { padding: 0; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
        </style>
        </head><body>
      `);

      printWindow.document.write(`
        <div class="header">
            ${config.logoUrl ? `<img src="${config.logoUrl}" style="height: 50px; margin-bottom: 5px;" />` : ''}
            <h1>${config.schoolName}</h1>
            <h2>Parent-Teacher Association Collection Report</h2>
        </div>
        <div class="meta-row"><span>Section: ${section.name} (${section.gradeLevel})</span><span>Date: ${new Date().toLocaleDateString()}</span></div>
        <div class="meta-row"><span>Adviser: ${section.adviserName || 'N/A'}</span><span>Assessment per Student: ₱${totalAssessment.toLocaleString()}</span></div>
        <br/>
        <table><thead><tr><th style="width:30px">#</th><th>Learner Name</th><th class="text-right">Total Paid</th><th class="text-right">Balance</th><th class="text-center">Status</th></tr></thead><tbody>
      `);

      if (males.length > 0) {
          printWindow.document.write(`<tr><td colspan="5" class="group-header">Male (${males.length})</td></tr>`);
          males.forEach((m, i) => printWindow.document.write(`<tr><td class="text-center">${i+1}</td><td>${m.lastName}, ${m.firstName}</td><td class="text-right">₱${m.totalPaid.toLocaleString()}</td><td class="text-right">₱${m.balance.toLocaleString()}</td><td class="text-center">${m.balance <= 0 ? 'PAID' : m.totalPaid > 0 ? 'PARTIAL' : 'UNPAID'}</td></tr>`));
      }
      if (females.length > 0) {
          printWindow.document.write(`<tr><td colspan="5" class="group-header">Female (${females.length})</td></tr>`);
          females.forEach((f, i) => printWindow.document.write(`<tr><td class="text-center">${i+1}</td><td>${f.lastName}, ${f.firstName}</td><td class="text-right">₱${f.totalPaid.toLocaleString()}</td><td class="text-right">₱${f.balance.toLocaleString()}</td><td class="text-center">${f.balance <= 0 ? 'PAID' : f.totalPaid > 0 ? 'PARTIAL' : 'UNPAID'}</td></tr>`));
      }

      printWindow.document.write(`</tbody></table>`);
      const totalCollected = data.reduce((s, l) => s + l.totalPaid, 0);
      printWindow.document.write(`
        <div class="summary"><div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px;"><span>Total Collected:</span><span>₱${totalCollected.toLocaleString()}</span></div></div>
        <div class="signatories">
            <div class="sig-box"><div class="sig-line">${config.ptaTreasurerName || 'PTA Staff'}</div><div style="font-size:10px;">PTA Staff</div></div>
            <div class="sig-box"><div class="sig-line">Adviser / School Head</div><div style="font-size:10px;">Noted By</div></div>
        </div>
        <script>window.onload = function() { window.print(); }<\/script></body></html>
      `);
      printWindow.document.close();
      setIsPrintModalOpen(false);
  };

  const handlePrintDailyReport = () => {
      const dayTransactions = transactions.filter(t => t.date === dailyReportDate && t.status === 'Posted');
      const collections = dayTransactions.filter(t => t.type === TransactionType.COLLECTION);
      const expenses = dayTransactions.filter(t => t.type === TransactionType.EXPENSE);
      const totalCollected = collections.reduce((sum, t) => sum + t.amount, 0);
      const totalExpensed = expenses.reduce((sum, t) => sum + t.amount, 0);
      const netCash = totalCollected - totalExpensed;

      const printWindow = window.open('', '', 'height=1100,width=850');
      if (!printWindow) { setNotice({ open: true, title: 'Pop-up Blocked', message: 'Please allow pop-ups to print the daily report.', tone: 'warning' }); return; }

      printWindow.document.write(`
        <html><head><title>Daily Transaction Log</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1f2937; max-width: 210mm; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .school-name { font-weight: 800; font-size: 1.2em; text-transform: uppercase; margin: 0; }
            .sub-header { font-size: 0.8em; text-transform: uppercase; letter-spacing: 2px; color: #4b5563; margin: 5px 0; }
            .report-title { font-size: 1.5em; font-weight: 900; text-transform: uppercase; margin-top: 15px; }
            .date-meta { font-weight: 600; margin-top: 5px; }
            .summary-box { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #000; margin-bottom: 30px; }
            .summary-item { padding: 15px; text-align: center; border-right: 1px solid #000; }
            .summary-item:last-child { border-right: none; }
            .summary-label { display: block; font-size: 0.7em; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 5px; }
            .summary-val { font-size: 1.2em; font-weight: bold; }
            .section-title { font-size: 0.9em; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 0.8em; margin-bottom: 20px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 4px; text-align: left; }
            th { border-bottom: 1px solid #000; font-weight: 700; }
            .text-right { text-align: right; }
            .font-mono { font-family: 'Courier New', monospace; }
            .empty-msg { text-align: center; color: #9ca3af; font-style: italic; padding: 10px; }
            @media print { body { padding: 0; } .summary-box { background-color: transparent !important; } }
        </style>
        </head><body>
        <div class="header">
            ${config.logoUrl ? `<img src="${config.logoUrl}" style="height: 60px; object-fit: contain; margin-bottom: 10px;" />` : ''}
            <h1 class="school-name">${config.schoolName}</h1>
            <p class="sub-header">School Parent-Teacher Association</p>
            <div class="report-title">Daily Transaction Log</div>
            <div class="date-meta">${new Date(dailyReportDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div class="summary-box">
            <div class="summary-item"><span class="summary-label">Total Collections</span><span class="summary-val">₱${totalCollected.toLocaleString()}</span></div>
            <div class="summary-item"><span class="summary-label">Total Expenses</span><span class="summary-val">₱${totalExpensed.toLocaleString()}</span></div>
            <div class="summary-item"><span class="summary-label">Net Cash Change</span><span class="summary-val">₱${netCash.toLocaleString()}</span></div>
        </div>
      `);

      printWindow.document.write(`<div class="section-title">Collections (Inflow)</div>`);
      if (collections.length > 0) {
          printWindow.document.write(`<table><thead><tr><th style="width: 25%">Ref No.</th><th>Payer / Source</th><th class="text-right" style="width: 20%">Amount</th></tr></thead><tbody>`);
          collections.forEach(t => printWindow.document.write(`<tr><td class="font-mono">${t.referenceNo || t.disbursementCode || '-'}</td><td><strong>${t.learnerName || t.source}</strong></td><td class="text-right">₱${t.amount.toLocaleString()}</td></tr>`));
          printWindow.document.write(`</tbody></table>`);
      } else { printWindow.document.write(`<p class="empty-msg">No collections recorded.</p>`); }

      printWindow.document.write(`<div class="section-title">Disbursements (Outflow)</div>`);
      if (expenses.length > 0) {
          printWindow.document.write(`<table><thead><tr><th style="width: 25%">Voucher No.</th><th>Payee</th><th class="text-right" style="width: 20%">Amount</th></tr></thead><tbody>`);
          expenses.forEach(t => printWindow.document.write(`<tr><td class="font-mono">${t.disbursementCode || '-'}</td><td><strong>${t.payee}</strong></td><td class="text-right">₱${t.amount.toLocaleString()}</td></tr>`));
          printWindow.document.write(`</tbody></table>`);
      } else { printWindow.document.write(`<p class="empty-msg">No disbursements recorded.</p>`); }

      printWindow.document.write('<script>window.onload = function() { window.print(); }<\/script></body></html>');
      printWindow.document.close();
      setIsDailyReportOpen(false);
  };

  return (
    <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 bg-[var(--deped-white)] p-4 rounded-xl border border-[var(--deped-line)] shadow-sm">
            <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--deped-muted)]">search</span>
                <input 
                    className="h-[54px] w-full pl-10 pr-4 py-3 border border-[var(--deped-line)] rounded-md bg-[var(--deped-white)] text-[16px] text-[var(--deped-ink)] focus:outline-none focus:border-[var(--deped-line-strong)] focus:ring-2 focus:ring-[rgba(0,56,168,0.08)]"
                    placeholder="Search by Name, Ref No..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <UsisSearchableSelect
                    ariaLabel="Filter transaction type"
                    className="w-44"
                    value={filterType}
                    onChange={setFilterType}
                    placeholder="All Types"
                    options={[
                        { label: 'All Types', value: 'All' },
                        { label: 'Collections', value: 'Collection' },
                        { label: 'Disbursements', value: 'Expense' },
                    ]}
                />
                <input type="date" className="h-[54px] px-4 py-3 border border-[var(--deped-line)] rounded-md bg-[var(--deped-white)] text-[16px] text-[var(--deped-ink)] focus:outline-none focus:border-[var(--deped-line-strong)] focus:ring-2 focus:ring-[rgba(0,56,168,0.08)]" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                <button onClick={() => { setIsDailyReportOpen(true); }} className="h-[54px] px-4 py-3 border border-[var(--deped-line)] bg-[var(--deped-white)] text-[var(--deped-blue)] rounded-md font-bold shadow-sm flex items-center gap-2 hover:bg-[var(--deped-canvas)] whitespace-nowrap">
                    <span className="material-symbols-outlined">fact_check</span> Daily Closing
                </button>
                <button onClick={() => { setPrintSectionId(''); setPrintGradeLevel(''); setIsPrintModalOpen(true); }} className="h-[54px] px-4 py-3 bg-[var(--deped-blue)] text-[var(--deped-white)] rounded-md font-bold shadow-sm flex items-center gap-2 hover:opacity-90 whitespace-nowrap">
                    <span className="material-symbols-outlined">print</span> Section Report
                </button>
            </div>
        </div>

        {/* Transaction History Grouped by Date */}
        <div className="space-y-4">
            {groupedTransactions.map(([date, txs]) => {
                const isExpanded = expandedDates.has(date);
                const dailyTotal = txs.reduce((sum, t) => sum + (t.type === TransactionType.COLLECTION ? t.amount : -t.amount), 0);
                const count = txs.length;

                return (
                    <div key={date} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all">
                        {/* Collapsible Header */}
                        <div onClick={() => toggleDateExpansion(date)} className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50 border-b border-gray-100' : 'hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <button className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-gray-200' : ''}`}><span className="material-symbols-outlined text-gray-500 block">expand_more</span></button>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm md:text-base">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                                    <p className="text-xs text-gray-500">{count} Transaction{count !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`font-bold ${dailyTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{dailyTotal >= 0 ? '+' : ''}₱{dailyTotal.toLocaleString()}</span>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Net Change</p>
                            </div>
                        </div>

                        {/* Collapsible Content */}
                        {isExpanded && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white text-gray-500 uppercase font-bold text-[10px] border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-2 w-24">Ref No.</th>
                                            <th className="px-4 py-2">Entity</th>
                                            <th className="px-4 py-2 text-center w-24">Type</th>
                                            <th className="px-4 py-2 text-right w-32">Amount</th>
                                            <th className="px-4 py-2 text-center w-32">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-5">
                                        {txs.map(tx => (
                                            <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{tx.referenceNo || tx.disbursementCode || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-bold text-gray-800 text-xs md:text-sm">{tx.type === TransactionType.COLLECTION ? tx.learnerName : tx.payee}</p>
                                                    {tx.gradeSection && <span className="text-[10px] text-gray-400">{tx.gradeSection}</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${tx.type === TransactionType.COLLECTION ? 'bg-green-50 text-green-700 border-green-100' : tx.type === TransactionType.EXPENSE ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                                        {tx.type === TransactionType.COLLECTION ? 'In' : 'Out'}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold text-xs md:text-sm ${tx.type === TransactionType.COLLECTION ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.type === TransactionType.COLLECTION ? '+' : '-'}₱{tx.amount.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button onClick={() => { setViewingTx(tx); setIsViewModalOpen(true); }} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded-full transition-colors" title="View Details"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                                                        <button onClick={() => handleEditClick(tx)} className="text-orange-600 hover:bg-orange-100 p-1.5 rounded-full transition-colors" title="Edit"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                        {tx.type === TransactionType.COLLECTION && (
                                                            <button onClick={() => handlePrintReceipt(tx)} className="text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)] p-1.5 rounded-full transition-colors" title="Print Receipt"><span className="material-symbols-outlined text-[18px]">print</span></button>
                                                        )}
                                                        <button onClick={() => setConfirmDeleteId(tx.id)} className="text-red-600 hover:bg-red-100 p-1.5 rounded-full transition-colors" title="Delete"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}
            {groupedTransactions.length === 0 && <div className="p-12 text-center text-gray-400 bg-white border border-gray-200 rounded-xl border-dashed"><span className="material-symbols-outlined text-4xl mb-2 opacity-50">history_edu</span><p>No transactions found for the selected criteria.</p></div>}
        </div>

        {/* View Details Modal */}
        {isViewModalOpen && viewingTx && createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl flex flex-col max-h-[85vh] animate-fade-in">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-[24px]">
                        <h3 className="text-xl font-bold text-gray-800">Transaction Details</h3>
                        <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><span className="material-symbols-outlined text-gray-500">close</span></button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <div className="mb-6 grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-gray-500 uppercase font-bold">Reference No</p><p className="font-mono text-sm">{viewingTx.referenceNo || viewingTx.disbursementCode}</p></div>
                            <div><p className="text-xs text-gray-500 uppercase font-bold">Date</p><p className="text-sm">{viewingTx.date}</p></div>
                            <div className="col-span-2"><p className="text-xs text-gray-500 uppercase font-bold">Entity</p><p className="text-sm font-bold">{viewingTx.learnerName || viewingTx.payee}</p></div>
                        </div>
                        
                        <div className="border rounded-xl overflow-hidden mb-4">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                                    <tr><th className="p-3 text-left">Description</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Bal</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {parseParticulars(viewingTx.particulars).map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3">{item.name}</td>
                                            <td className="p-3 text-right font-medium">{item.paid}</td>
                                            <td className="p-3 text-right text-gray-500">{item.bal}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="font-bold text-gray-600">Total Amount</span>
                            <span className={`text-xl font-bold ${viewingTx.type === TransactionType.COLLECTION ? 'text-green-600' : 'text-red-600'}`}>₱{viewingTx.amount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>, document.body
        )}

        {/* Edit Transaction Modal */}
        {isEditModalOpen && editingTx && createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-xl rounded-2xl p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4">Edit Transaction</h3>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                <input 
                                    type="date" 
                                    className="m3-input w-full"
                                    value={editingTx.date}
                                    onChange={e => setEditingTx({...editingTx, date: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="m3-input w-full font-bold text-lg text-blue-700"
                                    value={editAmount}
                                    onChange={e => setEditAmount(parseFloat(e.target.value) || 0)}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                {editingTx.type === TransactionType.COLLECTION ? 'Learner / Payer Name' : 'Payee'}
                            </label>
                            <input 
                                className="m3-input w-full"
                                value={editingTx.type === TransactionType.COLLECTION ? (editingTx.learnerName || '') : (editingTx.payee || '')}
                                onChange={e => {
                                    if (editingTx.type === TransactionType.COLLECTION) setEditingTx({...editingTx, learnerName: e.target.value});
                                    else setEditingTx({...editingTx, payee: e.target.value});
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reference No.</label>
                            <input 
                                className="m3-input w-full"
                                value={editingTx.referenceNo || editingTx.disbursementCode || ''}
                                onChange={e => {
                                     if (editingTx.type === TransactionType.COLLECTION) setEditingTx({...editingTx, referenceNo: e.target.value});
                                     else setEditingTx({...editingTx, disbursementCode: e.target.value});
                                }}
                            />
                        </div>

                        {/* CONDITIONAL UI: Fee Table for Collections, Textarea for Expenses */}
                        {editingTx.type === TransactionType.COLLECTION && allocationPreview ? (
                            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden mt-4">
                                <div className="p-3 bg-gray-100 text-xs font-bold text-gray-500 uppercase border-b border-gray-200 flex justify-between items-center">
                                    <span>Fee Allocation (Auto-Distribute)</span>
                                    {allocationPreview.excess > 0 && <span className="text-orange-600">Excess: ₱{allocationPreview.excess.toLocaleString()}</span>}
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100 text-[10px] uppercase text-gray-500 font-bold sticky top-0">
                                            <tr>
                                                <th className="p-2 w-8"></th>
                                                <th className="p-2">Fee</th>
                                                <th className="p-2 text-right">Paid</th>
                                                <th className="p-2 text-right text-blue-600">This Tx</th>
                                                <th className="p-2 text-right">Bal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {allocationPreview.breakdown.map(item => (
                                                <tr key={item.name} onClick={() => toggleEditFee(item.name)} className="cursor-pointer hover:bg-blue-50/50 transition-colors">
                                                    <td className="p-2 text-center">
                                                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${editSelectedFees.has(item.name) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'}`}>
                                                            {editSelectedFees.has(item.name) && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-2 font-medium text-gray-800">{item.name}</td>
                                                    <td className="p-2 text-right text-gray-500">{item.prior > 0 ? item.prior.toLocaleString() : '-'}</td>
                                                    <td className="p-2 text-right font-bold text-blue-700">{item.current > 0 ? item.current.toLocaleString() : '-'}</td>
                                                    <td className={`p-2 text-right ${item.bal > 0 ? 'text-red-500' : 'text-green-500'}`}>{item.bal.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Particulars</label>
                                <textarea 
                                    className="m3-input w-full"
                                    rows={3}
                                    value={editingTx.particulars || ''}
                                    onChange={e => setEditingTx({...editingTx, particulars: e.target.value})}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="m3-btn-tonal">Cancel</button>
                            <button type="submit" className="m3-btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>, document.body
        )}

        {/* Delete Confirmation Modal */}
        {confirmDeleteId && createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl animate-fade-in">
                    <h3 className="text-lg font-bold mb-2">Delete Transaction?</h3>
                    <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this record? This action cannot be undone.</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-bold text-sm">Cancel</button>
                        <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold text-sm">Delete</button>
                    </div>
                </div>
            </div>, document.body
        )}

        {/* Section Report Selection Modal (Reused) */}
        {isPrintModalOpen && (
            createPortal(
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-fade-in">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Generate Report</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade Level</label>
                                <select className="m3-input w-full" value={printGradeLevel} onChange={e => { setPrintGradeLevel(e.target.value); setPrintSectionId(''); }}>
                                    <option value="">Select Grade...</option>
                                    {Object.values(GradeLevel).map(g => (<option key={g} value={g}>{g}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Class Section</label>
                                <select className="m3-input w-full" value={printSectionId} onChange={e => setPrintSectionId(e.target.value)} disabled={!printGradeLevel}>
                                    <option value="">{printGradeLevel ? 'Select Section...' : 'Select Grade First'}</option>
                                    {sections.filter(s => s.gradeLevel === printGradeLevel).sort((a,b) => a.name.localeCompare(b.name)).map(s => (<option key={s.id} value={s.id}>{s.name} {s.strand ? `(${s.strand})` : ''}</option>))}
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsPrintModalOpen(false)} className="m3-btn-tonal">Cancel</button>
                                <button onClick={handlePrintSectionReport} className="m3-btn-primary" disabled={!printSectionId}>Print Report</button>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )
        )}

        {/* Daily Report Selection Modal (Reused) */}
        {isDailyReportOpen && (
            createPortal(
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-fade-in">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Daily Closing Report</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Date</label>
                                <input type="date" className="m3-input w-full" value={dailyReportDate} onChange={e => setDailyReportDate(e.target.value)} />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsDailyReportOpen(false)} className="m3-btn-tonal">Cancel</button>
                                <button onClick={handlePrintDailyReport} className="m3-btn-primary">Print Report</button>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )
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
