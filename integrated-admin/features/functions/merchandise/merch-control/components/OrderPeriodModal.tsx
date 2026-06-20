import { UsisDateTimePicker } from '../../../../../../common/components/ui/UsisDateTimePicker';
import type { MerchandiseOrderPeriodRecord } from '../../services/merchandiseControlService';

type Draft = { endDate: string; isActive: boolean; label: string; startDate: string };

const normalizeText = (value: unknown) => String(value || '').trim();
const parseOrderPeriodDate = (value: unknown) => {
  const text = normalizeText(value);
  if (!text) return null;
  const parsed = new Date(`${text}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWithinWindow = (startDate: unknown, endDate: unknown) => {
  const start = parseOrderPeriodDate(startDate);
  const end = parseOrderPeriodDate(endDate);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (start && todayStart < start) return false;
  if (end && todayStart > end) return false;
  return true;
};

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
            <div className="floating-field-grid floating-field-grid--two">
              <UsisDateTimePicker ariaLabel="Order period start" label="Start Date" mode="date" value={orderPeriodDraft.startDate} onChange={(value) => setOrderPeriodDraft((current) => ({ ...current, startDate: value }))} />
              <UsisDateTimePicker ariaLabel="Order period end" label="End Date" mode="date" value={orderPeriodDraft.endDate} onChange={(value) => setOrderPeriodDraft((current) => ({ ...current, endDate: value }))} />
            </div>
            <label className="integrated-admin-order-period-switch integrated-admin-order-period-switch--full">
              <input
                type="checkbox"
                checked={orderPeriodDraft.isActive}
                onChange={(event) => setOrderPeriodDraft((current) => ({ ...current, isActive: event.target.checked }))}
              />
              <span className="integrated-admin-order-period-switch__visual" aria-hidden="true">
                <span className="integrated-admin-order-period-switch__thumb" />
              </span>
              <span className="integrated-admin-order-period-switch__text">Active order period</span>
            </label>
            <div className="modal-dialog__actions"><button type="button" onClick={onClose} disabled={isSavingOrderPeriod}>Cancel</button><button type="submit" className="modal-dialog__blue" disabled={isSavingOrderPeriod}>{isSavingOrderPeriod ? 'Saving...' : 'Create Order Period'}</button></div>
          </form>
        ) : (
          <div className="modal-dialog__body registry-form">
            <div className="integrated-admin-order-period-list">
              {periods.length === 0 ? <p className="integrated-admin-order-period-list__empty">No order periods found.</p> : periods.map((period) => (
                <article key={period.id} className="integrated-admin-order-period-item">
                  {(() => {
                    const periodWithinWindow = isWithinWindow(period.startDate, period.endDate);
                    const draftWithinWindow = editingOrderPeriodId === period.id
                      ? isWithinWindow(orderPeriodEditDraft.startDate, orderPeriodEditDraft.endDate)
                      : periodWithinWindow;
                    const toggleDisabled = orderPeriodActionId === period.id || !draftWithinWindow;
                    const statusText = periodWithinWindow
                      ? (period.isActive ? 'Active' : 'Inactive')
                      : 'Inactive (outside dates)';

                    return editingOrderPeriodId === period.id ? (
                      <div className="integrated-admin-order-period-item__edit">
                        <label className="floating-field"><div className="floating-field__control"><input value={orderPeriodEditDraft.label} onChange={(event) => setOrderPeriodEditDraft((current) => ({ ...current, label: event.target.value }))} required placeholder=" " /><span>Order Period Label</span></div></label>
                        <div className="floating-field-grid floating-field-grid--two">
                          <UsisDateTimePicker ariaLabel="Order period start" label="Start Date" mode="date" value={orderPeriodEditDraft.startDate} onChange={(value) => setOrderPeriodEditDraft((current) => ({ ...current, startDate: value }))} />
                          <UsisDateTimePicker ariaLabel="Order period end" label="End Date" mode="date" value={orderPeriodEditDraft.endDate} onChange={(value) => setOrderPeriodEditDraft((current) => ({ ...current, endDate: value }))} />
                        </div>
                        <label className="integrated-admin-order-period-switch integrated-admin-order-period-switch--compact integrated-admin-order-period-item__toggle">
                          <input
                            type="checkbox"
                            checked={draftWithinWindow ? orderPeriodEditDraft.isActive : false}
                            disabled={toggleDisabled}
                            onChange={(event) => setOrderPeriodEditDraft((current) => ({ ...current, isActive: event.target.checked }))}
                          />
                          <span className="integrated-admin-order-period-switch__visual" aria-hidden="true">
                            <span className="integrated-admin-order-period-switch__thumb" />
                          </span>
                          <span className="integrated-admin-order-period-switch__text">
                            {draftWithinWindow ? (orderPeriodEditDraft.isActive ? 'Active' : 'Inactive') : 'Inactive (outside dates)'}
                          </span>
                        </label>
                        {!draftWithinWindow ? <p className="integrated-admin-order-period-item__note">This period is outside the date window and will remain inactive until the dates are valid.</p> : null}
                        <div className="integrated-admin-order-period-item__actions">
                          <button type="button" className="secondary-button" disabled={orderPeriodActionId === period.id} onClick={onCancelEdit}>Cancel</button>
                          <button type="button" className="modal-dialog__blue" disabled={orderPeriodActionId === period.id} onClick={() => onSaveEdit(period.id)}>{orderPeriodActionId === period.id ? 'Saving...' : 'Save'}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="integrated-admin-order-period-item__meta"><strong>{period.label}</strong><span>{new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}</span></div>
                        <div className="integrated-admin-order-period-item__actions">
                          <label className="integrated-admin-order-period-switch integrated-admin-order-period-switch--compact integrated-admin-order-period-item__toggle">
                            <input
                              type="checkbox"
                              checked={periodWithinWindow ? period.isActive : false}
                              disabled={toggleDisabled}
                              onChange={() => onToggleActive(period)}
                            />
                            <span className="integrated-admin-order-period-switch__visual" aria-hidden="true">
                              <span className="integrated-admin-order-period-switch__thumb" />
                            </span>
                            <span className="integrated-admin-order-period-switch__text">{statusText}</span>
                          </label>
                          <button type="button" className="secondary-button" disabled={orderPeriodActionId === period.id} onClick={() => onBeginEdit(period)}>Edit</button>
                          <button type="button" className="secondary-button" disabled={orderPeriodActionId === period.id} onClick={() => onDelete(period)}>Delete</button>
                        </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
