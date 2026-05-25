import { useMemo, useState } from 'react';
import { RegistryDirectory } from '../../../../../coordinator/features/access/components/RegistryDirectory';
import { useCredentialRegistry } from '../../../../../coordinator/features/access/hooks/useCredentialRegistry';
import { getModuleAccessMap, setAccountModuleAccess, type UsisModuleKey } from '../../../../../coordinator/features/access/utils/moduleAccessRegistry';
import type { RegistryUserRecord } from '../../../../../coordinator/features/access/utils/credentialRegistry';
import { CoordinatorRegistryModals } from '../components/CoordinatorRegistryModals';

export function CoordinatorRegistryPage() {
  const {
    access,
    deleteCore,
    deleteElection,
    deleteSpPortal,
    error,
    isDeleting,
    isLoading,
    isUpdatingCore,
    isUpdatingElection,
    snapshot,
    updateCore,
    updateElection,
  } = useCredentialRegistry();

  const [selectedCoreRecord, setSelectedCoreRecord] = useState<RegistryUserRecord | null>(null);
  const [selectedElectionRecord, setSelectedElectionRecord] = useState<RegistryUserRecord | null>(null);
  const [selectedViewRecord, setSelectedViewRecord] = useState<RegistryUserRecord | null>(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<RegistryUserRecord | null>(null);
  const [selectedModuleRecord, setSelectedModuleRecord] = useState<RegistryUserRecord | null>(null);
  const [moduleAccessByRecordId, setModuleAccessByRecordId] = useState<Record<string, UsisModuleKey[]>>(() => getModuleAccessMap());
  const [pendingModules, setPendingModules] = useState<UsisModuleKey[]>([]);

  const unifiedRecords = useMemo(() => {
    const all = [
      ...(snapshot?.coreCoordinators || []),
      ...(snapshot?.attendanceCoordinators || []),
      ...(snapshot?.registrarCoordinators || []),
      ...(snapshot?.electionCoordinators || []),
      ...(snapshot?.spPortalCoordinators || []),
    ];
    return Array.from(new Map(all.map((record) => [record.id, record])).values());
  }, [snapshot]);

  const openModuleAccess = (record: RegistryUserRecord) => {
    setSelectedModuleRecord(record);
    setPendingModules(moduleAccessByRecordId[record.id] || []);
  };

  const togglePendingModule = (moduleKey: UsisModuleKey) => {
    setPendingModules((current) => (current.includes(moduleKey) ? current.filter((item) => item !== moduleKey) : [...current, moduleKey]));
  };

  const saveModuleAccess = () => {
    if (!selectedModuleRecord) return;
    const next = { ...moduleAccessByRecordId, [selectedModuleRecord.id]: pendingModules };
    setAccountModuleAccess(selectedModuleRecord.id, pendingModules);
    setModuleAccessByRecordId(next);
    setSelectedModuleRecord(null);
    setPendingModules([]);
  };

  const handleEditRecord = (record: RegistryUserRecord) => {
    if (record.role === 'sp_portal_coordinator') return setSelectedViewRecord(record);
    if (record.electionId) return setSelectedElectionRecord(record);
    return setSelectedCoreRecord(record);
  };

  const handleDeleteRecord = async () => {
    if (!pendingDeleteRecord) return;
    try {
      if (pendingDeleteRecord.role === 'sp_portal_coordinator') await deleteSpPortal(pendingDeleteRecord.id);
      else if (pendingDeleteRecord.electionId) await deleteElection(pendingDeleteRecord.id);
      else await deleteCore(pendingDeleteRecord.id);
      setPendingDeleteRecord(null);
    } catch {}
  };

  return (
    <div className="admin-panel registry-page--unified">
      {error ? <p className="login-card__error registry-feedback">{error}</p> : null}
      <div className="registry-layout">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <p className="section-card__eyebrow">Coordinator Registry</p>
            <h3 className="mt-2">All Coordinator Accounts</h3>
            {isLoading ? (
              <div className="registry-list"><p>Loading registry.</p></div>
            ) : (
              <RegistryDirectory
                emptyMessage="No coordinator accounts found."
                moduleAccessByRecordId={moduleAccessByRecordId}
                onDelete={(record) => setPendingDeleteRecord(record)}
                onEdit={handleEditRecord}
                onManageModules={openModuleAccess}
                onView={(record) => setSelectedViewRecord(record)}
                records={unifiedRecords}
                tertiaryValue={(record) => (record.electionId ? record.scope : record.email)}
              />
            )}
          </div>
        </article>
      </div>

      <CoordinatorRegistryModals
        access={access}
        isDeleting={isDeleting}
        isUpdatingCore={isUpdatingCore}
        isUpdatingElection={isUpdatingElection}
        moduleAccessByRecordId={moduleAccessByRecordId}
        onCancelCore={() => setSelectedCoreRecord(null)}
        onCancelDelete={() => setPendingDeleteRecord(null)}
        onCancelElection={() => setSelectedElectionRecord(null)}
        onCancelModules={() => setSelectedModuleRecord(null)}
        onCancelView={() => setSelectedViewRecord(null)}
        onConfirmDelete={() => void handleDeleteRecord()}
        onSaveCore={async (payload) => {
          try {
            await updateCore(payload);
            setSelectedCoreRecord(null);
          } catch {}
        }}
        onSaveElection={async (payload) => {
          try {
            await updateElection(payload);
            setSelectedElectionRecord(null);
          } catch {}
        }}
        onSaveModules={saveModuleAccess}
        pendingDeleteRecord={pendingDeleteRecord}
        pendingModules={pendingModules}
        selectedCoreRecord={selectedCoreRecord}
        selectedElectionRecord={selectedElectionRecord}
        selectedModuleRecord={selectedModuleRecord}
        selectedViewRecord={selectedViewRecord}
        snapshot={snapshot}
        togglePendingModule={togglePendingModule}
      />
    </div>
  );
}
