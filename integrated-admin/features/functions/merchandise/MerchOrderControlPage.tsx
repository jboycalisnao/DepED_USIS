import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../common/components/ui/UsisGradeSectionList';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { ManualOrderOverrideModal } from './order-control/components/ManualOrderOverrideModal';
import { MerchOrderWorkbookReviewModal } from './order-control/components/MerchOrderWorkbookReviewModal';
import { OrderControlSectionTable } from './order-control/components/OrderControlSectionTable';
import { OrderDetailAuditModal } from './order-control/components/OrderDetailAuditModal';
import {
  downloadMerchOrdersWorkbook,
  reviewMerchOrdersWorkbook,
  type MerchOrderWorkbookReview,
} from './order-control/utils/merchOrdersWorkbook';
import {
  MERCH_ORDER_STATUS_OPTIONS,
  normalizeMerchOrderStatus,
} from './order-control/utils/orderStatus';
import { loadCachedMerchOrdersPageSnapshot, saveCachedMerchOrdersPageSnapshot } from './utils/merchOrdersPageCache';
import {
  createManualMerchOrder,
  deleteMerchOrderRecord,
  loadActiveSchoolYearLearners,
  loadMerchOrderAuditTrail,
  loadMerchOrderControlRecords,
  loadPublishedMerchProducts,
  hydrateMerchOrderLearnerNames,
  updateMerchOrderStatus,
  type MerchActiveLearnerOption,
  type MerchOrderAuditRecord,
  type MerchOrderControlRecord,
  type MerchProductOption,
} from './services/merchOrderControlService';

const parseGradeSortValue = (grade: string) => {
  const match = grade.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};
const formatDateTime = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString();
};

const normalizeOrderRecord = (record: MerchOrderControlRecord): MerchOrderControlRecord => ({
  ...record,
  orderKind: 'merch',
  orderStatus: normalizeMerchOrderStatus(record.orderStatus),
});

