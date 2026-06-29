import { useEffect, useMemo, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import { fetchLearnerProfile, type LearnerProfileRecord } from '../../services/learnerProfile';
import {
  deleteLearnerMerchOrder,
  fetchLearnerMerchCatalog,
  fetchLearnerMerchOrderPayments,
  fetchLearnerMerchOrders,
  getLearnerMerchOrderStatusLabel,
  getLearnerMerchOrderStatusClass,
  placeLearnerMerchOrder,
  updateLearnerMerchOrder,
  type LearnerMerchOrderPaymentRecord,
  type LearnerMerchOrderRecord,
  type LearnerMerchProduct,
} from '../../services/learnerMerchService';
import { MerchPaymentReceiptDownloadButton } from '../../../../../common/components/merch/MerchPaymentReceiptDownloadButton';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';

type MerchServicePageProps = {
  session: LearnerPortalAccessRecord;
};

const LOCKED_ORDER_STATUSES = new Set(['confirmed', 'released', 'refund']);

const formatLearnerMerchPaymentMethod = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Unknown';
  if (normalized === 'cash') return 'Cash';
  if (normalized === 'gcash') return 'GCash';
  if (normalized === 'bank_transfer') return 'Bank Transfer';
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatLearnerMerchPaymentStatus = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'voided') return 'Voided';
  return 'Posted';
};

const formatLearnerMerchCurrency = (value: number) => `PHP ${Number(value || 0).toFixed(2)}`;

