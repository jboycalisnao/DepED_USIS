import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type { MerchOrderControlRecord } from '../../services/merchOrderControlService';

type Props = {
  isSaving: boolean;
  onDeleteOrder: (orderId: string) => void;
  onOpenOrderDetails: (row: MerchOrderControlRecord) => void;
  onStatusChange: (orderId: string, value: string) => void;
  rows: MerchOrderControlRecord[];
  statusOptions: string[];
};

export function OrderControlSectionTable({
  isSaving,
  onDeleteOrder,
  onOpenOrderDetails,
  onStatusChange,
  rows,
  statusOptions,
}: Props) {
  return (
    <table className="registry-table integrated-admin-merch-group__table">
      <thead>
        <tr>
          <th>Ref No.</th>
          <th>Date</th>
          <th>Learner</th>
          <th>LRN</th>
          <th>Product</th>
          <th>Period</th>
          <th>Qty</th>
          <th>Size</th>
          <th>Status</th>
          <th>Placed Via</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={`${row.id}-${index}`}
            className="integrated-admin-merch-order-row"
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest('.integrated-admin-order-status-cell') || target.closest('.integrated-admin-order-action-cell')) {
                return;
              }
              onOpenOrderDetails(row);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenOrderDetails(row);
              }
            }}
          >
            <td>{row.referenceNo || '-'}</td>
            <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
            <td>{row.learnerName || '-'}</td>
            <td>{row.learnerLrn || '-'}</td>
            <td>{row.productName}</td>
            <td>{row.orderPeriodLabel || '-'}</td>
            <td>{row.quantity}</td>
            <td>{row.selectedSize || '-'}</td>
            <td className="integrated-admin-order-status-cell">
              {row.orderStatus === 'Approved' ? (
                <span className="integrated-admin-order-status-tag integrated-admin-order-status-tag--approved">
                  Approved
                </span>
              ) : (
                <div onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                  <UsisSearchableSelect
                    allowTyping={false}
                    ariaLabel="Order status"
                    floatingLabel
                    forceInlineMenu
                    label="Status"
                    onChange={(value) => onStatusChange(row.id, value)}
                    options={statusOptions.map((option) => ({ label: option, value: option }))}
                    value={row.orderStatus}
                  />
                </div>
              )}
            </td>
            <td>
              <span className={`integrated-admin-order-source-tag integrated-admin-order-source-tag--${row.orderSource}`}>
                <span className="integrated-admin-order-source-tag__dot" aria-hidden="true" />
                {row.orderSource === 'integrated_admin'
                  ? 'IA Override'
                  : row.orderSource === 'learner_portal'
                    ? 'Learner Portal'
                    : 'Unknown'}
              </span>
            </td>
            <td className="integrated-admin-order-action-cell">
              <button
                aria-label={`Delete order ${row.id}`}
                className="registry-icon-btn registry-icon-btn--danger"
                disabled={isSaving}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteOrder(row.id);
                }}
                type="button"
              >
                <span className="material-symbols-outlined" aria-hidden="true">delete</span>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