export function MerchOrderControlPage() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [records, setRecords] = useState<MerchOrderControlRecord[]>([]);
  const [learners, setLearners] = useState<MerchActiveLearnerOption[]>([]);
  const [products, setProducts] = useState<MerchProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [lastLoadedFromDbAt, setLastLoadedFromDbAt] = useState('');
  const [lastLoadedFromCacheAt, setLastLoadedFromCacheAt] = useState('');
  const [bootedFromCache, setBootedFromCache] = useState(false);
  const [isExportingWorkbook, setIsExportingWorkbook] = useState(false);
  const [isImportingWorkbook, setIsImportingWorkbook] = useState(false);
  const [pendingWorkbookReview, setPendingWorkbookReview] = useState<MerchOrderWorkbookReview | null>(null);
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  const bootstrapFromCacheOrDatabase = async () => {
    setIsLoading(true);
    try {
      const cached = await loadCachedMerchOrdersPageSnapshot();
      if (cached) {
        const cacheLoadedAt = new Date().toISOString();
        const cachedLearners = cached.learners || [];
        const cachedRecords = hydrateMerchOrderLearnerNames((cached.records || []).map(normalizeOrderRecord), cachedLearners);
        setRecords(cachedRecords);
        setLearners(cachedLearners);
        setProducts(cached.products || []);
        setLastLoadedFromDbAt(cached.lastLoadedFromDbAt || '');
        setLastLoadedFromCacheAt(cacheLoadedAt);
        setBootedFromCache(true);
        if (!selectedProductId && (cached.products || []).length > 0) {
          setSelectedProductId(cached.products[0].id);
        }
        if (cachedRecords.some((record) => Number(record.orderAmount || 0) <= 0)) {
          void refresh({ silent: true });
        }
        return;
      }

      const [merchRows, activeLearners, merchProducts] = await Promise.all([
        loadMerchOrderControlRecords(),
        loadActiveSchoolYearLearners(),
        loadPublishedMerchProducts(),
      ]);
      const nextRecords = hydrateMerchOrderLearnerNames(merchRows.map(normalizeOrderRecord), activeLearners);
      setRecords(nextRecords);
      setLearners(activeLearners);
      setProducts(merchProducts);
      if (!selectedProductId && merchProducts.length > 0) {
        setSelectedProductId(merchProducts[0].id);
      }
      const syncedAt = new Date().toISOString();
      setLastLoadedFromDbAt(syncedAt);
      setLastLoadedFromCacheAt('');
      setBootedFromCache(false);
      await saveCachedMerchOrdersPageSnapshot(nextRecords, activeLearners, merchProducts, syncedAt);
    } catch (error) {
      console.error('MerchOrderControlPage bootstrap failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) setIsRefreshing(true);
    try {
      const [merchRows, activeLearners, merchProducts] = await Promise.all([
        loadMerchOrderControlRecords(),
        loadActiveSchoolYearLearners(),
        loadPublishedMerchProducts(),
      ]);
      const nextRecords = hydrateMerchOrderLearnerNames(merchRows.map(normalizeOrderRecord), activeLearners);
      setLearners(activeLearners);
      setProducts(merchProducts);
      setRecords(nextRecords);
      if (!selectedProductId && merchProducts.length > 0) {
        setSelectedProductId(merchProducts[0].id);
      }
      const syncedAt = new Date().toISOString();
      setLastLoadedFromDbAt(syncedAt);
      await saveCachedMerchOrdersPageSnapshot(nextRecords, activeLearners, merchProducts, syncedAt);
      setBootedFromCache(false);
      if (!silent) {
        setAlert({ title: 'Refresh Complete', message: 'Merch orders were reloaded from the database and saved locally.', tone: 'success' });
      }
    } catch (error: any) {
      console.error('MerchOrderControlPage refresh failed:', error);
      setAlert({ title: 'Load Failed', message: error?.message || 'Unable to load merch orders.', tone: 'danger' });
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void bootstrapFromCacheOrDatabase();
  }, []);

  useEffect(() => {
    const selectedProduct = products.find((product) => product.id === selectedProductId);
    const firstSize = selectedProduct?.availableSizes?.[0] || '';
    setSelectedSize(firstSize);
  }, [products, selectedProductId]);

  const handleStatusChange = async (orderId: string, value: string) => {
    const currentRecord = records.find((row) => row.id === orderId);
    if (!currentRecord) return;

    setIsSaving(true);
    try {
      const nextStatus = normalizeMerchOrderStatus(value);
      await updateMerchOrderStatus(orderId, nextStatus);
      const nextRecords = hydrateMerchOrderLearnerNames(
        records.map((entry) => (entry.id === orderId ? { ...entry, orderStatus: nextStatus } : entry)),
        learners,
      );
      setRecords(nextRecords);
      await saveCachedMerchOrdersPageSnapshot(nextRecords, learners, products, lastLoadedFromDbAt);
      setSelectedOrderDetail((current) => (current && current.id === orderId ? { ...current, orderStatus: nextStatus } : current));
      setAlert({ title: 'Saved', message: 'Order status updated.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to update order status.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetailStatusSave = async () => {
    if (!selectedOrderDetail) return;
    const nextStatus = normalizeMerchOrderStatus(detailStatusValue);
    if (!nextStatus || nextStatus === selectedOrderDetail.orderStatus) return;

    setIsSaving(true);
    try {
      await updateMerchOrderStatus(selectedOrderDetail.id, nextStatus, {
        auditNote: `Manual status change from Merch Order Details. Updated to ${nextStatus}.`,
      });
      const nextRecords = hydrateMerchOrderLearnerNames(
        records.map((entry) => (entry.id === selectedOrderDetail.id ? { ...entry, orderStatus: nextStatus } : entry)),
        learners,
      );
      setRecords(nextRecords);
      await saveCachedMerchOrdersPageSnapshot(nextRecords, learners, products, lastLoadedFromDbAt);
      setSelectedOrderAudit((current) => [
        {
          changedBy: 'Integrated Admin',
          createdAt: new Date().toISOString(),
          fromStatus: selectedOrderDetail.orderStatus,
          notes: 'Manual status change from Merch Order Details.',
          source: 'integrated_admin',
          toStatus: nextStatus,
        },
        ...current,
      ]);
      setSelectedOrderDetail((current) => (current ? { ...current, orderStatus: nextStatus } : current));
      setDetailStatusValue(nextStatus);
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
              learners={learners}
              rows={sectionRows}
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
      const createdOrder = await createManualMerchOrder({
        learnerId: selectedLearner.id,
        learnerLrn: selectedLearner.lrn,
        learnerName: selectedLearner.name,
        notes: manualNotes,
        productId: selectedProduct.id,
        quantity: Math.max(1, Number(quantity || 1)),
        selectedSize,
      });
      const now = createdOrder.createdAt || new Date().toISOString();
      const quantityValue = Math.max(1, Number(quantity || 1));
      const productPrice = Math.max(0, Number(selectedProduct.price || 0));
      const nextRecord: MerchOrderControlRecord = {
        createdAt: now,
        gradeLevel: selectedLearner.gradeLevel || 'Unassigned',
        id: createdOrder.orderId,
        learnerId: selectedLearner.id,
        learnerLrn: selectedLearner.lrn,
        learnerName: selectedLearner.name,
        notes: manualNotes.trim(),
        orderStatus: 'pending',
        orderAmount: productPrice * quantityValue,
        orderKind: 'merch',
        orderPeriodLabel: createdOrder.orderPeriodLabel || '',
        orderSource: 'integrated_admin',
        productName: selectedProduct.name,
        quantity: quantityValue,
        referenceNo: createdOrder.referenceNo,
        sectionName: selectedLearner.sectionName || 'Unassigned',
        selectedSize: selectedSize.trim(),
        unitPrice: productPrice,
      };
      const nextRecords = [nextRecord, ...records.filter((row) => row.id !== nextRecord.id)];
      setRecords(nextRecords);
      await saveCachedMerchOrdersPageSnapshot(nextRecords, learners, products, lastLoadedFromDbAt);
      setSelectedLearnerId('');
      setLearnerSearch('');
      setManualNotes('');
      setQuantity('1');
      setIsManualModalOpen(false);
      setAlert({ title: 'Saved', message: 'Manual merch order added.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to add manual order.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadWorkbook = async () => {
    const merchOnlyRecords = records.filter((row) => row.orderKind === 'merch');
    if (merchOnlyRecords.length === 0) {
      setAlert({ title: 'Export Failed', message: 'No merch orders are available for export.', tone: 'danger' });
      return;
    }
    setIsExportingWorkbook(true);
    try {
      await downloadMerchOrdersWorkbook(merchOnlyRecords, 'Merch Orders');
      setAlert({ title: 'Export Complete', message: 'Merch orders workbook has been downloaded.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Export Failed', message: error?.message || 'Unable to export merch orders.', tone: 'danger' });
    } finally {
      setIsExportingWorkbook(false);
    }
  };

  const handleUploadWorkbook = () => {
    uploadInputRef.current?.click();
  };

  const handleWorkbookFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;

    setIsImportingWorkbook(true);
    try {
      const review = await reviewMerchOrdersWorkbook(file, records.filter((row) => row.orderKind === 'merch'));
      setPendingWorkbookReview(review);
    } catch (error: any) {
      setAlert({ title: 'Import Failed', message: error?.message || 'Unable to sync statuses from workbook.', tone: 'danger' });
    } finally {
      setIsImportingWorkbook(false);
    }
  };

  const handleConfirmWorkbookImport = async () => {
    if (!pendingWorkbookReview) return;

    if (pendingWorkbookReview.patches.length === 0) {
      setAlert({
        title: 'Import Review',
        message: 'No valid status changes were found in the uploaded workbook.',
        tone: 'danger',
      });
      setPendingWorkbookReview(null);
      return;
    }

    setIsImportingWorkbook(true);
    try {
      const nextRecords = records.map((row) => ({ ...row }));
      let changedCount = 0;

      for (const patch of pendingWorkbookReview.patches) {
        const match = nextRecords.find((row) => row.id === patch.orderId || row.referenceNo === patch.referenceNo);
        if (!match || match.orderKind !== 'merch') continue;
        const normalizedStatus = normalizeMerchOrderStatus(patch.orderStatus);
        if (normalizeMerchOrderStatus(match.orderStatus) === normalizedStatus) continue;
        await updateMerchOrderStatus(match.id, normalizedStatus);
        match.orderStatus = normalizedStatus;
        changedCount += 1;
      }

      if (changedCount === 0) {
        setAlert({
          title: 'Import Complete',
          message: 'The uploaded workbook did not change any order statuses.',
          tone: 'success',
        });
        setPendingWorkbookReview(null);
        return;
      }

      const syncedRecords = hydrateMerchOrderLearnerNames(nextRecords.map(normalizeOrderRecord), learners);
      setRecords(syncedRecords);
      await saveCachedMerchOrdersPageSnapshot(syncedRecords, learners, products, lastLoadedFromDbAt);
      setPendingWorkbookReview(null);
      setAlert({
        title: 'Import Complete',
        message: `${changedCount} order status${changedCount === 1 ? '' : 'es'} synced from the workbook.`,
        tone: 'success',
      });
    } catch (error: any) {
      setAlert({ title: 'Import Failed', message: error?.message || 'Unable to sync statuses from workbook.', tone: 'danger' });
    } finally {
      setIsImportingWorkbook(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setIsSaving(true);
    try {
      await deleteMerchOrderRecord(orderId);
      await refresh({ silent: true });
      setAlert({ title: 'Removed', message: 'Merch order deleted.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to remove order.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const openOrderDetails = async (row: MerchOrderControlRecord) => {
    setSelectedOrderDetail(row);
    setDetailStatusValue(normalizeMerchOrderStatus(row.orderStatus));
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
        <div className="integrated-admin-merch-orders__header-row">
          <div className="integrated-admin-merch-orders__header-copy">
            <h2>Orders</h2>
            <p>Merchandise orders received through the learner portal and manual Integrated Admin entries.</p>
            <div className="integrated-admin-merch-orders__sync-stack">
              <p className="integrated-admin-merch-orders__sync-line">
                <span>Last loaded from database: {formatDateTime(lastLoadedFromDbAt) || 'Not yet loaded from database'}</span>
                <span className="integrated-admin-merch-orders__sync-divider" aria-hidden="true">|</span>
                <span>Last loaded from cache: {formatDateTime(lastLoadedFromCacheAt) || 'Not yet loaded from cache'}</span>
              </p>
              {bootedFromCache ? (
                <p className="integrated-admin-merch-orders__sync-note">
                  Use Refresh to fetch the latest records from the database.
                </p>
              ) : null}
              {isLoading ? (
                <p className="integrated-admin-merch-orders__sync-note">
                  Loading orders in the background...
                </p>
              ) : null}
            </div>
          </div>
          <div className="integrated-admin-merch-orders__header-actions">
            <button
              className="secondary-button"
              onClick={() => void refresh()}
              type="button"
              disabled={isRefreshing || isLoading}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              className="primary-button"
              onClick={() => setIsManualModalOpen(true)}
              type="button"
              disabled={isRefreshing}
            >
              Manual Learner Order Override
            </button>
            <button
              className="secondary-button"
              onClick={() => void handleDownloadWorkbook()}
              type="button"
              disabled={isExportingWorkbook || isImportingWorkbook}
            >
              {isExportingWorkbook ? 'Downloading...' : 'Download Excel'}
            </button>
            <button
              className="secondary-button"
              onClick={handleUploadWorkbook}
              type="button"
              disabled={isExportingWorkbook || isImportingWorkbook}
            >
              {isImportingWorkbook ? 'Uploading...' : 'Upload Excel'}
            </button>
          </div>
        </div>
        <input
          ref={uploadInputRef}
          accept=".xlsx,.xls"
          aria-hidden="true"
          onChange={(event) => void handleWorkbookFileChange(event)}
          style={{ display: 'none' }}
          type="file"
        />
      </div>
      <article className="section-card integrated-admin-merch-control">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <div className="integrated-admin-merch-orders-toolbar">
            <div className="integrated-admin-merch-orders-toolbar__filters">
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
            </div>
          </div>
          <UsisGradeSectionList
            className="integrated-admin-merch-groups"
            emptyMessage={records.length === 0
              ? 'No cached merch orders found. Use Refresh to load records from the database.'
              : 'No merch orders found.'}
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
        statusOptions={MERCH_ORDER_STATUS_OPTIONS}
      />
      <MerchOrderWorkbookReviewModal
        isOpen={Boolean(pendingWorkbookReview)}
        isProcessing={isImportingWorkbook}
        onClose={() => setPendingWorkbookReview(null)}
        onConfirm={() => void handleConfirmWorkbookImport()}
        review={pendingWorkbookReview}
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
