
import React, { useMemo } from 'react';
import { FinancialTransaction, Activity, SystemConfig, TransactionType } from '../types';
import { FinanceDisbursement } from './FinanceDisbursement';

interface DisbursementProps {
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  projects: Activity[];
  config: SystemConfig;
}

export const Disbursement: React.FC<DisbursementProps> = ({ transactions, setTransactions, projects, config }) => {
  // Determine Fiscal Year from Config or default to current
  const fiscalYear = useMemo(() => {
      if (config.schoolYear) {
          const match = config.schoolYear.match(/(\d{4})/);
          return match ? parseInt(match[0]) : new Date().getFullYear();
      }
      return new Date().getFullYear();
  }, [config.schoolYear]);

  // Helper to calculate category balance
  const getCategoryBalance = (category: string) => {
      return transactions
        .filter(t => t.status === 'Posted')
        .reduce((acc, t) => {
            if (t.category === category || t.toCategory === category) {
                if (t.type === TransactionType.COLLECTION) return acc + t.amount;
                if (t.type === TransactionType.REALLOCATION) {
                    if (t.toCategory === category) return acc + t.amount;
                    if (t.category === category) return acc - t.amount;
                }
                if (t.type === TransactionType.EXPENSE && t.category === category) return acc - t.amount;
            }
            return acc;
        }, 0);
  };

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-[28px] font-normal text-[var(--md-sys-color-on-surface)]">Disbursement Management</h1>
            <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">Record, monitor, and manage all financial disbursements and vouchers.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <FinanceDisbursement 
                yearTransactions={transactions} 
                selectedFiscalYear={fiscalYear}
                categories={config.contributionCategories || []}
                projects={projects}
                setTransactions={setTransactions}
                getCategoryBalance={getCategoryBalance}
                config={config}
            />
        </div>
    </div>
  );
};
