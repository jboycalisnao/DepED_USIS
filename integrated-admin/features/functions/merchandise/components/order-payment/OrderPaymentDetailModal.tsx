import type { MerchOrderAuditRecord, MerchOrderControlRecord, MerchOrderPaymentRecord } from '../../services/merchOrderControlService';
import { getMerchOrderStatusLabel } from '../../order-control/utils/orderStatus';
import { MerchPaymentReceiptDownloadButton } from '../../../../../../common/components/merch/MerchPaymentReceiptDownloadButton';

const formatAuditStatusLabel = (value: string) => {
  const label = getMerchOrderStatusLabel(value);
  return label === 'Unknown' ? String(value || '-').trim() || 'Unknown' : label;
};

const formatAuditSourceLabel = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Unknown Source';
  if (normalized === 'learner_portal') return 'Learner Portal';
  if (normalized === 'integrated_admin') return 'IA Override';
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

type Props = {
  detailModalView: 'payment' | 'audit';
  isAuditLoading: boolean;
  isOpen: boolean;
  isPaymentsLoading: boolean;
  isSaving: boolean;
  onDeleteHistory: (row: MerchOrderPaymentRecord) => void;
  onEditHistory: (row: MerchOrderPaymentRecord) => void;
  onClose: () => void;
  onSetView: (view: 'payment' | 'audit') => void;
  order: MerchOrderControlRecord | null;
  paymentHistoryEntries: MerchOrderPaymentRecord[];
  selectedOrderAudit: MerchOrderAuditRecord[];
};

