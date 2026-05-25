import { supabase } from '../../../../packages/shared-supabase/src';

export type MerchCatalogItem = {
  availableSizes: string[];
  description?: string;
  category: string;
  id: string;
  isPreOrder: boolean;
  name: string;
  price: number;
  primaryImageUrl: string | null;
  slug: string;
  stockQty: number;
};

const normalizeCatalogRows = (rows: Array<Record<string, unknown>>): MerchCatalogItem[] =>
  rows.map((row) => ({
    availableSizes: Array.isArray(row.available_sizes) ? row.available_sizes.map((value) => String(value)) : [],
    description: typeof row.description === 'string' ? row.description : '',
    category: String(row.category_name || 'Uncategorized'),
    id: String(row.id || ''),
    isPreOrder: Boolean(row.is_preorder),
    name: String(row.name || 'Untitled Item'),
    price: Number(row.price || 0),
    primaryImageUrl:
      typeof row.primary_image_url === 'string' && row.primary_image_url.trim().length > 0
        ? row.primary_image_url
        : null,
    slug: String(row.slug || row.id || ''),
    stockQty: Number(row.stock_qty || 0),
  }));

export const loadPublishedMerchCatalog = async (): Promise<MerchCatalogItem[]> => {
  const publishedViewResponse = await supabase
    .from('merch_published_products')
    .select('id, slug, name, description, price, stock_qty, category_name, primary_image_url, sort_order, is_preorder, available_sizes')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (!publishedViewResponse.error && Array.isArray(publishedViewResponse.data)) {
    return normalizeCatalogRows(publishedViewResponse.data as Array<Record<string, unknown>>);
  }

  const directProductsResponse = await supabase
    .from('merch_products')
    .select(
      `
        id,
        slug,
        name,
        description,
        price,
        stock_qty,
        is_preorder,
        available_sizes,
        sort_order,
        category_id,
        merch_categories(name),
        merch_product_media(public_url, is_primary, sort_order, created_at)
      `,
    )
    .eq('is_published', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (directProductsResponse.error) {
    throw new Error('Unable to load merchandise catalog from database.');
  }

  const normalized = (directProductsResponse.data || []).map((row: any) => {
    const mediaRows = Array.isArray(row.merch_product_media) ? row.merch_product_media : [];
    const sortedMedia = [...mediaRows].sort((a, b) => {
      if (Boolean(a.is_primary) !== Boolean(b.is_primary)) return a.is_primary ? -1 : 1;
      const sortA = Number(a.sort_order || 0);
      const sortB = Number(b.sort_order || 0);
      if (sortA !== sortB) return sortA - sortB;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });

    return {
      category: row?.merch_categories?.name || 'Uncategorized',
      id: String(row.id || ''),
      name: String(row.name || 'Untitled Item'),
      price: Number(row.price || 0),
      primaryImageUrl: sortedMedia[0]?.public_url || null,
      slug: String(row.slug || row.id || ''),
      stockQty: Number(row.stock_qty || 0),
      description: String(row.description || ''),
      isPreOrder: Boolean(row.is_preorder),
      availableSizes: Array.isArray(row.available_sizes) ? row.available_sizes.map((value: unknown) => String(value)) : [],
    } satisfies MerchCatalogItem;
  });

  return normalized;
};

export const loadPublishedMerchItemBySlug = async (slug: string): Promise<MerchCatalogItem | null> => {
  const items = await loadPublishedMerchCatalog();
  return items.find((item) => item.slug === slug) || null;
};
