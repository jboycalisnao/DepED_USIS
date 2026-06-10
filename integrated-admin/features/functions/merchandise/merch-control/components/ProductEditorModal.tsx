import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type { MerchandiseOrderPeriodRecord } from '../../services/merchandiseControlService';
import { APPAREL_SIZE_KEYS, PRESET_CATEGORY_OPTIONS, type ProductModalState } from '../productForm';

type Props = {
  isCategoryApparel: boolean;
  isOpen: boolean;
  isSaving: boolean;
  modalState: ProductModalState;
  onClose: () => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onSetModalState: (updater: (current: ProductModalState) => ProductModalState) => void;
  onToggleAvailableSize: (sizeKey: string) => void;
  orderPeriods: MerchandiseOrderPeriodRecord[];
};

export function ProductEditorModal({
  isCategoryApparel,
  isOpen,
  isSaving,
  modalState,
  onClose,
  onSave,
  onSetModalState,
  onToggleAvailableSize,
  orderPeriods,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide integrated-admin-merch-modal" role="dialog" aria-modal="true" aria-label={modalState.productId ? 'Edit merchandise product' : 'Create merchandise product'}>
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Merchandise Control</p>
            <h3>{modalState.productId ? 'Update Product' : 'Create Product'}</h3>
          </div>
          <button type="button" className="modal-dialog__close" aria-label="Close" onClick={onClose}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <form className="modal-dialog__body registry-form" onSubmit={onSave}>
          <div className="floating-field-grid floating-field-grid--two">
            <label className="floating-field"><div className="floating-field__control"><input value={modalState.sku} onChange={(event) => onSetModalState((current) => ({ ...current, sku: event.target.value }))} required placeholder=" " /><span>SKU</span></div></label>
            <label className="floating-field"><div className="floating-field__control"><input value={modalState.name} onChange={(event) => onSetModalState((current) => ({ ...current, name: event.target.value }))} required placeholder=" " /><span>Product Name</span></div></label>
          </div>
          <div className="floating-field-grid floating-field-grid--two">
            <UsisSearchableSelect ariaLabel="Category" allowTyping={false} floatingLabel label="Category" options={PRESET_CATEGORY_OPTIONS} value={modalState.categoryName} onChange={(value) => onSetModalState((current) => ({ ...current, categoryName: value }))} />
            <label className="floating-field"><div className="floating-field__control"><input value={modalState.imageUrl} onChange={(event) => onSetModalState((current) => ({ ...current, imageUrl: event.target.value }))} placeholder=" " /><span>Image URL</span></div></label>
          </div>
          <label className="floating-field"><div className="floating-field__control"><input value={modalState.price} onChange={(event) => onSetModalState((current) => ({ ...current, price: event.target.value }))} required inputMode="decimal" placeholder=" " /><span>Price (PHP)</span></div></label>
          <UsisSearchableSelect
            ariaLabel="Order Period"
            allowTyping={false}
            floatingLabel
            label={modalState.isPreOrder ? 'Order Period (Required for Pre-order)' : 'Order Period (Optional)'}
            options={[{ label: 'No order period', value: '' }, ...orderPeriods.filter((period) => period.isActive).map((period) => ({ label: `${period.label} (${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()})`, value: period.id }))]}
            value={modalState.orderPeriodId}
            onChange={(value) => onSetModalState((current) => ({ ...current, orderPeriodId: value }))}
          />
          <label className="floating-field"><div className="floating-field__control"><textarea value={modalState.description} onChange={(event) => onSetModalState((current) => ({ ...current, description: event.target.value }))} placeholder=" " rows={3} className="integrated-admin-merch-textarea" /><span>Description</span></div></label>
          <div className="integrated-admin-merch-sizes">
            <p className="integrated-admin-merch-sizes__title">Available Sizes</p>
            <div className="integrated-admin-merch-size-picker" role="group" aria-label="Available sizes">
              {APPAREL_SIZE_KEYS.map((sizeKey) => {
                const selected = modalState.availableSizes.includes(sizeKey);
                return <button key={sizeKey} type="button" className={`integrated-admin-merch-size-pill${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onToggleAvailableSize(sizeKey)}>{sizeKey}</button>;
              })}
            </div>
          </div>
          <label className="registry-radio-option"><input type="checkbox" checked={modalState.isPreOrder} onChange={(event) => onSetModalState((current) => ({ ...current, isPreOrder: event.target.checked }))} /><span>Pre-order product (no stock fields)</span></label>
          <label className="registry-radio-option"><input type="checkbox" checked={modalState.isPublished} onChange={(event) => onSetModalState((current) => ({ ...current, isPublished: event.target.checked }))} /><span>Published and visible in Merch module</span></label>
          {!modalState.isPreOrder && !isCategoryApparel ? <label className="floating-field"><div className="floating-field__control"><input value={modalState.stockQty} onChange={(event) => onSetModalState((current) => ({ ...current, stockQty: event.target.value }))} required inputMode="numeric" placeholder=" " /><span>Stock Quantity</span></div></label> : null}
          {!modalState.isPreOrder && isCategoryApparel ? (
            <div className="integrated-admin-merch-sizes">
              <p className="integrated-admin-merch-sizes__title">Apparel Size Stocks</p>
              <div className="floating-field-grid floating-field-grid--two">
                {APPAREL_SIZE_KEYS.map((sizeKey) => (
                  <label key={sizeKey} className="floating-field"><div className="floating-field__control"><input value={modalState.sizeStock[sizeKey] || ''} onChange={(event) => onSetModalState((current) => ({ ...current, sizeStock: { ...current.sizeStock, [sizeKey]: event.target.value } }))} inputMode="numeric" placeholder=" " /><span>{sizeKey} Stock</span></div></label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="modal-dialog__actions">
            <button type="button" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className="modal-dialog__blue" disabled={isSaving}>{isSaving ? 'Saving...' : modalState.productId ? 'Save Changes' : 'Create Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
