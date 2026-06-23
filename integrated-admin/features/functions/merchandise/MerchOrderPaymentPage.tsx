import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../common/components/ui/UsisGradeSectionList';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { loadCachedMerchOrdersPageSnapshot, saveCachedMerchOrdersPageSnapshot } from './utils/merchOrdersPageCache';
import {
  createMerchOrderPayment,
  deleteMerchOrderPayment,
  loadMerchOrderPayments,
  loadMerchOrderAuditTrail,
  updateMerchOrderPayment,
  type MerchOrderPaymentRecord,
  updateMerchOrderStatus,
  type MerchActiveLearnerOption,
  type MerchOrderAuditRecord,
  type MerchOrderControlRecord,
  hydrateMerchOrderLearnerNames,
  getIntegratedAdminActorName,
  resolveMerchLearnerDisplayName,
} from './services/merchOrderControlService';
import { getMerchOrderStatusClass, getMerchOrderStatusLabel, normalizeMerchOrderStatus } from './order-control/utils/orderStatus';
import { AddPaymentModal } from './components/order-payment/AddPaymentModal';
import { OrderPaymentDetailModal } from './components/order-payment/OrderPaymentDetailModal';
import { MerchPaymentReceiptDownloadButton } from '../../../../common/components/merch/MerchPaymentReceiptDownloadButton';

