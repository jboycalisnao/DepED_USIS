import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { loadCachedMerchOrdersPageSnapshot } from './utils/merchOrdersPageCache';
import type { MerchOrderControlRecord } from './services/merchOrderControlService';

type MerchOrderCountsSummary = {
  countsByProduct: Array<{ amount: number; count: number; productName: string; quantity: number }>;
  orderPeriodOptions: string[];
  totalOrders: number;
};

const buildSummary = (records: MerchOrderControlRecord[], selectedOrderPeriod: string): MerchOrderCountsSummary => {
  const periodSet = new Set<string>();
  const productMap = new Map<string, { amount: number; count: number; productName: string; quantity: number }>();

  records.forEach((row) => {
    const items = [row.orderPeriodLabel || ''].filter(Boolean);
    items.forEach((label) => periodSet.add(label));

    if (selectedOrderPeriod && !items.includes(selectedOrderPeriod)) {
      return;
    }

    const productName = String(row.productName || '').trim() || 'Unspecified Product';
    const current = productMap.get(productName) || {
      amount: 0,
      count: 0,
      productName,
      quantity: 0,
    };
    current.count += 1;
    current.quantity += Math.max(1, Number(row.quantity || 1));
    current.amount += Number(row.orderAmount || 0);
    productMap.set(productName, current);
  });

  const countsByProduct = Array.from(productMap.values())
    .sort((a, b) => b.count - a.count || a.productName.localeCompare(b.productName));

  return {
    countsByProduct,
    orderPeriodOptions: Array.from(periodSet).sort((a, b) => a.localeCompare(b)),
    totalOrders: countsByProduct.reduce((sum, entry) => sum + entry.count, 0),
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

          <div className="integrated-admin-order-counts-section">
            <div className="integrated-admin-order-counts-section__header">
              <h3>By Product</h3>
              <p>Orders are grouped from the locally cached IA orders snapshot.</p>
            </div>

            {summary.countsByProduct.length === 0 ? (
              <article className="integrated-admin-order-counts-empty">
                <p>No orders found for this scope.</p>
              </article>
            ) : (
              <div className="integrated-admin-order-counts-grid">
                {summary.countsByProduct.map((row) => (
                  <article key={row.productName} className="integrated-admin-order-counts-card">
                    <h4>{row.productName}</h4>
                    <div className="integrated-admin-order-counts-card__metric">
                      <small>Orders</small>
                      <strong>{row.count}</strong>
                    </div>
                    <div className="integrated-admin-order-counts-card__metric">
                      <small>Total Qty</small>
                      <strong>{row.quantity}</strong>
                    </div>
                    <div className="integrated-admin-order-counts-card__metric">
                      <small>Total Amount</small>
                      <strong>PHP {row.amount.toFixed(2)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
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
