import { supabase } from '../../../../../../packages/shared-supabase/src';

export type IdOrderRecord = {
  address: string;
  createdAt: string;
  gradeLevel: string;
  guardianName: string;
  guardianNumber: string;
  id: string;
  learnerLrn: string;
  learnerName: string;
  lastUpdatedAt: string;
  orderPeriodId: string;
  orderPeriodLabel: string;
  orderStatus: string;
  referenceNo: string;
  sectionName: string;
};

export type IdOrdersExportMetadata = {
  orderPeriodLabel: string;
  schoolYearLabel: string;
};

type LearnerSectionLookup = {
  gradeLevel: string;
  sectionName: string;
};

const normalizeText = (value: unknown) => String(value || '').trim();
const normalizeStatus = (value: unknown) => normalizeText(value).toLowerCase() || 'pending';

const buildLearnerName = (row: any) => {
  const last = normalizeText(row?.last_name);
  const first = normalizeText(row?.first_name);
  const middle = normalizeText(row?.middle_name);
  return [last, first, middle].filter(Boolean).join(', ').replace(', ,', ',') || 'Unnamed Learner';
};

export const loadActiveIdOrdersSchoolYearLabel = async (): Promise<string> => {
  const result = await supabase
    .from('registrar_school_years')
    .select('label')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (result.error) {
    console.warn('Unable to load active school year for ID orders:', result.error);
    return 'Active School Year';
  }

  return normalizeText(result.data?.label) || 'Active School Year';
};

export const loadIdOrderRecords = async (): Promise<IdOrderRecord[]> => {
  const ordersResult = await supabase
    .from('merch_orders')
    .select('id,created_at,updated_at,reference_no,order_status,learner_id,learner_lrn,learner_name,guardian_contact_number,order_period_id,notes,merch_order_periods(label)')
    .eq('order_kind', 'id')
    .order('created_at', { ascending: false });

  if (ordersResult.error) {
    throw new Error('Unable to load ID orders.');
  }

  const rows = ordersResult.data || [];
  const learnerIds = Array.from(new Set(rows.map((row: any) => normalizeText(row.learner_id)).filter(Boolean)));
  const learnerLrns = Array.from(new Set(rows.map((row: any) => normalizeText(row.learner_lrn)).filter(Boolean)));

  const learnerLookup = new Map<string, LearnerSectionLookup>();
  const learnerMetaLookup = new Map<string, { address: string; guardianName: string; guardianNumber: string; learnerName: string }>();

  if (learnerIds.length > 0 || learnerLrns.length > 0) {
    const learnersById = learnerIds.length > 0
      ? await supabase.from('registrar_learners').select('id,lrn,first_name,middle_name,last_name,guardian_name,address,section_id').in('id', learnerIds)
      : { data: [], error: null } as any;
    const learnersByLrn = learnerLrns.length > 0
      ? await supabase.from('registrar_learners').select('id,lrn,first_name,middle_name,last_name,guardian_name,address,section_id').in('lrn', learnerLrns)
      : { data: [], error: null } as any;

    const learnerRows = [
      ...(learnersById.data || []),
      ...(learnersByLrn.data || []),
    ];

    const dedupedLearners = Array.from(
      new Map(learnerRows.map((row: any) => [normalizeText(row.id) || normalizeText(row.lrn), row])).values(),
    );

    const sectionIds = Array.from(new Set(dedupedLearners.map((row: any) => normalizeText(row.section_id)).filter(Boolean)));
    const sectionLookup = new Map<string, LearnerSectionLookup>();
    if (sectionIds.length > 0) {
      const sectionsResult = await supabase
        .from('registrar_sections')
        .select('id,name,grade_level')
        .in('id', sectionIds);
      if (!sectionsResult.error) {
        (sectionsResult.data || []).forEach((section: any) => {
          const sectionId = normalizeText(section.id);
          if (!sectionId) return;
          sectionLookup.set(sectionId, {
            gradeLevel: normalizeText(section.grade_level) || 'Unassigned',
            sectionName: normalizeText(section.name) || 'Unassigned',
          });
        });
      }
    }

    dedupedLearners.forEach((row: any) => {
      const sectionId = normalizeText(row.section_id);
      const learnerId = normalizeText(row.id);
      const learnerLrn = normalizeText(row.lrn);
      const sectionInfo = sectionLookup.get(sectionId) || { gradeLevel: 'Unassigned', sectionName: 'Unassigned' };
      const learnerName = buildLearnerName(row);
      if (learnerId) learnerLookup.set(`id:${learnerId}`, sectionInfo);
      if (learnerLrn) learnerLookup.set(`lrn:${learnerLrn}`, sectionInfo);
      const meta = {
        address: normalizeText(row.address),
        guardianName: normalizeText(row.guardian_name),
        guardianNumber: normalizeText(row.contact_number),
        learnerName,
      };
      if (learnerId) learnerMetaLookup.set(`id:${learnerId}`, meta);
      if (learnerLrn) learnerMetaLookup.set(`lrn:${learnerLrn}`, meta);
    });
  }

  return rows.map((row: any) => {
    const learnerIdKey = `id:${normalizeText(row.learner_id)}`;
    const learnerLrnKey = `lrn:${normalizeText(row.learner_lrn)}`;
    const learnerInfo = learnerLookup.get(learnerIdKey) || learnerLookup.get(learnerLrnKey) || { gradeLevel: 'Unassigned', sectionName: 'Unassigned' };
    const learnerMeta = learnerMetaLookup.get(learnerIdKey) || learnerMetaLookup.get(learnerLrnKey) || {
      address: '',
      guardianName: '',
      guardianNumber: '',
      learnerName: normalizeText(row.learner_name) || 'Unnamed Learner',
    };

    return {
      address: learnerMeta.address,
      createdAt: normalizeText(row.created_at),
      gradeLevel: learnerInfo.gradeLevel,
      guardianName: learnerMeta.guardianName,
      guardianNumber: normalizeText(row.guardian_contact_number) || learnerMeta.guardianNumber,
      id: normalizeText(row.id),
      learnerLrn: normalizeText(row.learner_lrn),
      learnerName: learnerMeta.learnerName,
      lastUpdatedAt: normalizeText(row.updated_at) || normalizeText(row.created_at),
      orderPeriodId: normalizeText(row.order_period_id),
      orderPeriodLabel: normalizeText(row?.merch_order_periods?.label) || 'ID Request',
      orderStatus: normalizeStatus(row.order_status),
      referenceNo: normalizeText(row.reference_no),
      sectionName: learnerInfo.sectionName,
    };
  });
};

