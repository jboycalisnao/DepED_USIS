import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { FinancialTransaction, Learner, Section, TransactionType, SystemConfig, GradeLevel } from '../types';
import { supabase } from '../lib/supabaseClient';
import { createIdleKioskState, publishKioskState } from '../lib/kiosk';
import { UsisSearchableSelect } from '../../common/components/ui/UsisSearchableSelect';
import { UsisAlertModal } from '../../common/components/UsisAlertModal';
import { openStatementOfAccountPrintWindow } from '../features/finance/soa/utils/printStatementOfAccount';

interface FinanceCollectionProps {
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  learners: Learner[];
  sections: Section[];
  config: SystemConfig;
}

interface FeeBreakdown {
    name: string;
    paid: number;
    bal: number;
}

export const FinanceCollection: React.FC<FinanceCollectionProps> = ({ transactions, setTransactions, learners, sections, config }) => {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchGrade, setSearchGrade] = useState<string>('All');
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  
  // Collection Form State
  const [amount, setAmount] = useState<number>(0);
  const [collectionDate, setCollectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [siblingDiscount, setSiblingDiscount] = useState<{isApplicable: boolean, payerName?: string, feesWaived: string[]}>({ isApplicable: false, feesWaived: [] });
  const [detectedSiblings, setDetectedSiblings] = useState<Learner[]>([]);

  // Summary State
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>({ open: false, title: '', message: '' });
  const [currentTx, setCurrentTx] = useState<FinancialTransaction | null>(null);
  const [currentBreakdown, setCurrentBreakdown] = useState<FeeBreakdown[]>([]);

  const resetForNewTransaction = () => {
      setIsSummaryOpen(false);
      setCurrentTx(null);
      setCurrentBreakdown([]);
      setSelectedLearner(null);
      setAmount(0);
      setSelectedFees(new Set());
      setSiblingDiscount({ isApplicable: false, feesWaived: [] });
      setDetectedSiblings([]);
      setManualEntryMode(false);
  };

  // Helper to get learner for receipt credentials
  const receiptLearner = useMemo(() => {
      if (!currentTx || !currentTx.learnerId) return null;
      return learners.find(l => l.id === currentTx.learnerId);
  }, [currentTx, learners]);

  // Helper to get numeric grade value
  const getGradeVal = (grade?: string) => {
      if (!grade) return 0;
      const match = grade.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
  };

  // 1. Fee Calculation Logic (Base Assessment)
  const learnerAssessment = useMemo(() => {
      if (!selectedLearner) return { isSHS: false, isSpecial: false, total: 0, fees: [] };

      const section = sections.find(s => s.id === selectedLearner.sectionId);
      
      const isSHS = section?.gradeLevel === GradeLevel.GRADE_11 || section?.gradeLevel === GradeLevel.GRADE_12;
      
      const isSpecial = !isSHS && (section?.strand === 'STE' || section?.strand === 'SPA');

      const applicableFees = (config.feeSchedule || []).filter(fee => {
          if (fee.type === 'Base') return true;
          if (fee.type === 'SHS_Only' && isSHS) return true;
          if (fee.type === 'STE_SPA_Only' && isSpecial) return true;
          return false;
      });

      const total = applicableFees.reduce((sum, f) => sum + f.amount, 0);

      return { isSHS, isSpecial, total, fees: applicableFees };
  }, [selectedLearner, sections, config.feeSchedule]);

  // 2. History Calculation (Detailed Breakdown per Fee)
  const paymentHistory = useMemo(() => {
      if (!selectedLearner) return { totalPaid: 0, breakdown: {} as Record<string, number> };
      
      const txs = transactions.filter(t => 
          t.learnerId === selectedLearner.id && 
          t.type === TransactionType.COLLECTION && 
          t.status === 'Posted'
      );

      const breakdown: Record<string, number> = {};
      let totalPaid = 0;

      txs.forEach(tx => {
          totalPaid += tx.amount;
          // Parse particulars to find specific fee payments
          if (tx.particulars) {
              const items = tx.particulars.split('; ');
              items.forEach(item => {
                  // Regex to capture "Fee Name" and "Paid: 1,000.00"
                  const match = item.match(/(.*?) \(Paid: ([0-9,.]+)/);
                  if (match) {
                      const feeName = match[1].trim();
                      const amountPaid = parseFloat(match[2].replace(/,/g, ''));
                      if (!isNaN(amountPaid)) {
                          breakdown[feeName] = (breakdown[feeName] || 0) + amountPaid;
                      }
                  }
              });
          }
      });

      return { totalPaid, breakdown };
  }, [selectedLearner, transactions]);

  // 3. Net Assessment & Balance Calculation
  const financials = useMemo(() => {
      // Calculate amount waived by sibling discount
      const waivedAmount = learnerAssessment.fees
          .filter(f => siblingDiscount.feesWaived.includes(f.name))
          .reduce((sum, f) => sum + f.amount, 0);

      const netAssessed = learnerAssessment.total - waivedAmount;
      
      // The remaining balance is Total Assessment - Total Paid
      const remainingBalance = Math.max(0, netAssessed - paymentHistory.totalPaid);
      const isFullyPaid = learnerAssessment.total > 0 && remainingBalance <= 0;

      return { netAssessed, remainingBalance, isFullyPaid, waivedAmount };
  }, [learnerAssessment, paymentHistory.totalPaid, siblingDiscount]);


  // Reset state and Check Siblings when learner is selected
  useEffect(() => {
      if (selectedLearner) {
          let discountInfo = { isApplicable: false, payerName: '', feesWaived: [] as string[] };
          let foundSiblings: Learner[] = [];

          // --- SIBLING DETECTION LOGIC ---
          const normalize = (s?: string) => s ? s.trim().toLowerCase() : '';
          const currentGuardian = normalize(selectedLearner.guardianName);

          if (currentGuardian && currentGuardian.length > 3 && currentGuardian !== 'parent' && currentGuardian !== 'guardian') {
              const siblings = learners.filter(l => {
                  if (l.id === selectedLearner.id) return false;
                  return normalize(l.guardianName) === currentGuardian;
              });
              
              foundSiblings = siblings;

              if (siblings.length > 0) {
                  // Simple logic: if siblings exist, maybe highlight them. Discount logic usually requires specific rules.
                  // For now, let's keep it simple or manual.
              }
          }
          
          setDetectedSiblings(foundSiblings);
          setSiblingDiscount(discountInfo);

          // --- AUTO-SELECT UNPAID FEES ---
          const unpaidFees = new Set<string>();
          learnerAssessment.fees.forEach(f => {
              const paid = paymentHistory.breakdown[f.name] || 0;
              const isWaived = discountInfo.feesWaived.includes(f.name);
              // Only select if not fully paid AND not waived
              if (paid < f.amount && !isWaived) {
                  unpaidFees.add(f.name);
              }
          });
          setSelectedFees(unpaidFees);
          
          // --- CALCULATE REMAINING BALANCE FOR DEFAULT INPUT ---
          const waivedAmountLocal = learnerAssessment.fees
            .filter(f => discountInfo.feesWaived.includes(f.name))
            .reduce((sum, f) => sum + f.amount, 0);
          
          const netAssessedLocal = learnerAssessment.total - waivedAmountLocal;
          const remainingLocal = Math.max(0, netAssessedLocal - paymentHistory.totalPaid);

          setAmount(remainingLocal);
          setManualEntryMode(false);
      }
  }, [selectedLearner, learnerAssessment, learners, sections, paymentHistory]);

  // Calculated total of currently checked items (Considering remaining balance of each)
  const selectedTotal = useMemo(() => {
      return learnerAssessment.fees
        .filter(f => selectedFees.has(f.name))
        .reduce((sum, f) => {
            const pastPaid = paymentHistory.breakdown[f.name] || 0;
            const remaining = Math.max(0, f.amount - pastPaid);
            return sum + remaining;
        }, 0);
  }, [selectedFees, learnerAssessment, paymentHistory]);

  const tenderedCoverage = useMemo(() => {
      let remainingTendered = Math.max(0, amount);
      const coverage: Record<string, number> = {};

      learnerAssessment.fees.forEach(fee => {
          const pastPaid = paymentHistory.breakdown[fee.name] || 0;
          const isWaived = siblingDiscount.feesWaived.includes(fee.name);
          const outstandingBalance = isWaived ? 0 : Math.max(0, fee.amount - pastPaid);
          const isSelected = selectedFees.has(fee.name);

          let covered = 0;
          if (isSelected && !isWaived && outstandingBalance > 0 && remainingTendered > 0) {
              covered = Math.min(outstandingBalance, remainingTendered);
              remainingTendered -= covered;
          }

          coverage[fee.name] = covered;
      });

      return coverage;
  }, [amount, learnerAssessment.fees, paymentHistory.breakdown, selectedFees, siblingDiscount.feesWaived]);

  const kioskState = useMemo(() => {
      if (!selectedLearner) return createIdleKioskState();

      const sectionName = sections.find(s => s.id === selectedLearner.sectionId)?.name || 'N/A';
      let remainingTendered = Math.max(0, amount);
      const fees = learnerAssessment.fees.map(fee => {
          const paid = paymentHistory.breakdown[fee.name] || 0;
          const waived = siblingDiscount.feesWaived.includes(fee.name);
          const outstandingBalance = waived ? 0 : Math.max(0, fee.amount - paid);
          const selected = selectedFees.has(fee.name);

          let allocated = 0;
          if (selected && !waived && outstandingBalance > 0 && remainingTendered > 0) {
              allocated = Math.min(outstandingBalance, remainingTendered);
              remainingTendered -= allocated;
          }

          return {
              name: fee.name,
              amount: fee.amount,
              paid,
              allocated,
              balance: Math.max(0, outstandingBalance - allocated),
              selected,
              waived
          };
      });

      return {
          learnerName: `${selectedLearner.lastName}, ${selectedLearner.firstName}`,
          gradeSection: sectionName,
          balance: financials.remainingBalance,
          totalPaid: paymentHistory.totalPaid,
          totalAssessment: financials.netAssessed,
          amountTendered: amount,
          status: 'active' as const,
          fees,
          updatedAt: new Date().toISOString()
      };
  }, [selectedLearner, sections, learnerAssessment.fees, paymentHistory, siblingDiscount.feesWaived, selectedFees, financials.remainingBalance, financials.netAssessed, amount]);

  useEffect(() => {
      publishKioskState(kioskState);
  }, [kioskState]);

  // Search Logic
  const filteredLearners = useMemo(() => {
      if (!searchTerm && searchGrade === 'All') return [];
      
      const term = searchTerm.toLowerCase();

      return learners.filter(l => {
          const fullName = `${l.firstName} ${l.lastName}`.toLowerCase();
          const reverseName = `${l.lastName}, ${l.firstName}`.toLowerCase(); // matches "Last, First"
          
          const matchesName = 
            fullName.includes(term) || 
            reverseName.includes(term) ||
            l.lastName.toLowerCase().includes(term) || 
            l.firstName.toLowerCase().includes(term) ||
            l.lrn.includes(searchTerm);
          
          if (searchGrade === 'All') return matchesName;
          
          const section = sections.find(s => s.id === l.sectionId);
          return matchesName && section?.gradeLevel === searchGrade;
      }).slice(0, 20); 
  }, [learners, searchTerm, searchGrade, sections]);

  const handleSelectLearner = (l: Learner) => {
      setSelectedLearner(l);
      setSearchTerm('');
      setSearchGrade('All');
      setIsSearchModalOpen(false);
  };

  const handleQuickAction = (type: 'full' | 'half' | 'pta') => {
      if (financials.isFullyPaid) return;
      setManualEntryMode(false);

      if (type === 'full') {
          const payableFees = learnerAssessment.fees
            .filter(f => {
                const paid = paymentHistory.breakdown[f.name] || 0;
                const isWaived = siblingDiscount.feesWaived.includes(f.name);
                return paid < f.amount && !isWaived;
            })
            .map(f => f.name);
            
          setSelectedFees(new Set(payableFees));
          setAmount(financials.remainingBalance);

      } else if (type === 'half') {
          setAmount(financials.remainingBalance / 2);
          setManualEntryMode(true); 

      } else if (type === 'pta') {
          // Changed 'PTA' logic to 'Clearance' logic for Barangay context as an example
          const ptaFees = learnerAssessment.fees.filter(f => 
              (f.name.toUpperCase().includes('CLEARANCE') || f.name.toUpperCase().includes('PERMIT')) &&
              !siblingDiscount.feesWaived.includes(f.name) 
          );
          
          const unpaidPta = ptaFees.filter(f => (paymentHistory.breakdown[f.name] || 0) < f.amount);
          const ptaSet = new Set(unpaidPta.map(f => f.name));
          setSelectedFees(ptaSet);
          
          const ptaTotal = unpaidPta.reduce((s, f) => {
              const paid = paymentHistory.breakdown[f.name] || 0;
              return s + (f.amount - paid);
          }, 0);
          
          setAmount(Math.min(ptaTotal, financials.remainingBalance));
      }
  };

  const toggleFee = (feeName: string) => {
      if (financials.isFullyPaid) return;
      const newSet = new Set(selectedFees);
      if (newSet.has(feeName)) newSet.delete(feeName);
      else newSet.add(feeName);
      
      setSelectedFees(newSet);

      if (!manualEntryMode) {
          const newTotal = learnerAssessment.fees
            .filter(f => newSet.has(f.name))
            .reduce((sum, f) => {
                const paid = paymentHistory.breakdown[f.name] || 0;
                return sum + Math.max(0, f.amount - paid);
            }, 0);
          
          setAmount(Math.min(newTotal, financials.remainingBalance));
      }
  };

  const handleAmountChange = (val: string) => {
      if (financials.isFullyPaid) return;
      const parsedAmount = parseFloat(val) || 0;
      const newAmount = Math.min(parsedAmount, financials.remainingBalance);
      setAmount(newAmount);
      setManualEntryMode(true);

      const newSelected = new Set<string>();
      let remaining = newAmount;
      
      learnerAssessment.fees.forEach(fee => {
          if (!siblingDiscount.feesWaived.includes(fee.name)) {
              const pastPaid = paymentHistory.breakdown[fee.name] || 0;
              const due = Math.max(0, fee.amount - pastPaid);
              
              if (due > 0 && remaining > 0) {
                  newSelected.add(fee.name);
                  remaining -= due;
              }
          }
      });
      setSelectedFees(newSelected);
  };

  const handlePayment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedLearner || financials.isFullyPaid) return;

      let remainingCash = amount;
      const breakdownStrings: string[] = [];
      const breakdownData: FeeBreakdown[] = [];
      
      // Iterate through ALL fees to build a complete picture
      learnerAssessment.fees.forEach(fee => {
          // 1. Check Historical Status
          const pastPaid = paymentHistory.breakdown[fee.name] || 0;
          const feeBalance = Math.max(0, fee.amount - pastPaid);
          const isWaived = siblingDiscount.feesWaived.includes(fee.name);

          // 2. Allocate Current Payment (Only if selected and has cash)
          let currentPaid = 0;

          if (selectedFees.has(fee.name) && !isWaived && feeBalance > 0) {
              if (remainingCash >= feeBalance) {
                  currentPaid = feeBalance;
                  remainingCash -= feeBalance;
              } else if (remainingCash > 0) {
                  currentPaid = remainingCash;
                  remainingCash = 0;
              }
          }

          // 3. Calculate New Balance for Receipt
          let finalBal = fee.amount - (pastPaid + currentPaid);
          if (isWaived) finalBal = 0;

          // 4. Always add to Breakdown Data (even if 0) so receipt shows full schedule
          breakdownData.push({ 
              name: fee.name + (isWaived ? ' (Waived)' : ''), 
              paid: currentPaid, 
              bal: finalBal 
          });
          
          if (isWaived) {
              breakdownStrings.push(`${fee.name} (Waived)`);
          } else {
              // Format: Fee Name (Paid: 50, Bal: 50)
              breakdownStrings.push(`${fee.name} (Paid: ${currentPaid.toLocaleString()}, Bal: ${finalBal.toLocaleString()})`);
          }
      });

      if (remainingCash > 0) {
          breakdownStrings.push(`Unallocated Excess (Paid: ${remainingCash.toLocaleString()}, Bal: 0)`);
          breakdownData.push({ name: 'Unallocated Excess', paid: remainingCash, bal: 0 });
      }
      
      const particulars = breakdownStrings.join('; ');

      // Use the Custom Selected Date instead of Today
      const txDate = collectionDate || new Date().toISOString().split('T')[0];
      
      const countToday = transactions.filter(t => t.date === txDate && t.type === TransactionType.COLLECTION).length + 1;
      const receiptNo = `${txDate.replace(/-/g, '')}-${String(countToday).padStart(3, '0')}`;

      const newTx: FinancialTransaction = {
          id: Date.now().toString(),
          date: txDate,
          type: TransactionType.COLLECTION,
          category: 'General Collection',
          amount,
          particulars: particulars,
          status: 'Posted',
          learnerId: selectedLearner.id,
          learnerName: `${selectedLearner.lastName}, ${selectedLearner.firstName}`,
          gradeSection: sections.find(s => s.id === selectedLearner.sectionId)?.name || 'N/A',
          recordedBy: 'Admin',
          referenceNo: receiptNo
      };

      // --- SAVE TO DATABASE ---
      const { error } = await supabase.from('financial_transactions').insert(newTx);
      
      if (error) {
          setNotice({ open: true, title: 'Save Failed', message: `Error saving transaction: ${error.message}`, tone: 'danger' });
          return;
      }

      setTransactions(prev => [newTx, ...prev]);
      
      setCurrentTx(newTx);
      setCurrentBreakdown(breakdownData);
      setIsSummaryOpen(true);
  };

  // --- PRINT RECEIPT LOGIC ---
  const handlePrintReceipt = () => {
      if (!currentTx) return;
      
      const printWindow = window.open('', '', 'height=600,width=900');
      if (!printWindow) { setNotice({ open: true, title: 'Pop-up Blocked', message: 'Please allow pop-ups to print the official receipt.', tone: 'warning' }); return; }

      // Generate Parent Portal URL with LRN param for auto-population
      const lrnParam = receiptLearner?.lrn ? `?lrn=${receiptLearner.lrn}` : '';
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
            .info-row:last-child { margin-bottom: 0; }
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
                        <p class="sub-text">SPTA Management System</p>
                        <div class="title">Official Receipt</div>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Date Issued</span>
                        <span class="meta-val">${new Date(currentTx.date).toLocaleDateString()}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Receipt No.</span>
                        <span class="meta-val ref-no">${currentTx.referenceNo || currentTx.id.substring(0,8).toUpperCase()}</span>
                    </div>
                    <div class="payer-box">
                        <div class="info-row"><span class="info-label">Student Name</span><span class="info-val">${currentTx.learnerName}</span></div>
                        <div class="info-row"><span class="info-label">Grade & Section</span><span class="info-val">${currentTx.gradeSection}</span></div>
                        <div class="info-row"><span class="info-label">LRN</span><span class="info-val">${receiptLearner?.lrn || '-'}</span></div>
                    </div>
                    
                    <div class="portal-box">
                        <img src="${qrApiUrl}" class="qr-img" />
                        <div>
                            <div class="portal-head">Student Portal Access</div>
                            <div class="portal-url">${portalUrl}</div>
                            <div class="portal-creds">LRN: ${receiptLearner?.lrn || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    <div>System ID: ${currentTx.id}</div>
                    <div>Generated: ${new Date().toLocaleString()}</div>
                </div>
            </div>
            <div class="col-right">
                <table>
                    <thead><tr><th>Particulars / Fee Description</th><th class="text-right" width="60">Paid</th><th class="text-right" width="60">Balance</th></tr></thead>
                    <tbody>
                        ${currentBreakdown.map(item => `<tr><td>${item.name}</td><td class="text-right">${item.paid > 0 ? item.paid.toLocaleString() : '-'}</td><td class="text-right">${item.bal.toLocaleString()}</td></tr>`).join('')}
                    </tbody>
                </table>
                <div class="total-section">
                    <span class="total-label">Total Amount Paid</span>
                    <span class="total-amount">₱${currentTx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div class="sig-box">
                    <div class="sig-line">${config.ptaTreasurerName || 'Treasurer'}</div>
                    <div class="sig-label">PTA Staff / Collecting Officer</div>
                </div>
            </div>
        </div>
        <script>
            window.onload = function() { setTimeout(function(){ window.print(); }, 500); }
        <\/script>
        </body></html>
      `);
      printWindow.document.close();
  };

  const handlePrintStatementOfAccount = () => {
      if (!selectedLearner) return;

      const selectedSection = sections.find((section) => section.id === selectedLearner.sectionId);
      const opened = openStatementOfAccountPrintWindow({
          learner: selectedLearner,
          section: selectedSection,
          transactions,
          config
      });

      if (!opened) {
          setNotice({
              open: true,
              title: 'Pop-up Blocked',
              message: 'Please allow pop-ups to print the statement of account.',
              tone: 'warning'
          });
      }
  };

  return (
    <div className="flex flex-col h-full">
        {/* Main Content Area */}
        <div className="flex-1 bg-white p-6 rounded-2xl border border-[var(--md-sys-color-outline-variant)] shadow-sm">
            {!selectedLearner ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-5xl text-blue-600">person_search</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Student Selected</h2>
                    <p className="text-gray-500 mb-8 max-w-sm">Search and select a student from the registry to begin processing a new payment collection.</p>
                    <button 
                        onClick={() => setIsSearchModalOpen(true)}
                        className="m3-btn-primary px-8 py-4 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                    >
                        <span className="material-symbols-outlined mr-2">search</span> Find Student
                    </button>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
                    {/* Student Info Card */}
                    <div className="w-full lg:w-80 shrink-0">
                        <div className="rounded-2xl p-6 shadow-lg mb-6 relative overflow-hidden border border-[var(--deped-line)] bg-[var(--deped-white)]">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <span className="material-symbols-outlined text-9xl">account_circle</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/60 text-gray-900">
                                        {selectedLearner.firstName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-bold text-gray-600 tracking-wider">Student</p>
                                        <h3 className="font-bold text-xl leading-tight text-gray-900">{selectedLearner.firstName}</h3>
                                        <h3 className="font-bold text-xl leading-tight text-gray-900">{selectedLearner.lastName}</h3>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <div className="flex justify-between border-b border-white/10 pb-1">
                                        <span>LRN</span>
                                        <span className="font-mono font-bold text-gray-900">{selectedLearner.lrn}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-1">
                                        <span>Grade/Section</span>
                                        <span className="font-bold text-gray-900">{sections.find(s => s.id === selectedLearner.sectionId)?.name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-1">
                                        <span>Parent/Guardian</span>
                                        <span className="font-bold text-gray-900 text-right truncate max-w-[150px]" title={selectedLearner.guardianName}>{selectedLearner.guardianName || 'N/A'}</span>
                                    </div>
                                    
                                    {/* Balance Rows */}
                                    <div className="flex justify-between border-b border-white/10 pb-1 pt-2">
                                        <span className="text-gray-700">Total Assessed</span>
                                        <span className="font-bold text-gray-900">₱{financials.netAssessed.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-1">
                                        <span className="text-gray-700">Total Paid</span>
                                        <span className="font-bold text-gray-900">₱{paymentHistory.totalPaid.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between pt-2">
                                        <span className="font-bold uppercase text-gray-900">Balance</span>
                                        <span className={`font-black text-lg ${financials.remainingBalance > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                                            ₱{financials.remainingBalance.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Fully Paid Banner */}
                        {financials.isFullyPaid && (
                            <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-xl text-green-900 text-sm shadow-sm animate-fade-in">
                                <div className="flex items-center gap-2 mb-1 font-bold uppercase">
                                    <span className="material-symbols-outlined text-xl">check_circle</span>
                                    Account Fully Settled
                                </div>
                                <p className="opacity-90 text-xs">This student has completed all required payments.</p>
                            </div>
                        )}

                        {/* Higher Year Sibling - Show Lower Year Siblings */}
                        {!siblingDiscount.isApplicable && detectedSiblings.length > 0 && (
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
                                <div className="flex items-center gap-2 mb-2 font-bold uppercase text-blue-800">
                                    <span className="material-symbols-outlined text-lg">family_restroom</span>
                                    Household Members
                                </div>
                                <div className="bg-white/50 rounded-lg p-2 border border-blue-100">
                                    <ul className="space-y-1">
                                        {detectedSiblings.map(sib => (
                                            <li key={sib.id} className="flex justify-between border-b border-blue-100 last:border-0 pb-1 last:pb-0">
                                                <span className="font-medium truncate max-w-[120px]">{sib.firstName} {sib.lastName}</span>
                                                <span className="font-bold text-blue-700">{sections.find(s => s.id === sib.sectionId)?.gradeLevel}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={() => setIsSearchModalOpen(true)}
                            className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">switch_account</span> Change Student
                        </button>
                        <button
                            type="button"
                            onClick={handlePrintStatementOfAccount}
                            className="w-full mt-2 py-3 bg-white text-[var(--deped-ink)] font-bold rounded-xl border border-[var(--deped-line)] hover:border-[var(--deped-line-strong)] hover:bg-[var(--deped-canvas)] transition-colors flex items-center justify-center gap-2"
                        >
                            Print Statement of Account
                        </button>
                    </div>

                    {/* Payment Form */}
                    <div className="flex-1 relative">
                        {/* Overlay to disable form if fully paid */}
                        {financials.isFullyPaid && (
                            <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 text-center max-w-sm">
                                    <span className="material-symbols-outlined text-6xl text-green-600 mb-2">task_alt</span>
                                    <h3 className="text-xl font-bold text-gray-800">Payments Complete</h3>
                                    <p className="text-gray-500 text-sm mt-2">No further collection required.</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handlePayment} className={`space-y-6 ${financials.isFullyPaid ? 'opacity-30 pointer-events-none' : ''}`}>
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800">New Payment</h3>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handlePrintStatementOfAccount}
                                        className="px-3 py-1.5 bg-white text-[var(--deped-ink)] rounded-lg text-xs font-bold hover:bg-[var(--deped-canvas)] transition-colors border border-[var(--deped-line)]"
                                    >
                                        Print SOA
                                    </button>
                                    <button type="button" onClick={() => handleQuickAction('full')} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-200">Full</button>
                                    <button type="button" onClick={() => handleQuickAction('half')} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200">Half</button>
                                    <button type="button" onClick={() => handleQuickAction('pta')} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors border border-green-200">Permits/Clearance</button>
                                </div>
                            </div>

                            {/* Fee Checklist */}
                            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                <div className="grid grid-cols-[minmax(0,1fr)_170px] gap-3 p-3 bg-gray-100 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                                    <span>Fee Description</span>
                                    <span className="text-right">Amount / Covered / Balance</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {learnerAssessment.fees.map((fee, idx) => {
                                        const pastPaid = paymentHistory.breakdown[fee.name] || 0;
                                        const remainingBalance = Math.max(0, fee.amount - pastPaid);
                                        const coveredAmount = tenderedCoverage[fee.name] || 0;
                                        const projectedBalance = Math.max(0, remainingBalance - coveredAmount);
                                        const isWaived = siblingDiscount.feesWaived.includes(fee.name);
                                        const isFullyPaid = remainingBalance <= 0;
                                        
                                        // Allow selection only if not waived and not fully paid
                                        const canSelect = !isWaived && !isFullyPaid;

                                        return (
                                            <div 
                                                key={idx} 
                                                className={`grid grid-cols-[minmax(0,1fr)_170px] items-center gap-3 p-3 border-b border-gray-200 last:border-0 transition-colors ${
                                                    !canSelect ? 'bg-gray-100/50 opacity-60 cursor-not-allowed' : 
                                                    selectedFees.has(fee.name) ? 'bg-blue-50/30 hover:bg-blue-50 cursor-pointer' : 'hover:bg-white cursor-pointer'
                                                }`}
                                                onClick={() => canSelect && toggleFee(fee.name)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                                        isWaived || isFullyPaid ? 'border-gray-300 bg-gray-200 text-gray-400' :
                                                        selectedFees.has(fee.name) ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white'
                                                    }`}>
                                                        {isWaived ? <span className="material-symbols-outlined text-[14px]">remove</span> :
                                                         isFullyPaid ? <span className="material-symbols-outlined text-[14px] text-gray-500">check</span> :
                                                         selectedFees.has(fee.name) && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                                                    </div>
                                                    <div>
                                                        <span className={`text-sm ${selectedFees.has(fee.name) ? 'text-gray-900 font-bold' : 'text-gray-600'} ${isWaived || isFullyPaid ? 'text-gray-400' : ''}`}>{fee.name}</span>
                                                        {isWaived && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 rounded uppercase font-bold">Waived</span>}
                                                        {isFullyPaid && !isWaived && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 rounded uppercase font-bold">Settled</span>}
                                                    </div>
                                                </div>
                                                <span className={`text-sm ${selectedFees.has(fee.name) ? 'font-bold text-gray-900' : 'text-gray-500'} ${isWaived ? 'line-through' : ''}`}>
                                                    {pastPaid > 0 && !isFullyPaid ? (
                                                        <span>₱{fee.amount.toFixed(2)} <span className="text-xs text-orange-600 font-bold">(Bal: ₱{remainingBalance.toLocaleString()})</span></span>
                                                    ) : (
                                                        <span>₱{fee.amount.toFixed(2)}</span>
                                                    )}
                                                </span>
                                                {!isWaived && coveredAmount > 0 && (
                                                    <div className="text-right text-xs font-bold text-green-700">Covered: PHP {coveredAmount.toLocaleString()}</div>
                                                )}
                                                {!isWaived && (pastPaid > 0 || coveredAmount > 0 || !isFullyPaid) && (
                                                    <div className="text-right text-xs font-bold text-orange-600">Projected Bal: PHP {projectedBalance.toLocaleString()}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="p-3 bg-white flex justify-between items-center border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Selected Total</span>
                                    <span className="font-bold text-blue-700 text-lg">₱{selectedTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Amount and Date Input */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount Received (PHP)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">₱</span>
                                        <input 
                                            type="number" 
                                            className="w-full pl-10 p-4 border border-gray-300 rounded-xl font-bold text-3xl text-green-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white"
                                            value={amount}
                                            onChange={e => handleAmountChange(e.target.value)}
                                            onFocus={() => setManualEntryMode(true)}
                                            min={0}
                                            max={financials.remainingBalance}
                                            disabled={financials.isFullyPaid}
                                        />
                                    </div>
                                    {Math.abs(amount - selectedTotal) > 0.01 && (
                                        <div className={`text-xs mt-2 font-bold flex items-center gap-1 ${amount > selectedTotal ? 'text-orange-600' : 'text-red-600'}`}>
                                            <span className="material-symbols-outlined text-sm">{amount > selectedTotal ? 'payments' : 'warning'}</span>
                                            {amount > selectedTotal 
                                                ? `Unallocated Excess: ₱${(amount - selectedTotal).toLocaleString()}` 
                                                : `Allocation Missing: ₱${(selectedTotal - amount).toLocaleString()}`
                                            }
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Collection Date</label>
                                    <input 
                                        type="date"
                                        className="w-full p-4 border border-gray-300 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-blue-500 transition-all bg-white h-[70px]"
                                        value={collectionDate}
                                        onChange={e => setCollectionDate(e.target.value)}
                                        disabled={financials.isFullyPaid}
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="m3-btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
                                disabled={financials.isFullyPaid}
                            >
                                <span className="material-symbols-outlined">check_circle</span>
                                Confirm Payment
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>

        {/* FIND STUDENT MODAL */}
        {isSearchModalOpen && createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(18,35,61,0.45)] p-4">
                <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-[var(--deped-line)] bg-[var(--deped-white)] shadow-2xl flex flex-col animate-fade-in">
                    <div className="h-2 grid grid-cols-3">
                        <span className="bg-[var(--deped-blue)]" />
                        <span className="bg-[var(--deped-red)]" />
                        <span className="bg-[var(--deped-yellow)]" />
                    </div>
                    <div className="p-6 border-b border-[var(--deped-line)] flex justify-between items-center bg-[var(--deped-white)]">
                        <h3 className="text-[24px] font-bold text-[var(--deped-ink)]">Find Student</h3>
                        <button
                            onClick={() => setIsSearchModalOpen(false)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[var(--deped-line)] bg-[var(--deped-white)] text-[var(--deped-muted)] transition-colors hover:border-[var(--deped-line-strong)] hover:text-[var(--deped-blue)]"
                            aria-label="Close find student modal"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="p-6 bg-[var(--deped-white)] border-b border-[var(--deped-line)] z-10">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <span className="material-symbols-outlined absolute left-4 top-3.5 text-[var(--deped-muted)]">search</span>
                                <input 
                                    className="w-full h-[54px] pl-12 pr-4 py-3 border border-[var(--deped-line)] rounded-md focus:outline-none focus:border-[var(--deped-line-strong)] focus:ring-2 focus:ring-[rgba(0,56,168,0.08)] text-[16px] bg-[var(--deped-white)] text-[var(--deped-ink)] transition-all"
                                    placeholder="Search by Name or LRN..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <UsisSearchableSelect
                                ariaLabel="Filter by grade level"
                                className="w-44"
                                floatingLabel
                                label="Grade Level"
                                value={searchGrade}
                                onChange={setSearchGrade}
                                placeholder="All Grades"
                                options={[
                                    { label: 'All Grades', value: 'All' },
                                    ...Object.values(GradeLevel).map(g => ({ label: g, value: g })),
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-[var(--deped-canvas)]">
                        {filteredLearners.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-[var(--deped-muted)]">
                                <span className="material-symbols-outlined text-4xl mb-2">person_search</span>
                                <p>Start typing to search...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {filteredLearners.map(l => (
                                    <div 
                                        key={l.id} 
                                        onClick={() => handleSelectLearner(l)}
                                        className="bg-[var(--deped-white)] p-4 rounded-xl border border-[var(--deped-line)] hover:border-[var(--deped-line-strong)] hover:ring-2 hover:ring-[rgba(0,56,168,0.08)] cursor-pointer transition-all flex justify-between items-center group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[rgba(0,56,168,0.12)] text-[var(--deped-blue)] flex items-center justify-center font-bold text-sm">
                                                {l.firstName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[var(--deped-ink)] group-hover:text-[var(--deped-blue)] transition-colors">{l.lastName}, {l.firstName}</h4>
                                                <div className="flex items-center gap-2 text-xs text-[var(--deped-muted)]">
                                                    <span className="font-mono bg-[var(--deped-canvas)] px-1 rounded">{l.lrn}</span>
                                                    {l.guardianName && (
                                                        <span className="flex items-center gap-1 text-[10px] text-[var(--deped-muted)]">
                                                            <span className="material-symbols-outlined text-[10px]">family_restroom</span>
                                                            {l.guardianName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs font-bold text-[var(--deped-ink)] bg-[var(--deped-canvas)] px-2 py-1 rounded">
                                                {sections.find(s => s.id === l.sectionId)?.name}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 bg-[var(--deped-white)] text-center text-xs text-[var(--deped-muted)] border-t border-[var(--deped-line)]">
                        Showing top results. Refine search for more specific matches.
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* PAYMENT SUMMARY MODAL */}
        {isSummaryOpen && currentTx && createPortal(
            <div className="fixed inset-0 z-[100] bg-[var(--md-sys-color-surface)] flex flex-col animate-fade-in">
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                            <span className="material-symbols-outlined text-2xl">check_circle</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--md-sys-color-on-surface)]">Payment Successful</h2>
                            <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">Transaction recorded in the system.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsSummaryOpen(false)} 
                        className="p-2 rounded-full hover:bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] transition-colors"
                    >
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Details */}
                        <div className="space-y-8">
                            <div>
                                <p className="text-sm font-bold text-[var(--md-sys-color-outline)] uppercase tracking-wider mb-2">Student Information</p>
                                <h3 className="text-4xl font-bold text-[var(--md-sys-color-on-surface)] mb-1">{currentTx.learnerName}</h3>
                                <p className="text-xl text-[var(--md-sys-color-on-surface-variant)]">{currentTx.gradeSection}</p>
                                {receiptLearner?.lrn && <p className="font-mono text-sm text-[var(--md-sys-color-primary)] mt-1 tracking-widest">{receiptLearner.lrn}</p>}
                            </div>
                            <div className="p-6 bg-[var(--md-sys-color-surface-container)] rounded-[24px] border border-[var(--md-sys-color-outline-variant)]">
                                <p className="text-sm font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase mb-4">Transaction Details</p>
                                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                    <div><p className="text-xs text-[var(--md-sys-color-outline)]">Reference No.</p><p className="font-mono font-bold text-[var(--md-sys-color-on-surface)]">{currentTx.referenceNo}</p></div>
                                    <div><p className="text-xs text-[var(--md-sys-color-outline)]">Date</p><p className="font-medium text-[var(--md-sys-color-on-surface)]">{currentTx.date}</p></div>
                                </div>
                            </div>
                            <div><p className="text-sm font-bold text-[var(--md-sys-color-outline)] uppercase mb-2">Total Amount Paid</p><p className="text-6xl font-bold text-[var(--md-sys-color-primary)]">₱{currentTx.amount.toLocaleString()}</p></div>
                        </div>
                        <div className="flex flex-col h-full">
                            <p className="text-sm font-bold text-[var(--md-sys-color-outline)] uppercase tracking-wider mb-4">Fee Allocation Breakdown</p>
                            <div className="flex-1 bg-white border border-[var(--md-sys-color-outline-variant)] rounded-[24px] overflow-hidden shadow-sm flex flex-col">
                                <div className="overflow-y-auto flex-1 p-0">
                                    <table className="w-full text-left">
                                        <thead className="bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] text-xs uppercase font-bold sticky top-0"><tr><th className="p-4">Particulars</th><th className="p-4 text-right">Applied</th><th className="p-4 text-right">Balance</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {currentBreakdown.map((item, idx) => (<tr key={idx} className="hover:bg-[var(--md-sys-color-surface-container-low)]"><td className="p-4 font-medium text-[var(--md-sys-color-on-surface)]">{item.name}</td><td className="p-4 text-right font-bold text-[var(--md-sys-color-primary)]">{item.paid > 0 ? `₱${item.paid.toLocaleString()}` : '-'}</td><td className={`p-4 text-right font-medium ${item.bal > 0 ? 'text-[var(--md-sys-color-error)]' : 'text-green-600'}`}>₱{item.bal.toLocaleString()}</td></tr>))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-[var(--md-sys-color-outline-variant)] bg-white flex justify-end gap-4">
                    <button onClick={resetForNewTransaction} className="px-8 py-4 rounded-full border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface)] font-bold hover:bg-[var(--md-sys-color-surface-container)] transition-colors flex items-center gap-2"><span className="material-symbols-outlined">add</span>New Transaction</button>
                    <button onClick={handlePrintReceipt} className="m3-btn-primary px-8 py-4 rounded-md flex items-center gap-2"><span className="material-symbols-outlined">print</span>Print Official Receipt</button>
                </div>
            </div>, document.body
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
