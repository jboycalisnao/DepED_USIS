import { supabase } from '@deped-usis/shared-supabase';

export type LearnerMerchProduct = {
  availableSizes: string[];
  categoryName: string;
  description: string;
  id: string;
  imageUrl: string | null;
  isPreOrder: boolean;
  name: string;
  price: number;
  preOrderCutoffDate: string | null;
  stockQty: number;
};

export type PlaceLearnerMerchOrderPayload = {
  learnerId: string;
  learnerLrn: string;
  learnerName: string;
  notes: string;
  productId: string;
  quantity: number;
  selectedSize: string | null;
};

export type LearnerMerchOrderRecord = {
  availableSizes: string[];
  createdAt: string;
  notes: string;
  orderId: string;
  orderPeriodLabel: string;
  orderPeriodEndDate: string | null;
  orderSource: 'integrated_admin' | 'learner_portal' | 'unknown';
  orderStatus: string;
  preOrderCutoffDate: string | null;
  productId: string;
  productName: string;
  quantity: number;
  referenceNo: string;
  selectedSize: string;
};

export type UpdateLearnerMerchOrderPayload = {
  learnerId: string;
  learnerLrn: string;
  notes: string;
  orderId: string;
  quantity: number;
  selectedSize: string | null;
};

export type DeleteLearnerMerchOrderPayload = {
  learnerId: string;
  learnerLrn: string;
  orderId: string;
};

const makeOrderPeriodPrefix = (label: string) => {
  const cleaned = String(label || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return 'ORD';
  return cleaned.slice(0, 3).padEnd(3, 'X');
};
const MAX_REFERENCE_RETRY = 5;
const isUniqueViolation = (error: any, columnHint: string) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return (code === '23505' || message.includes('duplicate') || details.includes('duplicate')) &&
    (message.includes(columnHint) || details.includes(columnHint));
};

const generateOrderReferenceNo = async (orderPeriodLabel: string) => {
  const prefix = makeOrderPeriodPrefix(orderPeriodLabel);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const digits = `${Math.floor(10000 + Math.random() * 90000)}`;
    const candidate = `${prefix}${digits}`;
    const existing = await supabase
      .from('merch_orders')
      .select('id')
      .eq('reference_no', candidate)
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error('Unable to verify generated reference number.');
    if (!existing.data?.id) return candidate;
  }
  throw new Error('Unable to generate unique order reference number.');
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
      changed_by: params.changedBy || null,
      notes: params.notes || null,
    },
  ]);
  if (error) {
    // Do not block order placement if audit trail table/policies are not yet ready.
    console.warn('Merch order audit logging failed:', error.message);
  }
};

export const fetchLearnerMerchCatalog = async (): Promise<LearnerMerchProduct[]> => {
  const { data, error } = await supabase
    .from('merch_published_products')
    .select('id, name, description, price, stock_qty, category_name, primary_image_url, is_preorder, pre_order_cutoff_date, available_sizes, sort_order')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) throw new Error('Unable to load merchandise catalog.');

  return (data || []).map((row: any) => ({
    availableSizes: Array.isArray(row.available_sizes) ? row.available_sizes.map((value: unknown) => String(value)) : [],
    categoryName: String(row.category_name || 'Uncategorized'),
    description: String(row.description || ''),
    id: String(row.id || ''),
    imageUrl: typeof row.primary_image_url === 'string' ? row.primary_image_url : null,
    isPreOrder: Boolean(row.is_preorder),
    name: String(row.name || ''),
    price: Number(row.price || 0),
    preOrderCutoffDate: row.pre_order_cutoff_date ? String(row.pre_order_cutoff_date) : null,
    stockQty: Number(row.stock_qty || 0),
  }));
};

