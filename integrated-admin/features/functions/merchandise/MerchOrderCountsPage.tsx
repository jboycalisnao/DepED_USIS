import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { loadCachedMerchOrdersPageSnapshot } from './utils/merchOrdersPageCache';
import { getMerchOrderStatusLabel, normalizeMerchOrderStatus } from './order-control/utils/orderStatus';
import type { MerchOrderControlRecord } from './services/merchOrderControlService';

type MerchOrderCountsSummary = {
  countsBySource: Array<{ count: number; source: string }>;
  countsByStatus: Array<{ count: number; status: string }>;
  orderPeriodOptions: string[];
  totalOrders: number;
};

const buildSummary = (records: MerchOrderControlRecord[], selectedOrderPeriod: string): MerchOrderCountsSummary => {
  const periodSet = new Set<string>();
  const statusMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();

  records.forEach((row) => {
    const status = normalizeMerchOrderStatus(row.orderStatus);
    if (!['confirmed', 'released'].includes(status)) {
      return;
    }

    const items = [row.orderPeriodLabel || ''].filter(Boolean);
    items.forEach((label) => periodSet.add(label));

    if (selectedOrderPeriod && !items.includes(selectedOrderPeriod)) {
      return;
    }

    const sourceRaw = String(row.orderSource || '').trim();
    const source = sourceRaw === 'integrated_admin'
      ? 'Integrated Admin'
      : sourceRaw === 'learner_portal'
        ? 'Learner Portal'
        : 'Unknown';

    statusMap.set(status, (statusMap.get(status) || 0) + 1);
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });

  const countsByStatus = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
  const countsBySource = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));

  return {
    countsBySource,
    countsByStatus,
    orderPeriodOptions: Array.from(periodSet).sort((a, b) => a.localeCompare(b)),
    totalOrders: countsByStatus.reduce((sum, entry) => sum + entry.count, 0),
  };
};

export function MerchOrderCountsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<MerchOrderControlRecord[]>([]);
  const [selectedOrderPeriod, setSelectedOrderPeriod] = useState('');
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const snapshot = await loadCachedMerchOrdersPageSnapshot();
        if (!snapshot) {
          if (!cancelled) {
            setRecords([]);
            setAlert({
              title: 'Cache Missing',
              message: 'No local merch cache is available yet. Open the Orders page and refresh it first.',
              tone: 'danger',
            });
          }
          return;
        }
        if (!cancelled) {
          setRecords((snapshot.records || []).map((row) => ({ ...row })));
        }
      } catch (error: any) {
        if (!cancelled) {
          setAlert({ title: 'Load Failed', message: error?.message || 'Unable to load order count dashboard.', tone: 'danger' });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => buildSummary(records, selectedOrderPeriod), [records, selectedOrderPeriod]);

  const orderPeriodOptions = useMemo(
    () => [
      { label: 'All Order Periods', value: '' },
      ...summary.orderPeriodOptions.map((label) => ({ label, value: label })),
    ],
    [summary.orderPeriodOptions],
  );

  if (isLoading) return <UsisPageLoader message="Loading order count dashboard..." />;

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Order Counts</h2>
      </div>

      <article className="section-card integrated-admin-merch-control">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <div className="integrated-admin-order-counts-toolbar">
            <div className="integrated-admin-order-counts-toolbar__period">
              <UsisSearchableSelect
                ariaLabel="Order period filter"
                allowTyping={false}
                floatingLabel
                label="Order Period"
                options={orderPeriodOptions}
                value={selectedOrderPeriod}
                onChange={setSelectedOrderPeriod}
              />
            </div>
          </div>

          <div className="integrated-admin-order-payment-metrics">
            <div className="integrated-admin-order-payment-summary__metric">
              <small>Total Orders</small>
              <strong>{summary.totalOrders}</strong>
            </div>
            <div className="integrated-admin-order-payment-summary__metric">
              <small>Order Period Scope</small>
              <strong>{selectedOrderPeriod || 'All Order Periods'}</strong>
            </div>
          </div>

          <div className="integrated-admin-order-counts-grid">
            <article className="integrated-admin-order-counts-card">
              <h3>By Status</h3>
              {summary.countsByStatus.length === 0 ? (
                <p>No orders found for this scope.</p>
              ) : (
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.countsByStatus.map((row) => (
                      <tr key={row.status}>
                        <td>{getMerchOrderStatusLabel(row.status)}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>

            <article className="integrated-admin-order-counts-card">
              <h3>By Source</h3>
              {summary.countsBySource.length === 0 ? (
                <p>No orders found for this scope.</p>
              ) : (
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.countsBySource.map((row) => (
                      <tr key={row.source}>
                        <td>{row.source}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>
          </div>
        </div>
      </article>

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
