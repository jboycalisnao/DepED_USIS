import { supabase } from '../../../../../packages/shared-supabase/src';
import { normalizeMerchOrderStatus, toMerchOrderDbStatus } from '../order-control/utils/orderStatus';

export type MerchOrderControlRecord = {
  createdAt: string;
  gradeLevel: string;
  id: string;
  learnerId: string;
  learnerLrn: string;
  learnerName: string;
  notes: string;
  orderStatus: string;
  orderAmount: number;
  orderPeriodLabel: string;
  orderSource: 'integrated_admin' | 'learner_portal' | 'unknown';
  productName: string;
  quantity: number;
  referenceNo: string;
  sectionName: string;
  selectedSize: string;
  unitPrice: number;
};

type LearnerSectionInfo = {
  gradeLevel: string;
  sectionName: string;
};

export type MerchActiveLearnerOption = {
  id: string;
  label: string;
  gradeLevel: string;
  lrn: string;
  name: string;
  sectionName: string;
};

export const resolveMerchLearnerDisplayName = (
  record: Pick<MerchOrderControlRecord, 'learnerId' | 'learnerLrn' | 'learnerName'>,
  learners: Pick<MerchActiveLearnerOption, 'id' | 'lrn' | 'name'>[] = [],
) => {
  const learnerId = String(record.learnerId || '').trim();
  if (learnerId) {
    const matchedById = learners.find((learner) => String(learner.id || '').trim() === learnerId);
    if (matchedById?.name) return matchedById.name;
  }

  const learnerLrn = String(record.learnerLrn || '').trim();
  if (learnerLrn) {
    const matchedByLrn = learners.find((learner) => String(learner.lrn || '').trim() === learnerLrn);
    if (matchedByLrn?.name) return matchedByLrn.name;
  }

  return String(record.learnerName || '').trim() || 'Unnamed Learner';
};

const normalizeLearnerMatchValue = (value: string) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const resolveMerchLearnerProfile = (
  record: Pick<MerchOrderControlRecord, 'learnerId' | 'learnerLrn' | 'learnerName' | 'gradeLevel' | 'sectionName'>,
  learners: Pick<MerchActiveLearnerOption, 'id' | 'lrn' | 'name' | 'gradeLevel' | 'sectionName'>[] = [],
) => {
  const learnerId = String(record.learnerId || '').trim();
  if (learnerId) {
    const matchedById = learners.find((learner) => String(learner.id || '').trim() === learnerId);
    if (matchedById) {
      return {
        gradeLevel: String(matchedById.gradeLevel || '').trim() || String(record.gradeLevel || '').trim() || 'Unassigned',
        name: String(matchedById.name || '').trim() || String(record.learnerName || '').trim() || 'Unnamed Learner',
        sectionName: String(matchedById.sectionName || '').trim() || String(record.sectionName || '').trim() || 'Unassigned',
      };
    }
  }

  const learnerLrn = String(record.learnerLrn || '').trim();
  if (learnerLrn) {
    const matchedByLrn = learners.find((learner) => String(learner.lrn || '').trim() === learnerLrn);
    if (matchedByLrn) {
      return {
        gradeLevel: String(matchedByLrn.gradeLevel || '').trim() || String(record.gradeLevel || '').trim() || 'Unassigned',
        name: String(matchedByLrn.name || '').trim() || String(record.learnerName || '').trim() || 'Unnamed Learner',
        sectionName: String(matchedByLrn.sectionName || '').trim() || String(record.sectionName || '').trim() || 'Unassigned',
      };
    }
  }

  const learnerName = normalizeLearnerMatchValue(String(record.learnerName || ''));
  if (learnerName) {
    const matchedByName = learners.find((learner) => normalizeLearnerMatchValue(String(learner.name || '')) === learnerName);
    if (matchedByName) {
      return {
        gradeLevel: String(matchedByName.gradeLevel || '').trim() || String(record.gradeLevel || '').trim() || 'Unassigned',
        name: String(matchedByName.name || '').trim() || String(record.learnerName || '').trim() || 'Unnamed Learner',
        sectionName: String(matchedByName.sectionName || '').trim() || String(record.sectionName || '').trim() || 'Unassigned',
      };
    }
  }

  return {
    gradeLevel: String(record.gradeLevel || '').trim() || 'Unassigned',
    name: String(record.learnerName || '').trim() || 'Unnamed Learner',
    sectionName: String(record.sectionName || '').trim() || 'Unassigned',
  };
};