export const fetchLearnerMerchOrders = async (params: {
  learnerId: string;
  learnerLrn: string;
}): Promise<LearnerMerchOrderRecord[]> => {
  const learnerId = params.learnerId.trim();
  const learnerLrn = params.learnerLrn.trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const orFilters: string[] = [];
  if (learnerId && uuidPattern.test(learnerId)) {
    orFilters.push(`learner_id.eq.${learnerId}`);
  }
  if (learnerLrn) orFilters.push(`learner_lrn.eq.${learnerLrn}`);
  const applyLearnerFilter = (query: any) => (orFilters.length > 0 ? query.or(orFilters.join(',')) : query);

  const queryWithSource = applyLearnerFilter(
    supabase
      .from('merch_orders')
      .select(
        `
          id,
          created_at,
          reference_no,
          order_status,
          order_source,
          notes,
          merch_order_items(quantity, selected_size, merch_products(id, name, available_sizes, is_preorder, pre_order_cutoff_date, merch_order_periods(label, end_date)))
        `,
      )
      .order('created_at', { ascending: false }),
  );

  let data: any[] | null = null;
  const withSourceResult = await queryWithSource;
  if (withSourceResult.error) {
    const message = String(withSourceResult.error.message || '').toLowerCase();
    const details = String(withSourceResult.error.details || '').toLowerCase();
    const missingSourceColumn = message.includes('order_source') || details.includes('order_source');
    const missingReferenceColumn = message.includes('reference_no') || details.includes('reference_no');
    if (!missingSourceColumn && !missingReferenceColumn) {
      throw new Error('Unable to load your merch orders.');
    }

    const fallbackResult = await applyLearnerFilter(
      supabase
        .from('merch_orders')
        .select(
          `
            id,
            created_at,
            order_status,
            notes,
            merch_order_items(quantity, selected_size, merch_products(id, name, available_sizes, is_preorder, pre_order_cutoff_date, merch_order_periods(label, end_date)))
          `,
        )
        .order('created_at', { ascending: false }),
    );
    if (fallbackResult.error) throw new Error('Unable to load your merch orders.');
    data = fallbackResult.data || [];
  } else {
    data = withSourceResult.data || [];
  }

  return (data || []).flatMap((row: any) => {
    const items = Array.isArray(row.merch_order_items) ? row.merch_order_items : [];
    const source = String(row.order_source || '').trim();
    const normalizedSource: LearnerMerchOrderRecord['orderSource'] =
      source === 'integrated_admin' || source === 'learner_portal' ? source : 'unknown';

    if (items.length === 0) {
      return [
        {
          availableSizes: [],
          createdAt: String(row.created_at || ''),
          notes: String(row.notes || ''),
          orderId: String(row.id || ''),
          orderPeriodLabel: '',
          orderPeriodEndDate: null,
          orderSource: normalizedSource,
          orderStatus: String(row.order_status || 'Pending'),
          preOrderCutoffDate: null,
          productId: '',
          productName: 'Unknown Product',
          quantity: 0,
          referenceNo: String(row.reference_no || ''),
          selectedSize: '',
        } satisfies LearnerMerchOrderRecord,
      ];
    }

    return items.map((item: any) => ({
      availableSizes: Array.isArray(item?.merch_products?.available_sizes)
        ? item.merch_products.available_sizes.map((value: unknown) => String(value))
        : [],
      createdAt: String(row.created_at || ''),
      notes: String(row.notes || ''),
      orderId: String(row.id || ''),
      orderPeriodLabel: String(item?.merch_products?.merch_order_periods?.label || ''),
      orderPeriodEndDate: item?.merch_products?.merch_order_periods?.end_date ? String(item.merch_products.merch_order_periods.end_date) : null,
      orderSource: normalizedSource,
      orderStatus: String(row.order_status || 'Pending'),
      preOrderCutoffDate: item?.merch_products?.pre_order_cutoff_date ? String(item.merch_products.pre_order_cutoff_date) : null,
      productId: String(item?.merch_products?.id || ''),
      productName: String(item?.merch_products?.name || 'Unknown Product'),
      quantity: Number(item.quantity || 0),
      referenceNo: String(row.reference_no || ''),
      selectedSize: String(item.selected_size || ''),
    } satisfies LearnerMerchOrderRecord));
  });
};

