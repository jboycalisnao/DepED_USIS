import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../common/components/ui/UsisGradeSectionList';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import {
  createMerchOrderPayment,
  deleteLatestMerchOrderPayment,
  loadMerchOrderControlRecords,
  loadMerchOrderPayments,
  loadMerchOrderAuditTrail,
  updateMerchOrderPayment,
  type MerchOrderPaymentRecord,
  updateMerchOrderStatus,
  type MerchOrderAuditRecord,
  type MerchOrderControlRecord,
} from './services/merchOrderControlService';
import { AddPaymentModal } from './components/order-payment/AddPaymentModal';
import { OrderPaymentDetailModal } from './components/order-payment/OrderPaymentDetailModal';

const parseGradeSortValue = (grade: string) => {
  const match = grade.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

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
  const [detailModalView, setDetailModalView] = useState<'payment' | 'record' | 'audit'>('record');
  const [selectedOrderAudit, setSelectedOrderAudit] = useState<MerchOrderAuditRecord[]>([]);
  const [selectedOrderPayments, setSelectedOrderPayments] = useState<MerchOrderPaymentRecord[]>([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [detailPaymentAmount, setDetailPaymentAmount] = useState('');
  const [detailReceiptNo, setDetailReceiptNo] = useState('');
  const [detailPaymentNotes, setDetailPaymentNotes] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState('');
  const [addPaymentAmountError, setAddPaymentAmountError] = useState('');
  const [detailPaymentAmountError, setDetailPaymentAmountError] = useState('');
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
      const rows = await loadMerchOrderControlRecords();
      setRecords(rows);
    } catch (error: any) {
      setAlert({ title: 'Load Failed', message: error?.message || 'Unable to load order payments.', tone: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return records.filter((row) => {
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
  }, [records, search]);

  const paymentOrderOptions = useMemo(
    () =>
      records
        .filter((row) => row.orderStatus === 'Pending')
        .map((row) => ({
        label: `${row.referenceNo || row.id} - ${row.learnerName || 'Unknown Learner'} - ${row.productName}`,
        value: row.id,
      })),
    [records],
  );

  const selectedPaymentOrder = useMemo(
    () => records.find((row) => row.id === selectedPaymentOrderId) || null,
    [records, selectedPaymentOrderId],
  );
  const addPaymentAmountValue = Number(paymentAmount);
  const addPaymentBalance = selectedPaymentOrder
    ? Math.max(0, selectedPaymentOrder.orderAmount - (Number.isFinite(addPaymentAmountValue) ? Math.max(0, addPaymentAmountValue) : 0))
    : 0;
  const paymentHistoryEntries = useMemo(
    () => selectedOrderPayments.filter((entry) => entry.paymentStatus === 'posted'),
    [selectedOrderPayments],
  );
  const totalPaidAmount = useMemo(
    () => paymentHistoryEntries.reduce((sum, entry) => sum + entry.paymentAmount, 0),
    [paymentHistoryEntries],
  );
  const editingPaymentRecord = useMemo(
    () => paymentHistoryEntries.find((entry) => entry.id === editingPaymentId) || null,
    [paymentHistoryEntries, editingPaymentId],
  );
  const totalPaidAmountExcludingEditing = totalPaidAmount - (editingPaymentRecord?.paymentAmount || 0);
  const detailPaymentAmountValue = Number(detailPaymentAmount);
  const detailRemainingBalance = selectedOrderDetail
    ? Math.max(0, selectedOrderDetail.orderAmount - totalPaidAmountExcludingEditing)
    : 0;
  const detailPaymentBalance = Math.max(
    0,
    detailRemainingBalance - (Number.isFinite(detailPaymentAmountValue) ? Math.max(0, detailPaymentAmountValue) : 0),
  );
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
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((row, index) => (
                      <tr
                        key={`${row.id}-${index}`}
                        className="integrated-admin-merch-order-row"
                        onClick={() => void openOrderDetails(row)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            void openOrderDetails(row);
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
                        <td>{row.selectedSize || '-'}</td>
                        <td><strong>{row.orderStatus || 'Pending'}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    const amountValue = Number(options?.amount ?? detailPaymentAmount);
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
    const cleanReceipt = String(options?.receiptNo ?? detailReceiptNo).trim();
    const cleanNotes = String(options?.notes ?? detailPaymentNotes).trim();
    setIsSaving(true);
    try {
      await createMerchOrderPayment({
        orderId: row.id,
        paymentAmount: amountValue,
        paymentNotes: cleanNotes,
        receiptNo: cleanReceipt,
      });
      await updateMerchOrderStatus(row.id, 'Approved', {
        auditNote: `Payment recorded in Integrated Admin order payment page. Amount: PHP ${amountValue.toFixed(2)}.${cleanReceipt ? ` Receipt No: ${cleanReceipt}.` : ''}${cleanNotes ? ` Notes: ${cleanNotes}` : ''}`,
        expectedFromStatus: options?.force ? undefined : row.orderStatus === 'Pending' ? 'Pending' : undefined,
      });
      await refresh();
      await loadPaymentHistory(row.id);
      if (options?.closeDetailOnSuccess) {
        setSelectedOrderDetail(null);
      }
      setAlert({
        title: 'Payment Posted',
        message: `Order ${row.referenceNo || row.id} payment saved.`,
        tone: 'success',
      });
      if (selectedOrderDetail?.id === row.id) {
        setSelectedOrderDetail({ ...row, orderStatus: 'Approved' });
      }
    } catch (error: any) {
      setAlert({ title: 'Update Failed', message: error?.message || 'Unable to update payment status.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedPaymentOrder) {
      setAlert({ title: 'Required Fields', message: 'Select a pending order first.', tone: 'danger' });
      return;
    }
    const liveError = getAmountError(paymentAmount, selectedPaymentOrder.orderAmount);
    if (liveError) {
      setAddPaymentAmountError(liveError);
      return;
    }
    try {
      await handleMarkPaid(selectedPaymentOrder, {
        amount: paymentAmount,
        notes: paymentNotes,
        receiptNo,
      });
      setIsAddPaymentModalOpen(false);
      setSelectedPaymentOrderId('');
      setPaymentAmount('');
      setAddPaymentAmountError('');
      setReceiptNo('');
      setPaymentNotes('');
    } catch {}
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
    } catch {
      setSelectedOrderPayments([]);
    } finally {
      setIsPaymentsLoading(false);
    }
  };

  const openOrderDetails = async (row: MerchOrderControlRecord) => {
    setSelectedOrderDetail(row);
    setDetailModalView('record');
    setDetailPaymentAmount('0');
    setDetailPaymentAmountError('');
    setDetailReceiptNo('');
    setDetailPaymentNotes('');
    setEditingPaymentId('');
    setSelectedOrderAudit([]);
    setSelectedOrderPayments([]);
    const [, paymentRows] = await Promise.all([loadAuditTrail(row.id), loadMerchOrderPayments(row.id)]);
    setSelectedOrderPayments(paymentRows);
    const totalPosted = paymentRows
      .filter((entry) => entry.paymentStatus === 'posted')
      .reduce((sum, entry) => sum + entry.paymentAmount, 0);
    const remainingBalance = Math.max(0, row.orderAmount - totalPosted);
    setDetailPaymentAmount(String(remainingBalance));
  };

  const handleDeletePaymentRecord = async () => {
    if (!selectedOrderDetail) return;
    setIsSaving(true);
    try {
      await deleteLatestMerchOrderPayment(selectedOrderDetail.id);
      const latestPayments = await loadMerchOrderPayments(selectedOrderDetail.id);
      const hasPostedPayment = latestPayments.some((payment) => payment.paymentStatus === 'posted');
      if (!hasPostedPayment) {
        await updateMerchOrderStatus(selectedOrderDetail.id, 'Pending', {
          auditNote: 'Payment record deleted in Integrated Admin order payment page.',
        });
      }
      await refresh();
      setSelectedOrderPayments(latestPayments);
      setSelectedOrderDetail({ ...selectedOrderDetail, orderStatus: hasPostedPayment ? 'Approved' : 'Pending' });
      setAlert({
        title: 'Payment Deleted',
        message: `Latest payment record for order ${selectedOrderDetail.referenceNo || selectedOrderDetail.id} deleted.`,
        tone: 'success',
      });
    } catch (error: any) {
      setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to delete payment record.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPaymentHistory = (entry: MerchOrderPaymentRecord) => {
    setEditingPaymentId(entry.id);
    setDetailPaymentAmount(String(entry.paymentAmount));
    setDetailReceiptNo(entry.receiptNo || '');
    setDetailPaymentNotes(entry.paymentNotes || '');
    setDetailPaymentAmountError('');
  };

  const handleDetailPrimaryAction = async () => {
    if (!selectedOrderDetail) return;
    if (editingPaymentId) {
      const amountValue = Number(detailPaymentAmount);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        setDetailPaymentAmountError('Enter a valid payment amount.');
        return;
      }
      if (amountValue > detailRemainingBalance) {
        setDetailPaymentAmountError(`Payment amount cannot be greater than remaining balance (PHP ${detailRemainingBalance.toFixed(2)}).`);
        return;
      }
      setIsSaving(true);
      try {
        await updateMerchOrderPayment({
          paymentId: editingPaymentId,
          paymentAmount: amountValue,
          paymentNotes: detailPaymentNotes,
          receiptNo: detailReceiptNo,
        });
        await loadPaymentHistory(selectedOrderDetail.id);
        setEditingPaymentId('');
        setSelectedOrderDetail(null);
        setAlert({
          title: 'Payment Updated',
          message: `Payment history record updated for order ${selectedOrderDetail.referenceNo || selectedOrderDetail.id}.`,
          tone: 'success',
        });
      } catch (error: any) {
        setAlert({ title: 'Update Failed', message: error?.message || 'Unable to update payment record.', tone: 'danger' });
      } finally {
        setIsSaving(false);
      }
      return;
    }
    await handleMarkPaid(selectedOrderDetail, {
      closeDetailOnSuccess: selectedOrderDetail.orderStatus === 'Approved',
      force: true,
    });
  };

  if (isLoading) {
    return <UsisPageLoader message="Loading order payments..." />;
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
              onClick={() => setIsAddPaymentModalOpen(true)}
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
        isOpen={isAddPaymentModalOpen}
        isSaving={isSaving}
        onAmountChange={(value) => {
          setPaymentAmount(value);
          setAddPaymentAmountError(getAmountError(value, selectedPaymentOrder ? selectedPaymentOrder.orderAmount : null));
        }}
        onClose={() => setIsAddPaymentModalOpen(false)}
        onNotesChange={setPaymentNotes}
        onReceiptNoChange={setReceiptNo}
        onSave={() => void handleAddPayment()}
        onSelectOrder={setSelectedPaymentOrderId}
        paymentAmount={paymentAmount}
        paymentNotes={paymentNotes}
        paymentOrderOptions={paymentOrderOptions}
        receiptNo={receiptNo}
        selectedPaymentOrder={selectedPaymentOrder}
        selectedPaymentOrderId={selectedPaymentOrderId}
      />
      <OrderPaymentDetailModal
        detailModalView={detailModalView}
        detailPaymentAmount={detailPaymentAmount}
        detailPaymentAmountError={detailPaymentAmountError}
        detailPaymentBalance={detailPaymentBalance}
        detailPaymentNotes={detailPaymentNotes}
        detailReceiptNo={detailReceiptNo}
        detailRemainingBalance={detailRemainingBalance}
        editingPaymentId={editingPaymentId}
        isAuditLoading={isAuditLoading}
        isOpen={Boolean(selectedOrderDetail)}
        isPaymentsLoading={isPaymentsLoading}
        isSaving={isSaving}
        onAmountChange={(value) => {
          setDetailPaymentAmount(value);
          setDetailPaymentAmountError(getAmountError(value, detailRemainingBalance));
        }}
        onDeletePayment={() => void handleDeletePaymentRecord()}
        onEditHistory={(entry) => {
          handleEditPaymentHistory(entry);
          setDetailModalView('record');
        }}
        onNotesChange={setDetailPaymentNotes}
        onClose={() => setSelectedOrderDetail(null)}
        onPrimaryAction={() => void handleDetailPrimaryAction()}
        onReceiptNoChange={setDetailReceiptNo}
        onSetView={setDetailModalView}
        order={selectedOrderDetail}
        paymentHistoryEntries={paymentHistoryEntries}
        selectedOrderAudit={selectedOrderAudit}
        totalPaidAmount={totalPaidAmount}
      />
    </section>
  );
}