export const hydrateMerchOrderLearnerNames = (
  rows: MerchOrderControlRecord[],
  learners: Pick<MerchActiveLearnerOption, 'id' | 'lrn' | 'name' | 'gradeLevel' | 'sectionName'>[] = [],
) =>
  rows.map((row) => {
    const profile = resolveMerchLearnerProfile(row, learners);
    return {
      ...row,
      gradeLevel: profile.gradeLevel,
      learnerName: profile.name,
      sectionName: profile.sectionName,
    };
  });

export type MerchManualOrderPayload = {
  learnerId?: string;
  learnerLrn: string;
  learnerName: string;
  notes: string;
  productId: string;
  quantity: number;
  selectedSize: string;
};

export type MerchManualOrderCreateResult = {
  createdAt: string;
  orderId: string;
  orderPeriodLabel: string;
  referenceNo: string;
};

export type MerchProductOption = {
  availableSizes: string[];
  id: string;
  name: string;
  price: number;
};

export type MerchOrderAuditRecord = {
  changedBy: string;
  createdAt: string;
  fromStatus: string;
  notes: string;
  source: string;
  toStatus: string;
};

export type MerchOrderPaymentRecord = {
  createdAt: string;
  id: string;
  orderId: string;
  paidAt: string;
  paymentAmount: number;
  paymentMethod: string;
  paymentNotes: string;
  paymentStatus: 'posted' | 'voided';
  postedBy: string;
  receiptNo: string;
  transactionNo: string;
  updatedAt: string;
  voidedAt: string;
  voidedBy: string;
};

export type MerchOrderCountsSummary = {
  countsBySource: Array<{ count: number; source: string }>;
  countsByStatus: Array<{ count: number; status: string }>;
  orderPeriodOptions: string[];
  selectedOrderPeriod: string;
  totalOrders: number;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REFERENCE_RETRY = 5;
const MAX_PAYMENT_TRANSACTION_RETRY = 30;

const isUniqueViolation = (error: any, columnHint: string) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return (code === '23505' || message.includes('duplicate') || details.includes('duplicate')) &&
    (message.includes(columnHint) || details.includes(columnHint));
};

const makeOrderPeriodPrefix = (label: string) => {
  const cleaned = String(label || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return 'ORD';
  return cleaned.slice(0, 3).padEnd(3, 'X');
};

const generateOrderReferenceNo = async (orderPeriodLabel: string) => {
  const prefix = makeOrderPeriodPrefix(orderPeriodLabel);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const digits = `${Math.floor(10000 + Math.random() * 90000)}`;
    const candidate = `${prefix}${digits}`;
    const existing = await supabase
      .from('merch_orders')
      .select('id')
      .eq('order_kind', 'merch')
      .eq('reference_no', candidate)
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error('Unable to verify generated reference number.');
    if (!existing.data?.id) return candidate;
  }
  throw new Error('Unable to generate unique order reference number.');
};

const generatePaymentTransactionNo = async () => {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  for (let attempt = 0; attempt < MAX_PAYMENT_TRANSACTION_RETRY; attempt += 1) {
    const suffix = `${Math.floor(1000 + Math.random() * 9000)}`;
    const candidate = `PAY-${stamp}-${suffix}`;
    const existing = await supabase
      .from('merch_order_payments')
      .select('id')
      .eq('transaction_no', candidate)
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error('Unable to verify payment transaction number.');
    if (!existing.data?.id) return candidate;
  }
  throw new Error('Unable to generate unique payment transaction number.');
};

export const getIntegratedAdminActorName = () => {
  if (typeof window === 'undefined') return 'Integrated Admin';
  try {
    const raw = window.sessionStorage.getItem('usis_integrated_admin_access');
    if (!raw) return 'Integrated Admin';
    const parsed = JSON.parse(raw) as { coordinatorName?: string };
    const name = String(parsed?.coordinatorName || '').trim();
    return name || 'Integrated Admin';
  } catch {
    return 'Integrated Admin';
  }
};

const addMerchOrderAudit = async (params: {
  changedBy?: string | null;
  fromStatus: string | null;
  notes?: string | null;
  orderId: string;
  source: 'integrated_admin' | 'learner_portal';
  toStatus: string;
}) => {
  const { error } = await supabase.from('merch_order_status_audit').insert([
    {
      order_id: params.orderId,
      from_status: params.fromStatus,
      to_status: params.toStatus,
      changed_source: params.source,
      changed_by: params.changedBy || getIntegratedAdminActorName(),
      notes: params.notes || null,
    },
  ]);
  if (error) {
    // Keep status operations working even if audit table/policy is not ready.
    console.warn('Merch order audit logging failed:', error.message);
  }
};