export const placeLearnerMerchOrder = async (payload: PlaceLearnerMerchOrderPayload) => {
  const quantity = Math.max(1, Math.floor(payload.quantity || 1));
  const selectedSize = payload.selectedSize?.trim() || null;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const learnerId = payload.learnerId?.trim() || '';

  const { data: product, error: productError } = await supabase
    .from('merch_products')
    .select('is_preorder, pre_order_cutoff_date, merch_order_periods(label, end_date)')
    .eq('id', payload.productId)
    .limit(1)
    .maybeSingle();
  if (productError) throw new Error('Unable to validate product order window.');
  if (product?.is_preorder && product?.pre_order_cutoff_date) {
    const today = new Date().toISOString().slice(0, 10);
    if (String(product.pre_order_cutoff_date) < today) {
      throw new Error('Pre-order cutoff date has passed for this product.');
    }
  }
  if (product?.is_preorder && product?.merch_order_periods?.end_date) {
    const today = new Date().toISOString().slice(0, 10);
    if (String(product.merch_order_periods.end_date) < today) {
      throw new Error('Order period has already ended for this product.');
    }
  }

  const baseOrderPayload = {
    learner_id: uuidPattern.test(learnerId) ? learnerId : null,
    learner_lrn: payload.learnerLrn,
    learner_name: payload.learnerName,
    notes: payload.notes.trim() || null,
    order_status: 'Pending',
  };

  const orderPeriodLabel = String(product?.merch_order_periods?.label || 'ORD');
  let orderRow: any = null;
  for (let attempt = 0; attempt < MAX_REFERENCE_RETRY; attempt += 1) {
    const referenceNo = await generateOrderReferenceNo(orderPeriodLabel);
    const withSourcePayload = {
      ...baseOrderPayload,
      order_source: 'learner_portal',
      reference_no: referenceNo,
    };
    const fallbackPayloadWithRef = {
      ...baseOrderPayload,
      reference_no: referenceNo,
    };

    const withSourceInsert = await supabase
      .from('merch_orders')
      .insert([withSourcePayload])
      .select('id')
      .single();

    if (!withSourceInsert.error && withSourceInsert.data?.id) {
      orderRow = withSourceInsert.data;
      break;
    }

    const message = String(withSourceInsert.error?.message || '').toLowerCase();
    const details = String(withSourceInsert.error?.details || '').toLowerCase();
    const missingSourceColumn = message.includes('order_source') || details.includes('order_source');
    const missingReferenceColumn = message.includes('reference_no') || details.includes('reference_no');

    if (!missingSourceColumn && !missingReferenceColumn && !isUniqueViolation(withSourceInsert.error, 'reference_no')) {
      throw new Error('Unable to create order.');
    }

    if (isUniqueViolation(withSourceInsert.error, 'reference_no')) {
      continue;
    }

    const fallbackPayload = missingReferenceColumn
      ? { ...baseOrderPayload }
      : fallbackPayloadWithRef;
    const fallbackInsert = await supabase
      .from('merch_orders')
      .insert([fallbackPayload])
      .select('id')
      .single();
    if (!fallbackInsert.error && fallbackInsert.data?.id) {
      orderRow = fallbackInsert.data;
      break;
    }
    if (isUniqueViolation(fallbackInsert.error, 'reference_no')) {
      continue;
    }
    throw new Error('Unable to create order.');
  }

  if (!orderRow?.id) {
    throw new Error('Unable to create order. Please retry.');
  }

  const { error: itemError } = await supabase.from('merch_order_items').insert([
    {
      order_id: orderRow.id,
      product_id: payload.productId,
      quantity,
      selected_size: selectedSize,
    },
  ]);

  if (itemError) throw new Error('Unable to save order item.');

  await addMerchOrderAudit({
    changedBy: payload.learnerName,
    fromStatus: null,
    notes: 'Order placed from Learner Portal merch service.',
    orderId: String(orderRow.id),
    source: 'learner_portal',
    toStatus: 'Pending',
  });
};

