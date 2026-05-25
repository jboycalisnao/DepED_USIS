import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { loadMerchOrderCountsSummary, type MerchOrderCountsSummary } from './services/merchOrderControlService';

const defaultSummary: MerchOrderCountsSummary = {
  countsBySource: [],
  countsByStatus: [],
  orderPeriodOptions: [],
  selectedOrderPeriod: '',
  totalOrders: 0,
};

export function MerchOrderCountsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<MerchOrderCountsSummary>(defaultSummary);
  const [selectedOrderPeriod, setSelectedOrderPeriod] = useState('');
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  const loadSummary = async (periodLabel: string) => {
    setIsLoading(true);
    try {
      const result = await loadMerchOrderCountsSummary(periodLabel);
      setSummary(result);
    } catch (error: any) {
      setAlert({
        title: 'Load Failed',
        message: error?.message || 'Unable to load order count dashboard.',
        tone: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary(selectedOrderPeriod);
  }, [selectedOrderPeriod]);

  const statusOptions = useMemo(
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
                options={statusOptions}
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
                        <td>{row.status}</td>
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
