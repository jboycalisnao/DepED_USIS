import { useMemo } from 'react';
import {
  getLearnerMerchOrderStatusClass,
  getLearnerMerchOrderStatusLabel,
  type LearnerMerchOrderRecord,
} from '../../../../services/learnerMerchService';
import type { MerchControlSectionLearnerRecord } from '../../../../services/learnerMerchControlService';

type Props = {
  learner: MerchControlSectionLearnerRecord | null;
  orders: LearnerMerchOrderRecord[];
  isLoadingDetails: boolean;
  onClose: () => void;
};

export function MerchControlOrderDetailsModal({ learner, orders, isLoadingDetails, onClose }: Props) {
  const ordersByPeriod = useMemo(() => {
    const grouped = new Map<string, LearnerMerchOrderRecord[]>();
    orders.forEach((order) => {
      const key = String(order.orderPeriodLabel || '').trim() || 'No Order Period';
      const current = grouped.get(key) || [];
      current.push(order);
      grouped.set(key, current);
    });
    return Array.from(grouped.entries()).map(([periodLabel, periodOrders]) => ({ periodLabel, periodOrders }));
  }, [orders]);

  if (!learner) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide learner-merch-control-detail-modal" role="dialog" aria-modal="true" aria-label="Learner merch order details">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Merch Control</p>
            <h3>{learner.learnerName}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body">
          {isLoadingDetails ? (
            <p className="learner-services-history__state">Loading current orders...</p>
          ) : orders.length === 0 ? (
            <p className="learner-services-history__state">No current merch orders found for this learner.</p>
          ) : (
            <div className="learner-merch-orders-periods" aria-label="Current merch orders by order period">
              {ordersByPeriod.map(({ periodLabel, periodOrders }, groupIndex) => (
                <details key={`${periodLabel}-${groupIndex}`} className="learner-merch-orders-period" open={groupIndex === 0}>
                  <summary className="learner-merch-orders-period__summary">
                    <span className="learner-merch-orders-period__meta">
                      <span className="material-symbols-outlined learner-merch-orders-period__chevron" aria-hidden="true">
                        expand_more
                      </span>
                      <span className="learner-merch-orders-period__title">{periodLabel}</span>
                    </span>
                    <span className="learner-merch-orders-period__count">{periodOrders.length} order(s)</span>
                  </summary>
                  <div className="learner-merch-orders-table-wrap">
                    <table className="learner-merch-orders-table" aria-label={`Current merch orders for ${periodLabel}`}>
                      <thead>
                        <tr>
                          <th>Reference No.</th>
                          <th>Product</th>
                          <th>Qty / Size</th>
                          <th>Status</th>
                          <th>Placed Via</th>
                          <th>Date</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodOrders.map((order, index) => (
                          <tr key={`${order.orderId}-${index}`}>
                            <td>{order.referenceNo || '-'}</td>
                            <td>{order.productName}</td>
                            <td>{order.quantity} {order.selectedSize ? `- ${order.selectedSize}` : '- No size'}</td>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
        <div className="modal-dialog__actions">
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