export const updateLearnerMerchOrder = async (payload: UpdateLearnerMerchOrderPayload) => {
  const quantity = Math.max(1, Math.floor(payload.quantity || 1));
  const selectedSize = payload.selectedSize?.trim() || null;
  const learnerId = payload.learnerId.trim();
  const learnerLrn = payload.learnerLrn.trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const orFilters: string[] = [];
  if (learnerId && uuidPattern.test(learnerId)) {
    orFilters.push(`learner_id.eq.${learnerId}`);
  }
  if (learnerLrn) {
    orFilters.push(`learner_lrn.eq.${learnerLrn}`);
  }
  const applyLearnerFilter = (query: any) => (orFilters.length > 0 ? query.or(orFilters.join(',')) : query);

  const orderResult = await applyLearnerFilter(
    supabase
      .from('merch_orders')
      .select('id, order_source, merch_order_items(quantity, selected_size, merch_products(id, name, is_preorder, pre_order_cutoff_date, merch_order_periods(end_date)))')
      .eq('id', payload.orderId)
      .limit(1)
      .maybeSingle(),
  );
  if (orderResult.error || !orderResult.data?.id) {
    throw new Error('Order not found or inaccessible.');
  }

  const source = String(orderResult.data.order_source || '');
  if (source !== 'learner_portal') {
    throw new Error('Only learner portal orders can be edited.');
  }

  const item = Array.isArray(orderResult.data.merch_order_items) ? orderResult.data.merch_order_items[0] : null;
  if (!item?.merch_products?.id) {
    throw new Error('Order item details are missing.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const orderPeriodEndDate = item.merch_products.merch_order_periods?.end_date
    ? String(item.merch_products.merch_order_periods.end_date)
    : null;
  const preOrderCutoffDate = item.merch_products.pre_order_cutoff_date
    ? String(item.merch_products.pre_order_cutoff_date)
    : null;
  if ((orderPeriodEndDate && orderPeriodEndDate < today) || (preOrderCutoffDate && preOrderCutoffDate < today)) {
    throw new Error('Order period has ended. Editing is no longer allowed.');
  }

  const { error: itemError } = await supabase
    .from('merch_order_items')
    .update({
      quantity,
      selected_size: selectedSize,
    })
    .eq('order_id', payload.orderId)
    .eq('product_id', String(item.merch_products.id));
  if (itemError) throw new Error('Unable to update order item.');

  const { error: orderError } = await supabase
    .from('merch_orders')
    .update({
      notes: payload.notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.orderId);
  if (orderError) throw new Error('Unable to update order details.');

  await addMerchOrderAudit({
    fromStatus: null,
    notes: 'Order updated from Learner Portal merch service.',
    orderId: payload.orderId,
    source: 'learner_portal',
    toStatus: 'Pending',
  });
};

export const deleteLearnerMerchOrder = async (payload: DeleteLearnerMerchOrderPayload) => {
  const learnerId = payload.learnerId.trim();
  const learnerLrn = payload.learnerLrn.trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const orFilters: string[] = [];
  if (learnerId && uuidPattern.test(learnerId)) {
    orFilters.push(`learner_id.eq.${learnerId}`);
  }
  if (learnerLrn) {
    orFilters.push(`learner_lrn.eq.${learnerLrn}`);
  }
  const applyLearnerFilter = (query: any) => (orFilters.length > 0 ? query.or(orFilters.join(',')) : query);

  const existing = await applyLearnerFilter(
    supabase
      .from('merch_orders')
      .select('id, order_source')
      .eq('id', payload.orderId)
      .limit(1)
      .maybeSingle(),
  );
  if (existing.error || !existing.data?.id) {
    throw new Error('Order not found or inaccessible.');
  }
  if (String(existing.data.order_source || '') !== 'learner_portal') {
    throw new Error('Only learner portal orders can be deleted.');
  }

  const { error } = await supabase
    .from('merch_orders')
    .delete()
    .eq('id', payload.orderId);
  if (error) throw new Error('Unable to delete order.');
};
