import { openSoaPrintWindow } from '../../../../../common/utils/statementOfAccountPrint';
import { FeeItem, FinancialTransaction, Learner, Section, SystemConfig, TransactionType } from '../../../../types';

type StatementFeeRow = {
  name: string;
  assessed: number;
  paid: number;
  balance: number;
};

type OpenStatementOfAccountPrintWindowPayload = {
  learner: Learner;
  section?: Section;
  transactions: FinancialTransaction[];
  config: SystemConfig;
};

const isFeeApplicable = (fee: FeeItem, section?: Section) => {
  const gradeLevel = section?.gradeLevel || '';
  const isShs = gradeLevel === 'Grade 11' || gradeLevel === 'Grade 12';
  const isSpecial = !isShs && (section?.strand === 'STE' || section?.strand === 'SPA');

  if (fee.type === 'Base') return true;
  if (fee.type === 'SHS_Only') return isShs;
  if (fee.type === 'STE_SPA_Only') return isSpecial;
  return false;
};

const getFeePaidBreakdown = (transactions: FinancialTransaction[], learnerId: string) => {
  const paidByFee: Record<string, number> = {};

  transactions
    .filter((tx) => tx.learnerId === learnerId && tx.type === TransactionType.COLLECTION && tx.status === 'Posted')
    .forEach((tx) => {
      if (!tx.particulars) return;
      tx.particulars.split('; ').forEach((item: string) => {
        const match = item.match(/(.*?) \(Paid: ([0-9,.]+)/);
        if (!match) return;
        const feeName = String(match[1] || '').trim();
        const paid = Number.parseFloat(String(match[2] || '').replace(/,/g, ''));
        if (!feeName || Number.isNaN(paid)) return;
        paidByFee[feeName] = (paidByFee[feeName] || 0) + paid;
      });
    });

  return paidByFee;
};

const buildStatementRows = (payload: OpenStatementOfAccountPrintWindowPayload): StatementFeeRow[] => {
  const feeSchedule = payload.config.feeSchedule || [];
  const applicableFees = feeSchedule.filter((fee) => isFeeApplicable(fee, payload.section));
  const paidByFee = getFeePaidBreakdown(payload.transactions, payload.learner.id);

  return applicableFees.map((fee) => {
    const paid = Math.max(0, paidByFee[fee.name] || 0);
    const assessed = Math.max(0, Number(fee.amount || 0));
    const balance = Math.max(0, assessed - paid);
    return { name: fee.name, assessed, paid, balance };
  });
};

const buildPaymentHistoryRows = (payload: OpenStatementOfAccountPrintWindowPayload) => {
  return payload.transactions
    .filter((tx) => tx.learnerId === payload.learner.id && tx.type === TransactionType.COLLECTION && tx.status === 'Posted')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 10)
    .map((tx) => ({
      date: String(tx.date || ''),
      referenceNo: String(tx.referenceNo || tx.id || '-'),
      particulars: String(tx.particulars || '-'),
      amount: Number(tx.amount || 0),
    }));
};

export const openStatementOfAccountPrintWindow = (payload: OpenStatementOfAccountPrintWindowPayload): boolean => {
  const learnerName = `${payload.learner.lastName}, ${payload.learner.firstName}${payload.learner.middleName ? ` ${payload.learner.middleName}` : ''}`.trim();
  const sectionLabel = payload.section ? `${payload.section.gradeLevel} - ${payload.section.name}` : 'Unassigned';
  const guardian = payload.learner.guardianName || payload.learner.fatherName || payload.learner.motherName || 'N/A';

  return openSoaPrintWindow({
    learnerName,
    lrn: payload.learner.lrn,
    gradeSection: sectionLabel,
    parentOrGuardian: guardian,
    schoolName: payload.config.schoolName || 'LEON NATIONAL HIGH SCHOOL',
    schoolYear: payload.config.schoolYear || 'N/A',
    issuedBy: 'SPTA',
    feeRows: buildStatementRows(payload),
    paymentHistoryRows: buildPaymentHistoryRows(payload),
  });
};
