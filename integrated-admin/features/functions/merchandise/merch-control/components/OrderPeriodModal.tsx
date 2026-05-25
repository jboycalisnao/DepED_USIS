import { UsisDateTimePicker } from '../../../../../../common/components/ui/UsisDateTimePicker';
import type { MerchandiseOrderPeriodRecord } from '../../services/merchandiseControlService';

type Draft = { endDate: string; isActive: boolean; label: string; startDate: string };

type Props = {
  editingOrderPeriodId: string | null;
  isOpen: boolean;
  isSavingOrderPeriod: boolean;
  mode: 'create' | 'manage';
  onBeginEdit: (period: MerchandiseOrderPeriodRecord) => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onDelete: (period: MerchandiseOrderPeriodRecord) => void;
  onSaveCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveEdit: (id: string) => void;
  onToggleActive: (period: MerchandiseOrderPeriodRecord) => void;
  onToggleMode: () => void;
  orderPeriodActionId: string | null;
  orderPeriodDraft: Draft;
  orderPeriodEditDraft: Draft;
  periods: MerchandiseOrderPeriodRecord[];
  setOrderPeriodDraft: (updater: (current: Draft) => Draft) => void;
  setOrderPeriodEditDraft: (updater: (current: Draft) => Draft) => void;
};

export function OrderPeriodModal(props: Props) {
  const {
    editingOrderPeriodId, isOpen, isSavingOrderPeriod, mode, onBeginEdit, onCancelEdit, onClose, onDelete, onSaveCreate, onSaveEdit, onToggleActive, onToggleMode,
    orderPeriodActionId, orderPeriodDraft, orderPeriodEditDraft, periods, setOrderPeriodDraft, setOrderPeriodEditDraft,
  } = props;
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog integrated-admin-merch-modal" role="dialog" aria-modal="true" aria-label="Order period">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Merchandise Control</p>
            <h3>{mode === 'create' ? 'Create Order Period' : 'Manage Order Periods'}</h3>
          </div>
          <div className="integrated-admin-order-period-modal__header-actions">
            <button type="button" className="secondary-button" onClick={onToggleMode} disabled={isSavingOrderPeriod || Boolean(orderPeriodActionId)}>
              {mode === 'create' ? 'Settings' : 'Back to Create'}
            </button>
            <button type="button" className="modal-dialog__close" aria-label="Close" onClick={onClose}>
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        </div>
        {mode === 'create' ? (
          <form className="modal-dialog__body registry-form" onSubmit={onSaveCreate}>
            <label className="floating-field"><div className="floating-field__control"><input value={orderPeriodDraft.label} onChange={(event) => setOrderPeriodDraft((current) => ({ ...current, label: event.target.value }))} required placeholder=" " /><span>Order Period Label</span></div></label>
            <div className="registry-form__split">
              <UsisDateTimePicker ariaLabel="Order period start" label="Start Date" mode="date" value={orderPeriodDraft.startDate} onChange={(value) => setOrderPeriodDraft((current) => ({ ...current, startDate: value }))} />
              <UsisDateTimePicker ariaLabel="Order period end" label="End Date" mode="date" value={orderPeriodDraft.endDate} onChange={(value) => setOrderPeriodDraft((current) => ({ ...current, endDate: value }))} />
            </div>
            <label className="registry-radio-option registry-radio-option--toggle"><span>Active order period</span><input type="checkbox" checked={orderPeriodDraft.isActive} onChange={(event) => setOrderPeriodDraft((current) => ({ ...current, isActive: event.target.checked }))} /></label>
            <div className="modal-dialog__actions"><button type="button" onClick={onClose} disabled={isSavingOrderPeriod}>Cancel</button><button type="submit" className="modal-dialog__blue" disabled={isSavingOrderPeriod}>{isSavingOrderPeriod ? 'Saving...' : 'Create Order Period'}</button></div>
          </form>
        ) : (
          <div className="modal-dialog__body registry-form">
            <div className="integrated-admin-order-period-list">
              {periods.length === 0 ? <p className="integrated-admin-order-period-list__empty">No order periods found.</p> : periods.map((period) => (
                <article key={period.id} className="integrated-admin-order-period-item">
                  {editingOrderPeriodId === period.id ? (
                    <div className="integrated-admin-order-period-item__edit">
                      <label className="floating-field"><div className="floating-field__control"><input value={orderPeriodEditDraft.label} onChange={(event) => setOrderPeriodEditDraft((current) => ({ ...current, label: event.target.value }))} required placeholder=" " /><span>Order Period Label</span></div></label>
                      <div className="registry-form__split">
                        <UsisDateTimePicker ariaLabel="Order period start" label="Start Date" mode="date" value={orderPeriodEditDraft.startDate} onChange={(value) => setOrderPeriodEditDraft((current) => ({ ...current, startDate: value }))} />
                        <UsisDateTimePicker ariaLabel="Order period end" label="End Date" mode="date" value={orderPeriodEditDraft.endDate} onChange={(value) => setOrderPeriodEditDraft((current) => ({ ...current, endDate: value }))} />
                      </div>
                      <label className="registry-radio-option registry-radio-option--toggle integrated-admin-order-period-item__toggle"><span>{orderPeriodEditDraft.isActive ? 'Active' : 'Inactive'}</span><input type="checkbox" checked={orderPeriodEditDraft.isActive} onChange={(event) => setOrderPeriodEditDraft((current) => ({ ...current, isActive: event.target.checked }))} /></label>
                      <div className="integrated-admin-order-period-item__actions">
                        <button type="button" className="secondary-button" disabled={orderPeriodActionId === period.id} onClick={onCancelEdit}>Cancel</button>
                        <button type="button" className="modal-dialog__blue" disabled={orderPeriodActionId === period.id} onClick={() => onSaveEdit(period.id)}>{orderPeriodActionId === period.id ? 'Saving...' : 'Save'}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="integrated-admin-order-period-item__meta"><strong>{period.label}</strong><span>{new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}</span></div>
                      <div className="integrated-admin-order-period-item__actions">
                        <label className="registry-radio-option registry-radio-option--toggle integrated-admin-order-period-item__toggle"><span>{period.isActive ? 'Active' : 'Inactive'}</span><input type="checkbox" checked={period.isActive} disabled={orderPeriodActionId === period.id} onChange={() => onToggleActive(period)} /></label>
                        <button type="button" className="secondary-button" disabled={orderPeriodActionId === period.id} onClick={() => onBeginEdit(period)}>Edit</button>
                        <button type="button" className="secondary-button" disabled={orderPeriodActionId === period.id} onClick={() => onDelete(period)}>Delete</button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
