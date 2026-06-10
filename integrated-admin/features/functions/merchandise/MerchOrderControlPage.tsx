import { useEffect, useState } from 'react';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../common/components/ui/UsisGradeSectionList';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { ManualOrderOverrideModal } from './order-control/components/ManualOrderOverrideModal';
import { OrderControlSectionTable } from './order-control/components/OrderControlSectionTable';
import { OrderDetailAuditModal } from './order-control/components/OrderDetailAuditModal';
import {
  createManualMerchOrder,
  deleteMerchOrderRecord,
  loadActiveSchoolYearLearners,
  loadMerchOrderAuditTrail,
  loadMerchOrderControlRecords,
  loadPublishedMerchProducts,
  updateMerchOrderStatus,
  type MerchActiveLearnerOption,
  type MerchOrderAuditRecord,
  type MerchOrderControlRecord,
  type MerchProductOption,
} from './services/merchOrderControlService';

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Fulfilled'];
const parseGradeSortValue = (grade: string) => {
  const match = grade.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

export function MerchOrderControlPage() {
  const [records, setRecords] = useState<MerchOrderControlRecord[]>([]);
  const [learners, setLearners] = useState<MerchActiveLearnerOption[]>([]);
  const [products, setProducts] = useState<MerchProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [learnerSearch, setLearnerSearch] = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [manualNotes, setManualNotes] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<MerchOrderControlRecord | null>(null);
  const [selectedOrderAudit, setSelectedOrderAudit] = useState<MerchOrderAuditRecord[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [detailStatusValue, setDetailStatusValue] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  const refresh = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) setIsLoading(true);
    try {
      const [rows, activeLearners, merchProducts] = await Promise.all([
        loadMerchOrderControlRecords(),
        loadActiveSchoolYearLearners(),
        loadPublishedMerchProducts(),
      ]);
      setRecords(rows);
      setLearners(activeLearners);
      setProducts(merchProducts);
      if (!selectedProductId && merchProducts.length > 0) {
        setSelectedProductId(merchProducts[0].id);
      }
    } catch (error: any) {
      setAlert({ title: 'Load Failed', message: error?.message || 'Unable to load merch orders.', tone: 'danger' });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const selectedProduct = products.find((product) => product.id === selectedProductId);
    const firstSize = selectedProduct?.availableSizes?.[0] || '';
    setSelectedSize(firstSize);
  }, [products, selectedProductId]);

  const handleStatusChange = async (orderId: string, value: string) => {
    setIsSaving(true);
    try {
      await updateMerchOrderStatus(orderId, value);
      await refresh();
      setAlert({ title: 'Saved', message: 'Order status updated.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to update order status.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetailStatusSave = async () => {
    if (!selectedOrderDetail) return;
    const nextStatus = detailStatusValue.trim();
    if (!nextStatus || nextStatus === selectedOrderDetail.orderStatus) return;

    setIsSaving(true);
    try {
      await updateMerchOrderStatus(selectedOrderDetail.id, nextStatus, {
        auditNote: `Manual status change from Merch Order Details. Updated to ${nextStatus}.`,
      });
      const logs = await loadMerchOrderAuditTrail(selectedOrderDetail.id);
      setSelectedOrderAudit(logs);
      setSelectedOrderDetail((current) => (current ? { ...current, orderStatus: nextStatus } : current));
      await refresh({ silent: true });
      setAlert({ title: 'Saved', message: 'Order status updated.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to update order status.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedLearner = learners.find((learner) => learner.id === selectedLearnerId) || null;
  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;
  const selectedProductSizes = selectedProduct?.availableSizes || [];
  const quantityValue = Math.max(1, Number(quantity || 1));
  const orderTotal = (selectedProduct?.price || 0) * quantityValue;
  const learnerOptions = learners
    .filter((learner) => {
      const query = learnerSearch.trim().toLowerCase();
      if (!query) return true;
      return learner.label.toLowerCase().includes(query);
    })
    .map((learner) => ({ label: learner.label, value: learner.id }));
  const productOptions = products.map((product) => ({ label: product.name, value: product.id }));
  const normalizedOrderSearch = orderSearch.trim().toLowerCase();
  const filteredRecords = records.filter((row) => {
    if (!normalizedOrderSearch) return true;
    const createdAt = row.createdAt ? new Date(row.createdAt).toLocaleString().toLowerCase() : '';
    const haystack = [
      row.referenceNo,
      row.learnerName,
      row.learnerLrn,
      row.productName,
      row.notes,
      row.orderStatus,
      row.orderPeriodLabel,
      row.selectedSize,
      row.gradeLevel,
      row.sectionName,
      createdAt,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedOrderSearch);
  });

  const groupedRecords = filteredRecords.reduce<Record<string, Record<string, MerchOrderControlRecord[]>>>((acc, row) => {
    const grade = row.gradeLevel || 'Unassigned';
    const section = row.sectionName || 'Unassigned';
    if (!acc[grade]) acc[grade] = {};
    if (!acc[grade][section]) acc[grade][section] = [];
    acc[grade][section].push(row);
    return acc;
  }, {});

  const gradeListData: UsisGradeSectionListGrade[] = Object.entries(groupedRecords)
    .sort(([gradeA], [gradeB]) => {
      const gradeDiff = parseGradeSortValue(gradeA) - parseGradeSortValue(gradeB);
      if (gradeDiff !== 0) return gradeDiff;
      return gradeA.localeCompare(gradeB);
    })
    .map(([grade, sectionGroup]) => {
      const sectionEntries = Object.entries(sectionGroup).sort(([sectionA], [sectionB]) => sectionA.localeCompare(sectionB));
      const sectionCount = sectionEntries.length;
      return {
        countLabel: `${sectionCount} Active Sections`,
        key: grade,
        label: grade,
        sections: sectionEntries.map(([sectionName, sectionRows]) => ({
          content: (
            <OrderControlSectionTable
              isSaving={isSaving}
              onDeleteOrder={(orderId) => void handleDeleteOrder(orderId)}
              onOpenOrderDetails={(row) => void openOrderDetails(row)}
              onStatusChange={(orderId, value) => void handleStatusChange(orderId, value)}
              rows={sectionRows}
              statusOptions={STATUS_OPTIONS}
            />
          ),
          count: sectionRows.length,
          key: sectionName,
          label: sectionName,
        })),
      } satisfies UsisGradeSectionListGrade;
    });

  const handleCreateManualOrder = async () => {
    if (!selectedLearner || !selectedProduct) {
      setAlert({ title: 'Required Fields', message: 'Select learner and product first.', tone: 'danger' });
      return;
    }

    setIsSaving(true);
    try {
      await createManualMerchOrder({
        learnerId: selectedLearner.id,
        learnerLrn: selectedLearner.lrn,
        learnerName: selectedLearner.name,
        notes: manualNotes,
        productId: selectedProduct.id,
        quantity: Math.max(1, Number(quantity || 1)),
        selectedSize,
      });
      setSelectedLearnerId('');
      setLearnerSearch('');
      setManualNotes('');
      setQuantity('1');
      setIsManualModalOpen(false);
      await refresh({ silent: true });
      setAlert({ title: 'Saved', message: 'Manual merch order added.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to add manual order.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setIsSaving(true);
    try {
      await deleteMerchOrderRecord(orderId);
      await refresh();
      setAlert({ title: 'Removed', message: 'Merch order deleted.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to remove order.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const openOrderDetails = async (row: MerchOrderControlRecord) => {
    setSelectedOrderDetail(row);
    setDetailStatusValue(row.orderStatus);
    setSelectedOrderAudit([]);
    setIsAuditLoading(true);
    try {
      const logs = await loadMerchOrderAuditTrail(row.id);
      setSelectedOrderAudit(logs);
    } catch {
      setSelectedOrderAudit([]);
    } finally {
      setIsAuditLoading(false);
    }
  };

  if (isLoading) {
    return <UsisPageLoader message="Loading merch orders..." />;
  }

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Orders</h2>
      </div>
      <article className="section-card integrated-admin-merch-control">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <div className="integrated-admin-merch-orders-toolbar">
            <div className="integrated-admin-merch-orders-search">
              <div className="floating-field">
                <div className="floating-field__control">
                  <input
                    data-has-value={orderSearch.trim().length > 0 ? 'true' : 'false'}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder=" "
                    value={orderSearch}
                  />
                  <span>Search Orders (Learner, LRN, Product, Grade, Section, Status)</span>
                </div>
              </div>
            </div>
            <div className="integrated-admin-merch-order-manual-trigger">
              <button
                className="primary-button"
                onClick={() => setIsManualModalOpen(true)}
                type="button"
              >
                Manual Learner Order Override
              </button>
            </div>
          </div>
          <UsisGradeSectionList
            className="integrated-admin-merch-groups"
            emptyMessage="No merch orders found."
            expandAll={normalizedOrderSearch.length > 0}
            grades={gradeListData}
          />
        </div>
      </article>
      <ManualOrderOverrideModal
        isOpen={isManualModalOpen}
        isSaving={isSaving}
        learnerOptions={learnerOptions}
        manualNotes={manualNotes}
        onClose={() => setIsManualModalOpen(false)}
        onCreate={() => void handleCreateManualOrder()}
        onLearnerQueryChange={setLearnerSearch}
        onManualNotesChange={setManualNotes}
        onProductChange={setSelectedProductId}
        onQuantityChange={setQuantity}
        onSelectLearner={setSelectedLearnerId}
        onSelectSize={setSelectedSize}
        orderTotal={orderTotal}
        productOptions={productOptions}
        quantity={quantity}
        selectedLearner={selectedLearner}
        selectedLearnerId={selectedLearnerId}
        selectedProduct={selectedProduct}
        selectedProductId={selectedProductId}
        selectedProductSizes={selectedProductSizes}
        selectedSize={selectedSize}
      />
      <OrderDetailAuditModal
        isAuditLoading={isAuditLoading}
        isSaving={isSaving}
        onClose={() => setSelectedOrderDetail(null)}
        onStatusChange={setDetailStatusValue}
        onStatusSave={() => void handleDetailStatusSave()}
        order={selectedOrderDetail}
        orderStatusValue={detailStatusValue}
        orderAudit={selectedOrderAudit}
        statusOptions={STATUS_OPTIONS}
      />
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
