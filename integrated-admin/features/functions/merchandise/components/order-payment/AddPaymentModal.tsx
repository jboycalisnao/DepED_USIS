import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';

type Option = { label: string; value: string };

type Props = {
  addPaymentAmountError: string;
  isOpen: boolean;
  isSaving: boolean;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onReceiptNoChange: (value: string) => void;
  onSave: () => void;
  onSelectOrder: (value: string) => void;
  onNotesChange: (value: string) => void;
  paymentAmount: string;
  paymentNotes: string;
  paymentOrderOptions: Option[];
  receiptNo: string;
  selectedPaymentOrder: { id: string; learnerName: string; orderAmount: number; productName: string; referenceNo: string } | null;
  selectedPaymentOrderId: string;
};

export function AddPaymentModal({
  addPaymentAmountError,
  isOpen,
  isSaving,
  onAmountChange,
  onClose,
  onNotesChange,
  onReceiptNoChange,
  onSave,
  onSelectOrder,
  paymentAmount,
  paymentNotes,
  paymentOrderOptions,
  receiptNo,
  selectedPaymentOrder,
  selectedPaymentOrderId,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => (isSaving ? undefined : onClose())} />
      <div className="modal-dialog modal-dialog--wide integrated-admin-merch-modal" role="dialog" aria-modal="true" aria-label="Add payment">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Order Payment</p>
            <h3>Add Payment</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={() => (isSaving ? undefined : onClose())}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body registry-form">
          <UsisSearchableSelect
            ariaLabel="Pending order"
            floatingLabel
            label="Pending Order"
            allowTyping
            options={paymentOrderOptions}
            value={selectedPaymentOrderId}
            onChange={onSelectOrder}
          />
          <div className="registry-form__split">
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={paymentAmount} onChange={(event) => onAmountChange(event.target.value)} inputMode="decimal" placeholder=" " />
                <span>Payment Amount</span>
              </div>
              {addPaymentAmountError ? <small className="integrated-admin-payment-form__error">{addPaymentAmountError}</small> : null}
            </label>
            <label className="floating-field">
              <div className="floating-field__control">
                <input value={receiptNo} onChange={(event) => onReceiptNoChange(event.target.value)} placeholder=" " />
                <span>Receipt No. (Optional)</span>
              </div>
            </label>
          </div>
          {selectedPaymentOrder ? (
            <div className="integrated-admin-order-payment-summary">
              <strong>{selectedPaymentOrder.referenceNo || selectedPaymentOrder.id}</strong>
              <span>{selectedPaymentOrder.learnerName || '-'}</span>
              <span>{selectedPaymentOrder.productName || '-'}</span>
              <span>Order Amount: PHP {selectedPaymentOrder.orderAmount.toFixed(2)}</span>
            </div>
          ) : null}
          <label className="floating-field">
            <div className="floating-field__control">
              <textarea value={paymentNotes} onChange={(event) => onNotesChange(event.target.value)} rows={3} placeholder=" " />
              <span>Payment Notes (Optional)</span>
            </div>
          </label>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="button" className="modal-dialog__blue" onClick={onSave} disabled={isSaving || !selectedPaymentOrderId || Boolean(addPaymentAmountError)}>
            {isSaving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