const getOrderStatusSnapshot = async (orderId: string) => {
  const { data, error } = await supabase
    .from('merch_orders')
    .select('order_status')
    .eq('order_kind', 'merch')
    .eq('id', orderId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('Unable to read current order status.');
  const status = String(data?.order_status || '').trim() || 'pending';
  return normalizeMerchOrderStatus(status);
};

export const loadMerchOrderControlRecords = async (): Promise<MerchOrderControlRecord[]> => {
  let rows: any[] = [];
  const primaryResult = await supabase
    .from('merch_orders')
    .select(
      `
        id,
        created_at,
        learner_id,
        learner_lrn,
        learner_name,
        reference_no,
        order_status,
        order_source,
        notes,
        merch_order_items(quantity, selected_size, merch_products(name, price, merch_order_periods(label)))
      `,
    )
    .eq('order_kind', 'merch')
    .order('created_at', { ascending: false });

  if (primaryResult.error) {
    const message = String(primaryResult.error.message || '').toLowerCase();
    const details = String(primaryResult.error.details || '').toLowerCase();
    const missingReferenceColumn = message.includes('reference_no') || details.includes('reference_no');
    if (!missingReferenceColumn) throw new Error('Unable to load merch orders.');

    const fallbackResult = await supabase
      .from('merch_orders')
      .select(
        `
          id,
          created_at,
          learner_id,
          learner_lrn,
          learner_name,
          order_status,
          order_source,
          notes,
          merch_order_items(quantity, selected_size, merch_products(name, price, merch_order_periods(label)))
        `,
      )
      .eq('order_kind', 'merch')
      .order('created_at', { ascending: false });
    if (fallbackResult.error) throw new Error('Unable to load merch orders.');
    rows = fallbackResult.data || [];
  } else {
    rows = primaryResult.data || [];
  }

  const activeSectionIds = new Set<string>();
  const sectionLookup = new Map<string, LearnerSectionInfo>();
  const activeSchoolYearResult = await supabase
    .from('registrar_school_years')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  const activeSchoolYearId = String(activeSchoolYearResult.data?.id || '').trim();
  if (!activeSchoolYearResult.error && activeSchoolYearId) {
    const sectionsResult = await supabase
      .from('registrar_sections')
      .select('id,name,grade_level,school_year_id')
      .eq('school_year_id', activeSchoolYearId);
    if (!sectionsResult.error) {
      const activeSections = sectionsResult.data || [];
      activeSections.forEach((section: any) => {
        const sectionId = String(section.id || '').trim();
        if (!sectionId) return;
        activeSectionIds.add(sectionId);
        sectionLookup.set(sectionId, {
          gradeLevel: String(section.grade_level || '').trim() || 'Unassigned',
          sectionName: String(section.name || '').trim() || 'Unassigned',
        });
      });
    }
  }

  const learnerIds = Array.from(
    new Set(
      rows
        .map((row: any) => String(row.learner_id || '').trim())
        .filter(Boolean),
    ),
  );
  const learnerLrns = Array.from(
    new Set(
      rows
        .map((row: any) => String(row.learner_lrn || '').trim())
        .filter(Boolean),
    ),
  );

  const learnerLookup = new Map<string, LearnerSectionInfo>();

  if (learnerIds.length > 0 || learnerLrns.length > 0) {
    const learnersByIdResult = learnerIds.length > 0
      ? await supabase
          .from('registrar_learners')
          .select('id,lrn,section_id')
          .in('id', learnerIds)
      : { data: [], error: null } as any;

    const learnersByLrnResult = learnerLrns.length > 0
      ? await supabase
          .from('registrar_learners')
          .select('id,lrn,section_id')
          .in('lrn', learnerLrns)
      : { data: [], error: null } as any;

    const learnersRaw = [
      ...(learnersByIdResult.data || []),
      ...(learnersByLrnResult.data || []),
    ];

    const dedupedLearnersMap = new Map<string, any>();
    learnersRaw.forEach((learner: any) => {
      const idKey = String(learner.id || '').trim();
      const lrnKey = String(learner.lrn || '').trim();
      if (idKey) dedupedLearnersMap.set(`id:${idKey}`, learner);
      if (lrnKey) dedupedLearnersMap.set(`lrn:${lrnKey}`, learner);
    });
    const dedupedLearners = Array.from(
      new Map(
        Array.from(dedupedLearnersMap.values()).map((learner: any) => [String(learner.id || '').trim(), learner]),
      ).values(),
    );

    dedupedLearners.forEach((learner: any) => {
      const sectionId = String(learner.section_id || '').trim();
      if (!sectionId || !activeSectionIds.has(sectionId)) return;
      const info = sectionLookup.get(sectionId);
      if (!info) return;

      const learnerIdKey = String(learner.id || '').trim();
      const learnerLrnKey = String(learner.lrn || '').trim();
      if (learnerIdKey) learnerLookup.set(`id:${learnerIdKey}`, info);
      if (learnerLrnKey) learnerLookup.set(`lrn:${learnerLrnKey}`, info);
    });
  }

  return rows.flatMap((row: any) => {
    const items = Array.isArray(row.merch_order_items) ? row.merch_order_items : [];
    const learnerIdKey = `id:${String(row.learner_id || '').trim()}`;
    const learnerLrnKey = `lrn:${String(row.learner_lrn || '').trim()}`;
    const learnerInfo = learnerLookup.get(learnerIdKey) || learnerLookup.get(learnerLrnKey);

    const resolvedLearnerInfo = learnerInfo || { gradeLevel: 'Unassigned', sectionName: 'Unassigned' };

    if (items.length === 0) {
      return [
        {
          createdAt: String(row.created_at || ''),
          gradeLevel: resolvedLearnerInfo.gradeLevel,
          id: String(row.id || ''),
          learnerId: String(row.learner_id || ''),
          learnerLrn: String(row.learner_lrn || ''),
          learnerName: String(row.learner_name || ''),
          notes: String(row.notes || ''),
          orderStatus: normalizeMerchOrderStatus(String(row.order_status || 'pending')),
          orderAmount: 0,
          orderPeriodLabel: '',
          orderSource: String(row.order_source || '') === 'integrated_admin'
            ? 'integrated_admin'
            : String(row.order_source || '') === 'learner_portal'
              ? 'learner_portal'
              : 'unknown',
          productName: 'Unknown Product',
          quantity: 0,
          referenceNo: String(row.reference_no || ''),
          sectionName: resolvedLearnerInfo.sectionName,
          selectedSize: '',
          unitPrice: 0,
        } satisfies MerchOrderControlRecord,
      ];
    }
    return items.map((item: any) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item?.merch_products?.price || 0);
      return ({
      createdAt: String(row.created_at || ''),
      gradeLevel: resolvedLearnerInfo.gradeLevel,
      id: String(row.id || ''),
      learnerId: String(row.learner_id || ''),
      learnerLrn: String(row.learner_lrn || ''),
      learnerName: String(row.learner_name || ''),
      notes: String(row.notes || ''),
      orderStatus: normalizeMerchOrderStatus(String(row.order_status || 'pending')),
      orderAmount: Math.max(0, quantity * unitPrice),
      orderPeriodLabel: String(item?.merch_products?.merch_order_periods?.label || ''),
      orderSource: String(row.order_source || '') === 'integrated_admin'
        ? 'integrated_admin'
        : String(row.order_source || '') === 'learner_portal'
          ? 'learner_portal'
          : 'unknown',
      productName: String(item?.merch_products?.name || 'Unknown Product'),
      quantity,
      referenceNo: String(row.reference_no || ''),
      sectionName: resolvedLearnerInfo.sectionName,
      selectedSize: String(item.selected_size || ''),
      unitPrice: Math.max(0, unitPrice),
    } satisfies MerchOrderControlRecord);
    });
  });
};