const parseGradeSortValue = (grade: string) => {
  const match = grade.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

type LearnerGroup = {
  key: string;
  label: string;
  lrn: string;
  rows: MerchOrderControlRecord[];
};

type LearnerPaymentSummary = {
  label: string;
  orderCount: number;
  rows: MerchOrderControlRecord[];
  totalAmount: number;
  outstandingAmount: number;
};

type PaymentOrderMetrics = {
  balanceAfter: number;
  orderAmount: number;
  outstanding: number;
  paid: number;
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

function PaymentLearnerGroupTable({
  learners,
  isBalanceLoading,
  onAddPayment,
  onAddLearnerPayment,
  onOpenOrderDetails,
  orderOutstandingBalanceById,
  rows,
}: {
  learners: MerchActiveLearnerOption[]; 
  isBalanceLoading: boolean;
  onAddPayment: (row: MerchOrderControlRecord) => void;
  onAddLearnerPayment: (group: LearnerPaymentSummary) => void;
  onOpenOrderDetails: (row: MerchOrderControlRecord) => void;
  orderOutstandingBalanceById: Record<string, number>;
  rows: MerchOrderControlRecord[];
}) {
  const learnerGroups = Object.values(groupRowsByLearner(rows, learners)).sort((groupA, groupB) => {
    const nameDiff = groupA.label.localeCompare(groupB.label);
    if (nameDiff !== 0) return nameDiff;
    return groupA.lrn.localeCompare(groupB.lrn);
  });

  return (
    <div className="integrated-admin-merch-learner-groups">
      {learnerGroups.map((group) => {
        const totalAmount = group.rows.reduce((sum, row) => sum + row.orderAmount, 0);
        const outstandingAmount = group.rows.reduce(
          (sum, row) => sum + (orderOutstandingBalanceById[row.id] ?? row.orderAmount),
          0,
        );
        const canPayLearner = outstandingAmount > 0;
        const learnerReceiptPayload = {
          gradeSection: [group.rows[0]?.gradeLevel, group.rows[0]?.sectionName].filter(Boolean).join(' - ') || 'Unassigned',
          learnerLrn: group.lrn || '',
          learnerName: group.label || '',
          orderAmount: totalAmount,
          outstandingBalance: outstandingAmount,
          paymentAmount: outstandingAmount,
          referenceNo: group.rows[0]?.referenceNo || group.key,
          productName: `${group.rows.length} order(s)`,
          postedBy: getIntegratedAdminActorName(),
          sourceLabel: 'Integrated Admin',
          transactionNo: group.rows[0]?.referenceNo || group.key,
          variant: 'consolidated' as const,
          orderLines: group.rows.map((row) => ({
            amount: row.orderAmount,
            label: row.orderPeriodLabel || row.sectionName || '',
            outstandingBalance: orderOutstandingBalanceById[row.id] ?? row.orderAmount,
            productName: row.productName,
            referenceNo: row.referenceNo,
          })),
        };

        return (
          <details key={group.key} className="integrated-admin-merch-group integrated-admin-merch-learner-group" open>
            <summary className="integrated-admin-merch-group__summary">
              <div className="integrated-admin-merch-learner-group__summary-main">
                <span className="material-symbols-outlined integrated-admin-merch-group__chevron" aria-hidden="true">
                  expand_more
                </span>
                <div className="integrated-admin-merch-learner-group__identity">
                  <div className="integrated-admin-merch-learner-group__identity-row">
                    <span className="integrated-admin-merch-group__title">{group.label}</span>
                    <MerchPaymentReceiptDownloadButton
                      ariaLabel={`Print consolidated receipt for ${group.label}`}
                      className="integrated-admin-merch-learner-group__print-btn"
                      mode="print"
                      showLabel={false}
                      title="Print consolidated receipt"
                      payload={learnerReceiptPayload}
                    />
                  </div>
                  <span className="integrated-admin-merch-learner-group__meta">{group.lrn || 'No LRN provided'}</span>
                </div>
              </div>
              <div className="integrated-admin-merch-learner-group__summary-meta">
                <div className="integrated-admin-merch-learner-group__summary-stats">
                  <span className="integrated-admin-merch-group__count">{group.rows.length} order(s)</span>
                  <span className="integrated-admin-merch-learner-group__total">Total PHP {totalAmount.toFixed(2)}</span>
                  <span className="integrated-admin-merch-learner-group__outstanding">
                    Outstanding PHP {outstandingAmount.toFixed(2)}
                  </span>
                </div>
                <div className="integrated-admin-merch-learner-group__summary-actions">
                  <button
                    type="button"
                    className="primary-button integrated-admin-merch-learner-group__payment-btn"
                    disabled={!canPayLearner}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!canPayLearner) return;
                      onAddLearnerPayment({
                        label: group.label,
                        orderCount: group.rows.length,
                        rows: group.rows,
                        totalAmount,
                        outstandingAmount,
                      });
                    }}
                  >
                    {canPayLearner ? 'Payment' : 'No Balance'}
                  </button>
                </div>
              </div>
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
                <th>Order Amount</th>
                <th>Size</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row, index) => (
                <tr
                  key={`${row.id}-${index}`}
                  className={`integrated-admin-merch-order-row integrated-admin-merch-order-row--status-${row.orderStatus}`}
                  onClick={() => void onOpenOrderDetails(row)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void onOpenOrderDetails(row);
                    }
                  }}
                >
                  <td>{row.referenceNo || '-'}</td>
                  <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
                  <td>{row.learnerName || '-'}</td>
                  <td>{row.learnerLrn || '-'}</td>
                  <td>{row.productName || '-'}</td>
                  <td>{row.orderPeriodLabel || '-'}</td>
                  <td>{row.quantity}</td>
                  <td>
                    <div className="integrated-admin-merch-group__amount-stack">
                      <strong>PHP {row.orderAmount.toFixed(2)}</strong>
                      <small>
                        Outstanding:{' '}
                        {isBalanceLoading && !(row.id in orderOutstandingBalanceById)
                          ? 'Loading...'
                          : `PHP ${(orderOutstandingBalanceById[row.id] ?? row.orderAmount).toFixed(2)}`}
                      </small>
                    </div>
                  </td>
                  <td>{row.selectedSize || '-'}</td>
                  <td>
                    <span
                      className={`integrated-admin-order-status-tag ${getMerchOrderStatusClass(row.orderStatus).replace('select', 'tag')}`}
                    >
                      {getMerchOrderStatusLabel(row.orderStatus)}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const rowOutstanding = orderOutstandingBalanceById[row.id] ?? row.orderAmount;
                      const canPayRow = rowOutstanding > 0;
                      return (
                        <button
                          type="button"
                          className="primary-button integrated-admin-merch-group__payment-btn"
                          disabled={!canPayRow}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!canPayRow) return;
                            onAddPayment(row);
                          }}
                        >
                          {canPayRow ? 'Payment' : 'No Balance'}
                        </button>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </details>
        );
      })}
    </div>
  );
}

