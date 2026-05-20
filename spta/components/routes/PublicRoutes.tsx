import React from 'react';
import { Route } from 'react-router-dom';
import { SystemConfig, Learner, Section, FinancialTransaction } from '../../types';
import { PublicLayout } from '../shell/PublicLayout';
import { PublicPortal } from '../PublicPortal';
import { ParentPortal } from '../ParentPortal';
import { PublicAdviserPortal } from '../PublicAdviserPortal';
import { VerificationPage } from '../VerificationPage';
import { AccessPage } from '../AccessPage';
import { CoordinatorAccessRecord } from '../../../coordinator/features/auth/utils/coordinatorAccess';

interface PublicRoutesProps {
  config: SystemConfig;
  learners: Learner[];
  sections: Section[];
  transactions: FinancialTransaction[];
  onAccessSuccess: (record: CoordinatorAccessRecord) => void;
}

export const renderPublicRoutes = ({
  config,
  learners,
  sections,
  transactions,
  onAccessSuccess
}: PublicRoutesProps) => (
  <>
    <Route path="/" element={<PublicLayout config={config}><PublicPortal config={config} /></PublicLayout>} />
    <Route path="/parent" element={<PublicLayout config={config}><ParentPortal config={config} learners={learners} sections={sections} transactions={transactions} /></PublicLayout>} />
    <Route path="/adviser" element={<PublicLayout config={config}><PublicAdviserPortal config={config} learners={learners} sections={sections} transactions={transactions} /></PublicLayout>} />
    <Route path="/access" element={<PublicLayout config={config}><AccessPage onAccessSuccess={onAccessSuccess} /></PublicLayout>} />
    <Route path="/verify/:type/:id" element={<VerificationPage />} />
    <Route path="/verify/finance/:id" element={<VerificationPage />} />
  </>
);
