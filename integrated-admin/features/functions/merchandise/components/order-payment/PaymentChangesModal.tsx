import type { MerchOrderAuditRecord, MerchOrderControlRecord } from '../../services/merchOrderControlService';
import { getMerchOrderStatusLabel } from '../../order-control/utils/orderStatus';

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
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  order: MerchOrderControlRecord | null;
  rows: MerchOrderAuditRecord[];
};

export function PaymentChangesModal({ isLoading, isOpen, onClose, order, rows }: Props) {
  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide integrated-admin-merch-order-detail-modal" role="dialog" aria-modal="true" aria-label="Payment history and details">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Payment Changes</p>
            <h3>{order.referenceNo || order.id}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body modal-record">
          <section className="modal-record__section">
            <h4>Order Summary</h4>
            <div className="modal-record__fields">
              <div className="modal-record__field">
                <span>Learner</span>
                <strong>{order.learnerName || '-'}</strong>
              </div>
              <div className="modal-record__field">
                <span>Product</span>
                <strong>{order.productName || '-'}</strong>
              </div>
              <div className="modal-record__field">
                <span>Order Amount</span>
                <strong>PHP {order.orderAmount.toFixed(2)}</strong>
              </div>
              <div className="modal-record__field">
                <span>Status</span>
                <strong>{getMerchOrderStatusLabel(order.orderStatus)}</strong>
              </div>
            </div>
          </section>

          <section className="modal-record__section modal-record__section--full">
            <h4>Payment History</h4>
            <div className="integrated-admin-merch-order-audit">
              {isLoading ? (
                <p>Loading payment history...</p>
              ) : rows.length === 0 ? (
                <p>No payment history found for this order.</p>
              ) : (
                rows.map((log, index) => (
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
        </div>
        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__blue" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
