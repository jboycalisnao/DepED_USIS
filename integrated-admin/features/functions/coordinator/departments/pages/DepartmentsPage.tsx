import { UsisAlertModal } from '../../../../../../common/components/UsisAlertModal';
import { DepartmentFormModal } from '../components/DepartmentFormModal';
import { DepartmentsTable } from '../components/DepartmentsTable';
import { useDepartmentsManagement } from '../hooks/useDepartmentsManagement';

export function DepartmentsPage() {
  const {
    alert,
    activate,
    closeForm,
    deactivate,
    editing,
    isLoading,
    isSubmitting,
    name,
    openCreate,
    openEdit,
    remove,
    rows,
    setAlert,
    setName,
    submitForm,
  } = useDepartmentsManagement();

  return (
    <div className="admin-panel registry-page--unified">
      <div className="registry-layout">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Coordinator Subpage</p>
            <h3 className="mt-2">Departments</h3>
            <p className="registry-copy">Create and manage available departments for coordinator credentials.</p>
            <div className="registry-form__actions ia-departments-actions">
              <button
                type="button"
                className="registry-action-button"
                onClick={openCreate}
              >
                Add Department
              </button>
            </div>
            <DepartmentsTable
              isLoading={isLoading}
              rows={rows}
              onEdit={openEdit}
              onDeactivate={deactivate}
              onActivate={activate}
              onDelete={remove}
            />
          </div>
        </article>
      </div>
      <DepartmentFormModal
        editing={editing}
        isSubmitting={isSubmitting}
        name={name}
        onClose={closeForm}
        onNameChange={setName}
        onSubmit={submitForm}
      />

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
    </div>
  );
}