export function OrderPaymentDetailModal(props: Props) {
  const {
    detailModalView, isAuditLoading, isOpen, isPaymentsLoading, isSaving, onClose, onDeleteHistory, onEditHistory, onSetView,
    order, paymentHistoryEntries, selectedOrderAudit,
  } = props;

  if (!isOpen || !order) return null;

  const resolvedGradeSection = [order.gradeLevel, order.sectionName].filter(Boolean).join(' - ') || 'Unassigned';
  const paymentAuditEntries = selectedOrderAudit.filter((log) => String(log.notes || '').trim().toLowerCase().startsWith('payment posted'));
  const paymentAuditEntriesAscending = [...paymentAuditEntries].reverse();
  const fallbackPostedBy =
    paymentAuditEntriesAscending.find((log) => String(log.changedBy || '').trim())?.changedBy ||
    selectedOrderAudit.find((log) => String(log.changedBy || '').trim())?.changedBy ||
    'Unknown Actor';

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide integrated-admin-merch-order-detail-modal" role="dialog" aria-modal="true" aria-label="Order payment details">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Order Payment</p>
            <h3>{order.productName}</h3>
          </div>
          <div className="integrated-admin-order-payment-view-switch" role="tablist" aria-label="Order payment views">
            <button type="button" className={`integrated-admin-order-payment-view-switch__btn ${detailModalView === 'payment' ? 'is-active' : ''}`} onClick={() => onSetView('payment')}>Payment History</button>
            <button type="button" className={`integrated-admin-order-payment-view-switch__btn ${detailModalView === 'audit' ? 'is-active' : ''}`} onClick={() => onSetView('audit')}>Audit Trail</button>
            <button type="button" className="integrated-admin-order-payment-view-switch__close" onClick={onClose} aria-label="Close order payment modal">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        </div>
        <div className="modal-dialog__body modal-record">
          {detailModalView === 'payment' ? (
            <section className="modal-record__section modal-record__section--full">
              <h4>Payment History</h4>
              <div className="integrated-admin-merch-order-audit">
                  {isPaymentsLoading ? <p>Loading payment history...</p> : paymentHistoryEntries.length === 0 ? <p>No payment history found for this order.</p> : (
                    paymentHistoryEntries.map((entry, index) => {
                      const entryPostedBy =
                        entry.postedBy ||
                        paymentAuditEntriesAscending[index]?.changedBy ||
                        fallbackPostedBy;
                      const paidThroughEntry = paymentHistoryEntries
                        .slice(0, index + 1)
                        .reduce((sum, current) => sum + current.paymentAmount, 0);
                      const balanceAfterPayment = Math.max(0, Number(order.orderAmount || 0) - paidThroughEntry);

                    return (
                      <div key={`${entry.id}-${index}`} className="integrated-admin-merch-order-audit__item integrated-admin-merch-order-audit__item--split">
                        <div className="integrated-admin-merch-order-audit__header-grid">
                          <div className="integrated-admin-merch-order-audit__entry-meta">
                            <strong>Payment History No. {index + 1}</strong>
                            <small>Transaction No: {entry.transactionNo}</small>
                            <span>{entry.paidAt ? new Date(entry.paidAt).toLocaleString() : '-'}</span>
                          </div>
                          <div className="integrated-admin-merch-order-audit__amount-stack">
                            <span className="integrated-admin-merch-order-audit__source integrated-admin-merch-order-audit__source--amount">
                              PHP {entry.paymentAmount.toFixed(2)}
                            </span>
                            <small>Posted By: {entryPostedBy}</small>
                            <div className="integrated-admin-merch-order-audit__actions">
                              <MerchPaymentReceiptDownloadButton
                                ariaLabel={`Download receipt for payment history ${index + 1}`}
                                className="integrated-admin-history-icon-btn"
                                mode="print"
                                showLabel={false}
                                title="Print receipt"
                                payload={{
                                  balanceAfterPayment,
                                  gradeSection: resolvedGradeSection,
                                  learnerLrn: order.learnerLrn || '',
                                  learnerName: order.learnerName || '',
                                  orderAmount: Number(order.orderAmount || 0),
                                  paymentHistoryRows: paymentHistoryEntries.map((payment) => ({
                                    amount: payment.paymentAmount,
                                    date: payment.paidAt || payment.createdAt,
                                    notes: payment.paymentNotes || '',
                                    postedBy: payment.postedBy || 'Unknown Actor',
                                    receiptNo: payment.receiptNo || '',
                                    referenceNo: order.referenceNo || order.id,
                                    status: payment.paymentStatus,
                                    transactionNo: payment.transactionNo || '',
                                  })),
                                  outstandingBalance: balanceAfterPayment,
                                  paidAt: entry.paidAt || entry.createdAt,
                                  paymentAmount: entry.paymentAmount,
                                  paymentMethod: entry.paymentMethod,
                                  paymentNotes: entry.paymentNotes || '',
                                  paymentStatus: entry.paymentStatus,
                                  postedBy: entryPostedBy,
                                  productName: order.productName || '',
                                  referenceNo: order.referenceNo || order.id,
                                  receiptNo: entry.receiptNo || '',
                                  schoolName: 'DepED USIS',
                                  sourceLabel: 'Integrated Admin',
                                  transactionNo: entry.transactionNo || '',
                                }}
                              />
                              <button
                                type="button"
                                className="integrated-admin-history-icon-btn"
                                onClick={() => onEditHistory(entry)}
                                disabled={isSaving}
                                aria-label={`Edit payment history ${index + 1}`}
                                title="Edit payment"
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                              </button>
                              <button
                                type="button"
                                className="integrated-admin-history-icon-btn integrated-admin-history-icon-btn--danger"
                                onClick={() => onDeleteHistory(entry)}
                                disabled={isSaving}
                                aria-label={`Delete payment history ${index + 1}`}
                                title="Delete payment"
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        {entry.receiptNo ? <small>Receipt No: {entry.receiptNo}</small> : null}
                        {entry.paymentNotes ? <small>{entry.paymentNotes}</small> : null}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          ) : null}

          {detailModalView === 'audit' ? (
            <section className="modal-record__section modal-record__section--full">
              <h4>Audit Trail</h4>
              <div className="integrated-admin-merch-order-audit">
                {isAuditLoading ? <p>Loading audit trail...</p> : selectedOrderAudit.length === 0 ? <p>No audit logs found for this order.</p> : (
                  selectedOrderAudit.map((log, index) => (
                    <div key={`${log.createdAt}-${index}`} className="integrated-admin-merch-order-audit__item integrated-admin-merch-order-audit__item--formatted">
                      <div className="integrated-admin-merch-order-audit__headline">
                        <strong>
                          {log.fromStatus
                            ? `${formatAuditStatusLabel(log.fromStatus)} -> ${formatAuditStatusLabel(log.toStatus)}`
                            : `Created as ${formatAuditStatusLabel(log.toStatus)}`}
                        </strong>
                        <span className="integrated-admin-merch-order-audit__source">
                          {formatAuditSourceLabel(log.source)}
                        </span>
                      </div>
                      <div className="integrated-admin-merch-order-audit__meta">
                        <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</span>
                        <span>{log.changedBy || 'Unknown Actor'}</span>
                      </div>
                      {log.notes ? <small className="integrated-admin-merch-order-audit__notes">{log.notes}</small> : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
