import type { MerchActiveLearnerOption, MerchOrderControlRecord } from '../../services/merchOrderControlService';
import { resolveMerchLearnerDisplayName } from '../../services/merchOrderControlService';
import {
  getMerchOrderRowStatusClass,
  getMerchOrderStatusClass,
  getMerchOrderStatusLabel,
  ID_ORDER_STATUS_OPTIONS,
  MERCH_ORDER_STATUS_OPTIONS,
} from '../utils/orderStatus';

type Props = {
  isSaving: boolean;
  onDeleteOrder: (orderId: string) => void;
  onOpenOrderDetails: (row: MerchOrderControlRecord) => void;
  onStatusChange: (orderId: string, value: string) => void;
  learners: MerchActiveLearnerOption[];
  rows: MerchOrderControlRecord[];
};

type LearnerGroup = {
  key: string;
  label: string;
  lrn: string;
  rows: MerchOrderControlRecord[];
};

const buildLearnerGroupKey = (row: MerchOrderControlRecord) => {
  const learnerId = String(row.learnerId || '').trim().toLowerCase();
  const lrn = String(row.learnerLrn || '').trim().toLowerCase();
  const name = String(row.learnerName || '').trim().toLowerCase();
  return `${learnerId || lrn || name || 'unknown'}|${lrn || 'unknown'}`;
};

const groupRowsByLearner = (rows: MerchOrderControlRecord[], learners: MerchActiveLearnerOption[]) =>
  rows.reduce<Record<string, LearnerGroup>>((acc, row) => {
    const key = buildLearnerGroupKey(row);
    if (!acc[key]) {
      acc[key] = {
        key,
        label: resolveMerchLearnerDisplayName(row, learners),
        lrn: row.learnerLrn || '',
        rows: [],
      };
    }
    acc[key].rows.push(row);
    return acc;
  }, {});

export function OrderControlSectionTable({
  isSaving,
  onDeleteOrder,
  onOpenOrderDetails,
  onStatusChange,
  learners,
  rows,
}: Props) {
  const learnerGroups = Object.values(groupRowsByLearner(rows, learners)).sort((groupA, groupB) => {
    const nameDiff = groupA.label.localeCompare(groupB.label);
    if (nameDiff !== 0) return nameDiff;
    return groupA.lrn.localeCompare(groupB.lrn);
  });

  return (
    <div className="integrated-admin-merch-learner-groups">
      {learnerGroups.map((group) => (
        <details key={group.key} className="integrated-admin-merch-group integrated-admin-merch-learner-group" open>
          <summary className="integrated-admin-merch-group__summary">
            <span className="material-symbols-outlined integrated-admin-merch-group__chevron" aria-hidden="true">
              expand_more
            </span>
            <div className="integrated-admin-merch-learner-group__identity">
              <span className="integrated-admin-merch-group__title">
                {resolveMerchLearnerDisplayName(group.rows[0], learners)}
              </span>
              <span className="integrated-admin-merch-learner-group__meta">{group.lrn || 'No LRN provided'}</span>
            </div>
            <span className="integrated-admin-merch-group__count">{group.rows.length} order(s)</span>
          </summary>
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
            <th>Amount</th>
            <th>Size</th>
            <th>Status</th>
            <th>Placed Via</th>
            <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row, index) => (
                <tr
                  key={`${row.id}-${index}`}
                  className={`integrated-admin-merch-order-row ${getMerchOrderRowStatusClass(row.orderStatus, row.orderKind)}`}
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
                  <td>{resolveMerchLearnerDisplayName(row, learners) || '-'}</td>
                  <td>{row.learnerLrn || '-'}</td>
                  <td>{row.productName}</td>
                  <td>{row.orderPeriodLabel || '-'}</td>
                  <td>{row.quantity}</td>
                  <td>PHP {Number(row.orderAmount || 0).toFixed(2)}</td>
                  <td>{row.selectedSize || '-'}</td>
                  <td className="integrated-admin-order-status-cell">
                    <select
                      className={`integrated-admin-order-status-select ${getMerchOrderStatusClass(row.orderStatus, row.orderKind)}`}
                      disabled={isSaving}
                      value={row.orderStatus}
                      onChange={(event) => onStatusChange(row.id, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      aria-label="Order status"
                    >
                      {(row.orderKind === 'id' ? ID_ORDER_STATUS_OPTIONS : MERCH_ORDER_STATUS_OPTIONS).map((option) => (
                        <option key={option} value={option} className={getMerchOrderStatusClass(option, row.orderKind)}>
                          {getMerchOrderStatusLabel(option, row.orderKind)}
                        </option>
                      ))}
                    </select>
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
        </details>
      ))}
    </div>
  );
}
