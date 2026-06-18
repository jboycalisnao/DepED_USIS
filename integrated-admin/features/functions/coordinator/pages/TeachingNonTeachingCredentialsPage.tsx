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
import { TeachingNonTeachingCredentialPrintModal } from '../teaching-non-teaching/components/TeachingNonTeachingCredentialPrintModal';
import { TeachingNonTeachingModuleAccessModal } from '../teaching-non-teaching/components/TeachingNonTeachingModuleAccessModal';
import { TeachingNonTeachingSelectionToolbar } from '../teaching-non-teaching/components/TeachingNonTeachingSelectionToolbar';
import {
  deactivateTeachingNonTeachingCredential,
  deleteTeachingNonTeachingCredential,
  loadCoordinatorDepartments,
  loadTeachingNonTeachingCredentials,
  saveTeachingNonTeachingCredential,
  type CoordinatorDepartmentRecord,
  type TeachingNonTeachingCredentialRecord,
} from '../teaching-non-teaching/services/teachingNonTeachingCredentialsService';
import { TeachingNonTeachingCredentialList } from '../teaching-non-teaching/components/TeachingNonTeachingCredentialList';
import { openTeachingNonTeachingCredentialsPrintWindow } from '../teaching-non-teaching/utils/teachingNonTeachingCredentialPrint';
import type { TeachingNonTeachingBulkImportResult } from '../teaching-non-teaching/utils/teachingNonTeachingCredentialWorkbook';
import type { PersonnelType, SaveTeachingNonTeachingCredentialInput } from '../teaching-non-teaching/services/teachingNonTeachingCredentialsService';
import { useTeachingNonTeachingSelection } from '../teaching-non-teaching/hooks/useTeachingNonTeachingSelection';
import { loadCachedCoordinatorList, saveCachedCoordinatorList } from '../teaching-non-teaching/utils/teachingNonTeachingCoordinatorListCache';

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
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printScope, setPrintScope] = useState<'all' | 'department'>('all');
  const [printDepartmentId, setPrintDepartmentId] = useState('');
  const [isRefreshingCoordinatorList, setIsRefreshingCoordinatorList] = useState(false);
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
  const allowedIaPageKeys = useMemo(() => new Set(iaPageOptions.map((option) => option.key)), [iaPageOptions]);
  const normalizeIaPageSelections = (pageKeys: string[]) =>
    pageKeys.filter((pageKey) => allowedIaPageKeys.has(pageKey));
  const printDepartmentOptions = useMemo(() => {
    const options = departments
      .filter((department) => department.id || department.name)
      .map((department) => ({
        label: department.name,
        value: department.id,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base', numeric: true }));

    const hasUnassignedRows = rows.some((row) => !row.departmentId || row.departmentName === 'Not Set');
    if (hasUnassignedRows) {
      options.unshift({
        label: 'Not Set / Unassigned',
        value: '__unassigned__',
      });
    }

    return options;
  }, [departments, rows]);

  const resolvePrintableRows = () => {
    if (printScope === 'department') {
      return rows.filter((row) => {
        if (printDepartmentId === '__unassigned__') {
          return !row.departmentId || row.departmentName === 'Not Set';
        }
        return row.departmentId === printDepartmentId;
      });
    }
    return rows;
  };

  const openPrintModal = () => {
    setPrintScope('all');
    setPrintDepartmentId(printDepartmentOptions[0]?.value || '');
    setPrintModalOpen(true);
  };

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
      await saveCachedCoordinatorList(data);
      setDepartments(departmentRows);
      const accountIds = data.map((row) => row.id);
      const [accessMap, pageAccessMap, pageCatalog] = await Promise.all([
        loadCoordinatorModuleAccessMapFromSupabase(accountIds),
        loadCoordinatorIaPageAccessMapFromSupabase(accountIds),
        loadIaPageCatalogFromSupabase(),
      ]);
      setModuleAccessMap(accessMap);
      setIaPageOptions(pageCatalog);
      const pageKeySet = new Set(pageCatalog.map((option) => option.key));
      const sanitizedPageAccessMap = Object.fromEntries(
        Object.entries(pageAccessMap).map(([accountId, pageKeys]) => [
          accountId,
          pageKeys.filter((pageKey) => pageKeySet.has(pageKey)),
        ]),
      );
      setIaPageAccessMap(sanitizedPageAccessMap);
      setError('');
    } catch (nextError: any) {
      setError(nextError?.message || 'Unable to load teaching and non-teaching credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCoordinatorListOnly = async () => {
    if (!schoolCode) return;
    setIsRefreshingCoordinatorList(true);
    setActionLoadingMessage('Refreshing coordinator list...');
    try {
      const data = await loadTeachingNonTeachingCredentials(schoolCode);
      setRows(data);
      await saveCachedCoordinatorList(data);
      setNotice('Coordinator list refreshed.');
      setStatusAlert({
        title: 'Coordinator List Refreshed',
        message: 'Only the coordinator list was reloaded from Supabase and cached locally.',
        tone: 'success',
      });
    } catch (nextError: any) {
      setStatusAlert({
        title: 'Refresh Failed',
        message: nextError?.message || 'Unable to refresh coordinator list.',
        tone: 'danger',
      });
    } finally {
      setActionLoadingMessage('');
      setIsRefreshingCoordinatorList(false);
    }
  };

  useEffect(() => {
    void loadCachedCoordinatorList().then((cachedRows) => {
      if (cachedRows.length > 0) {
        setRows(cachedRows);
      }
    });
    void refresh();
  }, [schoolCode]);

  useEffect(() => {
    if (!moduleRecord) return;
    setModuleSelections(moduleAccessMap[moduleRecord.id] || getCoordinatorModuleAccessMap()[moduleRecord.id] || []);
    setIaPageSelections(normalizeIaPageSelections(iaPageAccessMap[moduleRecord.id] || getCoordinatorIaPageAccessMap()[moduleRecord.id] || []));
  }, [iaPageAccessMap, moduleAccessMap, moduleRecord, allowedIaPageKeys]);

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

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    setIsSubmitting(true);
    setActionLoadingMessage(`Deleting ${selectedRows.length} account${selectedRows.length === 1 ? '' : 's'}...`);
    const summary = {
      deletedCount: 0,
      errors: [] as string[],
    };
    try {
      for (const row of selectedRows) {
        try {
          await deleteTeachingNonTeachingCredential(row.id);
          summary.deletedCount += 1;
        } catch (nextError: any) {
          summary.errors.push(nextError?.message || `Unable to delete ${row.name}.`);
        }
      }
      if (summary.errors.length > 0) {
        setStatusAlert({
          title: 'Bulk Delete Completed with Warnings',
          message: summary.errors.slice(0, 3).join(' '),
          tone: 'warning',
        });
      } else {
        setStatusAlert({
          title: 'Bulk Delete Complete',
          message: `${summary.deletedCount} account${summary.deletedCount === 1 ? '' : 's'} deleted successfully.`,
          tone: 'success',
        });
      }
      setNotice(`Deleted ${summary.deletedCount} account${summary.deletedCount === 1 ? '' : 's'}.`);
      setBulkDeleteConfirmOpen(false);
      setBulkEditOpen(false);
      clearSelection();
      await refresh();
    } catch (nextError: any) {
      setStatusAlert({
        title: 'Bulk Delete Failed',
        message: nextError?.message || 'Unable to complete the bulk delete.',
        tone: 'danger',
      });
    } finally {
      setActionLoadingMessage('');
      setIsSubmitting(false);
    }
  };

  const handlePrintCredentials = () => {
    const printableRows = resolvePrintableRows();
    if (printScope === 'department' && !printDepartmentId) {
      setStatusAlert({
        title: 'Select Department',
        message: 'Choose a department before printing the selected department credentials.',
        tone: 'warning',
      });
      return;
    }
    if (printScope === 'department' && printableRows.length === 0) {
      setStatusAlert({
        title: 'No Records Found',
        message: 'No credentials were found for the selected department.',
        tone: 'warning',
      });
      return;
    }

    setActionLoadingMessage('Preparing print preview...');
    const ok = openTeachingNonTeachingCredentialsPrintWindow({
      departmentLabel: printDepartmentOptions.find((department) => department.value === printDepartmentId)?.label,
      rows: printableRows,
      scope: printScope,
    });
    setActionLoadingMessage('');
    if (!ok) {
      setStatusAlert({
        title: 'Popup Blocked',
        message: 'Allow popups for this site to print the credentials list.',
        tone: 'warning',
      });
      return;
    }
    setPrintModalOpen(false);
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
              <div className="registry-toolbar__actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={openPrintModal}
                  disabled={rows.length === 0}
                >
                  Print Credentials
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void refreshCoordinatorListOnly()}
                  disabled={isRefreshingCoordinatorList || isLoading}
                >
                  {isRefreshingCoordinatorList ? 'Refreshing...' : 'Refresh List'}
                </button>
                <button type="button" className="registry-action-button" onClick={() => setEditingRecord({} as TeachingNonTeachingCredentialRecord)}>
                  Create Account
                </button>
              </div>
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
              const chunkSize = 20;
              for (let index = 0; index < payloads.length; index += chunkSize) {
                const chunk = payloads.slice(index, index + chunkSize);
                setActionLoadingMessage(
                  `Importing ${Math.min(index + chunk.length, payloads.length)} of ${payloads.length} credential${payloads.length === 1 ? '' : 's'}...`,
                );
                const results = await Promise.allSettled(chunk.map(async (payload) => {
                  await saveTeachingNonTeachingCredential(payload);
                }));
                results.forEach((result) => {
                  if (result.status === 'fulfilled') {
                    summary.createdCount += 1;
                    return;
                  }
                  summary.skippedCount += 1;
                  summary.errors.push(result.reason?.message || 'Unable to import one credential row.');
                });
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
              const nextPageSelections = moduleSelections.includes('ia') ? normalizeIaPageSelections(iaPageSelections) : [];
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
              const nextPageSelections = moduleSelections.includes('ia') ? normalizeIaPageSelections(iaPageSelections) : [];
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

      <TeachingNonTeachingCredentialPrintModal
        departmentOptions={printDepartmentOptions}
        isOpen={printModalOpen}
        isPrinting={actionLoadingMessage === 'Preparing print preview...'}
        onClose={() => setPrintModalOpen(false)}
        onDepartmentChange={(value) => setPrintDepartmentId(value)}
        onPrint={handlePrintCredentials}
        onScopeChange={(value) => {
          setPrintScope(value);
          if (value === 'department' && !printDepartmentId) {
            setPrintDepartmentId(printDepartmentOptions[0]?.value || '');
          }
        }}
        printScope={printScope}
        selectedDepartmentId={printDepartmentId}
        totalCount={resolvePrintableRows().length}
      />

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
          onRequestDelete={() => {
            setBulkEditOpen(false);
            setBulkDeleteConfirmOpen(true);
          }}
        />
      ) : null}

      <UsisAlertModal
        open={bulkDeleteConfirmOpen}
        title="Delete Selected Accounts"
        message={`Delete ${selectedRows.length} selected account${selectedRows.length === 1 ? '' : 's'} from the coordinator registry? This will also remove linked department and module access records.`}
        tone="danger"
        confirmLabel={isSubmitting ? 'Deleting...' : 'Delete'}
        onConfirm={isSubmitting ? undefined : handleBulkDelete}
        onClose={() => setBulkDeleteConfirmOpen(false)}
      />

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
