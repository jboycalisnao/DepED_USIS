import { useEffect, useMemo, useState } from 'react';
import {
  getCoordinatorIaPageAccessMap,
  getCoordinatorModuleAccessMap,
  loadCoordinatorIaPageAccessMapFromSupabase,
  loadIaPageCatalogFromSupabase,
  saveCoordinatorAccountIaPageAccessToSupabase,
  loadCoordinatorModuleAccessMapFromSupabase,
  saveCoordinatorAccountModuleAccessToSupabase,
  type UsisModuleKey,
} from '../../../../../common/auth/moduleAccess';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { getStoredIntegratedAdminAccess } from '../../../auth/services/integratedAdminAccess';
import { TeachingNonTeachingBulkEditModal } from '../teaching-non-teaching/components/TeachingNonTeachingBulkEditModal';
import { TeachingNonTeachingCredentialFormModal } from '../teaching-non-teaching/components/TeachingNonTeachingCredentialFormModal';
import { TeachingNonTeachingModuleAccessModal } from '../teaching-non-teaching/components/TeachingNonTeachingModuleAccessModal';
import { TeachingNonTeachingSelectionToolbar } from '../teaching-non-teaching/components/TeachingNonTeachingSelectionToolbar';
import {
  deactivateTeachingNonTeachingCredential,
  loadCoordinatorDepartments,
  loadTeachingNonTeachingCredentials,
  saveTeachingNonTeachingCredential,
  type CoordinatorDepartmentRecord,
  type TeachingNonTeachingCredentialRecord,
} from '../teaching-non-teaching/services/teachingNonTeachingCredentialsService';
import { TeachingNonTeachingCredentialList } from '../teaching-non-teaching/components/TeachingNonTeachingCredentialList';
import type { TeachingNonTeachingBulkImportResult } from '../teaching-non-teaching/utils/teachingNonTeachingCredentialWorkbook';
import type { PersonnelType, SaveTeachingNonTeachingCredentialInput } from '../teaching-non-teaching/services/teachingNonTeachingCredentialsService';
import { useTeachingNonTeachingSelection } from '../teaching-non-teaching/hooks/useTeachingNonTeachingSelection';

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
  const [bulkModuleAccessOpen, setBulkModuleAccessOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [moduleSelections, setModuleSelections] = useState<UsisModuleKey[]>([]);
  const [iaPageSelections, setIaPageSelections] = useState<string[]>([]);
  const [moduleAccessMap, setModuleAccessMap] = useState<Record<string, UsisModuleKey[]>>({});
  const [iaPageAccessMap, setIaPageAccessMap] = useState<Record<string, string[]>>({});
  const [iaPageOptions, setIaPageOptions] = useState<Array<{ group: string; key: string; label: string }>>([]);
  const [isSavingModules, setIsSavingModules] = useState(false);
  const [actionLoadingMessage, setActionLoadingMessage] = useState('');
  const [successAlert, setSuccessAlert] = useState<{ title: string; message: string } | null>(null);
  const [statusAlert, setStatusAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'warning' | 'info' } | null>(null);
  const {
    clearSelection,
    selectedAccountIds,
    selectedRows,
    toggleManySelected,
    toggleSelected,
  } = useTeachingNonTeachingSelection(rows);

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
      const accountIds = data.map((row) => row.id);
      const [accessMap, pageAccessMap, pageCatalog] = await Promise.all([
        loadCoordinatorModuleAccessMapFromSupabase(accountIds),
        loadCoordinatorIaPageAccessMapFromSupabase(accountIds),
        loadIaPageCatalogFromSupabase(),
      ]);
      setModuleAccessMap(accessMap);
      setIaPageAccessMap(pageAccessMap);
      setIaPageOptions(pageCatalog);
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
    setIaPageSelections(iaPageAccessMap[moduleRecord.id] || getCoordinatorIaPageAccessMap()[moduleRecord.id] || []);
  }, [iaPageAccessMap, moduleAccessMap, moduleRecord]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      row.name.toLowerCase().includes(normalized) ||
      row.username.toLowerCase().includes(normalized) ||
      row.email.toLowerCase().includes(normalized) ||
      row.departmentName.toLowerCase().includes(normalized) ||
      row.personnelType.toLowerCase().includes(normalized),
    );
  }, [query, rows]);

  const buildSavePayload = (
    row: TeachingNonTeachingCredentialRecord,
    overrides: {
      departmentId: string;
      isActive: boolean;
      personnelType: PersonnelType;
    },
  ): SaveTeachingNonTeachingCredentialInput => ({
    departmentId: overrides.departmentId || row.departmentId,
    email: row.email,
    employeeId: row.employeeId,
    firstName: row.firstName,
    id: row.id,
    isActive: overrides.isActive,
    lastName: row.lastName,
    middleName: row.middleName,
    mobileNo: row.mobileNo,
    personnelType: overrides.personnelType,
    schoolCode,
    username: row.username,
  });

  const openBulkModuleAccess = () => {
    if (selectedRows.length === 0) return;
    const first = selectedRows[0];
    setModuleSelections(moduleAccessMap[first.id] || getCoordinatorModuleAccessMap()[first.id] || []);
    setIaPageSelections(iaPageAccessMap[first.id] || getCoordinatorIaPageAccessMap()[first.id] || []);
    setBulkModuleAccessOpen(true);
  };

  const openBulkEdit = () => {
    if (selectedRows.length === 0) return;
    setBulkEditOpen(true);
  };

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

            <TeachingNonTeachingSelectionToolbar
              selectedCount={selectedAccountIds.length}
              visibleCount={filteredRows.length}
              onSelectVisible={() => toggleManySelected(filteredRows.map((row) => row.id), true)}
              onClearSelection={clearSelection}
              onBulkModuleAccess={openBulkModuleAccess}
              onBulkEditDetails={openBulkEdit}
            />

            <div className="registry-list">
              <TeachingNonTeachingCredentialList
                moduleAccessMap={moduleAccessMap}
                onToggleManySelected={toggleManySelected}
                onDeactivate={async (row) => {
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
                onEdit={(row) => setEditingRecord(row)}
                onManageModules={(row) => setModuleRecord(row)}
                onToggleSelected={toggleSelected}
                selectedAccountIds={selectedAccountIds}
                rows={filteredRows}
              />
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
          existingRecords={rows}
          isSubmitting={isSubmitting}
          departments={departments}
          schoolCode={schoolCode}
          onClose={() => setEditingRecord(null)}
          onBulkImport={async (payloads) => {
            setIsSubmitting(true);
            setActionLoadingMessage(`Importing ${payloads.length} credential${payloads.length === 1 ? '' : 's'}...`);
            const summary: TeachingNonTeachingBulkImportResult = {
              createdCount: 0,
              errors: [],
              skippedCount: 0,
            };
            try {
              for (const payload of payloads) {
                try {
                  await saveTeachingNonTeachingCredential(payload);
                  summary.createdCount += 1;
                } catch (nextError: any) {
                  summary.skippedCount += 1;
                  summary.errors.push(nextError?.message || 'Unable to import one credential row.');
                }
              }
              if (summary.createdCount > 0) {
                setNotice(`Imported ${summary.createdCount} credential${summary.createdCount === 1 ? '' : 's'}.`);
              }
              if (summary.errors.length > 0) {
                setStatusAlert({
                  title: 'Bulk Import Completed with Warnings',
                  message: summary.errors.slice(0, 3).join(' '),
                  tone: 'warning',
                });
              } else {
                setSuccessAlert({
                  title: 'Bulk Import Complete',
                  message: `${summary.createdCount} credential${summary.createdCount === 1 ? '' : 's'} were imported successfully.`,
                });
              }
              await refresh();
              return summary;
            } catch (nextError: any) {
              summary.errors.push(nextError?.message || 'Unable to complete bulk import.');
              setStatusAlert({
                title: 'Bulk Import Failed',
                message: nextError?.message || 'Unable to complete bulk import.',
                tone: 'danger',
              });
              return summary;
            } finally {
              setActionLoadingMessage('');
              setIsSubmitting(false);
            }
          }}
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
          iaPageOptions={iaPageOptions}
          iaPageSelections={iaPageSelections}
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
              const nextPageSelections = moduleSelections.includes('ia') ? iaPageSelections : [];
              await saveCoordinatorAccountIaPageAccessToSupabase(moduleRecord.id, nextPageSelections);
              setModuleAccessMap((current) => ({
                ...current,
                [moduleRecord.id]: [...moduleSelections],
              }));
              setIaPageAccessMap((current) => ({
                ...current,
                [moduleRecord.id]: [...nextPageSelections],
              }));
              setNotice('Module access saved.');
              setModuleRecord(null);
              setModuleSelections([]);
              setIaPageSelections([]);
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
          onToggleIaPage={(key) => {
            setIaPageSelections((current) => (
              current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
            ));
          }}
        />
      ) : null}

      {bulkModuleAccessOpen && selectedRows.length > 0 ? (
        <TeachingNonTeachingModuleAccessModal
          iaPageOptions={iaPageOptions}
          iaPageSelections={iaPageSelections}
          isSubmitting={isSavingModules}
          modules={moduleSelections}
          name={`${selectedRows.length} selected account${selectedRows.length === 1 ? '' : 's'}`}
          onClose={() => setBulkModuleAccessOpen(false)}
          onSave={async () => {
            setIsSavingModules(true);
            setActionLoadingMessage(`Saving module access for ${selectedRows.length} account${selectedRows.length === 1 ? '' : 's'}...`);
            try {
              const nextPageSelections = moduleSelections.includes('ia') ? iaPageSelections : [];
              await Promise.all(selectedRows.map(async (row) => {
                await saveCoordinatorAccountModuleAccessToSupabase(row.id, moduleSelections);
                await saveCoordinatorAccountIaPageAccessToSupabase(row.id, nextPageSelections);
              }));
              setModuleAccessMap((current) => {
                const next = { ...current };
                selectedRows.forEach((row) => {
                  next[row.id] = [...moduleSelections];
                });
                return next;
              });
              setIaPageAccessMap((current) => {
                const next = { ...current };
                selectedRows.forEach((row) => {
                  next[row.id] = [...nextPageSelections];
                });
                return next;
              });
              setNotice('Bulk module access saved.');
              setBulkModuleAccessOpen(false);
              clearSelection();
              setStatusAlert({ title: 'Bulk Module Access Saved', message: 'Module permissions updated for all selected accounts.', tone: 'success' });
              await refresh();
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
          onToggleIaPage={(key) => {
            setIaPageSelections((current) => (
              current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
            ));
          }}
        />
      ) : null}

      {bulkEditOpen && selectedRows.length > 0 ? (
        <TeachingNonTeachingBulkEditModal
          departments={departments}
          initialDepartmentId={selectedRows[0]?.departmentId || ''}
          initialPersonnelType={selectedRows[0]?.personnelType || 'teaching'}
          initialIsActive={selectedRows[0]?.isActive ?? true}
          isSubmitting={isSubmitting}
          selectedCount={selectedRows.length}
          onClose={() => setBulkEditOpen(false)}
          onSave={async (payload) => {
            setIsSubmitting(true);
            setActionLoadingMessage(`Updating ${selectedRows.length} account${selectedRows.length === 1 ? '' : 's'}...`);
            const summary = {
              updatedCount: 0,
              errors: [] as string[],
            };
            try {
              for (const row of selectedRows) {
                try {
                  await saveTeachingNonTeachingCredential(buildSavePayload(row, payload));
                  summary.updatedCount += 1;
                } catch (nextError: any) {
                  summary.errors.push(nextError?.message || `Unable to update ${row.name}.`);
                }
              }
              if (summary.errors.length > 0) {
                setStatusAlert({
                  title: 'Bulk Update Completed with Warnings',
                  message: summary.errors.slice(0, 3).join(' '),
                  tone: 'warning',
                });
              } else {
                setStatusAlert({
                  title: 'Bulk Update Complete',
                  message: `${summary.updatedCount} account${summary.updatedCount === 1 ? '' : 's'} updated successfully.`,
                  tone: 'success',
                });
              }
              setNotice(`Updated ${summary.updatedCount} account${summary.updatedCount === 1 ? '' : 's'}.`);
              setBulkEditOpen(false);
              clearSelection();
              await refresh();
            } catch (nextError: any) {
              summary.errors.push(nextError?.message || 'Unable to complete the bulk update.');
              setStatusAlert({
                title: 'Bulk Update Failed',
                message: nextError?.message || 'Unable to complete the bulk update.',
                tone: 'danger',
              });
            } finally {
              setActionLoadingMessage('');
              setIsSubmitting(false);
            }
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