export function MerchOrderPaymentPage() {
  const [records, setRecords] = useState<MerchOrderControlRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [selectedPaymentOrderId, setSelectedPaymentOrderId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<MerchOrderControlRecord | null>(null);
  const [detailModalView, setDetailModalView] = useState<'payment' | 'audit'>('payment');
  const [selectedOrderAudit, setSelectedOrderAudit] = useState<MerchOrderAuditRecord[]>([]);
  const [selectedOrderPayments, setSelectedOrderPayments] = useState<MerchOrderPaymentRecord[]>([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [orderOutstandingBalanceById, setOrderOutstandingBalanceById] = useState<Record<string, number>>({});
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [addPaymentAmountError, setAddPaymentAmountError] = useState('');
  const [cacheReady, setCacheReady] = useState(false);
  const [cachedLearners, setCachedLearners] = useState<any[]>([]);
  const [cachedProducts, setCachedProducts] = useState<any[]>([]);
  const [lastLoadedFromDbAt, setLastLoadedFromDbAt] = useState('');
  const [selectedLearnerPaymentSummary, setSelectedLearnerPaymentSummary] = useState<LearnerPaymentSummary | null>(null);
  const [editingHistoryPaymentId, setEditingHistoryPaymentId] = useState('');
  const [selectedPaymentOrderMetrics, setSelectedPaymentOrderMetrics] = useState<PaymentOrderMetrics | null>(null);
  const [isPaymentOrderLocked, setIsPaymentOrderLocked] = useState(false);
  const [alert, setAlert] = useState<{ message: string; title: string; tone: 'success' | 'danger' } | null>(null);

  const getAmountError = (amount: string, orderAmount: number | null) => {
    const trimmed = String(amount || '').trim();
    if (!trimmed) return '';
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric) || numeric <= 0) return 'Enter a valid payment amount.';
    if (orderAmount !== null && numeric > orderAmount) {
      return `Payment amount cannot be greater than order amount (PHP ${orderAmount.toFixed(2)}).`;
    }
    return '';
  };

  const refresh = async () => {
    setIsLoading(true);
    try {
      const snapshot = await loadCachedMerchOrdersPageSnapshot();
      if (!snapshot) {
        setRecords([]);
        setCacheReady(false);
        throw new Error('No local merch cache found. Open the Orders page and refresh it first.');
      }
      const snapshotLearners = snapshot.learners || [];
      setRecords(hydrateMerchOrderLearnerNames((snapshot.records || []).map((row) => ({ ...row })), snapshotLearners));
      setCachedLearners(snapshotLearners);
      setCachedProducts(snapshot.products || []);
      setLastLoadedFromDbAt(snapshot.lastLoadedFromDbAt || '');
      setCacheReady(true);
    } catch (error: any) {
      setAlert({ title: 'Load Failed', message: error?.message || 'Unable to load order payments.', tone: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const visibleRecords = useMemo(
    () =>
      records.filter((row) => {
        const status = normalizeMerchOrderStatus(row.orderStatus);
        return status === 'confirmed' || status === 'released';
      }),
    [records],
  );

  const refreshOutstandingBalances = async (targetRecords: MerchOrderControlRecord[] = records) => {
    const balanceTargetRecords = targetRecords.filter((row) => {
      const status = normalizeMerchOrderStatus(row.orderStatus);
      return status === 'confirmed' || status === 'released';
    });

    if (!cacheReady || balanceTargetRecords.length === 0) {
      setOrderOutstandingBalanceById({});
      return;
    }

    setIsBalanceLoading(true);
    try {
      const balances = await Promise.all(
        balanceTargetRecords.map(async (row) => {
          const payments = await loadMerchOrderPayments(row.id);
          const postedTotal = payments
            .filter((entry) => entry.paymentStatus === 'posted')
            .reduce((sum, entry) => sum + entry.paymentAmount, 0);
          return [row.id, Math.max(0, row.orderAmount - postedTotal)] as const;
        }),
      );

      setOrderOutstandingBalanceById(Object.fromEntries(balances));
    } catch {
      setOrderOutstandingBalanceById({});
    } finally {
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (!cacheReady) return;
    void refreshOutstandingBalances(records);
  }, [cacheReady]);

    const syncOutstandingBalanceFromPayments = (
      row: MerchOrderControlRecord,
      payments: MerchOrderPaymentRecord[] = [],
    ) => {
      const postedTotal = payments
        .filter((entry) => entry.paymentStatus === 'posted')
        .reduce((sum, entry) => sum + entry.paymentAmount, 0);
      setOrderOutstandingBalanceById((current) => ({
        ...current,
        [row.id]: Math.max(0, row.orderAmount - postedTotal),
      }));
      if (selectedPaymentOrderId === row.id) {
        const outstanding = Math.max(0, row.orderAmount - postedTotal);
        setSelectedPaymentOrderMetrics({
          orderAmount: row.orderAmount,
          paid: Math.max(0, row.orderAmount - outstanding),
          outstanding,
          balanceAfter: outstanding,
        });
      }
      setSelectedOrderDetail((current) =>
        current && current.id === row.id
          ? {
              ...current,
              outstandingBalance: Math.max(0, row.orderAmount - postedTotal),
            }
          : current,
      );
    };

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return visibleRecords.filter((row) => {
      if (!normalized) return true;
      return [
        row.referenceNo,
        row.learnerName,
        row.learnerLrn,
        row.productName,
        row.orderPeriodLabel,
        row.gradeLevel,
        row.sectionName,
        row.orderStatus,
        row.notes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [search, visibleRecords]);

  const paymentOrderOptions = useMemo(
    () =>
      visibleRecords
        .map((row) => ({
          label: `${row.referenceNo || row.id} - ${row.learnerName || 'Unknown Learner'} - ${row.productName}`,
          value: row.id,
        })),
    [visibleRecords],
  );

  const selectedPaymentOrder = useMemo(
    () => visibleRecords.find((row) => row.id === selectedPaymentOrderId) || null,
    [selectedPaymentOrderId, visibleRecords],
  );
  const editingHistoryPaymentRecord = useMemo(
    () => selectedOrderPayments.find((entry) => entry.id === editingHistoryPaymentId) || null,
    [editingHistoryPaymentId, selectedOrderPayments],
  );
  const addPaymentAmountValue = Number(paymentAmount);
  const paymentHistoryEntries = useMemo(
    () => selectedOrderPayments.filter((entry) => entry.paymentStatus === 'posted'),
    [selectedOrderPayments],
  );
  const totalPaidAmount = useMemo(
    () => paymentHistoryEntries.reduce((sum, entry) => sum + entry.paymentAmount, 0),
    [paymentHistoryEntries],
  );
  const addPaymentEditLimit = editingHistoryPaymentRecord && selectedOrderDetail
    ? Math.max(0, selectedOrderDetail.orderAmount - (totalPaidAmount - editingHistoryPaymentRecord.paymentAmount))
    : null;
  const selectedPaymentOrderOutstanding = selectedPaymentOrder
    ? (selectedPaymentOrderMetrics?.outstanding ?? orderOutstandingBalanceById[selectedPaymentOrder.id] ?? selectedPaymentOrder.orderAmount)
    : null;
  const activePaymentLimit = editingHistoryPaymentId
    ? addPaymentEditLimit
    : selectedLearnerPaymentSummary
      ? selectedLearnerPaymentSummary.outstandingAmount
      : selectedPaymentOrderOutstanding;
  const addPaymentLimit = editingHistoryPaymentId
    ? addPaymentEditLimit
    : selectedLearnerPaymentSummary
      ? selectedLearnerPaymentSummary.outstandingAmount
      : selectedPaymentOrderOutstanding;
  const clampPaymentAmountToLimit = (value: string, limit: number | null) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric) || numeric <= 0) return trimmed;
    if (limit === null) return trimmed;
    return String(Math.min(numeric, limit));
  };
  const applyLocalOutstandingDelta = (orderId: string, delta: number, fallbackOutstanding?: number) => {
    const cleanDelta = Number.isFinite(delta) ? delta : 0;
    if (!orderId || cleanDelta === 0) return;
    setOrderOutstandingBalanceById((current) => {
      const currentBalance = Number(current[orderId] ?? fallbackOutstanding ?? 0);
      const nextBalance = Math.max(0, currentBalance + cleanDelta);
      return { ...current, [orderId]: nextBalance };
    });
    setSelectedPaymentOrderMetrics((current) =>
      current && selectedPaymentOrderId === orderId
        ? {
            ...current,
            outstanding: Math.max(0, current.outstanding + cleanDelta),
            balanceAfter: Math.max(0, current.balanceAfter + cleanDelta),
          }
        : current,
    );
    setSelectedOrderDetail((current) =>
      current && current.id === orderId
        ? {
            ...current,
            outstandingBalance: Math.max(0, Number(current.outstandingBalance || current.orderAmount || 0) + cleanDelta),
          }
        : current,
    );
  };
    const openAddPaymentForOrder = (row: MerchOrderControlRecord) => {
      setEditingHistoryPaymentId('');
      setSelectedLearnerPaymentSummary(null);
      setSelectedPaymentOrderId(row.id);
      const currentOutstanding = Math.max(0, orderOutstandingBalanceById[row.id] ?? row.orderAmount);
      setPaymentAmount(String(currentOutstanding.toFixed(2)));
    setReceiptNo('');
    setPaymentNotes('');
      setAddPaymentAmountError('');
      setIsPaymentOrderLocked(true);
      setSelectedPaymentOrderMetrics({
        orderAmount: row.orderAmount,
        paid: Math.max(0, row.orderAmount - currentOutstanding),
        outstanding: currentOutstanding,
        balanceAfter: currentOutstanding,
      });
      setIsAddPaymentModalOpen(true);
    };
  const openAddPaymentForLearner = (summary: LearnerPaymentSummary) => {
    setEditingHistoryPaymentId('');
    setSelectedLearnerPaymentSummary(summary);
    setSelectedPaymentOrderId(summary.rows[0]?.id || '');
    setPaymentAmount(String(summary.outstandingAmount.toFixed(2)));
    setReceiptNo('');
    setPaymentNotes('');
    setAddPaymentAmountError('');
    setIsPaymentOrderLocked(false);
    setSelectedPaymentOrderMetrics(null);
    setIsAddPaymentModalOpen(true);
  };
  const openStandaloneAddPaymentModal = () => {
    setEditingHistoryPaymentId('');
    setSelectedLearnerPaymentSummary(null);
    setSelectedPaymentOrderId('');
    setPaymentAmount('');
    setReceiptNo('');
    setPaymentNotes('');
    setAddPaymentAmountError('');
    setEditingHistoryPaymentId('');
    setIsPaymentOrderLocked(false);
    setSelectedPaymentOrderMetrics(null);
    setIsAddPaymentModalOpen(true);
  };
  const groupedRows = useMemo(
    () =>
      filteredRows.reduce<Record<string, Record<string, MerchOrderControlRecord[]>>>((acc, row) => {
        const grade = row.gradeLevel || 'Unassigned';
        const section = row.sectionName || 'Unassigned';
        if (!acc[grade]) acc[grade] = {};
        if (!acc[grade][section]) acc[grade][section] = [];
        acc[grade][section].push(row);
        return acc;
      }, {}),
    [filteredRows],
  );
  const gradeListData = useMemo<UsisGradeSectionListGrade[]>(
    () =>
      Object.entries(groupedRows)
        .sort(([gradeA], [gradeB]) => {
          const gradeDiff = parseGradeSortValue(gradeA) - parseGradeSortValue(gradeB);
          if (gradeDiff !== 0) return gradeDiff;
          return gradeA.localeCompare(gradeB);
        })
        .map(([grade, sectionGroup]) => {
          const sectionEntries = Object.entries(sectionGroup).sort(([sectionA], [sectionB]) => sectionA.localeCompare(sectionB));
          return {
            countLabel: `${sectionEntries.length} Active Sections`,
            key: grade,
            label: grade,
            sections: sectionEntries.map(([sectionName, sectionRows]) => ({
              content: (
                <PaymentLearnerGroupTable
                  learners={cachedLearners}
                  isBalanceLoading={isBalanceLoading}
                  onAddPayment={(row) => void openAddPaymentForOrder(row)}
                  onAddLearnerPayment={(summary) => void openAddPaymentForLearner(summary)}
                  onOpenOrderDetails={(row) => void openOrderDetails(row)}
                  orderOutstandingBalanceById={orderOutstandingBalanceById}
                  rows={sectionRows}
                />
              ),
              count: sectionRows.length,
              key: sectionName,
              label: sectionName,
            })),
          } satisfies UsisGradeSectionListGrade;
        }),
    [groupedRows],
  );

  const handleMarkPaid = async (row: MerchOrderControlRecord, options?: { amount?: string; notes?: string; receiptNo?: string; force?: boolean; closeDetailOnSuccess?: boolean }) => {
    const amountValue = Number(options?.amount ?? paymentAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setAlert({ title: 'Required Fields', message: 'Enter a valid payment amount.', tone: 'danger' });
      return;
    }
    const referencePaidTotal = row.id === selectedOrderDetail?.id ? totalPaidAmount : 0;
    const maxAllowedForEntry = Math.max(0, row.orderAmount - referencePaidTotal);
    if (amountValue > maxAllowedForEntry) {
      setAlert({
        title: 'Invalid Payment Amount',
        message: `Payment amount cannot be greater than remaining balance (PHP ${maxAllowedForEntry.toFixed(2)}).`,
        tone: 'danger',
      });
      return;
    }
    const cleanReceipt = String(options?.receiptNo ?? receiptNo).trim();
    const cleanNotes = String(options?.notes ?? paymentNotes).trim();
    setIsSaving(true);
    try {
      const createdPayment = await createMerchOrderPayment({
        orderId: row.id,
        paymentAmount: amountValue,
        paymentNotes: cleanNotes,
        receiptNo: cleanReceipt,
      });
      await updateMerchOrderStatus(row.id, 'confirmed', {
        auditNote: `Payment recorded in Integrated Admin order payment page. Amount: PHP ${amountValue.toFixed(2)}.${cleanReceipt ? ` Receipt No: ${cleanReceipt}.` : ''}${cleanNotes ? ` Notes: ${cleanNotes}` : ''}`,
        expectedFromStatus: options?.force ? undefined : row.orderStatus === 'pending' ? 'pending' : undefined,
      });
      const nextRecords = records.map((entry) =>
        entry.id === row.id ? { ...entry, orderStatus: 'confirmed' } : entry,
      );
      setRecords(nextRecords);
      await saveCachedMerchOrdersPageSnapshot(nextRecords, cachedLearners, cachedProducts, lastLoadedFromDbAt);
      applyLocalOutstandingDelta(row.id, -amountValue, row.orderAmount);
      setSelectedOrderPayments((current) =>
        current.some((entry) => entry.id === createdPayment.id) ? current : [...current, createdPayment],
      );
      if (selectedOrderDetail?.id === row.id) {
        setSelectedOrderDetail({ ...row, orderStatus: 'confirmed' });
      }
      if (options?.closeDetailOnSuccess) {
        setSelectedOrderDetail(null);
      }
        setAlert({
          title: 'Payment Posted',
          message: `Order ${row.referenceNo || row.id} payment saved.`,
          tone: 'success',
        });
      if (selectedOrderDetail?.id === row.id) {
        setSelectedOrderDetail({ ...row, orderStatus: 'confirmed' });
      }
    } catch (error: any) {
      setAlert({ title: 'Update Failed', message: error?.message || 'Unable to update payment status.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPayment = async () => {
    const editingMode = Boolean(editingHistoryPaymentId);
    if (!selectedPaymentOrder && !selectedLearnerPaymentSummary && !editingMode) {
      setAlert({ title: 'Required Fields', message: 'Select a confirmed or released order first.', tone: 'danger' });
      return;
    }
    const editTargetLimit = editingMode && selectedOrderDetail && editingHistoryPaymentRecord
      ? Math.max(0, selectedOrderDetail.orderAmount - (totalPaidAmount - editingHistoryPaymentRecord.paymentAmount))
      : null;
    const liveError = editingMode
      ? getAmountError(paymentAmount, editTargetLimit)
      : selectedLearnerPaymentSummary
        ? getAmountError(paymentAmount, selectedLearnerPaymentSummary.outstandingAmount)
        : getAmountError(paymentAmount, selectedPaymentOrder ? selectedPaymentOrder.orderAmount : null);
    if (liveError) {
      setAddPaymentAmountError(liveError);
      return;
    }
    try {
      if (editingMode) {
        if (!editingHistoryPaymentRecord) {
          throw new Error('Unable to locate payment record for update.');
        }
        const amountValue = Number(paymentAmount);
        const maxAllowed = editTargetLimit ?? 0;
        if (!Number.isFinite(amountValue) || amountValue <= 0) {
          setAddPaymentAmountError('Enter a valid payment amount.');
          return;
        }
        if (amountValue > maxAllowed) {
          setAddPaymentAmountError(`Payment amount cannot be greater than remaining balance (PHP ${maxAllowed.toFixed(2)}).`);
          return;
        }
        setIsSaving(true);
        await updateMerchOrderPayment({
          paymentId: editingHistoryPaymentId,
          paymentAmount: amountValue,
          paymentNotes: paymentNotes.trim(),
          receiptNo: receiptNo.trim(),
        });
        if (selectedOrderDetail) {
          const nextPaymentRows = selectedOrderPayments.map((entry) =>
            entry.id === editingHistoryPaymentId
              ? {
                  ...entry,
                  paymentAmount: amountValue,
                  paymentNotes: paymentNotes.trim(),
                  receiptNo: receiptNo.trim(),
                }
              : entry,
          );
          setSelectedOrderPayments(nextPaymentRows);
          syncOutstandingBalanceFromPayments(selectedOrderDetail, nextPaymentRows);
        }
        setEditingHistoryPaymentId('');
        setIsAddPaymentModalOpen(false);
        setSelectedPaymentOrderId('');
        setPaymentAmount('');
        setAddPaymentAmountError('');
        setReceiptNo('');
        setPaymentNotes('');
        setSelectedLearnerPaymentSummary(null);
        setIsPaymentOrderLocked(false);
        setSelectedPaymentOrderMetrics(null);
        setAlert({
          title: 'Payment Updated',
          message: 'Selected payment history record updated.',
          tone: 'success',
        });
        return;
        }
        if (selectedLearnerPaymentSummary) {
          const amountValue = Number(paymentAmount);
          const rowPaymentBalances = selectedLearnerPaymentSummary.rows.map((row) => ({
            row,
            remaining: Math.max(0, orderOutstandingBalanceById[row.id] ?? row.orderAmount),
          }));
          const totalOutstanding = rowPaymentBalances.reduce((sum, item) => sum + item.remaining, 0);
          if (amountValue > totalOutstanding) {
            setAlert({
              title: 'Invalid Payment Amount',
              message: `Payment amount cannot be greater than learner outstanding total (PHP ${totalOutstanding.toFixed(2)}).`,
            tone: 'danger',
          });
          return;
        }
        let remainingAmount = amountValue;
        const createdPayments: MerchOrderPaymentRecord[] = [];
        for (const item of rowPaymentBalances) {
          if (remainingAmount <= 0) break;
          const paymentForRow = Math.min(item.remaining, remainingAmount);
          if (paymentForRow <= 0) continue;
          const createdPayment = await createMerchOrderPayment({
            orderId: item.row.id,
            paymentAmount: paymentForRow,
            paymentNotes: paymentNotes.trim(),
            receiptNo: receiptNo.trim(),
          });
          createdPayments.push(createdPayment);
          await updateMerchOrderStatus(item.row.id, 'confirmed', {
            auditNote: `Learner total payment recorded in Integrated Admin order payment page. Amount: PHP ${paymentForRow.toFixed(2)}.${receiptNo.trim() ? ` Receipt No: ${receiptNo.trim()}.` : ''}${paymentNotes.trim() ? ` Notes: ${paymentNotes.trim()}` : ''}`,
            expectedFromStatus: item.row.orderStatus === 'pending' ? 'pending' : undefined,
          });
          applyLocalOutstandingDelta(item.row.id, -paymentForRow, item.row.orderAmount);
          if (selectedOrderDetail?.id === item.row.id) {
            setSelectedOrderPayments((current) =>
              current.some((entry) => entry.id === createdPayment.id) ? current : [...current, createdPayment],
            );
          }
          remainingAmount -= paymentForRow;
        }
        const nextRecords = records.map((entry) =>
          selectedLearnerPaymentSummary.rows.some((row) => row.id === entry.id) ? { ...entry, orderStatus: 'confirmed' } : entry,
        );
        setRecords(nextRecords);
        await saveCachedMerchOrdersPageSnapshot(nextRecords, cachedLearners, cachedProducts, lastLoadedFromDbAt);
        if (selectedOrderDetail && createdPayments.some((payment) => payment.orderId === selectedOrderDetail.id)) {
          setSelectedOrderPayments((current) => {
            const nextById = new Map(current.map((entry) => [entry.id, entry]));
            createdPayments.forEach((payment) => nextById.set(payment.id, payment));
            return Array.from(nextById.values()).sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.createdAt.localeCompare(b.createdAt));
          });
        }
        setAlert({
          title: 'Payment Posted',
          message: `Learner payment saved for ${selectedLearnerPaymentSummary.label}.`,
          tone: 'success',
        });
      } else {
        await handleMarkPaid(selectedPaymentOrder, {
          amount: paymentAmount,
          notes: paymentNotes,
          receiptNo,
        });
      }
      setIsAddPaymentModalOpen(false);
      setSelectedPaymentOrderId('');
      setPaymentAmount('');
      setAddPaymentAmountError('');
      setReceiptNo('');
      setPaymentNotes('');
      setSelectedLearnerPaymentSummary(null);
      setIsPaymentOrderLocked(false);
      setSelectedPaymentOrderMetrics(null);
    } catch {}
    finally {
      setIsSaving(false);
    }
  };

  const loadAuditTrail = async (orderId: string) => {
    setIsAuditLoading(true);
    try {
      const logs = await loadMerchOrderAuditTrail(orderId);
      setSelectedOrderAudit(logs);
    } catch {
      setSelectedOrderAudit([]);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const loadPaymentHistory = async (orderId: string) => {
    setIsPaymentsLoading(true);
    try {
      const rows = await loadMerchOrderPayments(orderId);
      setSelectedOrderPayments(rows);
      const targetRow = records.find((row) => row.id === orderId);
      if (targetRow) {
        syncOutstandingBalanceFromPayments(targetRow, rows);
      }
    } catch {
      setSelectedOrderPayments([]);
    } finally {
      setIsPaymentsLoading(false);
    }
  };

  const openOrderDetails = async (row: MerchOrderControlRecord) => {
    setSelectedOrderDetail(row);
    setDetailModalView('payment');
    setSelectedOrderAudit([]);
    setSelectedOrderPayments([]);
    const [, paymentRows] = await Promise.all([loadAuditTrail(row.id), loadMerchOrderPayments(row.id)]);
    setSelectedOrderPayments(paymentRows);
    syncOutstandingBalanceFromPayments(row, paymentRows);
  };

  const handleDeletePaymentHistoryEntry = async (entry: MerchOrderPaymentRecord) => {
    if (!selectedOrderDetail) return;
    setIsSaving(true);
    try {
      const orderId = await deleteMerchOrderPayment(entry.id);
      const remainingPostedPayments = selectedOrderPayments.filter((payment) => payment.id !== entry.id);
        const nextRecords = records.map((current) =>
          current.id === orderId ? { ...current } : current,
        );
        setRecords(nextRecords);
        await saveCachedMerchOrdersPageSnapshot(nextRecords, cachedLearners, cachedProducts, lastLoadedFromDbAt);
        setSelectedOrderPayments(remainingPostedPayments);
        setSelectedOrderDetail({ ...selectedOrderDetail });
        syncOutstandingBalanceFromPayments(selectedOrderDetail, remainingPostedPayments);
        setAlert({
          title: 'Payment Deleted',
          message: 'Selected payment history record deleted.',
          tone: 'success',
        });
    } catch (error: any) {
      setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to delete payment record.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPaymentHistory = (entry: MerchOrderPaymentRecord) => {
    setEditingHistoryPaymentId(entry.id);
    setSelectedLearnerPaymentSummary(null);
    setSelectedPaymentOrderId(entry.orderId);
    setPaymentAmount(String(entry.paymentAmount));
    setReceiptNo(entry.receiptNo || '');
    setPaymentNotes(entry.paymentNotes || '');
    setAddPaymentAmountError('');
    setIsPaymentOrderLocked(true);
    if (selectedOrderDetail && selectedOrderDetail.id === entry.orderId) {
      const paid = Math.max(0, totalPaidAmount - entry.paymentAmount);
      const outstanding = Math.max(0, selectedOrderDetail.orderAmount - paid);
      setSelectedPaymentOrderMetrics({
        orderAmount: selectedOrderDetail.orderAmount,
        paid,
        outstanding,
        balanceAfter: Math.max(0, outstanding - entry.paymentAmount),
      });
    } else {
      setSelectedPaymentOrderMetrics(null);
    }
    setIsAddPaymentModalOpen(true);
  };

  if (isLoading) {
    return <UsisPageLoader message="Loading order payments..." />;
  }

  if (!cacheReady) {
    return (
      <section className="section-shell integrated-admin-function">
        <div className="integrated-admin-function__header">
          <h2>Orders</h2>
        </div>
        <article className="section-card integrated-admin-merch-control">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="learner-services-history__state">
              No local merch cache is available yet. Open the Orders page and refresh it first.
            </p>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Orders</h2>
      </div>
      <article className="section-card integrated-admin-merch-control">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <div className="integrated-admin-order-payment-toolbar">
            <div className="floating-field integrated-admin-order-payment-toolbar__search">
              <div className="floating-field__control">
                <input
                  data-has-value={search.trim().length > 0 ? 'true' : 'false'}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder=" "
                  value={search}
                />
                <span>Search Orders (Ref No., Learner, LRN, Product, Grade, Section, Status)</span>
              </div>
            </div>
            <button
              type="button"
              className="primary-button integrated-admin-order-payment-toolbar__add-btn"
              onClick={() => openStandaloneAddPaymentModal()}
            >
              Add Payment
            </button>
          </div>

          <UsisGradeSectionList
            className="integrated-admin-merch-groups integrated-admin-order-payment-table-wrap"
            emptyMessage="No orders found."
            expandAll={search.trim().length > 0}
            grades={gradeListData}
          />
        </div>
      </article>
      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
      <AddPaymentModal
        addPaymentAmountError={addPaymentAmountError}
        editingPaymentId={editingHistoryPaymentId}
        isOrderSelectorDisabled={isPaymentOrderLocked || Boolean(editingHistoryPaymentId)}
        learnerPaymentSummary={selectedLearnerPaymentSummary}
        paymentAmountLimit={activePaymentLimit}
        paymentOrderMetrics={selectedPaymentOrderMetrics}
        isOpen={isAddPaymentModalOpen}
        isSaving={isSaving}
        onAmountChange={(value) => {
          const nextValue = clampPaymentAmountToLimit(value, activePaymentLimit);
          setPaymentAmount(nextValue);
          setAddPaymentAmountError(getAmountError(nextValue, addPaymentLimit));
        }}
        onClose={() => {
          setIsAddPaymentModalOpen(false);
          setSelectedLearnerPaymentSummary(null);
          setEditingHistoryPaymentId('');
          setIsPaymentOrderLocked(false);
          setSelectedPaymentOrderMetrics(null);
          setSelectedPaymentOrderId('');
          setPaymentAmount('');
          setReceiptNo('');
          setPaymentNotes('');
          setAddPaymentAmountError('');
        }}
        onNotesChange={setPaymentNotes}
        onReceiptNoChange={setReceiptNo}
        onSave={() => void handleAddPayment()}
        onSelectOrder={(value) => {
          setSelectedPaymentOrderId(value);
          const nextSelectedOrder = visibleRecords.find((row) => row.id === value) || null;
          const nextOutstanding = nextSelectedOrder
            ? Math.max(0, orderOutstandingBalanceById[nextSelectedOrder.id] ?? nextSelectedOrder.orderAmount)
            : null;
          if (!selectedLearnerPaymentSummary && !editingHistoryPaymentId && nextOutstanding !== null) {
            setPaymentAmount(String(nextOutstanding.toFixed(2)));
            setAddPaymentAmountError(getAmountError(String(nextOutstanding.toFixed(2)), nextOutstanding));
          }
        }}
        paymentAmount={paymentAmount}
        paymentNotes={paymentNotes}
        paymentOrderOptions={paymentOrderOptions}
        receiptNo={receiptNo}
        selectedPaymentOrder={selectedPaymentOrder}
        selectedPaymentOrderId={selectedPaymentOrderId}
      />
      <OrderPaymentDetailModal
        detailModalView={detailModalView}
        isAuditLoading={isAuditLoading}
        isOpen={Boolean(selectedOrderDetail)}
        isPaymentsLoading={isPaymentsLoading}
        isSaving={isSaving}
        onDeleteHistory={(entry) => void handleDeletePaymentHistoryEntry(entry)}
        onEditHistory={(entry) => {
          handleEditPaymentHistory(entry);
        }}
        onClose={() => setSelectedOrderDetail(null)}
        onSetView={setDetailModalView}
        order={selectedOrderDetail}
        paymentHistoryEntries={paymentHistoryEntries}
        selectedOrderAudit={selectedOrderAudit}
      />
    </section>
  );
}
