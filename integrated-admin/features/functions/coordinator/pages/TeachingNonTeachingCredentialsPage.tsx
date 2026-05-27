import { useEffect, useMemo, useState } from 'react';
import {
  getCoordinatorModuleAccessMap,
  loadCoordinatorModuleAccessMapFromSupabase,
  saveCoordinatorAccountModuleAccessToSupabase,
  type UsisModuleKey,
} from '../../../../../common/auth/moduleAccess';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { getStoredIntegratedAdminAccess } from '../../../auth/services/integratedAdminAccess';
import { TeachingNonTeachingCredentialFormModal } from '../teaching-non-teaching/components/TeachingNonTeachingCredentialFormModal';
import { TeachingNonTeachingModuleAccessModal } from '../teaching-non-teaching/components/TeachingNonTeachingModuleAccessModal';
import {
  deactivateTeachingNonTeachingCredential,
  loadCoordinatorDepartments,
  loadTeachingNonTeachingCredentials,
  saveTeachingNonTeachingCredential,
  type CoordinatorDepartmentRecord,
  type TeachingNonTeachingCredentialRecord,
} from '../teaching-non-teaching/services/teachingNonTeachingCredentialsService';

const toRoleLabel = (role: string) =>
  role === 'registrar_coordinator'
    ? 'Teaching Coordinator'
    : role === 'attendance_coordinator'
      ? 'Non-Teaching Coordinator'
      : role
          .split('_')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');

