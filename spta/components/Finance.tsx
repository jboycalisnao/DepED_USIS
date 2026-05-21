import React from 'react';
import { FinancialTransaction, Learner, Section, SystemConfig, User } from '../types';
import { FinanceCollection } from './FinanceCollection';
import { FinanceHistory } from './FinanceHistory';
import { FinanceFees } from './FinanceFees';
import { FinanceQuarterlyReport } from './FinanceQuarterlyReport';

type FinanceSectionKey = 'collection' | 'history' | 'fees' | 'quarterly';

interface FinanceProps {
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  learners: Learner[];
  sections: Section[];
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  section: FinanceSectionKey;
  currentUser?: User | null;
}

export const Finance: React.FC<FinanceProps> = ({
  transactions, setTransactions, learners, sections, config, setConfig, section, currentUser
}) => {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="p-4 md:p-6">
          {section === 'collection' && (
            <FinanceCollection
              transactions={transactions}
              setTransactions={setTransactions}
              learners={learners}
              sections={sections}
              config={config}
              cashierName={currentUser?.fullName || currentUser?.username || undefined}
            />
          )}

          {section === 'history' && (
            <FinanceHistory
              transactions={transactions}
              setTransactions={setTransactions}
              learners={learners}
              sections={sections}
              config={config}
            />
          )}

          {section === 'quarterly' && (
            <FinanceQuarterlyReport
              transactions={transactions}
              config={config}
              setConfig={setConfig}
            />
          )}

          {section === 'fees' && (
            <FinanceFees
              config={config}
              setConfig={setConfig}
            />
          )}
        </div>
      </section>
    </div>
  );
};
