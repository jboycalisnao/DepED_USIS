import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Layout } from '../Layout';
import { Dashboard } from '../Dashboard';
import { Finance } from '../Finance';
import { Disbursement } from '../Disbursement';
import { Learners } from '../Learners';
import { Settings } from '../Settings';
import { SystemConfig, User, Learner, Section, FinancialTransaction, Activity } from '../../types';

interface AdminRoutesProps {
  currentUser: User | null;
  config: SystemConfig;
  onLogout: () => void;
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  learners: Learner[];
  setLearners: React.Dispatch<React.SetStateAction<Learner[]>>;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  projects: Activity[];
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  lastFetchTime: number;
  unauthorizedElement: React.ReactNode;
}

export const renderAdminRoutes = ({
  currentUser,
  config,
  onLogout,
  transactions,
  setTransactions,
  learners,
  setLearners,
  sections,
  setSections,
  projects,
  users,
  setUsers,
  setConfig,
  lastFetchTime,
  unauthorizedElement
}: AdminRoutesProps) => (
  <Route
    path="/admin/*"
    element={
      currentUser ? (
        <Layout currentUser={currentUser} onLogout={onLogout} config={config}>
          <Routes>
            <Route path="/" element={<Dashboard transactions={transactions} projects={projects} learners={learners} sections={sections} config={config} lastFetchTime={lastFetchTime} />} />
            <Route path="finance" element={<Navigate to="/admin/finance/collection" replace />} />
            <Route path="finance/collection" element={<Finance section="collection" transactions={transactions} setTransactions={setTransactions} learners={learners} sections={sections} config={config} setConfig={setConfig} />} />
            <Route path="finance/history" element={<Finance section="history" transactions={transactions} setTransactions={setTransactions} learners={learners} sections={sections} config={config} setConfig={setConfig} />} />
            <Route path="finance/quarterly" element={<Finance section="quarterly" transactions={transactions} setTransactions={setTransactions} learners={learners} sections={sections} config={config} setConfig={setConfig} />} />
            <Route path="finance/fees" element={<Finance section="fees" transactions={transactions} setTransactions={setTransactions} learners={learners} sections={sections} config={config} setConfig={setConfig} />} />
            <Route path="disbursements" element={<Disbursement transactions={transactions} setTransactions={setTransactions} projects={projects} config={config} />} />
            <Route path="learners" element={<Learners learners={learners} setLearners={setLearners} sections={sections} setSections={setSections} config={config} setConfig={setConfig} />} />
            <Route path="settings" element={<Settings config={config} setConfig={setConfig} transactions={transactions} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Layout>
      ) : (
        unauthorizedElement
      )
    }
  />
);
