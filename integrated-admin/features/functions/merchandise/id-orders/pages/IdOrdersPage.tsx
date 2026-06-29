import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../../../common/components/ui/UsisGradeSectionList';
import { IdOrdersBulkImportModal } from '../components/IdOrdersBulkImportModal';
import { downloadIdOrdersWorkbook, reviewIdOrdersWorkbook, type IdOrderWorkbookReview } from '../utils/idOrdersWorkbook';
import {
  deleteIdOrderRecord,
  loadActiveIdOrdersSchoolYearLabel,
  loadIdOrderRecords,
  updateIdOrderStatus,
  type IdOrderRecord,
} from '../services/idOrdersService';
import { loadCachedIdOrdersSnapshot, saveCachedIdOrdersSnapshot } from '../utils/idOrdersCache';

const STATUS_OPTIONS = ['pending', 'done', 'released', 'for correction'];

const parseGradeSortValue = (grade: string) => {
  const match = grade.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

const formatMiddleInitial = (name: string) => {
  const parts = String(name || '').trim().split(',').map((part) => part.trim()).filter(Boolean);
  const [last = '', first = '', middle = ''] = parts;
  const middleInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : '';
  return [last, first, middleInitial].filter(Boolean).join(', ').replace(', ,', ',') || 'Unnamed Learner';
};

const formatTimestamp = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString();
};

const formatStatusLabel = (value: string) =>
  String(value || '')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Pending';

const getStatusToneClass = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'done') return 'registry-status--done';
  if (normalized === 'released') return 'registry-status--released';
  if (normalized === 'for correction') return 'registry-status--correction';
  return 'registry-status--pending';
};

