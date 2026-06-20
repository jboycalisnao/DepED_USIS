import { supabase } from '@deped-usis/shared-supabase';

export type LearnerIdOrderPeriodRecord = {
  endDate: string;
  id: string;
  isActive: boolean;
  label: string;
  startDate: string;
};

export type LearnerIdRequestRecord = {
  createdAt: string;
  guardianNumber: string;
  id: string;
  notes: string;
  orderPeriodEndDate: string | null;
  orderPeriodId: string;
  orderPeriodLabel: string;
  orderStatus: string;
  referenceNo: string;
};

export type LearnerIdServiceAvailabilityRecord = {
  isPublished: boolean;
};

const MAX_REFERENCE_RETRY = 30;

const normalizeText = (value: unknown) => String(value || '').trim();
const normalizeStatus = (value: unknown) => normalizeText(value).toLowerCase() || 'pending';
const parseOrderPeriodDate = (value: unknown) => {
  const text = normalizeText(value);
  if (!text) return null;
  const parsed = new Date(`${text}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isOrderPeriodCurrentlyValid = (startDate: unknown, endDate: unknown) => {
  const start = parseOrderPeriodDate(startDate);
  const end = parseOrderPeriodDate(endDate);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (start && todayStart < start) return false;
  if (end && todayStart > end) return false;
  return true;
};

const mapOrderPeriodRow = (row: any): LearnerIdOrderPeriodRecord => ({
  endDate: normalizeText(row.end_date),
  id: normalizeText(row.id),
  isActive: Boolean(row.is_active),
  label: normalizeText(row.label),
  startDate: normalizeText(row.start_date),
});

const makeReferencePrefix = (orderKind: 'id') => (orderKind === 'id' ? 'IDR' : 'ORD');

export const loadLearnerIdServiceAvailability = async (): Promise<LearnerIdServiceAvailabilityRecord> => {
  const { data, error } = await supabase
    .from('merch_products')
    .select('id,is_published')
    .eq('sku', 'ID-001')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('ID service availability query failed:', error);
    return { isPublished: false };
  }

  return {
    isPublished: Boolean(data?.is_published),
  };
};

const generateOrderReferenceNo = async (orderKind: 'id', orderPeriodLabel: string) => {
  const prefix = makeReferencePrefix(orderKind);
  const periodDigits = String(orderPeriodLabel || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');

  for (let attempt = 0; attempt < MAX_REFERENCE_RETRY; attempt += 1) {
    const digits = `${Math.floor(10000 + Math.random() * 90000)}`;
    const candidate = `${prefix}${periodDigits}${digits}`;
    const existing = await supabase
      .from('merch_orders')
      .select('id')
      .eq('reference_no', candidate)
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error('Unable to verify generated ID request reference number.');
    if (!existing.data?.id) return candidate;
  }

  throw new Error('Unable to generate unique ID request reference number.');
};

export const loadActiveIdOrderPeriod = async (): Promise<LearnerIdOrderPeriodRecord | null> => {
  const primary = await supabase
    .from('merch_order_periods')
    .select('id,label,start_date,end_date,is_active')
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .order('end_date', { ascending: false });

  if (!primary.error) {
    const activePeriods = (primary.data || [])
      .map(mapOrderPeriodRow)
      .filter((period) => isOrderPeriodCurrentlyValid(period.startDate, period.endDate));

    if (activePeriods[0]) {
      return activePeriods[0];
    }

    return null;
  }

  console.warn('ID service active period query failed:', primary.error);

  const fallback = await supabase
    .from('merch_order_periods')
    .select('id,label,start_date,end_date,is_active')
    .order('start_date', { ascending: false });

  if (fallback.error) throw new Error('Unable to load active ID request period.');

  const fallbackPeriods = (fallback.data || [])
    .map(mapOrderPeriodRow)
    .filter((period) => isOrderPeriodCurrentlyValid(period.startDate, period.endDate));

  return fallbackPeriods[0] || null;
};

const isIdRequestRow = (row: any) => {
  const orderKind = normalizeText(row.order_kind);
  if (orderKind) return orderKind === 'id';
  const referenceNo = normalizeText(row.reference_no).toUpperCase();
  return referenceNo.startsWith('IDR');
};

export const fetchLearnerIdRequests = async (params: {
  learnerId: string;
  learnerLrn: string;
}): Promise<LearnerIdRequestRecord[]> => {
  const learnerId = normalizeText(params.learnerId);
  const learnerLrn = normalizeText(params.learnerLrn);

  const primary = await supabase
    .from('merch_orders')
    .select('id,created_at,reference_no,order_kind,learner_id,learner_lrn,order_status,notes,order_period_id,guardian_contact_number,merch_order_periods(label,end_date)')
    .order('created_at', { ascending: false });

  const mapRows = (rows: any[]) =>
    rows.map((row: any) => ({
      createdAt: normalizeText(row.created_at),
      guardianNumber: normalizeText(row.guardian_contact_number),
      id: normalizeText(row.id),
      notes: normalizeText(row.notes),
      orderPeriodEndDate: row?.merch_order_periods?.end_date ? normalizeText(row.merch_order_periods.end_date) : null,
      orderPeriodId: normalizeText(row.order_period_id),
      orderPeriodLabel: normalizeText(row?.merch_order_periods?.label) || 'ID Request',
      orderStatus: normalizeStatus(row.order_status),
      referenceNo: normalizeText(row.reference_no),
    }));

  if (!primary.error) {
    return mapRows((primary.data || []).filter((row: any) => {
      if (!isIdRequestRow(row)) return false;
      const matchesLearnerId = learnerId ? normalizeText(row.learner_id) === learnerId : false;
      const matchesLearnerLrn = learnerLrn ? normalizeText(row.learner_lrn) === learnerLrn : false;
      return matchesLearnerId || matchesLearnerLrn;
    }));
  }

  console.warn('ID service request query failed, using fallback columns:', primary.error);

  const fallback = await supabase
    .from('merch_orders')
    .select('id,created_at,reference_no,learner_id,learner_lrn,order_status,notes,order_period_id,merch_order_periods(label,end_date)')
    .order('created_at', { ascending: false });

  if (fallback.error) throw new Error('Unable to load ID requests.');

  return mapRows((fallback.data || []).filter((row: any) => {
    const matchesLearnerId = learnerId ? normalizeText(row.learner_id) === learnerId : false;
    const matchesLearnerLrn = learnerLrn ? normalizeText(row.learner_lrn) === learnerLrn : false;
    const isIdByPrefix = normalizeText(row.reference_no).toUpperCase().startsWith('IDR');
    return isIdByPrefix && (matchesLearnerId || matchesLearnerLrn);
  }));
};

export const placeLearnerIdRequest = async (payload: {
  learnerId: string;
  learnerLrn: string;
  learnerName: string;
  notes: string;
}) => {
  const activePeriod = await loadActiveIdOrderPeriod();
  if (!activePeriod?.id) {
    throw new Error('No valid order period is available for ID requests.');
  }

  const learnerId = normalizeText(payload.learnerId);
  const learnerLrn = normalizeText(payload.learnerLrn);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const learnerIdForDb = uuidPattern.test(learnerId) ? learnerId : null;

  let learnerProfile = null as { contact_number?: string | null } | null;
  if (learnerIdForDb) {
    const byId = await supabase
      .from('registrar_learners')
      .select('contact_number')
      .eq('id', learnerIdForDb)
      .limit(1)
      .maybeSingle();
    if (byId.error) throw new Error('Unable to load learner contact number for ID request.');
    learnerProfile = byId.data || null;
  } else if (learnerLrn) {
    const byLrn = await supabase
      .from('registrar_learners')
      .select('contact_number')
      .eq('lrn', learnerLrn)
      .limit(1)
      .maybeSingle();
    if (byLrn.error) throw new Error('Unable to load learner contact number for ID request.');
    learnerProfile = byLrn.data || null;
  }

  const existingRequestQuery = supabase
    .from('merch_orders')
    .select('id,order_status,order_kind,order_period_id,learner_id,learner_lrn,reference_no')
    .eq('order_period_id', activePeriod.id)
    .order('created_at', { ascending: false })
    .limit(200);

  const existingRequestResult = await existingRequestQuery;
  if (existingRequestResult.error) throw new Error('Unable to validate existing ID request.');

  const existingRequest = (existingRequestResult.data || []).find((row: any) => {
    const rowKind = normalizeText(row.order_kind);
    const isId = rowKind ? rowKind === 'id' : normalizeText(row.reference_no).toUpperCase().startsWith('IDR');
    if (!isId) return false;
    const matchesLearnerId = learnerId ? normalizeText(row.learner_id) === learnerId : false;
    const matchesLearnerLrn = learnerLrn ? normalizeText(row.learner_lrn) === learnerLrn : false;
    return matchesLearnerId || matchesLearnerLrn;
  });

  if (existingRequest?.id) {
    throw new Error(`You already have an ID request for ${activePeriod.label}.`);
  }

  const referenceNo = await generateOrderReferenceNo('id', activePeriod.label);
  const { error } = await supabase.from('merch_orders').insert([
    {
      learner_id: learnerIdForDb,
      learner_lrn: learnerLrn || null,
      learner_name: normalizeText(payload.learnerName) || null,
      guardian_contact_number: normalizeText(learnerProfile?.contact_number) || null,
      notes: normalizeText(payload.notes) || null,
      order_kind: 'id',
      order_period_id: activePeriod.id,
      order_source: 'learner_portal',
      order_status: 'pending',
      reference_no: referenceNo,
    },
  ]);

  if (error) throw new Error(error.message || 'Unable to submit ID request.');
};
