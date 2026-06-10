import { useEffect, useMemo, useState } from 'react';
import { UsisAlertModal } from '../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';
import { OrderPeriodModal } from './merch-control/components/OrderPeriodModal';
import { ProductEditorModal } from './merch-control/components/ProductEditorModal';
import { APPAREL_SIZE_KEYS, initialModalState, toPayload, type ProductModalState } from './merch-control/productForm';
import type { MerchandiseControlRecord } from './services/merchandiseControlService';
import {
  createMerchOrderPeriod,
  deleteMerchandiseControlRecord,
  loadMerchOrderPeriods,
  loadMerchandiseControlRecords,
  removeMerchOrderPeriod,
  saveMerchandiseControlRecord,
  updateMerchOrderPeriod,
  updateMerchandiseSortOrder,
  type MerchandiseOrderPeriodRecord,
} from './services/merchandiseControlService';

export function MerchandiseControlPage() {
  const [records, setRecords] = useState<MerchandiseControlRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [alert, setAlert] = useState<{ message: string; title: string; tone: 'success' | 'danger' } | null>(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<MerchandiseControlRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalState, setModalState] = useState<ProductModalState>(initialModalState);
  const [draggedRecordId, setDraggedRecordId] = useState<string | null>(null);
  const [dragOverRecordId, setDragOverRecordId] = useState<string | null>(null);
  const [orderPeriods, setOrderPeriods] = useState<MerchandiseOrderPeriodRecord[]>([]);
  const [isOrderPeriodModalOpen, setIsOrderPeriodModalOpen] = useState(false);
  const [orderPeriodModalMode, setOrderPeriodModalMode] = useState<'create' | 'manage'>('create');
  const [isSavingOrderPeriod, setIsSavingOrderPeriod] = useState(false);
  const [orderPeriodActionId, setOrderPeriodActionId] = useState<string | null>(null);
  const [editingOrderPeriodId, setEditingOrderPeriodId] = useState<string | null>(null);
  const [orderPeriodEditDraft, setOrderPeriodEditDraft] = useState({
    endDate: '',
    isActive: true,
    label: '',
    startDate: '',
  });
  const [orderPeriodDraft, setOrderPeriodDraft] = useState({
    endDate: '',
    isActive: true,
    label: '',
    startDate: '',
  });

  const publishedCount = useMemo(() => records.filter((record) => record.isPublished).length, [records]);
  const isCategoryApparel = modalState.categoryName.trim().toLowerCase() === 'apparel';
  const toggleAvailableSize = (sizeKey: string) => {
    setModalState((current) => {
      const exists = current.availableSizes.includes(sizeKey);
      return {
        ...current,
        availableSizes: exists
          ? current.availableSizes.filter((entry) => entry !== sizeKey)
          : [...current.availableSizes, sizeKey],
      };
    });
  };

  const refresh = async () => {
      setIsLoading(true);
      try {
        const [nextRecords, nextPeriods] = await Promise.all([
          loadMerchandiseControlRecords(),
          loadMerchOrderPeriods(),
        ]);
        setRecords(nextRecords);
        setOrderPeriods(nextPeriods);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load merchandise records.';
        setAlert({ title: 'Load Failed', message, tone: 'danger' });
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openCreateModal = () => {
    setModalState(initialModalState);
    setIsModalOpen(true);
  };

  const openEditModal = (record: MerchandiseControlRecord) => {
    setModalState({
      availableSizes: record.availableSizes || [],
      categoryName: record.categoryName,
      description: record.description || '',
      imageUrl: record.imageUrl || '',
      isPublished: record.isPublished,
      isPreOrder: record.isPreOrder,
      name: record.name,
      orderPeriodId: record.orderPeriodId || '',
      price: String(record.price),
      productId: record.id,
      sizeStock: APPAREL_SIZE_KEYS.reduce((carry, sizeKey) => {
        carry[sizeKey] = String(record.sizeStock?.[sizeKey] || '');
        return carry;
      }, {} as Record<string, string>),
      sku: record.sku,
      stockQty: String(record.stockQty),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const openCreateOrderPeriodModal = () => {
    setOrderPeriodDraft({ endDate: '', isActive: true, label: '', startDate: '' });
    setOrderPeriodModalMode('create');
    setIsOrderPeriodModalOpen(true);
  };

  const closeOrderPeriodModal = () => {
    if (isSavingOrderPeriod || orderPeriodActionId) return;
    setIsOrderPeriodModalOpen(false);
    setOrderPeriodModalMode('create');
    setEditingOrderPeriodId(null);
  };

  const handleSaveOrderPeriod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingOrderPeriod(true);
    try {
      await createMerchOrderPeriod(orderPeriodDraft);
      await refresh();
      setIsOrderPeriodModalOpen(false);
      setAlert({ title: 'Saved', message: 'Order period created.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Save Failed', message: error?.message || 'Unable to create order period.', tone: 'danger' });
    } finally {
      setIsSavingOrderPeriod(false);
    }
  };

  const handleToggleOrderPeriodActive = async (period: MerchandiseOrderPeriodRecord) => {
    setOrderPeriodActionId(period.id);
    try {
      await updateMerchOrderPeriod(period.id, {
        endDate: period.endDate,
        isActive: !period.isActive,
        label: period.label,
        startDate: period.startDate,
      });
      await refresh();
      setAlert({ title: 'Saved', message: 'Order period updated.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Update Failed', message: error?.message || 'Unable to update order period.', tone: 'danger' });
    } finally {
      setOrderPeriodActionId(null);
    }
  };

  const handleDeleteOrderPeriod = async (period: MerchandiseOrderPeriodRecord) => {
    setOrderPeriodActionId(period.id);
    try {
      await removeMerchOrderPeriod(period.id);
      await refresh();
      setAlert({ title: 'Deleted', message: 'Order period deleted.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Delete Failed', message: error?.message || 'Unable to delete order period.', tone: 'danger' });
    } finally {
      setOrderPeriodActionId(null);
    }
  };

  const beginEditOrderPeriod = (period: MerchandiseOrderPeriodRecord) => {
    setEditingOrderPeriodId(period.id);
    setOrderPeriodEditDraft({
      endDate: period.endDate,
      isActive: period.isActive,
      label: period.label,
      startDate: period.startDate,
    });
  };

  const cancelEditOrderPeriod = () => {
    if (orderPeriodActionId) return;
    setEditingOrderPeriodId(null);
  };

  const saveEditOrderPeriod = async (periodId: string) => {
    setOrderPeriodActionId(periodId);
    try {
      await updateMerchOrderPeriod(periodId, orderPeriodEditDraft);
      await refresh();
      setEditingOrderPeriodId(null);
      setAlert({ title: 'Saved', message: 'Order period updated.', tone: 'success' });
    } catch (error: any) {
      setAlert({ title: 'Update Failed', message: error?.message || 'Unable to update order period.', tone: 'danger' });
    } finally {
      setOrderPeriodActionId(null);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = toPayload(modalState);
      await saveMerchandiseControlRecord(payload);
      await refresh();
      setIsModalOpen(false);
      setAlert({
        title: 'Saved',
        message: payload.productId ? 'Merchandise product updated.' : 'Merchandise product created.',
        tone: 'success',
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save merchandise product.';
      setAlert({ title: 'Save Failed', message, tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteRecord) return;
    setIsDeleting(true);
    try {
      await deleteMerchandiseControlRecord(pendingDeleteRecord.id);
      await refresh();
      setAlert({ title: 'Deleted', message: 'Merchandise product deleted.', tone: 'success' });
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Unable to delete merchandise product.';
      setAlert({ title: 'Delete Failed', message, tone: 'danger' });
    } finally {
      setIsDeleting(false);
      setPendingDeleteRecord(null);
    }
  };

  const moveRecordToIndex = (recordId: string, targetIndex: number) => {
    setRecords((current) => {
      const currentIndex = current.findIndex((record) => record.id === recordId);
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= current.length || currentIndex === targetIndex) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const saveArrangement = async () => {
    setIsReordering(true);
    try {
      await updateMerchandiseSortOrder(records.map((record) => record.id));
      setAlert({ title: 'Arrangement Saved', message: 'Product showcase arrangement updated.', tone: 'success' });
      await refresh();
    } catch (sortError) {
      const message = sortError instanceof Error ? sortError.message : 'Unable to save arrangement.';
      setAlert({ title: 'Save Failed', message, tone: 'danger' });
    } finally {
      setIsReordering(false);
    }
  };

  if (isLoading) {
    return <UsisPageLoader message="Loading merchandise records..." />;
  }

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Merchandise Control</h2>
      </div>

      <article className="section-card integrated-admin-merch-control">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <div className="integrated-admin-merch-control__toolbar">
            <div className="integrated-admin-merch-control__stats">
              <article className="integrated-admin-merch-control__stat">
                <span>Total Products</span>
                <strong>{records.length}</strong>
              </article>
              <article className="integrated-admin-merch-control__stat">
                <span>Published</span>
                <strong>{publishedCount}</strong>
              </article>
            </div>
            <div className="integrated-admin-merch-control__actions">
              <button type="button" className="primary-button" onClick={openCreateModal}>
                Create Product
              </button>
              <button type="button" className="secondary-button" onClick={openCreateOrderPeriodModal}>
                Create Order Period
              </button>
            </div>
          </div>

          <>
              <div className="registry-table-wrap">
                <table className="registry-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Order Period</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={8}>No merchandise records found.</td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id}>
                          <td>{record.sku}</td>
                          <td>{record.name}</td>
                          <td>{record.categoryName}</td>
                          <td>PHP {record.price.toFixed(2)}</td>
                          <td>{record.stockQty}</td>
                          <td>{record.isPreOrder ? 'Pre-order' : record.isPublished ? 'Published' : 'Draft'}</td>
                          <td>{record.orderPeriodLabel || '-'}</td>
                          <td>
                            <button
                              type="button"
                              className="registry-icon-btn registry-icon-btn--primary"
                              aria-label={`Edit ${record.name}`}
                              title="Edit"
                              onClick={() => openEditModal(record)}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                            </button>
                            <button
                              type="button"
                              className="registry-icon-btn registry-icon-btn--danger"
                              aria-label={`Delete ${record.name}`}
                              title="Delete"
                              onClick={() => setPendingDeleteRecord(record)}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="integrated-admin-merch-control__arrangement">
                <p>Showcase Arrangement (Drag and Drop)</p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={saveArrangement}
                  disabled={isReordering || records.length === 0}
                >
                  {isReordering ? 'Saving Arrangement...' : 'Save Arrangement'}
                </button>
              </div>
              <div className="integrated-admin-merch-preview-grid">
                {records.map((record, index) => (
                  <article
                    key={`${record.id}-drag`}
                    className={`integrated-admin-merch-preview-card integrated-admin-merch-preview-card--draggable${
                      draggedRecordId === record.id ? ' is-dragging' : ''
                    }${dragOverRecordId === record.id ? ' is-drag-over' : ''}`}
                    draggable
                    onDragStart={() => {
                      setDraggedRecordId(record.id);
                      setDragOverRecordId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedRecordId(null);
                      setDragOverRecordId(null);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (dragOverRecordId !== record.id) setDragOverRecordId(record.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverRecordId === record.id) setDragOverRecordId(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggedRecordId || draggedRecordId === record.id) {
                        setDragOverRecordId(null);
                        return;
                      }
                      moveRecordToIndex(draggedRecordId, index);
                      setDragOverRecordId(null);
                    }}
                  >
                    <div className="integrated-admin-merch-preview-card__head">
                      <strong>{index + 1}. {record.name}</strong>
                      <span>{record.categoryName}</span>
                    </div>
                  </article>
                ))}
              </div>
          </>
        </div>
      </article>

      <ProductEditorModal
        isCategoryApparel={isCategoryApparel}
        isOpen={isModalOpen}
        isSaving={isSaving}
        modalState={modalState}
        onClose={closeModal}
        onSave={handleSave}
        onSetModalState={(updater) => setModalState((current) => updater(current))}
        onToggleAvailableSize={toggleAvailableSize}
        orderPeriods={orderPeriods}
      />
      <OrderPeriodModal
        editingOrderPeriodId={editingOrderPeriodId}
        isOpen={isOrderPeriodModalOpen}
        isSavingOrderPeriod={isSavingOrderPeriod}
        mode={orderPeriodModalMode}
        onBeginEdit={beginEditOrderPeriod}
        onCancelEdit={cancelEditOrderPeriod}
        onClose={closeOrderPeriodModal}
        onDelete={(period) => void handleDeleteOrderPeriod(period)}
        onSaveCreate={handleSaveOrderPeriod}
        onSaveEdit={(id) => void saveEditOrderPeriod(id)}
        onToggleActive={(period) => void handleToggleOrderPeriodActive(period)}
        onToggleMode={() => setOrderPeriodModalMode((current) => (current === 'create' ? 'manage' : 'create'))}
        orderPeriodActionId={orderPeriodActionId}
        orderPeriodDraft={orderPeriodDraft}
        orderPeriodEditDraft={orderPeriodEditDraft}
        periods={orderPeriods}
        setOrderPeriodDraft={(updater) => setOrderPeriodDraft((current) => updater(current))}
        setOrderPeriodEditDraft={(updater) => setOrderPeriodEditDraft((current) => updater(current))}
      />
      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
      <UsisAlertModal
        open={Boolean(pendingDeleteRecord)}
        title="Delete Product"
        message={`Delete ${pendingDeleteRecord?.name || 'this product'} from merchandise listing?`}
        tone="danger"
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        onConfirm={isDeleting ? undefined : handleDelete}
        onClose={() => {
          if (isDeleting) return;
          setPendingDeleteRecord(null);
        }}
      />
    </section>
  );
}