function LearnerMerchPaymentHistoryModal({
  isOpen,
  isLoading,
  onClose,
  order,
  payments,
  learnerDisplayName,
  learnerDisplayLrn,
  learnerDisplayGradeSection,
}: {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  order: LearnerMerchOrderRecord | null;
  payments: LearnerMerchOrderPaymentRecord[];
  learnerDisplayName: string;
  learnerDisplayLrn: string;
  learnerDisplayGradeSection: string;
}) {
  const receiptBalanceAfterByPaymentId = useMemo(() => {
    const totalAmount = Number(order?.totalAmount || 0);
    const map = new Map<string, number>();
    let runningPaid = 0;
    [...payments].slice().reverse().forEach((payment) => {
      runningPaid += Number(payment.paymentAmount || 0);
      map.set(payment.id, Math.max(0, totalAmount - runningPaid));
    });
    return map;
  }, [order?.totalAmount, payments]);

  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide learner-merch-payment-modal" role="dialog" aria-modal="true" aria-label="Payment history">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Merch Payment Information</p>
            <h3>{order.productName}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="modal-dialog__body learner-merch-payment-modal__body">
          <div className="learner-merch-payment-modal__summary">
            <div>
              <span>Reference No.</span>
              <strong>{order.referenceNo || '-'}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{getLearnerMerchOrderStatusLabel(order.orderStatus)}</strong>
            </div>
            <div>
              <span>Product</span>
              <strong>{order.productName || '-'}</strong>
            </div>
          </div>
          <div className="learner-merch-payment-modal__list">
            {isLoading ? (
              <p className="learner-services-history__state">Loading payment history...</p>
            ) : payments.length === 0 ? (
              <p className="learner-services-history__state">No payment history found for this order.</p>
            ) : (
                payments.map((payment) => (
                  <article key={payment.id} className="learner-merch-payment-modal__item">
                    <div className="learner-merch-payment-modal__item-head">
                      <div className="learner-merch-payment-modal__item-head-main">
                        <strong>PHP {payment.paymentAmount.toFixed(2)}</strong>
                        <span>{formatLearnerMerchPaymentStatus(payment.paymentStatus)}</span>
                      </div>
                      <MerchPaymentReceiptDownloadButton
                        ariaLabel={`View receipt for payment ${payment.receiptNo || payment.transactionNo || payment.id}`}
                        className="learner-merch-payment-modal__receipt-btn"
                        mode="pdf"
                        title="View receipt"
                        payload={{
                          balanceAfterPayment: receiptBalanceAfterByPaymentId.get(payment.id) ?? Number(order.outstandingBalance || 0),
                          gradeSection: [order.gradeLevel, order.sectionName].filter(Boolean).join(' - ') || learnerDisplayGradeSection,
                          learnerLrn: order.learnerLrn || learnerDisplayLrn,
                          learnerName: order.learnerName || learnerDisplayName,
                          orderAmount: Number(order.totalAmount || 0),
                          paymentHistoryRows: payments.map((historyPayment) => ({
                            amount: historyPayment.paymentAmount,
                            date: historyPayment.paidAt,
                            notes: historyPayment.paymentNotes || '',
                            postedBy: historyPayment.postedBy || 'Unknown Actor',
                            receiptNo: historyPayment.receiptNo || '',
                            referenceNo: order.referenceNo || '-',
                            status: historyPayment.paymentStatus,
                            transactionNo: historyPayment.transactionNo || '',
                          })),
                          outstandingBalance: receiptBalanceAfterByPaymentId.get(payment.id) ?? Number(order.outstandingBalance || 0),
                          paidAt: payment.paidAt,
                          paymentAmount: payment.paymentAmount,
                          paymentMethod: payment.paymentMethod,
                          paymentNotes: payment.paymentNotes || '',
                          paymentStatus: payment.paymentStatus,
                          postedBy: payment.postedBy || 'Unknown Actor',
                          productName: order.productName || '-',
                          referenceNo: order.referenceNo || '-',
                          receiptNo: payment.receiptNo || '',
                          schoolName: 'Leon NHS - Only the Best Merchandise',
                          sourceLabel: 'Learner Portal',
                          transactionNo: payment.transactionNo || '',
                        }}
                      />
                    </div>
                    <div className="learner-merch-payment-modal__meta">
                      <span>Receipt: {payment.receiptNo || 'N/A'}</span>
                      <span>Method: {formatLearnerMerchPaymentMethod(payment.paymentMethod)}</span>
                      <span>{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'No payment date'}</span>
                    </div>
                    {payment.paymentNotes ? <p>{payment.paymentNotes}</p> : null}
                  </article>
                ))
              )}
          </div>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__blue" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function MerchServicePage({ session }: MerchServicePageProps) {
  const [catalog, setCatalog] = useState<LearnerMerchProduct[]>([]);
  const [orders, setOrders] = useState<LearnerMerchOrderRecord[]>([]);
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<LearnerMerchProduct | null>(null);
  const [editingOrder, setEditingOrder] = useState<LearnerMerchOrderRecord | null>(null);
  const [pendingDeleteOrder, setPendingDeleteOrder] = useState<LearnerMerchOrderRecord | null>(null);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<LearnerMerchOrderRecord | null>(null);
  const [selectedPaymentHistory, setSelectedPaymentHistory] = useState<LearnerMerchOrderPaymentRecord[]>([]);
  const [isPaymentHistoryLoading, setIsPaymentHistoryLoading] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [selectedSize, setSelectedSize] = useState('');
  const [notes, setNotes] = useState('');
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [rows, orderRows, profile] = await Promise.all([
          fetchLearnerMerchCatalog(),
          fetchLearnerMerchOrders({ learnerId: session.learnerId, learnerLrn: session.lrn }),
          fetchLearnerProfile({ learnerId: session.learnerId, lrn: session.lrn }).catch(() => null),
        ]);
        if (!cancelled) {
          setCatalog(rows);
          setOrders(orderRows);
          setLearnerProfile(profile);
        }
      } catch (loadError: any) {
        if (!cancelled) setError(loadError?.message || 'Unable to load merch catalog.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = useMemo(() => {
    if (!selectedProduct) return false;
    if (selectedProduct.availableSizes.length > 0 && !selectedSize) return false;
    return Number(quantity) > 0;
  }, [quantity, selectedProduct, selectedSize]);

  const ordersByPeriod = useMemo(() => {
    const grouped = new Map<string, LearnerMerchOrderRecord[]>();
    orders.forEach((order) => {
      const key = String(order.orderPeriodLabel || '').trim() || 'No Order Period';
      const current = grouped.get(key) || [];
      current.push(order);
      grouped.set(key, current);
    });
    return Array.from(grouped.entries()).map(([periodLabel, periodOrders]) => ({
      outstandingBalance: periodOrders.reduce((sum, order) => sum + Number(order.outstandingBalance || 0), 0),
      periodLabel,
      periodOrders,
      totalAmount: periodOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    }));
  }, [orders]);

  const learnerDisplayName = learnerProfile
    ? [learnerProfile.firstName, learnerProfile.lastName].filter(Boolean).join(' ') || session.learnerName
    : session.learnerName;
  const learnerDisplayLrn = learnerProfile?.lrn || session.lrn;
  const learnerDisplayGradeSection = learnerProfile
    ? [learnerProfile.gradeLevel, learnerProfile.sectionName].filter(Boolean).join(' - ')
    : '';

  const isPreOrderClosed = (item: LearnerMerchProduct) => {
    if (!item.isPreOrder || !item.preOrderCutoffDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    return item.preOrderCutoffDate < today;
  };

  const openOrderModal = (product: LearnerMerchProduct) => {
    setEditingOrder(null);
    setSelectedProduct(product);
    setQuantity('1');
    setSelectedSize(product.availableSizes[0] || '');
    setNotes('');
  };

  const canEditOrder = (order: LearnerMerchOrderRecord) => {
    if (order.orderSource !== 'learner_portal') return false;
    if (LOCKED_ORDER_STATUSES.has(String(order.orderStatus || '').trim().toLowerCase())) return false;
    const today = new Date().toISOString().slice(0, 10);
    if (order.orderPeriodEndDate && order.orderPeriodEndDate < today) return false;
    if (order.preOrderCutoffDate && order.preOrderCutoffDate < today) return false;
    return true;
  };

  const canDeleteOrder = (order: LearnerMerchOrderRecord) => {
    if (order.orderSource !== 'learner_portal') return false;
    if (LOCKED_ORDER_STATUSES.has(String(order.orderStatus || '').trim().toLowerCase())) return false;
    return true;
  };

  const openEditOrderModal = (order: LearnerMerchOrderRecord) => {
    setEditingOrder(order);
    setSelectedProduct({
      availableSizes: order.availableSizes || [],
      categoryName: '',
      description: '',
      id: order.productId,
      imageUrl: null,
      isPreOrder: Boolean(order.preOrderCutoffDate),
      name: order.productName,
      price: 0,
      preOrderCutoffDate: order.preOrderCutoffDate,
      stockQty: 0,
    });
    setQuantity(String(order.quantity || 1));
    setSelectedSize(order.selectedSize || (order.availableSizes[0] || ''));
    setNotes(order.notes || '');
  };

  const handlePlaceOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      if (editingOrder) {
        await updateLearnerMerchOrder({
          learnerId: session.learnerId,
          learnerLrn: session.lrn,
          notes,
          orderId: editingOrder.orderId,
          quantity: Number(quantity),
          selectedSize: selectedSize || null,
        });
      } else {
        await placeLearnerMerchOrder({
          learnerId: session.learnerId,
          learnerLrn: session.lrn,
          learnerName: session.learnerName,
          notes,
          productId: selectedProduct.id,
          quantity: Number(quantity),
          selectedSize: selectedSize || null,
        });
      }
      const refreshedOrders = await fetchLearnerMerchOrders({ learnerId: session.learnerId, learnerLrn: session.lrn });
      setOrders(refreshedOrders);
      setSelectedProduct(null);
      setEditingOrder(null);
      setAlert({
        title: editingOrder ? 'Order Updated' : 'Order Submitted',
        message: editingOrder ? 'Your merch order was updated.' : 'Your merch order request was sent.',
        tone: 'success',
      });
    } catch (submitError: any) {
      setAlert({ title: editingOrder ? 'Update Failed' : 'Order Failed', message: submitError?.message || 'Unable to submit order.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (order: LearnerMerchOrderRecord) => {
    if (!canDeleteOrder(order)) return;
    setPendingDeleteOrder(order);
  };

  const openPaymentHistory = async (order: LearnerMerchOrderRecord) => {
    setSelectedPaymentOrder(order);
    setSelectedPaymentHistory([]);
    setIsPaymentHistoryLoading(true);
    try {
      const rows = await fetchLearnerMerchOrderPayments(order.orderId);
      setSelectedPaymentHistory(rows);
    } catch (paymentError: any) {
      setAlert({ title: 'Payment History Failed', message: paymentError?.message || 'Unable to load payment history.', tone: 'danger' });
    } finally {
      setIsPaymentHistoryLoading(false);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!pendingDeleteOrder) return;
    setIsSubmitting(true);
    try {
      await deleteLearnerMerchOrder({
        learnerId: session.learnerId,
        learnerLrn: session.lrn,
        orderId: pendingDeleteOrder.orderId,
      });
      const refreshedOrders = await fetchLearnerMerchOrders({ learnerId: session.learnerId, learnerLrn: session.lrn });
      setOrders(refreshedOrders);
      setPendingDeleteOrder(null);
      setAlert({ title: 'Order Deleted', message: 'Your merch order request was deleted.', tone: 'success' });
    } catch (deleteError: any) {
      setAlert({ title: 'Delete Failed', message: deleteError?.message || 'Unable to delete order.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <UsisPageLoader message="Loading merchandise catalog..." />;
  }

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Merch</h2>
          <p>Browse products and submit a school merchandise order request.</p>
        </header>
      </div>

      {error ? <p className="learner-services-history__state">{error}</p> : null}

      {!error ? (
        <>
          {catalog.length > 0 ? (
            <div className="learner-merch-grid">
              {catalog.map((item) => (
                <article
                  key={item.id}
                  className={`learner-merch-card${isPreOrderClosed(item) ? ' learner-merch-card--disabled' : ''}`}
                >
                  <div className="learner-merch-card__image-wrap">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={`${item.name} product image`} className="learner-merch-card__image" />
                    ) : (
                      <div className="learner-merch-card__image-placeholder">No Image</div>
                    )}
                  </div>
                  <div className="learner-merch-card__body">
                    <span className="learner-merch-card__category">{item.categoryName}</span>
                    {item.isPreOrder ? <span className="learner-merch-card__preorder">Pre-order</span> : null}
                    <h3>{item.name}</h3>
                    <p className="learner-merch-card__price">PHP {item.price.toFixed(2)}</p>
                    <p className="learner-merch-card__stock">
                      {item.isPreOrder ? 'Open for pre-order' : `Stock: ${item.stockQty}`}
                    </p>
                    {item.isPreOrder && item.preOrderCutoffDate ? (
                      <p className="learner-merch-card__stock">
                        Cutoff: {new Date(item.preOrderCutoffDate).toLocaleDateString()}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openOrderModal(item)}
                      disabled={isPreOrderClosed(item)}
                    >
                      {isPreOrderClosed(item) ? 'Pre-order Closed' : 'Place Order'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="notice-box learner-hint__box learner-merch-empty-state" role="status" aria-live="polite">
              <strong>No Available Products</strong>
              <span>No merch items are available right now.</span>
            </div>
          )}
        </>
      ) : null}

      {!error ? (
        <section className="learner-services-history learner-merch-orders">
          <header className="learner-services-history__header">
            <h3>Current Orders</h3>
            <p>Your latest merchandise orders, ID requests, and overrides.</p>
          </header>
          {orders.length === 0 ? (
            <p className="learner-services-history__state">No current merch orders found.</p>
          ) : (
            <div className="learner-merch-orders-periods" aria-label="Current merch orders by order period">
              {ordersByPeriod.map(({ periodLabel, periodOrders, totalAmount, outstandingBalance }, groupIndex) => (
                <details key={`${periodLabel}-${groupIndex}`} className="learner-merch-orders-period">
                  <summary className="learner-merch-orders-period__summary">
                    <span className="learner-merch-orders-period__meta">
                      <span className="material-symbols-outlined learner-merch-orders-period__chevron" aria-hidden="true">
                        expand_more
                      </span>
                      <span className="learner-merch-orders-period__title">{periodLabel}</span>
                    </span>
                    <span className="learner-merch-orders-period__summary-meta">
                      <span className="learner-merch-orders-period__count">{periodOrders.length} order(s)</span>
                      <span className="learner-merch-orders-period__stats">
                        <span>Total {formatLearnerMerchCurrency(totalAmount)}</span>
                        <span>Outstanding {formatLearnerMerchCurrency(outstandingBalance)}</span>
                      </span>
                    </span>
                  </summary>
                  <div className="learner-merch-orders-table-wrap">
                    <table className="learner-merch-orders-table" aria-label={`Current merch orders for ${periodLabel}`}>
                      <thead>
                        <tr>
                          <th>Reference No.</th>
                          <th>Product</th>
                          <th>Qty / Size</th>
                          <th>Amount</th>
                          <th>Outstanding</th>
                          <th>Status</th>
                          <th>Placed Via</th>
                          <th>Date</th>
                          <th>Notes</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodOrders.map((order, index) => (
                          <tr key={`${order.orderId}-${index}`}>
                            <td>{order.referenceNo || '-'}</td>
                            <td>{order.productName}</td>
                            <td>{order.quantity} {order.selectedSize ? `- ${order.selectedSize}` : '- No size'}</td>
                            <td>{formatLearnerMerchCurrency(order.totalAmount)}</td>
                            <td>{formatLearnerMerchCurrency(order.outstandingBalance)}</td>
                            <td>
                              <span className={`learner-merch-status-chip ${getLearnerMerchOrderStatusClass(order.orderStatus)}`}>
                                {getLearnerMerchOrderStatusLabel(order.orderStatus)}
                              </span>
                            </td>
                            <td>
                              <span className={`learner-merch-order-source learner-merch-order-source--${order.orderSource}`}>
                                {order.orderSource === 'integrated_admin' ? 'IA Override' : order.orderSource === 'learner_portal' ? 'School Portal' : 'Unknown'}
                              </span>
                            </td>
                            <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</td>
                            <td>{order.notes || '-'}</td>
                            <td>
                              <div className="learner-merch-orders-table__actions">
                                {LOCKED_ORDER_STATUSES.has(String(order.orderStatus || '').trim().toLowerCase()) ? (
                                  <button
                                    type="button"
                                    className="learner-merch-orders-table__info-btn"
                                    onClick={() => void openPaymentHistory(order)}
                                    aria-label={`View payment history for ${order.productName}`}
                                    title="View payment history"
                                  >
                                    <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="learner-merch-orders-table__edit-btn"
                                  onClick={() => openEditOrderModal(order)}
                                  disabled={!canEditOrder(order) || isSubmitting}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="learner-merch-orders-table__delete-btn"
                                  onClick={() => void handleDeleteOrder(order)}
                                  disabled={!canDeleteOrder(order) || isSubmitting}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {selectedProduct ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setSelectedProduct(null)} />
          <div
            className="modal-dialog modal-dialog--wide learner-merch-order-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Place merch order"
          >
            <div className="modal-dialog__header">
              <div className="modal-dialog__title-group">
                <p className="modal-dialog__eyebrow">Merch Order</p>
                <h3>{editingOrder ? `Edit Order: ${selectedProduct.name}` : selectedProduct.name}</h3>
              </div>
              <button type="button" className="modal-dialog__close" onClick={() => { setSelectedProduct(null); setEditingOrder(null); }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="modal-dialog__body registry-form" onSubmit={handlePlaceOrder}>
              <div className="learner-merch-order-modal__row">
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" required placeholder=" " />
                    <span>Quantity</span>
                  </div>
                </label>
                {selectedProduct.availableSizes.length > 0 ? (
                  <UsisSearchableSelect
                    ariaLabel="Size"
                    allowTyping={false}
                    floatingLabel
                    label="Size"
                    value={selectedSize}
                    onChange={setSelectedSize}
                    options={selectedProduct.availableSizes.map((size) => ({
                      label: size,
                      value: size,
                    }))}
                  />
                ) : null}
              </div>
              <label className="floating-field">
                <div className="floating-field__control">
                  <textarea
                    className="learner-merch-order-modal__notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder=" "
                  />
                  <span>Notes (optional)</span>
                </div>
              </label>
              <div className="modal-dialog__actions">
                <button type="button" onClick={() => { setSelectedProduct(null); setEditingOrder(null); }} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="modal-dialog__blue" disabled={isSubmitting || !canSubmit}>
                  {isSubmitting ? (editingOrder ? 'Updating...' : 'Submitting...') : (editingOrder ? 'Update Order' : 'Submit Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
      <UsisAlertModal
        open={Boolean(pendingDeleteOrder)}
        title="Delete Order Request"
        message="Delete this order request? This action cannot be undone."
        tone="warning"
        confirmLabel={isSubmitting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onClose={() => {
          if (!isSubmitting) setPendingDeleteOrder(null);
        }}
        onConfirm={() => {
          if (!isSubmitting) void confirmDeleteOrder();
        }}
      />
      <LearnerMerchPaymentHistoryModal
        isOpen={Boolean(selectedPaymentOrder)}
        isLoading={isPaymentHistoryLoading}
        onClose={() => {
          setSelectedPaymentOrder(null);
          setSelectedPaymentHistory([]);
        }}
        order={selectedPaymentOrder}
        payments={selectedPaymentHistory}
        learnerDisplayName={learnerDisplayName}
        learnerDisplayLrn={learnerDisplayLrn}
        learnerDisplayGradeSection={learnerDisplayGradeSection}
      />
    </section>
  );
}
