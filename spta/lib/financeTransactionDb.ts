import type { FinancialTransaction } from '../types';

export const SPTA_FINANCIAL_TRANSACTIONS_TABLE = 'spta_financial_transactions';

type DbTransactionRow = Record<string, any>;

export const toDbFinancialTransaction = (tx: Partial<FinancialTransaction>): DbTransactionRow => ({
  id: tx.id,
  txn_date: tx.date,
  amount: tx.amount,
  txn_type: tx.type,
  category: tx.category,
  status: tx.status,
  particulars: tx.particulars,
  learner_id: tx.learnerId ?? null,
  learner_name: tx.learnerName ?? null,
  payee: tx.payee ?? null,
  reference_no: tx.referenceNo ?? null,
  disbursement_code: tx.disbursementCode ?? null,
  fiscal_year: tx.fiscalYear ?? null,
  quarter: tx.quarter ?? null,
  liquidation_status: tx.liquidationStatus ?? null,
  liquidation_date: tx.liquidationDate ?? null,
  audit_status: tx.auditStatus ?? null,
  activity_id: tx.activityId ?? null,
  is_deficit: tx.isDeficit ?? false,
  to_category: tx.toCategory ?? null,
  source: tx.source ?? null,
  recorded_by: tx.recordedBy ?? null,
  grade_section: tx.gradeSection ?? null
});

export const fromDbFinancialTransaction = (row: DbTransactionRow): FinancialTransaction => ({
  id: row.id,
  date: row.txn_date ?? row.date ?? '',
  amount: Number(row.amount ?? 0),
  type: row.txn_type ?? row.type,
  category: row.category ?? '',
  status: row.status ?? 'Posted',
  particulars: row.particulars ?? '',
  learnerId: row.learner_id ?? row.learnerId ?? undefined,
  learnerName: row.learner_name ?? row.learnerName ?? undefined,
  payee: row.payee ?? undefined,
  referenceNo: row.reference_no ?? row.referenceNo ?? undefined,
  disbursementCode: row.disbursement_code ?? row.disbursementCode ?? undefined,
  fiscalYear: row.fiscal_year ?? row.fiscalYear ?? undefined,
  quarter: row.quarter ?? undefined,
  liquidationStatus: row.liquidation_status ?? row.liquidationStatus ?? undefined,
  liquidationDate: row.liquidation_date ?? row.liquidationDate ?? undefined,
  auditStatus: row.audit_status ?? row.auditStatus ?? undefined,
  activityId: row.activity_id ?? row.activityId ?? undefined,
  isDeficit: row.is_deficit ?? row.isDeficit ?? undefined,
  toCategory: row.to_category ?? row.toCategory ?? undefined,
  source: row.source ?? undefined,
  recordedBy: row.recorded_by ?? row.recordedBy ?? undefined,
  gradeSection: row.grade_section ?? row.gradeSection ?? undefined
});

