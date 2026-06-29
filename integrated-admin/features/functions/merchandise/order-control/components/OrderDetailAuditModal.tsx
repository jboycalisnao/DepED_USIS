import type { MerchOrderAuditRecord, MerchOrderControlRecord } from '../../services/merchOrderControlService';
import { getMerchOrderStatusClass, getMerchOrderStatusLabel } from '../utils/orderStatus';

type Props = {
  isAuditLoading: boolean;
  isSaving: boolean;
  onClose: () => void;
  onStatusChange: (value: string) => void;
  onStatusSave: () => void;
  order: MerchOrderControlRecord | null;
  orderStatusValue: string;
  orderAudit: MerchOrderAuditRecord[];
  statusOptions: string[];
};

export function OrderDetailAuditModal({
  isAuditLoading,
  isSaving,
  onClose,
  onStatusChange,
  onStatusSave,
  order,
  orderStatusValue,
  orderAudit,
  statusOptions,
}: Props) {
  if (!order) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide integrated-admin-merch-order-detail-modal" role="dialog" aria-modal="true" aria-label="Order details">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">{order.orderKind === 'id' ? 'ID Order Details' : 'Merch Order Details'}</p>
            <h3>{order.productName}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body modal-record">
          <section className="modal-record__section">
            <h4>Manual Status Change</h4>
            <div className="integrated-admin-order-detail-status-row">
              <select
                aria-label="Order status"
                className={`integrated-admin-order-status-select integrated-admin-order-detail-status-select ${getMerchOrderStatusClass(orderStatusValue, order.orderKind)}`}
                onChange={(event) => onStatusChange(event.target.value)}
                value={orderStatusValue}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option} className={getMerchOrderStatusClass(option, order.orderKind)}>
                    {getMerchOrderStatusLabel(option, order.orderKind)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="primary-button integrated-admin-order-detail-status-save"
                onClick={onStatusSave}
                disabled={isSaving || orderStatusValue === order.orderStatus}
              >
                {isSaving ? 'Saving...' : 'Save Status'}
              </button>
            </div>
          </section>

          <section className="modal-record__section">
            <h4>Order Summary</h4>
            <div className="modal-record__fields">
              <div className="modal-record__field">
                <span>Reference No.</span>
                <strong>{order.referenceNo || '-'}</strong>
              </div>
              <div className="modal-record__field">
                <span>Learner</span>
                <strong>{order.learnerName || '-'}</strong>
              </div>
              <div className="modal-record__field">
                <span>LRN</span>
                <strong>{order.learnerLrn || '-'}</strong>
              </div>
              <div className="modal-record__field">
                <span>Grade / Section</span>
                <strong>{order.gradeLevel} - {order.sectionName}</strong>
              </div>
              <div className="modal-record__field">
                <span>Quantity</span>
                <strong>{order.quantity}</strong>
              </div>
              <div className="modal-record__field">
                <span>Order Amount</span>
                <strong>PHP {Number(order.orderAmount || 0).toFixed(2)}</strong>
              </div>
              <div className="modal-record__field">
                <span>Order Period</span>
                <strong>{order.orderPeriodLabel || '-'}</strong>
              </div>
              <div className="modal-record__field">
                <span>Size</span>
                <strong>{order.selectedSize || '-'}</strong>
              </div>
              <div className="modal-record__field">
                <span>Status</span>
                <strong>{getMerchOrderStatusLabel(order.orderStatus, order.orderKind)}</strong>
              </div>
              <div className="modal-record__field">
                <span>Date</span>
                <strong>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</strong>
              </div>
            </div>
          </section>

          <section className="modal-record__section modal-record__section--full">
            <h4>Notes</h4>
            <div className="modal-record__timeline">
              <span>Order Notes</span>
              <strong>{order.notes || '-'}</strong>
            </div>
          </section>

          <section className="modal-record__section modal-record__section--full">
            <h4>Audit Trail</h4>
            <div className="integrated-admin-merch-order-audit">
              {isAuditLoading ? (
                <p>Loading audit trail...</p>
              ) : orderAudit.length === 0 ? (
                <p>No audit logs found for this order.</p>
              ) : (
                orderAudit.map((log, index) => (
                  <div key={`${log.createdAt}-${index}`} className="integrated-admin-merch-order-audit__item">
                    <strong>
                      {log.fromStatus
                        ? `${getMerchOrderStatusLabel(log.fromStatus, order.orderKind)} -> ${getMerchOrderStatusLabel(log.toStatus, order.orderKind)}`
                        : `Created as ${getMerchOrderStatusLabel(log.toStatus, order.orderKind)}`}
                    </strong>
                    <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'} | {log.changedBy || log.source || 'Unknown Actor'}</span>
                    {log.notes ? <small>{log.notes}</small> : null}
                  </div>
                ))
              )}
            </div>
          </section>
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