const formatModuleLabel = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function TeachingNonTeachingCredentialsPage() {
  const schoolCode = getStoredIntegratedAdminAccess()?.coordinatorAccess.schoolId || '';
  const [rows, setRows] = useState<TeachingNonTeachingCredentialRecord[]>([]);
  const [departments, setDepartments] = useState<CoordinatorDepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState<TeachingNonTeachingCredentialRecord | null>(null);
  const [moduleRecord, setModuleRecord] = useState<TeachingNonTeachingCredentialRecord | null>(null);
  const [moduleSelections, setModuleSelections] = useState<UsisModuleKey[]>([]);
  const [moduleAccessMap, setModuleAccessMap] = useState<Record<string, UsisModuleKey[]>>({});
  const [isSavingModules, setIsSavingModules] = useState(false);
  const [actionLoadingMessage, setActionLoadingMessage] = useState('');
  const [successAlert, setSuccessAlert] = useState<{ title: string; message: string } | null>(null);
  const [statusAlert, setStatusAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'warning' | 'info' } | null>(null);

  const refresh = async () => {
    if (!schoolCode) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [data, departmentRows] = await Promise.all([
        loadTeachingNonTeachingCredentials(schoolCode),
        loadCoordinatorDepartments(),
      ]);
      setRows(data);
      setDepartments(departmentRows);
      const accessMap = await loadCoordinatorModuleAccessMapFromSupabase(data.map((row) => row.id));
      setModuleAccessMap(accessMap);
      setError('');
    } catch (nextError: any) {
      setError(nextError?.message || 'Unable to load teaching and non-teaching credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [schoolCode]);

  useEffect(() => {
    if (!moduleRecord) return;
    setModuleSelections(moduleAccessMap[moduleRecord.id] || getCoordinatorModuleAccessMap()[moduleRecord.id] || []);
  }, [moduleRecord]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      row.name.toLowerCase().includes(normalized) ||
      row.username.toLowerCase().includes(normalized) ||
      row.email.toLowerCase().includes(normalized) ||
      toRoleLabel(row.role).toLowerCase().includes(normalized),
    );
  }, [query, rows]);

  if (isLoading) {
    return <UsisPageLoader message="Loading teaching and non-teaching credentials..." />;
  }

  return (
    <div className="admin-panel registry-page--unified">
      {error ? <p className="login-card__error registry-feedback">{error}</p> : null}
      {notice ? <p className="registry-success">{notice}</p> : null}
      <div className="registry-layout">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Coordinator Subpage</p>
            <h3 className="mt-2">Teaching and Non-Teaching Credentials</h3>
            <p className="registry-copy">Create and manage teacher/staff coordinator accounts with custom IA module access.</p>
            <div className="registry-toolbar">
              <label className="floating-field">
                <div className="floating-field__control">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder=" " />
                  <span>Search Credentials</span>
                </div>
              </label>
              <button type="button" className="registry-action-button" onClick={() => setEditingRecord({} as TeachingNonTeachingCredentialRecord)}>
                Create Account
              </button>
            </div>

            <div className="registry-list">
              {filteredRows.length === 0 ? <p>No credentials found.</p> : null}
              {filteredRows.length > 0 ? (
                <div className="registry-table-wrap">
                  <table className="registry-table ia-registry-table--enhanced">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Module Access</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.id}>
                          <td><strong>{row.name}</strong></td>
                          <td>{row.username}</td>
                          <td>{row.email}</td>
                          <td><span className="modal-record__chip">{row.departmentName || 'Not Set'}</span></td>
                          <td>
                            <div className="modal-record__chips">
                              <span className="modal-record__chip">{toRoleLabel(row.role)}</span>
                            </div>
                          </td>
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
                              <button type="button" className="registry-icon-btn" onClick={() => setModuleRecord(row)} aria-label="Manage module access">
                                <span className="material-symbols-outlined">apps</span>
                              </button>
                              <button type="button" className="registry-icon-btn registry-icon-btn--primary" onClick={() => setEditingRecord(row)} aria-label="Edit account">
                                <span className="material-symbols-outlined">edit</span>
                              </button>
                              <button
                                type="button"
                                className="registry-icon-btn registry-icon-btn--danger"
                                onClick={async () => {
                                  setIsSubmitting(true);
                                  setActionLoadingMessage('Applying coordinator changes...');
                                  try {
                                    await deactivateTeachingNonTeachingCredential(row.id);
                                    setNotice('Credential deactivated.');
                                    setStatusAlert({ title: 'Credential Deactivated', message: 'Account was deactivated successfully.', tone: 'success' });
                                    await refresh();
                                  } catch (nextError: any) {
                                    setError(nextError?.message || 'Unable to deactivate credential.');
                                    setStatusAlert({
                                      title: 'Deactivate Failed',
                                      message: nextError?.message || 'Unable to deactivate credential.',
                                      tone: 'danger',
                                    });
                                  } finally {
                                    setActionLoadingMessage('');
                                    setIsSubmitting(false);
                                  }
                                }}
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
              ) : null}
            </div>
          </div>
        </article>
      </div>

      {editingRecord ? (
        <TeachingNonTeachingCredentialFormModal
          initialValue={editingRecord.id ? {
            email: editingRecord.email,
            departmentId: editingRecord.departmentId,
            employeeId: editingRecord.employeeId,
            firstName: editingRecord.firstName,
            id: editingRecord.id,
            isActive: editingRecord.isActive,
            lastName: editingRecord.lastName,
            middleName: editingRecord.middleName,
            mobileNo: editingRecord.mobileNo,
            personnelType: editingRecord.personnelType,
            username: editingRecord.username,
          } : null}
          isSubmitting={isSubmitting}
          departments={departments}
          schoolCode={schoolCode}
          onClose={() => setEditingRecord(null)}
          onSubmit={async (payload) => {
            setIsSubmitting(true);
            setActionLoadingMessage(payload.id ? 'Updating credential record...' : 'Saving credential to database...');
            try {
              await saveTeachingNonTeachingCredential(payload);
              setNotice(payload.id ? 'Credential updated.' : 'Credential created.');
              setEditingRecord(null);
              await refresh();
              if (!payload.id) {
                setSuccessAlert({
                  title: 'Credential Created',
                  message: 'Teaching/Non-Teaching credential was successfully created.',
                });
              } else {
                setStatusAlert({
                  title: 'Credential Updated',
                  message: 'Credential changes were saved successfully.',
                  tone: 'success',
                });
              }
            } catch (nextError: any) {
              setError(nextError?.message || 'Unable to save credential.');
              setStatusAlert({
                title: 'Save Failed',
                message: nextError?.message || 'Unable to save credential.',
                tone: 'danger',
              });
            } finally {
              setActionLoadingMessage('');
              setIsSubmitting(false);
            }
          }}
        />
      ) : null}

      {moduleRecord ? (
        <TeachingNonTeachingModuleAccessModal
          isSubmitting={isSavingModules}
          modules={moduleSelections}
          name={moduleRecord.name}
          onClose={() => {
            setModuleRecord(null);
            setModuleSelections([]);
          }}
          onSave={async () => {
            setIsSavingModules(true);
            setActionLoadingMessage('Saving module access...');
            try {
              await saveCoordinatorAccountModuleAccessToSupabase(moduleRecord.id, moduleSelections);
              setModuleAccessMap((current) => ({
                ...current,
                [moduleRecord.id]: [...moduleSelections],
              }));
              setNotice('Module access saved.');
              setModuleRecord(null);
              setModuleSelections([]);
              setStatusAlert({ title: 'Module Access Saved', message: 'Module permissions updated successfully.', tone: 'success' });
            } finally {
              setActionLoadingMessage('');
              setIsSavingModules(false);
            }
          }}
          onToggleModule={(key) => {
            setModuleSelections((current) => {
              return current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
            });
          }}
        />
      ) : null}

      <UsisAlertModal
        open={Boolean(successAlert)}
        title={successAlert?.title || 'Success'}
        message={successAlert?.message || ''}
        tone="success"
        onClose={() => setSuccessAlert(null)}
      />
      <UsisAlertModal
        open={Boolean(statusAlert)}
        title={statusAlert?.title || 'Notice'}
        message={statusAlert?.message || ''}
        tone={statusAlert?.tone || 'info'}
        onClose={() => setStatusAlert(null)}
      />
      {actionLoadingMessage ? <UsisPageLoader message={actionLoadingMessage} /> : null}
    </div>
  );
}
