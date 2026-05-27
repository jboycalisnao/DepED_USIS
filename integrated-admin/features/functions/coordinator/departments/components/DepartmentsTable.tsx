import type { DepartmentRecord } from '../services/departmentsService';

type Props = {
  onActivate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
  onDeactivate: (id: string) => Promise<void>;
  onEdit: (row: DepartmentRecord) => void;
  rows: DepartmentRecord[];
};

export function DepartmentsTable({ isLoading, onActivate, onDeactivate, onDelete, onEdit, rows }: Props) {
  if (isLoading) return <p>Loading departments...</p>;

  return (
    <div className="registry-table-wrap ia-departments-table-wrap">
      <table className="registry-table ia-registry-table--enhanced ia-departments-table">
        <thead>
          <tr>
            <th>Department</th>
            <th>Status</th>
            <th>Assigned Coordinators</th>
            <th className="ia-departments-table__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.name}</strong></td>
              <td><span className="modal-record__chip">{row.isActive ? 'Active' : 'Inactive'}</span></td>
              <td>{row.assignedCount}</td>
              <td className="ia-departments-table__actions-col">
                <div className="registry-table__actions ia-departments-table__actions">
                  <button type="button" className="registry-icon-btn" onClick={() => onEdit(row)}><span className="material-symbols-outlined">edit</span></button>
                  <button type="button" className="registry-icon-btn registry-icon-btn--danger" onClick={async () => onDelete(row.id)} title="Delete Department"><span className="material-symbols-outlined">delete</span></button>
                  {row.isActive ? (
                    <button
                      type="button"
                      className="registry-action-button ia-departments-table__state-btn"
                      onClick={async () => onDeactivate(row.id)}
                      title="Deactivate Department"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="registry-action-button ia-departments-table__state-btn"
                      onClick={async () => onActivate(row.id)}
                      title="Activate Department"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={4}>No departments configured.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
