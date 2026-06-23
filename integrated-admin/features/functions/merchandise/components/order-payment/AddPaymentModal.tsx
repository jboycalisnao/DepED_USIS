import { useEffect, useState, type FormEvent } from 'react';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';

type Option = { label: string; value: string };

type Props = {
  addPaymentAmountError: string;
  editingPaymentId: string;
  isOrderSelectorDisabled: boolean;
  learnerPaymentSummary: { label: string; orderCount: number; totalAmount: number; outstandingAmount: number } | null;
  paymentAmountLimit: number | null;
  paymentOrderMetrics: { balanceAfter: number; orderAmount: number; outstanding: number; paid: number } | null;
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
  editingPaymentId,
  isOrderSelectorDisabled,
  learnerPaymentSummary,
  paymentAmountLimit,
  paymentOrderMetrics,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const enteredAmount = Number(paymentAmount);
  const balanceAfterPayment = paymentOrderMetrics
    ? Math.max(0, paymentOrderMetrics.outstanding - (Number.isFinite(enteredAmount) ? Math.max(0, enteredAmount) : 0))
    : null;
  const formId = 'integrated-admin-add-payment-form';

  useEffect(() => {
    if (!isSaving || !isOpen) {
      setIsSubmitting(false);
    }
  }, [isSaving, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || isSubmitting || (!selectedPaymentOrderId && !paymentOrderMetrics) || Boolean(addPaymentAmountError)) return;
    setIsSubmitting(true);
    onSave();
  };

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => (isSaving ? undefined : onClose())} />
      <div className="modal-dialog modal-dialog--wide integrated-admin-merch-modal" role="dialog" aria-modal="true" aria-label="Add payment">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Order Payment</p>
            <h3>{editingPaymentId ? 'Edit Payment' : 'Add Payment'}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={() => (isSaving ? undefined : onClose())}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form id={formId} className="modal-dialog__body registry-form" onSubmit={handleSubmit}>
          {learnerPaymentSummary ? (
            <div className="integrated-admin-order-payment-summary integrated-admin-order-payment-summary--metrics">
              <strong>{learnerPaymentSummary.label}</strong>
              <span>{learnerPaymentSummary.orderCount} order(s)</span>
              <span>Learner Total: PHP {learnerPaymentSummary.totalAmount.toFixed(2)}</span>
              <span>Learner Outstanding: PHP {learnerPaymentSummary.outstandingAmount.toFixed(2)}</span>
              <span>This payment will be distributed across the learner&apos;s orders.</span>
            </div>
          ) : (
            <UsisSearchableSelect
              ariaLabel="Pending order"
              floatingLabel
              label="Pending Order"
              allowTyping
              options={paymentOrderOptions}
              value={selectedPaymentOrderId}
              disabled={isOrderSelectorDisabled || Boolean(editingPaymentId || paymentOrderMetrics)}
              onChange={onSelectOrder}
            />
          )}
          {(editingPaymentId || paymentOrderMetrics) && selectedPaymentOrder ? (
            <div className="integrated-admin-order-payment-summary integrated-admin-order-payment-summary--metrics">
              <strong>{selectedPaymentOrder.referenceNo || selectedPaymentOrder.id}</strong>
              <span>{selectedPaymentOrder.learnerName || '-'}</span>
              <span>{selectedPaymentOrder.productName || '-'}</span>
              <span>Order Amount: PHP {(paymentOrderMetrics?.orderAmount ?? selectedPaymentOrder.orderAmount).toFixed(2)}</span>
              <span>Paid: PHP {(paymentOrderMetrics?.paid ?? 0).toFixed(2)}</span>
              <span>Outstanding: PHP {(paymentOrderMetrics?.outstanding ?? 0).toFixed(2)}</span>
              <span>Balance After Payment: PHP {(balanceAfterPayment ?? paymentOrderMetrics?.balanceAfter ?? 0).toFixed(2)}</span>
              <span>{editingPaymentId ? 'This payment record is being updated.' : 'This order was selected from the learner row.'}</span>
            </div>
          ) : null}
          <div className="floating-field-grid floating-field-grid--two">
            <label className="floating-field">
              <div className="floating-field__control">
                <input
                  max={paymentAmountLimit ?? undefined}
                  value={paymentAmount}
                  onChange={(event) => onAmountChange(event.target.value)}
                  inputMode="decimal"
                  placeholder=" "
                />
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
          {!learnerPaymentSummary && !paymentOrderMetrics && selectedPaymentOrder ? (
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
        </form>
        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose} disabled={isSaving || isSubmitting}>Cancel</button>
          <button
            type="submit"
            form={formId}
            className="modal-dialog__blue"
            disabled={isSaving || isSubmitting || (!selectedPaymentOrderId && !paymentOrderMetrics) || Boolean(addPaymentAmountError)}
          >
            {isSaving || isSubmitting ? (
              <span className="integrated-admin-payment-form__save-label">
                <span className="integrated-admin-payment-form__saving-spinner" aria-hidden="true" />
                Saving...
              </span>
            ) : editingPaymentId ? 'Update Payment' : learnerPaymentSummary ? 'Save Learner Payment' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
