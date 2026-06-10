import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type { MerchActiveLearnerOption, MerchProductOption } from '../../services/merchOrderControlService';

type Option = { label: string; value: string };

type Props = {
  isOpen: boolean;
  isSaving: boolean;
  learnerOptions: Option[];
  manualNotes: string;
  onClose: () => void;
  onCreate: () => void;
  onLearnerQueryChange: (query: string) => void;
  onManualNotesChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onSelectLearner: (value: string) => void;
  onSelectSize: (value: string) => void;
  orderTotal: number;
  productOptions: Option[];
  quantity: string;
  selectedLearner: MerchActiveLearnerOption | null;
  selectedLearnerId: string;
  selectedProduct: MerchProductOption | null;
  selectedProductId: string;
  selectedProductSizes: string[];
  selectedSize: string;
};

export function ManualOrderOverrideModal(props: Props) {
  const {
    isOpen,
    isSaving,
    learnerOptions,
    manualNotes,
    onClose,
    onCreate,
    onLearnerQueryChange,
    onManualNotesChange,
    onProductChange,
    onQuantityChange,
    onSelectLearner,
    onSelectSize,
    orderTotal,
    productOptions,
    quantity,
    selectedLearner,
    selectedLearnerId,
    selectedProduct,
    selectedProductId,
    selectedProductSizes,
    selectedSize,
  } = props;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide integrated-admin-merch-modal" role="dialog" aria-modal="true" aria-label="Manual learner order override">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Orders</p>
            <h3>Manual Learner Order Override</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body registry-form">
          <div className="floating-field-grid floating-field-grid--two">
            <div style={{ gridColumn: '1 / -1' }}>
              <UsisSearchableSelect
                ariaLabel="Search Learner"
                emptyQueryMessage="No learners matched your search."
                floatingLabel
                label="Search Learner (Active School Year)"
                minQueryLength={1}
                onChange={onSelectLearner}
                onQueryChange={onLearnerQueryChange}
                options={learnerOptions}
                placeholder="Search by learner name or LRN"
                requireQueryBeforeOptions
                value={selectedLearnerId}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <UsisSearchableSelect
                ariaLabel="Product"
                floatingLabel
                label="Product"
                onChange={onProductChange}
                options={productOptions}
                value={selectedProductId}
              />
            </div>
            <label className="floating-field" style={{ gridColumn: '1 / -1' }}>
              <div className="floating-field__control">
                <input readOnly data-has-value="true" value={`PHP ${orderTotal.toFixed(2)}`} placeholder=" " />
                <span>Order Total</span>
              </div>
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input
                  data-has-value={quantity.trim().length > 0 ? 'true' : 'false'}
                  min={1}
                  onChange={(event) => onQuantityChange(event.target.value)}
                  placeholder=" "
                  type="number"
                  value={quantity}
                />
                <span>Quantity</span>
              </div>
            </label>
            <label className="floating-field">
              <UsisSearchableSelect
                ariaLabel="Size"
                floatingLabel
                label="Size"
                onChange={onSelectSize}
                options={
                  selectedProductSizes.length > 0
                    ? selectedProductSizes.map((size) => ({ label: size, value: size }))
                    : [{ label: 'Not required', value: '' }]
                }
                value={selectedSize}
              />
            </label>
          </div>
          <label className="floating-field">
            <div className="floating-field__control">
              <textarea
                onChange={(event) => onManualNotesChange(event.target.value)}
                placeholder=" "
                value={manualNotes}
              />
              <span>Override Notes (Optional)</span>
            </div>
          </label>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button className="modal-dialog__blue" disabled={isSaving || !selectedLearner || !selectedProduct} onClick={onCreate} type="button">
            Add Order For Learner
          </button>
        </div>
      </div>
    </div>
  );
}
