import type { MerchOrderAuditRecord, MerchOrderControlRecord, MerchOrderPaymentRecord } from '../../services/merchOrderControlService';

type Props = {
  detailModalView: 'payment' | 'record' | 'audit';
  detailPaymentAmount: string;
  detailPaymentAmountError: string;
  detailPaymentBalance: number;
  detailPaymentNotes: string;
  detailReceiptNo: string;
  detailRemainingBalance: number;
  editingPaymentId: string;
  isAuditLoading: boolean;
  isOpen: boolean;
  isPaymentsLoading: boolean;
  isSaving: boolean;
  onAmountChange: (value: string) => void;
  onDeletePayment: () => void;
  onEditHistory: (row: MerchOrderPaymentRecord) => void;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onPrimaryAction: () => void;
  onReceiptNoChange: (value: string) => void;
  onSetView: (view: 'payment' | 'record' | 'audit') => void;
  order: MerchOrderControlRecord | null;
  paymentHistoryEntries: MerchOrderPaymentRecord[];
  selectedOrderAudit: MerchOrderAuditRecord[];
  totalPaidAmount: number;
};

export function OrderPaymentDetailModal(props: Props) {
  const {
    detailModalView, detailPaymentAmount, detailPaymentAmountError, detailPaymentBalance, detailPaymentNotes, detailReceiptNo,
    detailRemainingBalance, editingPaymentId, isAuditLoading, isOpen, isPaymentsLoading, isSaving, onAmountChange,
    onClose, onDeletePayment, onEditHistory, onNotesChange, onPrimaryAction, onReceiptNoChange, onSetView,
    order, paymentHistoryEntries, selectedOrderAudit, totalPaidAmount,
  } = props;

  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={() => (isSaving ? undefined : onSetView('record'))} />
      <div className="modal-dialog modal-dialog--wide integrated-admin-merch-order-detail-modal" role="dialog" aria-modal="true" aria-label="Order payment details">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Order Payment</p>
            <h3>{order.productName}</h3>
          </div>
          <div className="integrated-admin-order-payment-view-switch" role="tablist" aria-label="Order payment views">
            <button type="button" className={`integrated-admin-order-payment-view-switch__btn ${detailModalView === 'payment' ? 'is-active' : ''}`} onClick={() => onSetView('payment')}>Payment History</button>
            <button type="button" className={`integrated-admin-order-payment-view-switch__btn ${detailModalView === 'record' ? 'is-active' : ''}`} onClick={() => onSetView('record')}>Record Entry</button>
            <button type="button" className={`integrated-admin-order-payment-view-switch__btn ${detailModalView === 'audit' ? 'is-active' : ''}`} onClick={() => onSetView('audit')}>Audit Trail</button>
            <button type="button" className="integrated-admin-order-payment-view-switch__close" onClick={onClose} aria-label="Close order payment modal">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        </div>
        <div className="modal-dialog__body integrated-admin-merch-order-detail">
          {detailModalView === 'record' ? (
            <article className="integrated-admin-merch-order-detail__full">
              <div className="integrated-admin-order-payment-glance">
                <div className="integrated-admin-order-payment-glance__identity">
                  <div>
                    <p><strong>{order.referenceNo || '-'}</strong></p>
                    <p>{order.learnerName || '-'}</p>
                  </div>
                  <p>{order.gradeLevel} - {order.sectionName} | LRN: {order.learnerLrn || '-'}</p>
                </div>
                <div className="integrated-admin-order-payment-glance__metrics">
                  <article>
                    <span>Order Amount</span>
                    <strong>PHP {order.orderAmount.toFixed(2)}</strong>
                  </article>
                  <article>
                    <span>Paid</span>
                    <strong>PHP {totalPaidAmount.toFixed(2)}</strong>
                  </article>
                  <article>
                    <span>Balance</span>
                    <strong>PHP {detailRemainingBalance.toFixed(2)}</strong>
                  </article>
                  <article>
                    <span>Item</span>
                    <strong>{order.productName || '-'}</strong>
                    <small>{order.selectedSize || 'N/A'} | {order.quantity || 0}</small>
                  </article>
                </div>
              </div>
              <div className="integrated-admin-order-payment-divider" />
              <div className="integrated-admin-order-payment-metrics">
                <div className="integrated-admin-order-payment-summary__metric"><small>Remaining Balance</small><strong>PHP {detailRemainingBalance.toFixed(2)}</strong></div>
                <div className="integrated-admin-order-payment-summary__metric"><small>Balance After This Pay</small><strong>PHP {detailPaymentBalance.toFixed(2)}</strong></div>
              </div>
              <span className="integrated-admin-payment-form__title">Record Payment Entry</span>
              <div className="registry-form integrated-admin-payment-form">
                <div className="registry-form__split">
                  <label className="floating-field"><div className="floating-field__control"><input value={detailPaymentAmount} onChange={(e) => onAmountChange(e.target.value)} inputMode="decimal" placeholder=" " /><span>Payment Amount</span></div>{detailPaymentAmountError ? <small className="integrated-admin-payment-form__error">{detailPaymentAmountError}</small> : null}</label>
                  <label className="floating-field"><div className="floating-field__control"><input value={detailReceiptNo} onChange={(e) => onReceiptNoChange(e.target.value)} placeholder=" " /><span>Receipt No. (Optional)</span></div></label>
                </div>
                <label className="floating-field"><div className="floating-field__control"><textarea value={detailPaymentNotes} onChange={(e) => onNotesChange(e.target.value)} rows={3} placeholder=" " /><span>Payment Notes (Optional)</span></div></label>
              </div>
            </article>
          ) : detailModalView === 'payment' ? (
            <article className="integrated-admin-merch-order-detail__full">
              <span>Payment History</span>
              <div className="integrated-admin-merch-order-audit">
                {isPaymentsLoading ? <p>Loading payment history...</p> : paymentHistoryEntries.length === 0 ? <p>No payment history found for this order.</p> : (
                  paymentHistoryEntries.map((entry, index) => (
                    <div key={`${entry.id}-${index}`} className="integrated-admin-merch-order-audit__item integrated-admin-merch-order-audit__item--split">
                      <strong>Payment History No. {index + 1}</strong>
                      <small>Transaction No: {entry.transactionNo}</small>
                      <span>{entry.paidAt ? new Date(entry.paidAt).toLocaleString() : '-'}</span>
                      <small>Amount: PHP {entry.paymentAmount.toFixed(2)}</small>
                      {entry.receiptNo ? <small>Receipt No: {entry.receiptNo}</small> : null}
                      {entry.paymentNotes ? <small>{entry.paymentNotes}</small> : null}
                      <button type="button" className="primary-button integrated-admin-history-edit-btn" onClick={() => onEditHistory(entry)} disabled={isSaving}>Edit</button>
                    </div>
                  ))
                )}
              </div>
            </article>
          ) : (
            <article className="integrated-admin-merch-order-detail__full">
              <span>Audit Trail</span>
              <div className="integrated-admin-merch-order-audit">
                {isAuditLoading ? <p>Loading audit trail...</p> : selectedOrderAudit.length === 0 ? <p>No audit logs found for this order.</p> : (
                  selectedOrderAudit.map((log, index) => (
                    <div key={`${log.createdAt}-${index}`} className="integrated-admin-merch-order-audit__item">
                      <strong>{log.fromStatus ? `${log.fromStatus} -> ${log.toStatus}` : `Created as ${log.toStatus}`}</strong>
                      <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'} | {log.changedBy || log.source || 'Unknown Actor'}</span>
                      {log.notes ? <small>{log.notes}</small> : null}
                    </div>
                  ))
                )}
              </div>
            </article>
          )}
        </div>
        <div className="modal-dialog__actions">
          {detailModalView === 'record' ? (
            <>
              <button type="button" onClick={onDeletePayment} disabled={isSaving}>Delete Payment</button>
              <button type="button" className="modal-dialog__blue" onClick={() => onSetView('payment')}>Payment History</button>
              <button type="button" className="modal-dialog__blue" disabled={isSaving || Boolean(detailPaymentAmountError)} onClick={onPrimaryAction}>
                {editingPaymentId ? 'Update Payment History' : order.orderStatus === 'Approved' ? 'Edit Payment Record' : 'Save Payment Record'}
              </button>
            </>
          ) : (
            <button type="button" className="modal-dialog__blue" onClick={() => onSetView('record')}>Back To Record Entry</button>
          )}
        </div>
      </div>
    </div>
  );
}