export function IdOrdersPage() {
  const [records, setRecords] = useState<IdOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isImportingWorkbook, setIsImportingWorkbook] = useState(false);
  const [isReviewingWorkbook, setIsReviewingWorkbook] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [importScope, setImportScope] = useState<'all' | 'grade'>('all');
  const [importGradeLevel, setImportGradeLevel] = useState('');
  const [pendingWorkbookReview, setPendingWorkbookReview] = useState<IdOrderWorkbookReview | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [deletingOrderId, setDeletingOrderId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrderPeriodId, setSelectedOrderPeriodId] = useState('');
  const [schoolYearLabel, setSchoolYearLabel] = useState('Active School Year');
  const [lastSyncedAt, setLastSyncedAt] = useState('');
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  const hydrateFromCache = async () => {
    setIsLoading(true);
    try {
      const cached = await loadCachedIdOrdersSnapshot();
      if (cached) {
        setRecords(cached.records || []);
        setSchoolYearLabel(cached.schoolYearLabel || 'Active School Year');
        setLastSyncedAt(cached.updatedAt || '');
      }
    } catch (loadError: any) {
      console.error('[ID Orders] cache hydrate failed', loadError);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLatestFromDatabase = async () => {
    console.log('[ID Orders] refresh start');
    const [rows, activeSchoolYearLabel] = await Promise.all([
      loadIdOrderRecords(),
      loadActiveIdOrdersSchoolYearLabel(),
    ]);
    console.log('[ID Orders] refresh complete', { count: rows.length });
    return { rows, activeSchoolYearLabel };
  };

  const refreshFromDatabase = async () => {
    setIsRefreshing(true);
    try {
      const { rows, activeSchoolYearLabel } = await loadLatestFromDatabase();
      setRecords(rows);
      setSchoolYearLabel(activeSchoolYearLabel);
      setLastSyncedAt(new Date().toISOString());
      await saveCachedIdOrdersSnapshot(rows, activeSchoolYearLabel);
      setAlert({ title: 'Refresh Complete', message: 'ID orders were reloaded from the database and saved locally.', tone: 'success' });
    } catch (loadError: any) {
      console.error('[ID Orders] refresh failed', loadError);
      setAlert({ title: 'Refresh Failed', message: loadError?.message || 'Unable to refresh ID orders.', tone: 'danger' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const bootstrapFromCacheOrDatabase = async () => {
    setIsLoading(true);
    try {
      const cached = await loadCachedIdOrdersSnapshot();
      if (cached?.records?.length) {
        setRecords(cached.records || []);
        setSchoolYearLabel(cached.schoolYearLabel || 'Active School Year');
        setLastSyncedAt(cached.updatedAt || '');
        return;
      }

      console.log('[ID Orders] cache empty, loading from database');
      const { rows, activeSchoolYearLabel } = await loadLatestFromDatabase();
      setRecords(rows);
      setSchoolYearLabel(activeSchoolYearLabel);
      setLastSyncedAt(new Date().toISOString());
      await saveCachedIdOrdersSnapshot(rows, activeSchoolYearLabel);
    } catch (loadError: any) {
      console.error('[ID Orders] bootstrap failed', loadError);
      setAlert({ title: 'Load Failed', message: loadError?.message || 'Unable to load ID orders.', tone: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void bootstrapFromCacheOrDatabase();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void saveCachedIdOrdersSnapshot(records, schoolYearLabel);
  }, [isLoading, records, schoolYearLabel]);

  useEffect(() => {
    if (!selectedOrderPeriodId) return;
    if (records.some((row) => row.orderPeriodId === selectedOrderPeriodId)) return;
    setSelectedOrderPeriodId('');
  }, [records, selectedOrderPeriodId]);

  const normalizedSearch = search.trim().toLowerCase();

  const orderPeriodOptions = useMemo(() => {
    const periodMap = new Map<string, string>();
    records.forEach((row) => {
      const periodId = String(row.orderPeriodId || '').trim();
      const periodLabel = String(row.orderPeriodLabel || '').trim();
      if (!periodId) return;
      if (!periodMap.has(periodId)) {
        periodMap.set(periodId, periodLabel || 'ID Order');
      }
    });
    return [
      { label: 'All Order Periods', value: '' },
      ...Array.from(periodMap.entries())
        .sort((left, right) => left[1].localeCompare(right[1], undefined, { numeric: true }))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [records]);

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    const currentRecord = records.find((row) => row.id === orderId);
    if (!currentRecord || currentRecord.orderStatus === nextStatus) return;

    setUpdatingOrderId(orderId);
    setIsSavingStatus(true);

    const previousRecords = records;
    const nextRecords = records.map((row) => (
      row.id === orderId
        ? { ...row, orderStatus: nextStatus, lastUpdatedAt: new Date().toISOString() }
        : row
    ));

    try {
      setRecords(nextRecords);
      await updateIdOrderStatus(orderId, nextStatus);
      await saveCachedIdOrdersSnapshot(nextRecords, schoolYearLabel);
      setLastSyncedAt(new Date().toISOString());
    } catch (error: any) {
      console.error('[ID Orders] status change failed', error);
      setRecords(previousRecords);
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to update ID order status.', tone: 'danger' });
    } finally {
      setUpdatingOrderId('');
      setIsSavingStatus(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const target = records.find((row) => row.id === orderId);
    if (!target) return;

    const confirmed = window.confirm(`Delete ID order ${target.referenceNo || target.id}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingOrderId(orderId);
    setIsDeleting(true);
    const previousRecords = records;
    const nextRecords = records.filter((row) => row.id !== orderId);

    try {
      setRecords(nextRecords);
      await deleteIdOrderRecord(orderId);
      await saveCachedIdOrdersSnapshot(nextRecords, schoolYearLabel);
      setLastSyncedAt(new Date().toISOString());
      setAlert({ title: 'Deleted', message: 'ID order deleted.', tone: 'success' });
    } catch (error: any) {
      console.error('[ID Orders] delete failed', error);
      setRecords(previousRecords);
      setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to delete ID order.', tone: 'danger' });
    } finally {
      setDeletingOrderId('');
      setIsDeleting(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      if (selectedOrderPeriodId && row.orderPeriodId !== selectedOrderPeriodId) {
        return false;
      }
      const haystack = [
        row.gradeLevel,
        row.sectionName,
        row.learnerLrn,
        row.learnerName,
        row.guardianName,
        row.address,
        row.referenceNo,
        row.orderStatus,
        row.orderPeriodLabel,
      ]
        .join(' ')
        .toLowerCase();
      return !normalizedSearch || haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, records, selectedOrderPeriodId]);

  const groupedRecords = useMemo(() => {
    return filteredRecords.reduce<Record<string, Record<string, IdOrderRecord[]>>>((acc, row) => {
      const grade = row.gradeLevel || 'Unassigned';
      const section = row.sectionName || 'Unassigned';
      if (!acc[grade]) acc[grade] = {};
      if (!acc[grade][section]) acc[grade][section] = [];
      acc[grade][section].push(row);
      return acc;
    }, {});
  }, [filteredRecords]);

  const exportGradeOptions = useMemo(() => {
    return Object.keys(groupedRecords).sort((left, right) => {
      const diff = parseGradeSortValue(left) - parseGradeSortValue(right);
      if (diff !== 0) return diff;
      return left.localeCompare(right, undefined, { numeric: true });
    });
  }, [groupedRecords]);

  useEffect(() => {
    if (importScope !== 'grade') return;
    if (importGradeLevel && exportGradeOptions.includes(importGradeLevel)) return;
    setImportGradeLevel(exportGradeOptions[0] || '');
  }, [exportGradeOptions, importGradeLevel, importScope]);

  const gradeListData: UsisGradeSectionListGrade[] = Object.entries(groupedRecords)
    .sort(([gradeA], [gradeB]) => {
      const diff = parseGradeSortValue(gradeA) - parseGradeSortValue(gradeB);
      if (diff !== 0) return diff;
      return gradeA.localeCompare(gradeB);
    })
    .map(([grade, sectionsByGrade]) => {
      const sectionEntries = Object.entries(sectionsByGrade).sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));
      const totalRequests = sectionEntries.reduce((sum, [, sectionRows]) => sum + sectionRows.length, 0);
      return {
        countLabel: `${totalRequests} Requests`,
        key: grade,
        label: grade,
        sections: sectionEntries.map(([sectionName, sectionRows]) => ({
          count: sectionRows.length,
          key: sectionName,
          label: sectionName,
          content: (
            <div className="registry-table-wrap">
              <table className="registry-table">
                <thead>
                  <tr>
                    <th>LRN</th>
                    <th>Name</th>
                    <th>Guardians Name</th>
                    <th>Address</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionRows.map((row) => {
                    const currentStatus = String(row.orderStatus || 'pending').toLowerCase();
                    const rowStatusOptions = STATUS_OPTIONS.includes(currentStatus)
                      ? STATUS_OPTIONS
                      : [currentStatus, ...STATUS_OPTIONS];
                    const statusToneClass = getStatusToneClass(currentStatus);

                    return (
                      <tr key={row.id} className={statusToneClass}>
                        <td>{row.learnerLrn || '-'}</td>
                        <td>{formatMiddleInitial(row.learnerName)}</td>
                        <td>{row.guardianName || '-'}</td>
                        <td>{row.address || '-'}</td>
                        <td>{row.referenceNo || '-'}</td>
                        <td>
                          <select
                            aria-label={`Change status for ${row.referenceNo || row.id}`}
                            className={`registry-inline-status-select ${statusToneClass}`}
                            disabled={isSavingStatus && updatingOrderId === row.id}
                            value={currentStatus}
                            onChange={(event) => void handleStatusChange(row.id, event.target.value)}
                          >
                            {rowStatusOptions.map((option) => (
                              <option key={option} value={option} className={getStatusToneClass(option)}>
                                {formatStatusLabel(option)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{formatTimestamp(row.lastUpdatedAt || row.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={isSavingStatus || isDeleting || deletingOrderId === row.id}
                            onClick={() => void handleDeleteOrder(row.id)}
                          >
                            {deletingOrderId === row.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ),
        })),
      } satisfies UsisGradeSectionListGrade;
    });

  const totalRequests = filteredRecords.length;
  const totalSections = Object.values(groupedRecords).reduce((sum, sectionMap) => sum + Object.keys(sectionMap).length, 0);
  const downloadOrderPeriodLabel = useMemo(() => {
    const labels = Array.from(new Set(
      filteredRecords
        .map((row) => String(row.orderPeriodLabel || '').trim())
        .filter(Boolean),
    ));

    if (labels.length === 1) return labels[0];
    if (labels.length > 1) return labels.join(' / ');

    if (selectedOrderPeriodId) {
      const selectedOption = orderPeriodOptions.find((option) => option.value === selectedOrderPeriodId);
      if (selectedOption?.label) return selectedOption.label;
    }

    return 'Order Period';
  }, [filteredRecords, orderPeriodOptions, selectedOrderPeriodId]);

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const templateRecords = importScope === 'grade'
        ? filteredRecords.filter((row) => row.gradeLevel === importGradeLevel)
        : filteredRecords;

      if (templateRecords.length === 0) {
        setAlert({
          title: 'Download Failed',
          message: importScope === 'grade'
            ? 'No records found for the selected grade level.'
            : 'No ID orders are available for download.',
          tone: 'danger',
        });
        return;
      }

      await downloadIdOrdersWorkbook(templateRecords, downloadOrderPeriodLabel, {
        fileNameSuffix: importScope === 'grade' ? importGradeLevel : 'All_Orders',
        isWholeOrders: importScope === 'all',
      });
      setAlert({ title: 'Download Complete', message: 'ID orders workbook has been downloaded.', tone: 'success' });
    } catch (downloadError: any) {
      setAlert({ title: 'Download Failed', message: downloadError?.message || 'Unable to download ID orders workbook.', tone: 'danger' });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleReviewWorkbook = async (file: File) => {
    setIsReviewingWorkbook(true);
    try {
      const review = await reviewIdOrdersWorkbook(file, records);
      setPendingWorkbookReview(review);
    } catch (reviewError: any) {
      setAlert({ title: 'Review Failed', message: reviewError?.message || 'Unable to review the uploaded workbook.', tone: 'danger' });
    } finally {
      setIsReviewingWorkbook(false);
    }
  };

  const handleConfirmWorkbookImport = async () => {
    if (!pendingWorkbookReview) return;

    const blockingIssues = pendingWorkbookReview.issues.filter((issue) => issue.severity === 'error');
    if (blockingIssues.length > 0) {
      const firstIssue = blockingIssues[0];
      setAlert({
        title: 'Import Blocked',
        message: `${firstIssue.message} (${firstIssue.sheetName} row ${firstIssue.rowNumber})`,
        tone: 'danger',
      });
      return;
    }

    if (pendingWorkbookReview.patches.length === 0) {
      setAlert({
        title: 'Import Blocked',
        message: 'No valid order rows were found in the workbook.',
        tone: 'danger',
      });
      return;
    }

    setIsImportingWorkbook(true);
    try {
      const results = await Promise.allSettled(
        pendingWorkbookReview.patches.map((patch) => updateIdOrderStatus(patch.orderId, patch.orderStatus)),
      );
      const failedCount = results.filter((result) => result.status === 'rejected').length;
      const succeededCount = results.length - failedCount;

      const { rows, activeSchoolYearLabel } = await loadLatestFromDatabase();
      setRecords(rows);
      setSchoolYearLabel(activeSchoolYearLabel);
      setLastSyncedAt(new Date().toISOString());
      await saveCachedIdOrdersSnapshot(rows, activeSchoolYearLabel);

      setPendingWorkbookReview(null);

      if (failedCount > 0) {
        setAlert({
          title: 'Import Partially Completed',
          message: `${succeededCount} ID order status${succeededCount === 1 ? '' : 'es'} imported. ${failedCount} row${failedCount === 1 ? '' : 's'} failed to save.`,
          tone: 'danger',
        });
        return;
      }

      setIsBulkImportModalOpen(false);
      setAlert({
        title: 'Import Complete',
        message: `${succeededCount} ID order status${succeededCount === 1 ? '' : 'es'} imported successfully.`,
        tone: 'success',
      });
    } catch (importError: any) {
      setAlert({ title: 'Import Failed', message: importError?.message || 'Unable to import ID orders workbook.', tone: 'danger' });
    } finally {
      setIsImportingWorkbook(false);
    }
  };

  if (isLoading) return <UsisPageLoader message="Loading ID orders..." />;

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>ID Orders</h2>
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
                      data-has-value={normalizedSearch.length > 0 ? 'true' : 'false'}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder=" "
                      value={search}
                    />
                    <span>Search ID orders (Learner, LRN, Grade, Section, Guardian, Address)</span>
                  </div>
                </div>
              </div>
              <div className="integrated-admin-merch-orders-period-filter">
                <UsisSearchableSelect
                  ariaLabel="Order Period Filter"
                  allowTyping={false}
                  floatingLabel
                  label="Order Period"
                  options={orderPeriodOptions}
                  value={selectedOrderPeriodId}
                  onChange={(value) => setSelectedOrderPeriodId(value)}
                />
              </div>
            </div>
            <div className="integrated-admin-merch-order-manual-trigger integrated-admin-merch-order-manual-trigger--actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void refreshFromDatabase()}
                disabled={isRefreshing || isLoading || isSavingStatus}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => setIsBulkImportModalOpen(true)}
                disabled={isDownloadingTemplate || isImportingWorkbook || filteredRecords.length === 0 || isRefreshing || isSavingStatus}
              >
                Bulk Import
              </button>
            </div>
          </div>

          <div className="integrated-admin-order-payment-metrics">
            <div className="integrated-admin-order-payment-summary__metric">
              <small>Total Requests</small>
              <strong>{totalRequests}</strong>
            </div>
            <div className="integrated-admin-order-payment-summary__metric">
              <small>Grade / Section Groups</small>
              <strong>{totalSections}</strong>
            </div>
          </div>

          <UsisGradeSectionList
            className="integrated-admin-merch-groups"
            emptyMessage={records.length === 0
              ? 'No cached ID orders found. Use Refresh to load records from the database.'
              : 'No ID orders found for the selected filter.'}
            expandAll={normalizedSearch.length > 0}
            grades={gradeListData}
          />

          {lastSyncedAt ? (
            <p className="integrated-admin-merch-orders-cache-note">
              Last synced: {new Date(lastSyncedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      </article>

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />

      <IdOrdersBulkImportModal
        gradeOptions={exportGradeOptions}
        isBusy={isDownloadingTemplate || isImportingWorkbook || isReviewingWorkbook}
        isImporting={isImportingWorkbook}
        isReviewing={isReviewingWorkbook}
        isOpen={isBulkImportModalOpen}
        onClose={() => {
          setPendingWorkbookReview(null);
          setIsBulkImportModalOpen(false);
        }}
        onDownload={() => handleDownloadTemplate()}
        onReview={handleReviewWorkbook}
        onConfirmImport={handleConfirmWorkbookImport}
        onGradeChange={setImportGradeLevel}
        onResetReview={() => setPendingWorkbookReview(null)}
        onScopeChange={setImportScope}
        review={pendingWorkbookReview}
        selectedGrade={importGradeLevel}
        selectedScope={importScope}
      />
    </section>
  );
}
