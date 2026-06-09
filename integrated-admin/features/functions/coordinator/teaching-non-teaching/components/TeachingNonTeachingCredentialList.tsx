import type { UsisModuleKey } from '../../../../../../common/auth/moduleAccess';
import type { TeachingNonTeachingCredentialRecord } from '../services/teachingNonTeachingCredentialsService';
import { groupTeachingNonTeachingCredentials } from '../utils/teachingNonTeachingCredentialGrouping';

type Props = {
  moduleAccessMap: Record<string, UsisModuleKey[]>;
  onDeactivate: (record: TeachingNonTeachingCredentialRecord) => void;
  onEdit: (record: TeachingNonTeachingCredentialRecord) => void;
  onManageModules: (record: TeachingNonTeachingCredentialRecord) => void;
  rows: TeachingNonTeachingCredentialRecord[];
};

const formatModuleLabel = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function TeachingNonTeachingCredentialList({ moduleAccessMap, onDeactivate, onEdit, onManageModules, rows }: Props) {
  const groupedRows = groupTeachingNonTeachingCredentials(rows);

  if (groupedRows.length === 0) {
    return <p>No credentials found.</p>;
  }

  return (
    <div className="ia-teaching-credential-groups">
      {groupedRows.map((group) => (
        <details key={group.personnelType} className="ia-teaching-credential-group" open>
          <summary className="ia-teaching-credential-group__summary">
            <span className="ia-teaching-credential-group__summary-icon">
              <span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
            </span>
            <span className="ia-teaching-credential-group__summary-copy">
              <strong>{group.personnelTypeLabel}</strong>
              <small>{group.count} account{group.count === 1 ? '' : 's'}</small>
            </span>
          </summary>
          <div className="ia-teaching-credential-group__body">
            {group.departments.map((department) => (
              <details key={`${group.personnelType}-${department.departmentId}`} className="ia-teaching-credential-department">
                <summary className="ia-teaching-credential-department__summary">
                  <span className="ia-teaching-credential-department__summary-icon">
                    <span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
                  </span>
                  <span className="ia-teaching-credential-department__summary-copy">
                    <strong>{department.departmentName}</strong>
                    <small>{department.rows.length} account{department.rows.length === 1 ? '' : 's'}</small>
                  </span>
                </summary>
                <div className="ia-teaching-credential-department__body">
                  <div className="registry-table-wrap ia-teaching-credential-table-wrap">
                    <table className="registry-table ia-registry-table--enhanced ia-teaching-credential-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Module Access</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {department.rows.map((row) => (
                          <tr key={row.id}>
                            <td><strong>{row.name}</strong></td>
                            <td>{row.username}</td>
                            <td>{row.email}</td>
                            <td>{row.isActive ? 'Active' : 'Inactive'}</td>
                            <td>
                              <div className="modal-record__chips">
                                {(moduleAccessMap[row.id] || []).length ? (
                                  (moduleAccessMap[row.id] || []).map((moduleKey) => (
                                    <span key={moduleKey} className="modal-record__chip">
                                      {formatModuleLabel(moduleKey)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="modal-record__chip">Not Set</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="registry-table__actions">
                                <button
                                  type="button"
                                  className="registry-icon-btn"
                                  onClick={() => onManageModules(row)}
                                  aria-label="Manage module access"
                                >
                                  <span className="material-symbols-outlined">apps</span>
                                </button>
                                <button
                                  type="button"
                                  className="registry-icon-btn registry-icon-btn--primary"
                                  onClick={() => onEdit(row)}
                                  aria-label="Edit account"
                                >
                                  <span className="material-symbols-outlined">edit</span>
                                </button>
                                <button
                                  type="button"
                                  className="registry-icon-btn registry-icon-btn--danger"
                                  onClick={() => onDeactivate(row)}
                                  aria-label="Deactivate account"
                                >
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
