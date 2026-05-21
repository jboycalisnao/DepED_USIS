import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SystemConfig, Learner, FinancialTransaction, Section, TransactionType, GradeLevel } from '../types';
import { UsisLoginModal } from '../../common/components/UsisLoginModal';

interface ParentPortalProps {
  config: SystemConfig;
  learners: Learner[];
  sections: Section[];
  transactions: FinancialTransaction[];
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ config, learners, sections, transactions }) => {
  const [lrnInput, setLrnInput] = useState('');
  const [currentLearner, setCurrentLearner] = useState<Learner | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-fill LRN from URL parameter
  useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const lrnParam = searchParams.get('lrn');
      if (lrnParam) {
          setLrnInput(lrnParam);
      }
  }, [location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 800));

    const found = learners.find(l => l.lrn === lrnInput.trim());
    
    if (found) {
        setCurrentLearner(found);
    } else {
        setError('Learner not found. Please check the LRN and try again.');
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
      setCurrentLearner(null);
      setError('');
      window.history.pushState({}, '', '/parent');
      setLrnInput('');
  };

  // --- Financial Calculations ---
  
  // 1. Calculate Required Fees based on Grade/Section
  const assessment = useMemo(() => {
      if (!currentLearner) return { total: 0, fees: [] };

      const section = sections.find(s => s.id === currentLearner.sectionId);
      const isSHS = section?.gradeLevel === GradeLevel.GRADE_11 || section?.gradeLevel === GradeLevel.GRADE_12;
      const isSpecial = !isSHS && (section?.strand === 'STE' || section?.strand === 'SPA');

      const applicableFees = (config.feeSchedule || []).filter(fee => {
          if (fee.type === 'Base') return true;
          if (fee.type === 'SHS_Only' && isSHS) return true;
          if (fee.type === 'STE_SPA_Only' && isSpecial) return true;
          return false;
      });

      const total = applicableFees.reduce((sum, f) => sum + f.amount, 0);
      return { total, fees: applicableFees, sectionName: section?.name, gradeLevel: section?.gradeLevel };
  }, [currentLearner, sections, config.feeSchedule]);

  // 2. Get Payment History
  const paymentHistory = useMemo(() => {
      if (!currentLearner) return [];
      return transactions
        .filter(t => t.learnerId === currentLearner.id && t.type === TransactionType.COLLECTION && t.status === 'Posted')
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentLearner, transactions]);

  // 3. Totals
  const totalPaid = paymentHistory.reduce((sum, t) => sum + t.amount, 0);
  const balance = assessment.total - totalPaid;
  const progress = assessment.total > 0 ? (totalPaid / assessment.total) * 100 : 0;

  // 4. Calculate Detail Per Fee (Table Data)
  const feeStatus = useMemo(() => {
      if (!currentLearner) return [];
      
      const statusMap = new Map<string, { amount: number, paid: number, waived: boolean }>();
      
      // Initialize with base fees
      assessment.fees.forEach(fee => {
          statusMap.set(fee.name, { amount: fee.amount, paid: 0, waived: false });
      });

      // Parse payment history to distribute payments
      paymentHistory.forEach(tx => {
          if (tx.particulars) {
              const items = tx.particulars.split('; ');
              items.forEach(item => {
                  // Regex to capture "Fee Name" and "Paid: 1,000.00"
                  const match = item.match(/(.*?) \(Paid: ([0-9,.]+)/);
                  if (match) {
                      const name = match[1].trim();
                      const amountPaid = parseFloat(match[2].replace(/,/g, ''));
                      
                      if (statusMap.has(name)) {
                          const current = statusMap.get(name)!;
                          statusMap.set(name, { ...current, paid: current.paid + amountPaid });
                      }
                  } else if (item.includes('(Waived')) {
                       const name = item.split(' (Waived')[0].trim();
                       if (statusMap.has(name)) {
                           const current = statusMap.get(name)!;
                           statusMap.set(name, { ...current, waived: true }); 
                       }
                  }
              });
          }
      });

      return Array.from(statusMap.entries()).map(([name, val]) => {
          const effectiveBalance = val.waived ? 0 : Math.max(0, val.amount - val.paid);
          return {
            name,
            amount: val.amount,
            paid: val.paid,
            balance: effectiveBalance,
            isWaived: val.waived
          };
      });
  }, [assessment.fees, paymentHistory, currentLearner]);

  const parseTransactionDetails = (particulars: string) => {
      if (!particulars) return [];
      const items = particulars.split('; ');
      return items.map(item => {
          // Attempt to parse: "Fee Name (Paid: 100, Bal: 50)"
          const match = item.match(/(.*?) \(Paid: (.*?), Bal: (.*?)\)/);
          if (match) {
              return { name: match[1].trim(), paid: match[2], bal: match[3] };
          }
          // Fallback or Waived items
          return { name: item, paid: null, bal: null };
      });
  };

  if (!currentLearner) {
      return (
        <div className="section-shell spta-parent-access animate-fade-in">
          <button 
            onClick={() => navigate('/')} 
            className="mb-4 inline-flex items-center text-sm font-bold text-gray-500 hover:text-[var(--md-sys-color-primary)]"
          >
            <span className="material-symbols-outlined mr-1 text-lg">arrow_back</span>
            Back to Portal
          </button>
          <UsisLoginModal
            title="Parent Access Login"
            username={lrnInput}
            password="parent-access"
            usernameLabel="Learner Reference Number (LRN)"
            passwordLabel="Access Key"
            isSubmitting={isLoading}
            submitLabel="Access Records"
            noticeTitle="Access Notice"
            noticeMessage={error || null}
            onDismissNotice={() => setError('')}
            onUsernameChange={(value) => setLrnInput(value.replace(/[^0-9]/g, ''))}
            onPasswordChange={() => {}}
            onSubmit={handleLogin}
          />
        </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in pb-20">
        <button 
            onClick={() => navigate('/')} 
            className="flex items-center text-gray-500 font-bold text-sm hover:text-[var(--md-sys-color-primary)] transition-colors mb-[-10px]"
        >
            <span className="material-symbols-outlined text-lg mr-1">arrow_back</span>
            Back to Portal
        </button>
        
        {/* Header Card */}
        <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-[var(--md-sys-color-outline-variant)] flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-9xl">face</span>
            </div>
            
            <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md border-4 border-white ${currentLearner.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                    {currentLearner.firstName.charAt(0)}
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[var(--md-sys-color-on-surface)]">
                        {currentLearner.firstName} {currentLearner.lastName}
                    </h1>
                    <p className="text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-2 mt-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider text-gray-600">LRN: {currentLearner.lrn}</span>
                        <span className="text-sm">{assessment.gradeLevel} - {assessment.sectionName}</span>
                    </p>
                </div>
            </div>

            <div className="flex gap-3 relative z-10 w-full md:w-auto">
                <button onClick={handleLogout} className="m3-btn-tonal bg-gray-100 hover:bg-gray-200 border-transparent w-full md:w-auto">
                    <span className="material-symbols-outlined mr-2">logout</span> Exit
                </button>
            </div>
        </div>

        {/* Financial Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-600 rounded-[24px] p-6 text-white shadow-lg shadow-blue-200 flex flex-col justify-between h-40 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-20">
                    <span className="material-symbols-outlined text-9xl">assignment</span>
                </div>
                <p className="font-bold uppercase text-xs tracking-widest opacity-80">Total Assessed Fees</p>
                <div>
                    <h3 className="text-4xl font-bold">₱{assessment.total.toLocaleString()}</h3>
                    <p className="text-xs opacity-80 mt-1">Fiscal Year {config.schoolYear}</p>
                </div>
            </div>

            <div className="bg-green-600 rounded-[24px] p-6 text-white shadow-lg shadow-green-200 flex flex-col justify-between h-40 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-20">
                    <span className="material-symbols-outlined text-9xl">payments</span>
                </div>
                <p className="font-bold uppercase text-xs tracking-widest opacity-80">Total Paid</p>
                <div>
                    <h3 className="text-4xl font-bold">₱{totalPaid.toLocaleString()}</h3>
                    <div className="w-full bg-black/20 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-white h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                    <p className="text-xs opacity-80 mt-1">{progress.toFixed(0)}% Settled</p>
                </div>
            </div>

            <div className={`rounded-[24px] p-6 shadow-lg flex flex-col justify-between h-40 relative overflow-hidden border-2 ${balance > 0 ? 'bg-white border-orange-100 shadow-orange-100' : 'bg-white border-green-100 shadow-green-100'}`}>
                <div className={`absolute -right-4 -bottom-4 opacity-10 ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    <span className="material-symbols-outlined text-9xl">account_balance_wallet</span>
                </div>
                <p className="font-bold uppercase text-xs tracking-widest text-gray-500">Outstanding Balance</p>
                <div>
                    <h3 className={`text-4xl font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        ₱{balance.toLocaleString()}
                    </h3>
                    <p className={`text-xs mt-1 font-bold ${balance > 0 ? 'text-orange-400' : 'text-green-600'}`}>
                        {balance > 0 ? 'Payment Required' : 'Fully Paid'}
                    </p>
                </div>
            </div>
        </div>

        {/* Breakdown Table */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[var(--md-sys-color-outline-variant)]">
            <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--md-sys-color-primary)]">list_alt</span>
                Fee Breakdown & Balance
            </h3>
            
            <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th className="p-4">Fee / Description</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-right">Paid</th>
                            <th className="p-4 text-right">Balance</th>
                            <th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {feeStatus.map((fee, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-medium text-gray-800">
                                    {fee.name}
                                    {fee.isWaived && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase">Waived</span>}
                                </td>
                                <td className="p-4 text-right text-gray-600">₱{fee.amount.toLocaleString()}</td>
                                <td className="p-4 text-right text-green-700 font-medium">
                                    {fee.paid > 0 ? `₱${fee.paid.toLocaleString()}` : '-'}
                                </td>
                                <td className={`p-4 text-right font-bold ${fee.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                    {fee.balance > 0 ? `₱${fee.balance.toLocaleString()}` : '0.00'}
                                </td>
                                <td className="p-4 text-center">
                                    {fee.balance <= 0 ? (
                                        <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                                    ) : (
                                        <span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold text-gray-800">
                        <tr>
                            <td className="p-4 uppercase text-xs tracking-wider">Total</td>
                            <td className="p-4 text-right">₱{assessment.total.toLocaleString()}</td>
                            <td className="p-4 text-right text-green-700">₱{totalPaid.toLocaleString()}</td>
                            <td className="p-4 text-right text-red-600">₱{balance.toLocaleString()}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        {/* Collapsible Transaction History Table */}
        <details className="group bg-white rounded-[24px] border border-[var(--md-sys-color-outline-variant)] shadow-sm overflow-hidden">
            <summary className="p-6 cursor-pointer list-none flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--md-sys-color-primary)]">history</span>
                    Transaction History
                </h3>
                <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">expand_more</span>
            </summary>
            
            <div className="border-t border-gray-200">
                {paymentHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                        <p>No payment records found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-200">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Reference No.</th>
                                    <th className="p-4">Payment Details / Fee Allocation</th>
                                    <th className="p-4 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paymentHistory.map(tx => {
                                    const details = parseTransactionDetails(tx.particulars);
                                    return (
                                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 whitespace-nowrap text-gray-700 align-top">
                                                {new Date(tx.date).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-gray-500 align-top">
                                                {tx.referenceNo || tx.id.substring(0,8)}
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="space-y-1">
                                                    {details.map((item, i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                                            <span className="font-medium text-gray-800">{item.name}</span>
                                                            {item.paid ? (
                                                                <span className="text-gray-500 ml-4">
                                                                    Paid: <span className="font-bold text-green-700">₱{item.paid}</span> 
                                                                    <span className="text-gray-300 mx-1">|</span> 
                                                                    Bal: {item.bal}
                                                                </span>
                                                            ) : (
                                                                <span className="text-orange-600 ml-4 italic font-bold">Waived/Adjusted</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-green-700 text-lg align-top">
                                                +₱{tx.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </details>
    </div>
  );
};

