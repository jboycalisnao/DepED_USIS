import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SystemConfig, Learner, Section, FinancialTransaction, GradeLevel, TransactionType } from '../types';
import { UsisLoginModal } from '../../common/components/UsisLoginModal';

interface PublicAdviserPortalProps {
  config: SystemConfig;
  learners: Learner[];
  sections: Section[];
  transactions: FinancialTransaction[];
}

export const PublicAdviserPortal: React.FC<PublicAdviserPortalProps> = ({ config, learners, sections, transactions }) => {
  const navigate = useNavigate();
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Supports numeric pins and fallback UUIDs (case insensitive)
      const input = accessCodeInput.trim();
      const section = sections.find(s => 
          s.accessCode === input || 
          s.accessCode === input.toUpperCase()
      );

      if (section) {
          setCurrentSection(section);
          setAccessCodeInput('');
      } else {
          setError('Invalid access key. Please check your adviser access slip.');
      }
      setIsLoading(false);
  };

  const handleLogout = () => {
      setCurrentSection(null);
      setError('');
  };

  // 1. Calculate Assessment Fee for this Section
  const sectionAssessment = useMemo(() => {
      if (!currentSection) return 0;

      const isSHS = currentSection.gradeLevel === GradeLevel.GRADE_11 || currentSection.gradeLevel === GradeLevel.GRADE_12;
      const isSpecial = !isSHS && (currentSection.strand === 'STE' || currentSection.strand === 'SPA');

      const total = (config.feeSchedule || []).reduce((sum, fee) => {
          if (fee.type === 'Base') return sum + fee.amount;
          if (fee.type === 'SHS_Only' && isSHS) return sum + fee.amount;
          if (fee.type === 'STE_SPA_Only' && isSpecial) return sum + fee.amount;
          return sum;
      }, 0);

      return total;
  }, [currentSection, config.feeSchedule]);

  // 2. Process Learners and Financials
  const reportData = useMemo(() => {
      if (!currentSection) return { males: [], females: [], totalCollected: 0, totalExpected: 0 };

      const sectionLearners = learners.filter(l => l.sectionId === currentSection.id);
      
      let totalCollected = 0;
      const processedLearners = sectionLearners.map(l => {
          const paid = transactions
            .filter(t => t.learnerId === l.id && t.type === TransactionType.COLLECTION && t.status === 'Posted')
            .reduce((sum, t) => sum + t.amount, 0);
          
          totalCollected += paid;
          
          return {
              ...l,
              paid,
              balance: Math.max(0, sectionAssessment - paid),
              status: paid >= sectionAssessment ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid'
          };
      });

      const males = processedLearners.filter(l => l.gender === 'Male').sort((a, b) => a.lastName.localeCompare(b.lastName));
      const females = processedLearners.filter(l => l.gender === 'Female').sort((a, b) => a.lastName.localeCompare(b.lastName));

      return {
          males,
          females,
          totalCollected,
          totalExpected: sectionLearners.length * sectionAssessment
      };
  }, [currentSection, learners, transactions, sectionAssessment]);

  const percentage = reportData.totalExpected > 0 
    ? (reportData.totalCollected / reportData.totalExpected) * 100 
    : 0;

  if (!currentSection) {
      return (
        <div className="section-shell spta-adviser-access animate-fade-in">
          <button 
            onClick={() => navigate('/')} 
            className="mb-4 inline-flex items-center text-sm font-bold text-gray-500 hover:text-[var(--md-sys-color-primary)]"
          >
            <span className="material-symbols-outlined mr-1 text-lg">arrow_back</span>
            Back to Portal
          </button>
          <UsisLoginModal
            title="Adviser Access Login"
            username={accessCodeInput}
            password="adviser-access"
            usernameLabel="Access Key"
            passwordLabel="Access Key"
            isSubmitting={isLoading}
            submitLabel="Enter Portal"
            noticeTitle="Access Notice"
            noticeMessage={error || null}
            onDismissNotice={() => setError('')}
            onUsernameChange={setAccessCodeInput}
            onPasswordChange={() => {}}
            onSubmit={handleLogin}
          />
        </div>
      );
  }

  return (
    <div className="animate-fade-in pb-12 max-w-5xl mx-auto px-4 pt-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8 no-print">
            <button 
                onClick={handleLogout} 
                className="flex items-center text-[var(--md-sys-color-primary)] font-bold text-sm hover:underline hover:bg-white/50 px-3 py-2 rounded-full transition-colors"
            >
                <span className="material-symbols-outlined text-lg mr-1">arrow_back</span>
                Change Section
            </button>
            <div className="text-right">
                <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Adviser Mode
                </span>
            </div>
        </div>

        <div className="text-center mb-8 no-print">
            <h1 className="text-3xl font-bold text-[var(--md-sys-color-on-surface)] mb-2">Section Collection Monitor</h1>
            <p className="text-[var(--md-sys-color-on-surface-variant)]">Check payment status and balances for your section.</p>
        </div>

        {/* Report Content */}
        <div className="animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 no-print">
                <div className="p-4 rounded-md border flex items-center gap-4" style={{ background: 'var(--deped-white)', borderColor: 'var(--deped-line)', borderLeft: '4px solid var(--deped-blue)' }}>
                    <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: 'rgba(0,56,168,0.12)', color: 'var(--deped-blue)' }}>
                        <span className="material-symbols-outlined">groups</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold" style={{ color: 'var(--deped-muted)' }}>Population</p>
                        <p className="text-xl font-bold" style={{ color: 'var(--deped-ink)' }}>{reportData.males.length + reportData.females.length} Learners</p>
                    </div>
                </div>
                <div className="p-4 rounded-md border flex items-center gap-4" style={{ background: 'var(--deped-white)', borderColor: 'var(--deped-line)', borderLeft: '4px solid var(--deped-yellow)' }}>
                    <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: 'rgba(252,209,22,0.24)', color: '#7a6200' }}>
                        <span className="material-symbols-outlined">savings</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold" style={{ color: 'var(--deped-muted)' }}>Total Collected</p>
                        <p className="text-xl font-bold" style={{ color: 'var(--deped-ink)' }}>₱{reportData.totalCollected.toLocaleString()}</p>
                    </div>
                </div>
                <div className="p-4 rounded-md border flex items-center gap-4" style={{ background: 'var(--deped-white)', borderColor: 'var(--deped-line)', borderLeft: '4px solid var(--deped-red)' }}>
                    <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: 'rgba(206,17,38,0.12)', color: 'var(--deped-red)' }}>
                        <span className="material-symbols-outlined">pie_chart</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold" style={{ color: 'var(--deped-muted)' }}>Collection Rate</p>
                        <p className="text-xl font-bold" style={{ color: 'var(--deped-ink)' }}>{percentage.toFixed(1)}%</p>
                    </div>
                </div>
            </div>

            {/* Printable List */}
            <div className="bg-white rounded-[24px] shadow-sm border border-[var(--md-sys-color-outline-variant)] overflow-hidden print:shadow-none print:border-none">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-end bg-gray-50 print:bg-white print:border-none print:pb-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{currentSection.name}</h2>
                        <p className="text-gray-600 font-medium">{currentSection.gradeLevel} {currentSection.strand ? `• ${currentSection.strand}` : ''}</p>
                        <p className="text-sm text-gray-500 mt-1">Adviser: {currentSection.adviserName || 'N/A'}</p>
                    </div>
                    <div className="text-right hidden print:block">
                        <p className="text-[10px] text-gray-500">Generated: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Table - Added overflow-x-auto for mobile scroll */}
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-[var(--md-sys-color-surface-container)] text-gray-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 md:px-6 py-3 w-12">#</th>
                                <th className="px-4 md:px-6 py-3">Learner Name</th>
                                <th className="px-4 md:px-6 py-3 text-right">Paid</th>
                                <th className="px-4 md:px-6 py-3 text-right">Balance</th>
                                <th className="px-4 md:px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* MALE HEADER */}
                            {reportData.males.length > 0 && (
                                <tr className="bg-gray-100/50">
                                    <td colSpan={5} className="px-4 md:px-6 py-2 font-bold text-xs text-blue-600 uppercase tracking-wider">
                                        Male ({reportData.males.length})
                                    </td>
                                </tr>
                            )}
                            {reportData.males.map((l, idx) => (
                                <tr key={l.id} className="hover:bg-gray-50">
                                    <td className="px-4 md:px-6 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                                    <td className="px-4 md:px-6 py-3 font-medium uppercase text-gray-700 whitespace-nowrap">{l.lastName}, {l.firstName}</td>
                                    <td className="px-4 md:px-6 py-3 text-right font-medium text-green-700">₱{l.paid.toLocaleString()}</td>
                                    <td className={`px-4 md:px-6 py-3 text-right font-bold ${l.balance > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                        {l.balance > 0 ? `₱${l.balance.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-4 md:px-6 py-3 text-center">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                            l.status === 'Paid' ? 'bg-green-100 text-green-800' : 
                                            l.status === 'Partial' ? 'bg-blue-100 text-blue-800' : 
                                            'bg-gray-100 text-gray-500'
                                        }`}>
                                            {l.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {/* FEMALE HEADER */}
                            {reportData.females.length > 0 && (
                                <tr className="bg-gray-100/50">
                                    <td colSpan={5} className="px-4 md:px-6 py-2 font-bold text-xs text-pink-600 uppercase tracking-wider">
                                        Female ({reportData.females.length})
                                    </td>
                                </tr>
                            )}
                            {reportData.females.map((l, idx) => (
                                <tr key={l.id} className="hover:bg-gray-50">
                                    <td className="px-4 md:px-6 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                                    <td className="px-4 md:px-6 py-3 font-medium uppercase text-gray-700 whitespace-nowrap">{l.lastName}, {l.firstName}</td>
                                    <td className="px-4 md:px-6 py-3 text-right font-medium text-green-700">₱{l.paid.toLocaleString()}</td>
                                    <td className={`px-4 md:px-6 py-3 text-right font-bold ${l.balance > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                        {l.balance > 0 ? `₱${l.balance.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-4 md:px-6 py-3 text-center">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                            l.status === 'Paid' ? 'bg-green-100 text-green-800' : 
                                            l.status === 'Partial' ? 'bg-blue-100 text-blue-800' : 
                                            'bg-gray-100 text-gray-500'
                                        }`}>
                                            {l.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};
