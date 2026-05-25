import type { MerchandiseControlPayload } from '../services/merchandiseControlService';

export type ProductModalState = {
  availableSizes: string[];
  categoryName: string;
  description: string;
  imageUrl: string;
  isPublished: boolean;
  isPreOrder: boolean;
  name: string;
  orderPeriodId: string;
  price: string;
  productId?: string;
  sizeStock: Record<string, string>;
  sku: string;
  stockQty: string;
};

export const APPAREL_SIZE_KEYS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL'];
export const PRESET_CATEGORY_OPTIONS = [
  { label: 'Apparel', value: 'Apparel' },
  { label: 'Headwear', value: 'Headwear' },
  { label: 'Bags & Accessories', value: 'Bags & Accessories' },
  { label: 'Drinkware', value: 'Drinkware' },
  { label: 'School Essentials', value: 'School Essentials' },
  { label: 'Gift Items', value: 'Gift Items' },
];

export const initialModalState: ProductModalState = {
  availableSizes: [],
  categoryName: '',
  description: '',
  imageUrl: '',
  isPublished: false,
  isPreOrder: false,
  name: '',
  orderPeriodId: '',
  price: '',
  sizeStock: {},
  sku: '',
  stockQty: '',
};

export const toPayload = (form: ProductModalState): MerchandiseControlPayload => {
  const price = Number(form.price);
  const sizeStockNumeric: Record<string, number> = {};
  APPAREL_SIZE_KEYS.forEach((sizeKey) => {
    const sizeValue = Number(form.sizeStock[sizeKey] || 0);
    sizeStockNumeric[sizeKey] = Number.isFinite(sizeValue) && sizeValue >= 0 ? sizeValue : 0;
  });

  const normalizedCategory = form.categoryName.trim().toLowerCase();
  const isApparel = normalizedCategory === 'apparel';
  const computedStockQty = form.isPreOrder
    ? 0
    : isApparel
      ? APPAREL_SIZE_KEYS.reduce((sum, sizeKey) => sum + (sizeStockNumeric[sizeKey] || 0), 0)
      : Number(form.stockQty);

  if (!Number.isFinite(price) || price < 0) throw new Error('Price must be a valid non-negative number.');
  if (!Number.isFinite(computedStockQty) || computedStockQty < 0) {
    throw new Error('Stock quantity must be a valid non-negative number.');
  }
  if (form.isPreOrder && !form.orderPeriodId.trim()) {
    throw new Error('Order period is required for pre-order products.');
  }

  return {
    availableSizes: form.availableSizes,
    categoryName: form.categoryName.trim(),
    description: form.description.trim(),
    imageUrl: form.imageUrl.trim(),
    isPublished: form.isPublished,
    isPreOrder: form.isPreOrder,
    name: form.name.trim(),
    orderPeriodId: form.orderPeriodId.trim() || null,
    price,
    productId: form.productId,
    sizeStock: sizeStockNumeric,
    sku: form.sku.trim(),
    stockQty: computedStockQty,
  };
};
