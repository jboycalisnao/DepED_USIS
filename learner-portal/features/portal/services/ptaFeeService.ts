import { supabase } from '@deped-usis/shared-supabase';

type FeeType = 'Base' | 'SHS_Only' | 'STE_SPA_Only';

type FeeItem = {
  name: string;
  amount: number;
  type: FeeType;
};

export type LearnerPtaFeeTransaction = {
  id: string;
  date: string;
  referenceNo: string;
  amount: number;
  particulars: string;
};

export type LearnerPtaFeeBreakdownRow = {
  name: string;
  amount: number;
  paid: number;
  balance: number;
  isWaived: boolean;
};

export type LearnerPtaFeeSnapshot = {
  learnerName: string;
  lrn: string;
  sectionName: string;
  gradeLevel: string;
  strand: string;
  schoolYear: string;
  totalAssessed: number;
  totalPaid: number;
  totalBalance: number;
  breakdown: LearnerPtaFeeBreakdownRow[];
  transactions: LearnerPtaFeeTransaction[];
};

const toText = (value: unknown) => String(value || '').trim();
const toNumber = (value: unknown) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const isShs = (gradeLevel: string) => /11|12/.test(gradeLevel);

const isSpecial = (gradeLevel: string, strand: string) => {
  if (isShs(gradeLevel)) return false;
  const normalized = strand.trim().toUpperCase();
  return normalized === 'STE' || normalized === 'SPA';
};

const isApplicableFee = (fee: FeeItem, gradeLevel: string, strand: string) => {
  if (fee.type === 'Base') return true;
  if (fee.type === 'SHS_Only') return isShs(gradeLevel);
  if (fee.type === 'STE_SPA_Only') return isSpecial(gradeLevel, strand);
  return false;
};

const parseParticularLine = (line: string) => {
  const paidMatch = line.match(/(.*?) \(Paid: ([0-9,.]+)/);
  if (paidMatch) {
    return {
      feeName: toText(paidMatch[1]),
      paid: toNumber(String(paidMatch[2]).replace(/,/g, '')),
      waived: false,
    };
  }

  if (line.includes('(Waived')) {
    return {
      feeName: toText(line.split(' (Waived')[0]),
      paid: 0,
      waived: true,
    };
  }

  return null;
};

export async function fetchLearnerPtaFeeSnapshot(input: { learnerId?: string; lrn?: string; schoolYear?: string }): Promise<LearnerPtaFeeSnapshot> {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);
  const requestedSchoolYear = toText(input.schoolYear);

  let learnerQuery = supabase
    .from('registrar_learners')
    .select(
      `
      id,
      lrn,
      first_name,
      last_name,
      section_id,
      enrollment_history,
      registrar_sections (
        id,
        name,
        grade_level,
        strand
      )
      `
    )
    .limit(1);

  if (learnerId) {
    learnerQuery = learnerQuery.eq('id', learnerId);
  } else if (lrn) {
    learnerQuery = learnerQuery.eq('lrn', lrn);
  } else {
    throw new Error('Learner PTA fee lookup requires learner ID or LRN.');
  }

  const { data: learnerData, error: learnerError } = await learnerQuery.maybeSingle();
  if (learnerError) throw new Error(learnerError.message || 'Unable to load learner record.');
  if (!learnerData) throw new Error('No learner profile record was found.');

  const sectionData = (learnerData as any)?.registrar_sections;
  const gradeLevel = toText(sectionData?.grade_level);
  const strand = toText(sectionData?.strand);
  const sectionName = toText(sectionData?.name);

  const { data: systemConfigData } = await supabase.from('spta_system_config').select('config').eq('id', 1).maybeSingle();
  const config = (systemConfigData as any)?.config || {};
  const activeConfigSchoolYear = toText(config?.schoolYear);
  const schoolYear = requestedSchoolYear || activeConfigSchoolYear;

  const { data: feeConfigData } = schoolYear
    ? await supabase
        .from('spta_fee_configurations')
        .select('fee_schedule')
        .eq('school_year', schoolYear)
        .maybeSingle()
    : { data: null };

  const feeSchedule = Array.isArray((feeConfigData as any)?.fee_schedule)
    ? ((feeConfigData as any).fee_schedule as FeeItem[])
    : Array.isArray(config?.feeSchedule)
      ? (config.feeSchedule as FeeItem[])
      : [];

  const applicableFees = feeSchedule.filter((fee) => isApplicableFee(fee, gradeLevel, strand));

  let txQuery = supabase
    .from('spta_financial_transactions')
    .select('id,txn_date,amount,txn_type,status,particulars,reference_no,school_year')
    .eq('learner_id', toText((learnerData as any).id))
    .eq('txn_type', 'Collection')
    .eq('status', 'Posted');

  if (schoolYear) {
    txQuery = txQuery.eq('school_year', schoolYear);
  }

  const { data: txData, error: txError } = await txQuery.order('txn_date', { ascending: false });

  if (txError) throw new Error(txError.message || 'Unable to load PTA transactions.');

  const transactions: LearnerPtaFeeTransaction[] = (txData || []).map((row: any) => ({
    id: toText(row.id),
    date: toText(row.txn_date),
    referenceNo: toText(row.reference_no),
    amount: toNumber(row.amount),
    particulars: toText(row.particulars),
  }));

  const statusMap = new Map<string, { amount: number; paid: number; waived: boolean }>();
  applicableFees.forEach((fee) => {
    statusMap.set(toText(fee.name), { amount: toNumber(fee.amount), paid: 0, waived: false });
  });

  transactions.forEach((tx) => {
    const items = tx.particulars ? tx.particulars.split('; ') : [];
    items.forEach((line) => {
      const parsed = parseParticularLine(line);
      if (!parsed) return;
      const current = statusMap.get(parsed.feeName);
      if (!current) return;
      statusMap.set(parsed.feeName, {
        amount: current.amount,
        paid: current.paid + parsed.paid,
        waived: current.waived || parsed.waived,
      });
    });
  });

  const breakdown: LearnerPtaFeeBreakdownRow[] = Array.from(statusMap.entries()).map(([name, value]) => {
    const balance = value.waived ? 0 : Math.max(0, value.amount - value.paid);
    return {
      name,
      amount: value.amount,
      paid: value.paid,
      balance,
      isWaived: value.waived,
    };
  });

  const totalAssessed = breakdown.reduce((sum, row) => sum + row.amount, 0);
  const totalPaid = transactions.reduce((sum, row) => sum + row.amount, 0);
  const totalBalance = Math.max(0, totalAssessed - totalPaid);

  const snapshot: LearnerPtaFeeSnapshot = {
    learnerName: `${toText((learnerData as any).first_name)} ${toText((learnerData as any).last_name)}`.trim(),
    lrn: toText((learnerData as any).lrn),
    sectionName,
    gradeLevel,
    strand,
    schoolYear,
    totalAssessed,
    totalPaid,
    totalBalance,
    breakdown,
    transactions,
  };

  return snapshot;
}
