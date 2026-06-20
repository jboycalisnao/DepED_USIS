import { supabase } from '../../../../../packages/shared-supabase/src';

export type MerchandiseControlRecord = {
  availableSizes: string[];
  categoryName: string;
  description: string;
  id: string;
  imageUrl: string | null;
  isPublished: boolean;
  isPreOrder: boolean;
  name: string;
  orderPeriodId: string | null;
  orderPeriodLabel: string | null;
  price: number;
  preOrderCutoffDate: string | null;
  sortOrder: number;
  sizeStock: Record<string, number>;
  sku: string;
  stockQty: number;
};

export type MerchandiseOrderPeriodRecord = {
  endDate: string;
  id: string;
  isActive: boolean;
  label: string;
  startDate: string;
};

export type MerchandiseControlPayload = {
  availableSizes: string[];
  categoryName: string;
  description: string;
  imageUrl: string;
  isPublished: boolean;
  isPreOrder: boolean;
  name: string;
  orderPeriodId: string | null;
  price: number;
  productId?: string;
  sizeStock: Record<string, number>;
  sku: string;
  stockQty: number;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value: unknown) => String(value || '').trim();
const parseOrderPeriodDate = (value: unknown) => {
  const text = normalizeText(value);
  if (!text) return null;
  const parsed = new Date(`${text}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isOrderPeriodWithinWindow = (startDate: unknown, endDate: unknown) => {
  const start = parseOrderPeriodDate(startDate);
  const end = parseOrderPeriodDate(endDate);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (start && todayStart < start) return false;
  if (end && todayStart > end) return false;
  return true;
};

const isProtectedIdSku = (sku: string) => String(sku || '').trim().toUpperCase() === 'ID-001';

const resolveCategoryId = async (categoryName: string) => {
  const normalizedName = categoryName.trim();
  if (!normalizedName) return null;

  const existing = await supabase
    .from('merch_categories')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id as string;

  const code = slugify(normalizedName).replace(/-/g, '_') || `category_${Date.now()}`;
  const inserted = await supabase
    .from('merch_categories')
    .insert([{ code, name: normalizedName, is_active: true }])
    .select('id')
    .single();

  if (inserted.error || !inserted.data?.id) {
    throw new Error('Unable to create merchandise category.');
  }

  return inserted.data.id as string;
};

export const loadMerchandiseControlRecords = async (): Promise<MerchandiseControlRecord[]> => {
  const { data, error } = await supabase
    .from('merch_products')
    .select(
      `
        id,
        sku,
        name,
        price,
        stock_qty,
        sort_order,
        is_published,
        is_preorder,
        order_period_id,
        pre_order_cutoff_date,
        available_sizes,
        description,
        size_stock_json,
        merch_categories(name),
        merch_order_periods(label, end_date),
        merch_product_media(public_url, is_primary, sort_order, created_at)
      `,
    )
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Unable to load merchandise control records.');
  }

  return (data || []).map((row: any) => {
    const mediaRows = Array.isArray(row.merch_product_media) ? row.merch_product_media : [];
    const sortedMedia = [...mediaRows].sort((a, b) => {
      if (Boolean(a.is_primary) !== Boolean(b.is_primary)) return a.is_primary ? -1 : 1;
      const sortA = asNumber(a.sort_order);
      const sortB = asNumber(b.sort_order);
      if (sortA !== sortB) return sortA - sortB;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });

    return {
      availableSizes: Array.isArray(row.available_sizes) ? row.available_sizes.map((v: unknown) => String(v)) : [],
      categoryName: row?.merch_categories?.name || 'Uncategorized',
      description: String(row.description || ''),
      id: String(row.id || ''),
      imageUrl: sortedMedia[0]?.public_url || null,
      isPublished: Boolean(row.is_published),
      isPreOrder: Boolean(row.is_preorder),
      name: String(row.name || ''),
      orderPeriodId: row.order_period_id ? String(row.order_period_id) : null,
      orderPeriodLabel: row?.merch_order_periods?.label ? String(row.merch_order_periods.label) : null,
      price: asNumber(row.price),
      preOrderCutoffDate: row?.merch_order_periods?.end_date
        ? String(row.merch_order_periods.end_date)
        : row.pre_order_cutoff_date
          ? String(row.pre_order_cutoff_date)
          : null,
      sortOrder: asNumber(row.sort_order),
      sizeStock: (row?.size_stock_json as Record<string, number>) || {},
      sku: String(row.sku || ''),
      stockQty: asNumber(row.stock_qty),
    } satisfies MerchandiseControlRecord;
  });
};

export const loadMerchandiseCategories = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('merch_categories')
    .select('name')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error('Unable to load merchandise categories.');
  }

  return (data || []).map((entry) => String(entry.name || '')).filter(Boolean);
};

export const saveMerchandiseControlRecord = async (payload: MerchandiseControlPayload) => {
  const categoryId = await resolveCategoryId(payload.categoryName);
  const slugBase = slugify(payload.name || payload.sku || 'merch-item');
  const slug = payload.productId ? slugBase : `${slugBase}-${Date.now()}`;
  const isIdProduct = isProtectedIdSku(payload.sku);
  const nextIsPreOrder = isIdProduct ? true : payload.isPreOrder;

  if (payload.productId) {
    const { error } = await supabase
      .from('merch_products')
      .update({
        category_id: categoryId,
        is_published: payload.isPublished,
        is_preorder: nextIsPreOrder,
        order_period_id: payload.orderPeriodId || null,
        pre_order_cutoff_date: null,
        available_sizes: payload.availableSizes,
        description: payload.description.trim(),
        name: payload.name.trim(),
        price: payload.price,
        sku: payload.sku.trim(),
        slug,
        size_stock_json: payload.sizeStock,
        stock_qty: payload.stockQty,
      })
      .eq('id', payload.productId);

    if (error) {
      throw new Error('Unable to update merchandise product.');
    }
  } else {
    const { data, error } = await supabase
      .from('merch_products')
      .insert([
        {
          category_id: categoryId,
          is_published: payload.isPublished,
          is_preorder: nextIsPreOrder,
          order_period_id: payload.orderPeriodId || null,
          pre_order_cutoff_date: null,
          available_sizes: payload.availableSizes,
          description: payload.description.trim(),
          name: payload.name.trim(),
          price: payload.price,
          sku: payload.sku.trim(),
          slug,
          size_stock_json: payload.sizeStock,
          stock_qty: payload.stockQty,
        },
      ])
      .select('id')
      .single();

    if (error || !data?.id) {
      throw new Error('Unable to create merchandise product.');
    }

    payload.productId = data.id as string;
  }

  const productId = payload.productId as string;
  const imageUrl = payload.imageUrl.trim();
  if (imageUrl) {
    const existingPrimary = await supabase
      .from('merch_product_media')
      .select('id')
      .eq('product_id', productId)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();

    if (existingPrimary.data?.id) {
      const { error } = await supabase
        .from('merch_product_media')
        .update({ public_url: imageUrl, storage_path: imageUrl })
        .eq('id', existingPrimary.data.id);
      if (error) throw new Error('Unable to update product image.');
    } else {
      const { error } = await supabase.from('merch_product_media').insert([
        {
          is_primary: true,
          product_id: productId,
          public_url: imageUrl,
          storage_path: imageUrl,
        },
      ]);
      if (error) throw new Error('Unable to save product image.');
    }
  }
};

export const loadMerchOrderPeriods = async (): Promise<MerchandiseOrderPeriodRecord[]> => {
  const { data, error } = await supabase
    .from('merch_order_periods')
    .select('id,label,start_date,end_date,is_active')
    .order('start_date', { ascending: false });
  if (error) throw new Error('Unable to load merch order periods.');

  const periods = (data || []).map((row: any) => {
    const startDate = normalizeText(row.start_date);
    const endDate = normalizeText(row.end_date);
    const withinWindow = isOrderPeriodWithinWindow(startDate, endDate);
    const originalIsActive = Boolean(row.is_active);
    return {
      endDate,
      id: normalizeText(row.id),
      isActive: originalIsActive && withinWindow,
      label: normalizeText(row.label),
      startDate,
      originalIsActive,
      withinWindow,
    };
  });

  const expiredActivePeriods = periods.filter((period: any) => period.originalIsActive && !period.withinWindow);
  if (expiredActivePeriods.length > 0) {
    const updates = await Promise.all(
      expiredActivePeriods.map((period: any) =>
        supabase
          .from('merch_order_periods')
          .update({ is_active: false })
          .eq('id', period.id),
      ),
    );
    const failedUpdate = updates.find((result) => result.error);
    if (failedUpdate?.error) {
      console.warn('Unable to auto-disable expired merch order period.', failedUpdate.error);
    }
  }

  return periods.map(({ originalIsActive, withinWindow, ...period }) => period);
};

export const createMerchOrderPeriod = async (payload: {
  endDate: string;
  isActive: boolean;
  label: string;
  startDate: string;
}) => {
  const { error } = await supabase.from('merch_order_periods').insert([
    {
      end_date: payload.endDate,
      is_active: payload.isActive && isOrderPeriodWithinWindow(payload.startDate, payload.endDate),
      label: payload.label.trim(),
      start_date: payload.startDate,
    },
  ]);
  if (error) throw new Error('Unable to create order period.');
};

export const updateMerchOrderPeriod = async (
  periodId: string,
  payload: {
    endDate: string;
    isActive: boolean;
    label: string;
    startDate: string;
  },
) => {
  const { error } = await supabase
    .from('merch_order_periods')
    .update({
      end_date: payload.endDate,
      is_active: payload.isActive && isOrderPeriodWithinWindow(payload.startDate, payload.endDate),
      label: payload.label.trim(),
      start_date: payload.startDate,
    })
    .eq('id', periodId);
  if (error) throw new Error('Unable to update order period.');
};

export const removeMerchOrderPeriod = async (periodId: string) => {
  const { error } = await supabase.from('merch_order_periods').delete().eq('id', periodId);
  if (error) throw new Error('Unable to delete order period.');
};

export const deleteMerchandiseControlRecord = async (productId: string) => {
  const protectedRecord = await supabase
    .from('merch_products')
    .select('sku')
    .eq('id', productId)
    .limit(1)
    .maybeSingle();
  if (protectedRecord.error) {
    throw new Error('Unable to verify merchandise product.');
  }
  if (isProtectedIdSku(protectedRecord.data?.sku || '')) {
    throw new Error('ID-001 is protected and cannot be deleted.');
  }
  const { error } = await supabase.from('merch_products').delete().eq('id', productId);
  if (error) {
    throw new Error('Unable to delete merchandise product.');
  }
};

export const updateMerchandiseSortOrder = async (orderedProductIds: string[]) => {
  for (let index = 0; index < orderedProductIds.length; index += 1) {
    const productId = orderedProductIds[index];
    const { error } = await supabase
      .from('merch_products')
      .update({ sort_order: index + 1 })
      .eq('id', productId);
    if (error) {
      throw new Error('Unable to save product arrangement.');
    }
  }
};