export const updateMerchOrderStatus = async (
  orderId: string,
  orderStatus: string,
  options?: { auditNote?: string; expectedFromStatus?: string },
) => {
  const currentStatusResult = await supabase
    .from('merch_orders')
    .select('order_status')
    .eq('order_kind', 'merch')
    .eq('id', orderId)
    .limit(1)
    .maybeSingle();
  if (currentStatusResult.error) throw new Error('Unable to read current order status.');

  const fromStatus = normalizeMerchOrderStatus(String(currentStatusResult.data?.order_status || ''));
  const nextStatus = normalizeMerchOrderStatus(orderStatus);
  const nextDbStatus = toMerchOrderDbStatus(nextStatus);
  const normalizedExpectedFromStatus = options?.expectedFromStatus ? normalizeMerchOrderStatus(options.expectedFromStatus) : '';
  if (normalizedExpectedFromStatus && fromStatus !== normalizedExpectedFromStatus) {
    throw new Error(`Order status was already updated by another user. Current status: ${fromStatus || 'Unknown'}.`);
  }

  let updateQuery = supabase
    .from('merch_orders')
    .update({ order_status: nextDbStatus })
    .eq('order_kind', 'merch')
    .eq('id', orderId);
  if (normalizedExpectedFromStatus) {
    updateQuery = updateQuery.eq('order_status', normalizedExpectedFromStatus);
  }
  const { data: updatedRows, error } = await updateQuery.select('id');
  if (error) throw new Error('Unable to update order status.');
  if (normalizedExpectedFromStatus && (!updatedRows || updatedRows.length === 0)) {
    throw new Error('Order status update conflict detected. Please refresh and retry.');
  }

  await addMerchOrderAudit({
    changedBy: getIntegratedAdminActorName(),
    fromStatus,
    notes: options?.auditNote || 'Status changed in Integrated Admin merch control.',
    orderId,
    source: 'integrated_admin',
    toStatus: nextStatus,
  });
};

