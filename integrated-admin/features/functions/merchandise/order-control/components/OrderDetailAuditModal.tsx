import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type { MerchOrderAuditRecord, MerchOrderControlRecord } from '../../services/merchOrderControlService';

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
      <div className="modal-dialog integrated-admin-merch-order-detail-modal" role="dialog" aria-modal="true" aria-label="Order details">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Merch Order Details</p>
            <h3>{order.productName}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body integrated-admin-merch-order-detail">
          <article className="integrated-admin-merch-order-detail__full">
            <span className="integrated-admin-order-detail-status-title">Manual Status Change</span>
            <div className="integrated-admin-order-detail-status-row">
              <UsisSearchableSelect
                ariaLabel="Order status"
                allowTyping={false}
                className="integrated-admin-order-detail-status-select"
                floatingLabel
                label="Status"
                onChange={onStatusChange}
                options={statusOptions.map((option) => ({ label: option, value: option }))}
                value={orderStatusValue}
              />
              <button
                type="button"
                className="primary-button integrated-admin-order-detail-status-save"
                onClick={onStatusSave}
                disabled={isSaving || orderStatusValue === order.orderStatus}
              >
                {isSaving ? 'Saving...' : 'Save Status'}
              </button>
            </div>
          </article>
          <article className="integrated-admin-merch-order-detail__full integrated-admin-merch-order-detail__summary">
            <div className="integrated-admin-merch-order-detail__metric integrated-admin-merch-order-detail__metric--primary"><span>Reference No.</span><strong>{order.referenceNo || '-'}</strong></div>
            <div className="integrated-admin-merch-order-detail__metric integrated-admin-merch-order-detail__metric--primary"><span>Learner</span><strong>{order.learnerName || '-'}</strong></div>
            <div className="integrated-admin-merch-order-detail__metric"><span>LRN</span><strong>{order.learnerLrn || '-'}</strong></div>
            <div className="integrated-admin-merch-order-detail__metric"><span>Grade / Section</span><strong>{order.gradeLevel} - {order.sectionName}</strong></div>
            <div className="integrated-admin-merch-order-detail__metric"><span>Quantity</span><strong>{order.quantity}</strong></div>
            <div className="integrated-admin-merch-order-detail__metric"><span>Order Period</span><strong>{order.orderPeriodLabel || '-'}</strong></div>
            <div className="integrated-admin-merch-order-detail__metric"><span>Size</span><strong>{order.selectedSize || '-'}</strong></div>
            <div className="integrated-admin-merch-order-detail__metric integrated-admin-merch-order-detail__metric--status"><span>Status</span><strong>{order.orderStatus}</strong></div>
            <div className="integrated-admin-merch-order-detail__metric"><span>Date</span><strong>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</strong></div>
          </article>
          <article className="integrated-admin-merch-order-detail__full"><span>Notes</span><strong>{order.notes || '-'}</strong></article>
          <article className="integrated-admin-merch-order-detail__full">
            <span>Audit Trail</span>
            <div className="integrated-admin-merch-order-audit">
              {isAuditLoading ? (
                <p>Loading audit trail...</p>
              ) : orderAudit.length === 0 ? (
                <p>No audit logs found for this order.</p>
              ) : (
                orderAudit.map((log, index) => (
                  <div key={`${log.createdAt}-${index}`} className="integrated-admin-merch-order-audit__item">
                    <strong>{log.fromStatus ? `${log.fromStatus} -> ${log.toStatus}` : `Created as ${log.toStatus}`}</strong>
                    <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'} | {log.changedBy || log.source || 'Unknown Actor'}</span>
                    {log.notes ? <small>{log.notes}</small> : null}
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__blue" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