export const updateIdOrderStatus = async (orderId: string, orderStatus: string) => {
  const { data: currentOrder, error: readError } = await supabase
    .from('merch_orders')
    .select('id,order_status')
    .eq('order_kind', 'id')
    .eq('id', orderId)
    .limit(1)
    .maybeSingle();

  if (readError) {
    throw new Error('Unable to read current ID order status.');
  }

  if (!currentOrder?.id) {
    throw new Error('ID order not found.');
  }

  const { error: updateError } = await supabase
    .from('merch_orders')
    .update({ order_status: orderStatus, updated_at: new Date().toISOString() })
    .eq('order_kind', 'id')
    .eq('id', orderId);

  if (updateError) {
    console.error('[ID Orders] status update error payload', updateError);
    const details = [updateError.message, updateError.details, updateError.hint].filter(Boolean).join(' | ');
    throw new Error(details || 'Unable to update ID order status.');
  }
};

export const deleteIdOrderRecord = async (orderId: string) => {
  const { error } = await supabase
    .from('merch_orders')
    .delete()
    .eq('order_kind', 'id')
    .eq('id', orderId);

  if (error) {
    console.error('[ID Orders] delete error payload', error);
    const details = [error.message, error.details, error.hint].filter(Boolean).join(' | ');
    throw new Error(details || 'Unable to delete ID order.');
  }
};

export const deriveIdOrdersExportMetadata = (records: IdOrderRecord[]): IdOrdersExportMetadata => {
  const orderPeriodLabels = Array.from(new Set(records.map((row) => normalizeText(row.orderPeriodLabel)).filter(Boolean)));
  return {
    orderPeriodLabel: orderPeriodLabels.length === 1 ? orderPeriodLabels[0] : orderPeriodLabels.join(' / ') || 'ID Request',
    schoolYearLabel: 'Active School Year',
  };
};