export const loadPublishedMerchProducts = async (): Promise<MerchProductOption[]> => {
  const parsePrice = (raw: unknown) => {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
    const parsed = Number.parseFloat(String(raw ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const { data, error } = await supabase
    .from('merch_published_products')
    .select('id,name,available_sizes,price')
    .order('name', { ascending: true });

  if (error) throw new Error('Unable to load merch products.');

  return (data || []).map((row: any) => ({
    availableSizes: Array.isArray(row.available_sizes) ? row.available_sizes.map((size: unknown) => String(size)) : [],
    id: String(row.id || ''),
    name: String(row.name || ''),
    price: parsePrice(row.price),
  }));
};

export const loadActiveSchoolYearLearners = async (): Promise<MerchActiveLearnerOption[]> => {
  const activeSchoolYear = await supabase
    .from('registrar_school_years')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (activeSchoolYear.error || !activeSchoolYear.data?.id) {
    throw new Error('Active school year not found.');
  }

  const sectionsResult = await supabase
    .from('registrar_sections')
    .select('id')
    .eq('school_year_id', String(activeSchoolYear.data.id));
  if (sectionsResult.error) {
    throw new Error('Unable to load active school year sections.');
  }

  const sectionIds = (sectionsResult.data || []).map((row) => String(row.id || '')).filter(Boolean);
  if (sectionIds.length === 0) return [];

  const sectionRowsResult = await supabase
    .from('registrar_sections')
    .select('id,name,grade_level')
    .in('id', sectionIds);
  if (sectionRowsResult.error) {
    throw new Error('Unable to load active school year sections.');
  }
  const sectionLookup = new Map<string, LearnerSectionInfo>();
  for (const row of sectionRowsResult.data || []) {
    const sectionId = String((row as any).id || '').trim();
    if (!sectionId) continue;
    sectionLookup.set(sectionId, {
      gradeLevel: String((row as any).grade_level || '').trim() || 'Unassigned',
      sectionName: String((row as any).name || '').trim() || 'Unassigned',
    });
  }

  const learnersResult = await supabase
    .from('registrar_learners')
    .select('id,lrn,first_name,middle_name,last_name,section_id')
    .in('section_id', sectionIds)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });
  if (learnersResult.error) {
    throw new Error('Unable to load learners from active school year.');
  }

  return (learnersResult.data || []).map((row: any) => {
    const firstName = String(row.first_name || '').trim();
    const middleName = String(row.middle_name || '').trim();
    const lastName = String(row.last_name || '').trim();
    const lrn = String(row.lrn || '').trim();
    const name = [lastName, firstName, middleName].filter(Boolean).join(', ').replace(', ,', ',');
    const sectionInfo = sectionLookup.get(String(row.section_id || '').trim()) || {
      gradeLevel: 'Unassigned',
      sectionName: 'Unassigned',
    };
    return {
      id: String(row.id || ''),
      gradeLevel: sectionInfo.gradeLevel,
      label: `${name || 'Unnamed Learner'}${lrn ? ` (${lrn})` : ''}`,
      lrn,
      name: name || 'Unnamed Learner',
      sectionName: sectionInfo.sectionName,
    } satisfies MerchActiveLearnerOption;
  });
};

export const createManualMerchOrder = async (payload: MerchManualOrderPayload): Promise<MerchManualOrderCreateResult> => {
  const productOrderPeriod = await supabase
    .from('merch_products')
    .select('merch_order_periods(id,label)')
    .eq('id', payload.productId)
    .limit(1)
    .maybeSingle();
  if (productOrderPeriod.error) {
    throw new Error('Unable to read product order period for reference number.');
  }
  const orderPeriodLabel = String(productOrderPeriod.data?.merch_order_periods?.label || 'ORD');

  const learnerIdValue = String(payload.learnerId || '').trim();
  const orderInsertBase: any = {
    learner_lrn: payload.learnerLrn.trim() || null,
    learner_name: payload.learnerName.trim() || null,
    order_kind: 'merch',
    order_period_id: productOrderPeriod.data?.merch_order_periods?.id || null,
    notes: payload.notes.trim() || null,
    order_status: toMerchOrderDbStatus('pending'),
    order_source: 'integrated_admin',
  };
  if (UUID_REGEX.test(learnerIdValue)) {
    orderInsertBase.learner_id = learnerIdValue;
  }

  let orderResult: any = null;
  let referenceNoUsed = '';
  for (let attempt = 0; attempt < MAX_REFERENCE_RETRY; attempt += 1) {
    const referenceNo = await generateOrderReferenceNo(orderPeriodLabel);
    referenceNoUsed = referenceNo;
    const orderInsert = { ...orderInsertBase, reference_no: referenceNo };
    orderResult = await supabase
      .from('merch_orders')
      .insert([orderInsert])
      .select('id')
      .single();

    if (!orderResult.error && orderResult.data?.id) break;
    const message = String(orderResult.error?.message || '').toLowerCase();
    const details = String(orderResult.error?.details || '').toLowerCase();
    const missingReferenceColumn = message.includes('reference_no') || details.includes('reference_no');
    if (missingReferenceColumn) {
      referenceNoUsed = '';
      orderResult = await supabase
        .from('merch_orders')
        .insert([orderInsertBase])
        .select('id')
        .single();
      break;
    }
    if (isUniqueViolation(orderResult.error, 'reference_no')) {
      continue;
    }
    break;
  }
  if (orderResult?.error || !orderResult?.data?.id) throw new Error('Unable to create manual merch order.');

  const { error: itemError } = await supabase.from('merch_order_items').insert([
    {
      order_id: String(orderResult.data.id),
      product_id: payload.productId,
      quantity: Math.max(1, Number(payload.quantity || 1)),
      selected_size: payload.selectedSize.trim() || null,
    },
  ]);
  if (itemError) {
    throw new Error('Unable to save manual merch order item.');
  }

  await addMerchOrderAudit({
    changedBy: getIntegratedAdminActorName(),
    fromStatus: null,
    notes: 'Order created through manual IA override.',
    orderId: String(orderResult.data.id),
    source: 'integrated_admin',
    toStatus: 'pending',
  });

  return {
    createdAt: new Date().toISOString(),
    orderId: String(orderResult.data.id),
    orderPeriodLabel,
    referenceNo: referenceNoUsed,
  };
};

export const deleteMerchOrderRecord = async (orderId: string) => {
  const fromStatus = await getOrderStatusSnapshot(orderId);
  const { error } = await supabase
    .from('merch_orders')
    .delete()
    .eq('order_kind', 'merch')
    .eq('id', orderId);
  if (error) throw new Error('Unable to remove merch order.');

  await addMerchOrderAudit({
    changedBy: getIntegratedAdminActorName(),
    fromStatus,
    notes: 'Order record deleted in Integrated Admin merch control.',
    orderId,
    source: 'integrated_admin',
    toStatus: fromStatus,
  });
};

export const loadMerchOrderPayments = async (orderId: string): Promise<MerchOrderPaymentRecord[]> => {
  const primary = await supabase
    .from('merch_order_payments')
    .select('id,order_id,transaction_no,payment_amount,receipt_no,payment_method,payment_notes,payment_status,paid_at,posted_by,voided_at,voided_by,created_at,updated_at')
    .eq('order_id', orderId)
    .order('paid_at', { ascending: true })
    .order('created_at', { ascending: true });

  let rows: any[] = [];
  if (primary.error) {
    const message = String(primary.error.message || '').toLowerCase();
    const details = String(primary.error.details || '').toLowerCase();
    const missingTransactionNo = message.includes('transaction_no') || details.includes('transaction_no');
    if (!missingTransactionNo) throw new Error('Unable to load payment history.');
    const fallback = await supabase
      .from('merch_order_payments')
      .select('id,order_id,payment_amount,receipt_no,payment_method,payment_notes,payment_status,paid_at,posted_by,voided_at,voided_by,created_at,updated_at')
      .eq('order_id', orderId)
      .order('paid_at', { ascending: true })
      .order('created_at', { ascending: true });
    if (fallback.error) throw new Error('Unable to load payment history.');
    rows = fallback.data || [];
  } else {
    rows = primary.data || [];
  }

  return rows.map((row: any, index: number) => ({
    createdAt: String(row.created_at || ''),
    id: String(row.id || ''),
    orderId: String(row.order_id || ''),
    paidAt: String(row.paid_at || ''),
    paymentAmount: Number(row.payment_amount || 0),
    paymentMethod: String(row.payment_method || 'cash'),
    paymentNotes: String(row.payment_notes || ''),
    paymentStatus: String(row.payment_status || 'posted') as 'posted' | 'voided',
    postedBy: String(row.posted_by || ''),
    receiptNo: String(row.receipt_no || ''),
    transactionNo: String(row.transaction_no || `LEGACY-${index + 1}`),
    updatedAt: String(row.updated_at || ''),
    voidedAt: String(row.voided_at || ''),
    voidedBy: String(row.voided_by || ''),
  }));
};

export const createMerchOrderPayment = async (payload: {
  orderId: string;
  paymentAmount: number;
  paymentMethod?: 'cash' | 'gcash' | 'bank_transfer' | 'other';
  paymentNotes?: string;
  receiptNo?: string;
}): Promise<MerchOrderPaymentRecord> => {
  const fromStatus = await getOrderStatusSnapshot(payload.orderId);
  const transactionNo = await generatePaymentTransactionNo();
  const paidAt = new Date().toISOString();
  const { error } = await supabase.from('merch_order_payments').insert([
    {
      order_id: payload.orderId,
      transaction_no: transactionNo,
      paid_at: paidAt,
      payment_amount: Math.max(0, Number(payload.paymentAmount || 0)),
      payment_method: payload.paymentMethod || 'cash',
      payment_notes: payload.paymentNotes?.trim() || null,
      payment_status: 'posted',
      posted_by: getIntegratedAdminActorName(),
      receipt_no: payload.receiptNo?.trim() || null,
    },
  ]);
  if (error) throw new Error('Unable to save payment record.');

  await addMerchOrderAudit({
    changedBy: getIntegratedAdminActorName(),
    fromStatus,
    notes: `Payment posted: PHP ${Math.max(0, Number(payload.paymentAmount || 0)).toFixed(2)}${payload.receiptNo?.trim() ? ` (Receipt: ${payload.receiptNo.trim()})` : ''}.`,
    orderId: payload.orderId,
    source: 'integrated_admin',
    toStatus: fromStatus,
  });

  return {
    createdAt: paidAt,
    id: transactionNo,
    orderId: payload.orderId,
    paidAt,
    paymentAmount: Math.max(0, Number(payload.paymentAmount || 0)),
    paymentMethod: payload.paymentMethod || 'cash',
    paymentNotes: payload.paymentNotes?.trim() || '',
    paymentStatus: 'posted',
    postedBy: getIntegratedAdminActorName(),
    receiptNo: payload.receiptNo?.trim() || '',
    transactionNo,
    updatedAt: paidAt,
    voidedAt: '',
    voidedBy: '',
  };
};

export const deleteLatestMerchOrderPayment = async (orderId: string) => {
  const fromStatus = await getOrderStatusSnapshot(orderId);
  const latest = await supabase
    .from('merch_order_payments')
    .select('id')
    .eq('order_id', orderId)
    .eq('payment_status', 'posted')
    .order('paid_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) throw new Error('Unable to locate latest payment record.');
  if (!latest.data?.id) throw new Error('No posted payment record found for this order.');

  const { error } = await supabase
    .from('merch_order_payments')
    .delete()
    .eq('id', String(latest.data.id));
  if (error) throw new Error('Unable to delete payment record.');

  await addMerchOrderAudit({
    changedBy: getIntegratedAdminActorName(),
    fromStatus,
    notes: `Latest posted payment deleted (payment id: ${String(latest.data.id)}).`,
    orderId,
    source: 'integrated_admin',
    toStatus: fromStatus,
  });
};

export const deleteMerchOrderPayment = async (paymentId: string) => {
  const target = await supabase
    .from('merch_order_payments')
    .select('id,order_id')
    .eq('id', paymentId)
    .limit(1)
    .maybeSingle();
  if (target.error || !target.data?.id || !target.data?.order_id) {
    throw new Error('Unable to locate payment record for deletion.');
  }

  const orderId = String(target.data.order_id);
  const fromStatus = await getOrderStatusSnapshot(orderId);
  const { error } = await supabase
    .from('merch_order_payments')
    .delete()
    .eq('id', paymentId);
  if (error) throw new Error('Unable to delete payment record.');

  await addMerchOrderAudit({
    changedBy: getIntegratedAdminActorName(),
    fromStatus,
    notes: `Payment deleted (payment id: ${paymentId}).`,
    orderId,
    source: 'integrated_admin',
    toStatus: fromStatus,
  });

  return orderId;
};

export const updateMerchOrderPayment = async (payload: {
  paymentId: string;
  paymentAmount: number;
  paymentNotes?: string;
  receiptNo?: string;
}) => {
  const targetPayment = await supabase
    .from('merch_order_payments')
    .select('order_id,payment_amount,receipt_no,payment_notes')
    .eq('id', payload.paymentId)
    .limit(1)
    .maybeSingle();
  if (targetPayment.error || !targetPayment.data?.order_id) {
    throw new Error('Unable to locate payment record for update.');
  }
  const orderId = String(targetPayment.data.order_id || '');
  const fromStatus = await getOrderStatusSnapshot(orderId);

  const oldAmount = Math.max(0, Number(targetPayment.data.payment_amount || 0));
  const newAmount = Math.max(0, Number(payload.paymentAmount || 0));
  const oldReceipt = String(targetPayment.data.receipt_no || '').trim();
  const newReceipt = String(payload.receiptNo || '').trim();
  const oldNotes = String(targetPayment.data.payment_notes || '').trim();
  const newNotes = String(payload.paymentNotes || '').trim();

  const { error } = await supabase
    .from('merch_order_payments')
    .update({
      payment_amount: newAmount,
      payment_notes: payload.paymentNotes?.trim() || null,
      receipt_no: payload.receiptNo?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.paymentId);

  if (error) throw new Error('Unable to update payment record.');

  const notesDelta: string[] = [];
  if (oldAmount !== newAmount) notesDelta.push(`amount ${oldAmount.toFixed(2)} -> ${newAmount.toFixed(2)}`);
  if (oldReceipt !== newReceipt) notesDelta.push(`receipt "${oldReceipt || '-'}" -> "${newReceipt || '-'}"`);
  if (oldNotes !== newNotes) notesDelta.push('notes updated');

  await addMerchOrderAudit({
    changedBy: getIntegratedAdminActorName(),
    fromStatus,
    notes: notesDelta.length > 0
      ? `Payment updated (${payload.paymentId}): ${notesDelta.join(', ')}.`
      : `Payment record updated (${payload.paymentId}).`,
    orderId,
    source: 'integrated_admin',
    toStatus: fromStatus,
  });
};

export const loadMerchOrderAuditTrail = async (orderId: string): Promise<MerchOrderAuditRecord[]> => {
  const { data, error } = await supabase
    .from('merch_order_status_audit')
    .select('created_at,from_status,to_status,changed_source,changed_by,notes')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Unable to load order audit trail.');

  return (data || []).map((row: any) => ({
    changedBy: String(row.changed_by || ''),
    createdAt: String(row.created_at || ''),
    fromStatus: String(row.from_status || ''),
    notes: String(row.notes || ''),
    source: String(row.changed_source || ''),
    toStatus: String(row.to_status || ''),
  }));
};

export const loadMerchOrderCountsSummary = async (selectedOrderPeriod = ''): Promise<MerchOrderCountsSummary> => {
  const { data, error } = await supabase
    .from('merch_orders')
    .select('id,order_status,order_source,merch_order_items(merch_products(merch_order_periods(label)))')
    .eq('order_kind', 'merch');

  if (error) throw new Error('Unable to load order count summary.');

  const rows = data || [];
  const periodSet = new Set<string>();
  const statusMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();

  rows.forEach((row: any) => {
    const items = Array.isArray(row.merch_order_items) ? row.merch_order_items : [];
    const orderPeriods = items
      .map((item: any) => String(item?.merch_products?.merch_order_periods?.label || '').trim())
      .filter(Boolean);

    orderPeriods.forEach((label: string) => periodSet.add(label));

    if (selectedOrderPeriod && !orderPeriods.includes(selectedOrderPeriod)) {
      return;
    }

    const status = normalizeMerchOrderStatus(String(row.order_status || 'pending'));
    const sourceRaw = String(row.order_source || '').trim();
    const source = sourceRaw === 'integrated_admin'
      ? 'Integrated Admin'
      : sourceRaw === 'learner_portal'
        ? 'Learner Portal'
        : 'Unknown';

    statusMap.set(status, (statusMap.get(status) || 0) + 1);
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });

  const countsByStatus = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
  const countsBySource = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
  const orderPeriodOptions = Array.from(periodSet).sort((a, b) => a.localeCompare(b));
  const totalOrders = countsByStatus.reduce((sum, entry) => sum + entry.count, 0);

  return {
    countsBySource,
    countsByStatus,
    orderPeriodOptions,
    selectedOrderPeriod,
    totalOrders,
  };
};
