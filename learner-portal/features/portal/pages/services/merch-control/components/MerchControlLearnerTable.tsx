import type { MerchControlSectionLearnerRecord } from '../../../../services/learnerMerchControlService';
import {
  getLearnerMerchOrderStatusClass,
  getLearnerMerchOrderStatusLabel,
} from '../../../../services/learnerMerchService';

type Props = {
  rows: MerchControlSectionLearnerRecord[];
  ariaLabel: string;
  onOpenLearnerDetails: (learner: MerchControlSectionLearnerRecord) => void;
};

export function MerchControlLearnerTable({ rows, ariaLabel, onOpenLearnerDetails }: Props) {
  return (
    <div className="learner-merch-control-table-wrap">
      <table className="learner-merch-control-table" aria-label={ariaLabel}>
        <thead>
          <tr>
            <th>Learner</th>
            <th>LRN</th>
            <th>Total Orders</th>
            <th>Latest Status</th>
            <th>Latest Order</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.learnerId || row.learnerLrn}
              className="learner-merch-control-table__row"
              tabIndex={0}
              role="button"
              onClick={() => onOpenLearnerDetails(row)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpenLearnerDetails(row);
                }
              }}
            >
              <td>{row.learnerName}</td>
              <td>{row.learnerLrn || '-'}</td>
              <td>{row.totalOrders}</td>
              <td>
                {row.latestOrderStatus ? (
                  <span className={`learner-merch-status-chip ${getLearnerMerchOrderStatusClass(row.latestOrderStatus)}`}>
                    {getLearnerMerchOrderStatusLabel(row.latestOrderStatus)}
                  </span>
                ) : '-'}
              </td>
              <td>{row.latestOrderAt ? new Date(row.latestOrderAt).toLocaleString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
