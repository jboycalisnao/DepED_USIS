import React, { useMemo, useState } from 'react';
import { Learner } from '../types';
import ConfirmationModal from './ConfirmationModal';
import UsisInlineLoader from './ui/UsisInlineLoader';
import LearnerRegistrationModal from './modals/LearnerRegistrationModal';
import { normalizeRfidValue } from '../utils/rfid';
import {
  UsisGradeSectionList,
  type UsisGradeSectionListGrade,
} from '../../common/components/ui/UsisGradeSectionList';
import { RegisterLearnerPayload } from '../hooks/useLearners';

interface LearnerDirectoryProps {
  learners: Learner[];
  rosterLearners: Learner[];
  activeRfid: string;
  uidMappings: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUnlink: (id: string) => void;
  onReaderValueChange: (value: string) => void;
  onLoadRoster: () => void;
  onRegisterLearner: (payload: RegisterLearnerPayload) => Promise<{ ok: boolean; error?: string }>;
  isLoading: boolean;
  isSearching: boolean;
  isSyncing: boolean;
  fetchedCount: number;
  hasCachedRoster: boolean;
  lastSyncedAt: string;
}

const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const genderRank = (gender: string | null | undefined) => {
  const normalized = String(gender || '').trim().toLowerCase();
  if (normalized === 'male') return 0;
  if (normalized === 'female') return 1;
  return 2;
};

const learnerGenderNameSort = (a: Learner, b: Learner) => {
  const rankDelta = genderRank(a.gender) - genderRank(b.gender);
  if (rankDelta !== 0) return rankDelta;
  const last = (a.last_name || '').localeCompare(b.last_name || '', undefined, { sensitivity: 'base' });
  if (last !== 0) return last;
  return (a.first_name || '').localeCompare(b.first_name || '', undefined, { sensitivity: 'base' });
};

const SectionLearnersTable: React.FC<{
  learners: Learner[];
  uidMappings: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUnlink: (id: string) => void;
  onRegister: (id: string) => void;
}> = ({ learners, uidMappings, selectedId, onSelect, onUnlink, onRegister }) => {
  const sortedLearners = [...learners].sort(learnerGenderNameSort);

  return (
    <div className="table-card border-0 rounded-md border-t border-gray-200">
      <table className="usis-table">
        <thead>
          <tr>
            <th>Learner</th>
            <th>LRN</th>
            <th>Gender</th>
            <th>RFID</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedLearners.map((learner) => {
            const localTag = uidMappings[learner.id];
            const dbTag = normalizeRfidValue(learner.rfid);
            const tag = localTag || dbTag;
            const isLocallyMapped = Boolean(localTag);
            const isSelected = selectedId === learner.id;

            return (
              <tr key={learner.id} className={isSelected ? 'bg-primary-50' : undefined}>
                <td>
                  <div className="grid gap-1">
                    <span className="font-semibold text-gray-900">
                      {learner.last_name}, {learner.first_name}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {learner.grade_level || 'NO GRADE ASSIGNED'} • {learner.section_name || 'Unassigned'}
                    </span>
                  </div>
                </td>
                <td>{learner.lrn || 'N/A'}</td>
                <td>
                  <span className="status-badge status-badge--open">
                    {String(learner.gender || 'Unspecified').trim() || 'Unspecified'}
                  </span>
                </td>
                <td>
                  {tag ? (
                    <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 text-[10px] font-bold ${isLocallyMapped ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                      <span className={`material-symbols-outlined text-[12px] leading-none ${isLocallyMapped ? 'text-primary-600' : 'text-gray-400'}`}>
                        {isLocallyMapped ? 'tag' : 'database'}
                      </span>
                      {tag}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-md border border-accent-100 bg-accent-50 px-3 py-1 text-[10px] font-bold text-accent-700">
                      <span className="material-symbols-outlined text-[12px] leading-none">link_off</span>
                      Unlinked
                    </span>
                  )}
                </td>
                <td>
                  <span className={`inline-flex rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${String(learner.status || 'Active').toLowerCase() === 'active' ? 'bg-[#e7f6ee] text-[#0f6b3c]' : 'bg-[#fff7e1] text-[#7a4d00]'}`}>
                    {learner.status || 'Active'}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    {isLocallyMapped ? (
                      <button
                        type="button"
                        onClick={() => onUnlink(learner.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#f4cfd6] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#b4233d] transition hover:bg-[#fff4f6]"
                      >
                        <span className="material-symbols-outlined text-[14px] leading-none">link_off</span>
                        Unlink
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onRegister(learner.id)}
                      className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
                        isSelected
                          ? 'border-[#0038a8] bg-[#0038a8] text-white'
                          : 'border-[#d6deeb] bg-white text-[#43526b] hover:border-[#0038a8] hover:text-[#0038a8]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px] leading-none">
                        add
                      </span>
                      Select
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const LearnerDirectory: React.FC<LearnerDirectoryProps> = ({
  learners,
  rosterLearners,
  activeRfid,
  uidMappings,
  selectedId,
  onSelect,
  onUnlink,
  onReaderValueChange,
  onLoadRoster,
  onRegisterLearner,
  isLoading,
  isSearching,
  isSyncing,
  fetchedCount,
  hasCachedRoster,
  lastSyncedAt,
}) => {
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [unlinkId, setUnlinkId] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const handleOpenRegister = (learnerId: string) => {
    onSelect(learnerId);
    setRegisterError(null);
    setIsRegisterOpen(true);
  };

  const handleUnlinkSelectedLearner = async (learnerId: string) => {
    setIsUnlinking(true);
    setRegisterError(null);
    try {
      onSelect(learnerId);
      await onUnlink(learnerId);
    } finally {
      setIsUnlinking(false);
    }
  };

  const groupedData = useMemo(() => {
    const localQuery = listSearchQuery.trim().toLowerCase();
    const groups: Record<string, Record<string, Learner[]>> = {};

    learners.forEach((learner) => {
      const grade = learner.grade_level || 'NO GRADE ASSIGNED';
      const section = learner.section_name || 'Unassigned';
      const fullName = `${learner.last_name || ''} ${learner.first_name || ''}`.toLowerCase();
      const lrn = (learner.lrn || '').toLowerCase();
      const sectionSearchArea = `${grade} ${section}`.toLowerCase();

      if (localQuery) {
        const matches = fullName.includes(localQuery) || lrn.includes(localQuery) || sectionSearchArea.includes(localQuery);
        if (!matches) return;
      }

      if (!groups[grade]) groups[grade] = {};
      if (!groups[grade][section]) groups[grade][section] = [];

      groups[grade][section].push(learner);
    });

    const sortedGrades = Object.keys(groups).sort((a, b) => {
      if (a === 'NO GRADE ASSIGNED') return 1;
      if (b === 'NO GRADE ASSIGNED') return -1;
      return naturalSort(a, b);
    });

    return sortedGrades.reduce((acc, grade) => {
      const sections = groups[grade];
      acc[grade] = Object.keys(sections)
        .sort(naturalSort)
        .reduce((secAcc, sec) => {
          secAcc[sec] = sections[sec];
          return secAcc;
        }, {} as Record<string, Learner[]>);
      return acc;
    }, {} as Record<string, Record<string, Learner[]>>);
  }, [learners, listSearchQuery]);

  const sharedGradeSectionListData = useMemo<UsisGradeSectionListGrade[]>(() => {
    return Object.entries(groupedData).map(([grade, sections]) => {
      const gradeStudentCount = Object.values(sections).flat().length;
      return {
        key: grade,
        label: grade,
        countLabel: `${gradeStudentCount} ${gradeStudentCount === 1 ? 'Record' : 'Records'}`,
        sections: Object.entries(sections).map(([sectionName, sectionLearners]) => ({
          key: sectionName,
          label: sectionName,
          count: sectionLearners.length,
          content: (
            <SectionLearnersTable
              learners={sectionLearners}
              uidMappings={uidMappings}
              selectedId={selectedId}
              onSelect={onSelect}
              onUnlink={setUnlinkId}
              onRegister={handleOpenRegister}
            />
          ),
        })),
      };
    });
  }, [groupedData, onSelect, selectedId, uidMappings]);

  return (
    <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm min-h-[500px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-gray-50">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cached Roster</p>
          <p className="text-[11px] font-semibold text-gray-600">
            {hasCachedRoster ? `Ready offline${lastSyncedAt ? ` • Synced ${new Date(lastSyncedAt).toLocaleString()}` : ''}` : 'No roster cached yet'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-primary-700 transition hover:bg-primary-100"
          >
            <span className="material-symbols-outlined text-[16px] leading-none">person_add</span>
            Register Learner
          </button>
          <button
            type="button"
            onClick={onLoadRoster}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-primary-700 transition hover:bg-primary-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px] leading-none">
              {hasCachedRoster ? 'refresh' : 'download'}
            </span>
            {isSyncing ? 'Loading...' : hasCachedRoster ? 'Refresh Learners' : 'Load Learners'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <UsisInlineLoader message="Loading learner registry..." />
      ) : (
        <div className="p-4 space-y-4">
          {!isSearching && (
            <div className="px-2">
              <label htmlFor="global-section-search" className="sr-only">
                Search shared global section list
              </label>
              <div className="floating-field">
                <div className="floating-field__control" data-has-value={listSearchQuery.trim().length > 0 ? 'true' : 'false'}>
                  <input
                    id="global-section-search"
                    type="text"
                    value={listSearchQuery}
                    onChange={(event) => setListSearchQuery(event.target.value)}
                    placeholder=" "
                    aria-label="Search shared global section list"
                    className="rounded-md"
                  />
                  <span>Search shared global section list</span>
                </div>
                <small>Grade, section, learner, LRN</small>
              </div>
            </div>
          )}
          {isSearching ? (
            <div className="space-y-1 animate-in fade-in duration-300">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-md">
                <h3 className="text-[11px] font-bold text-primary-700 uppercase tracking-wider">
                  {learners.length === 1 ? 'Search Result' : 'Search Results'}
                </h3>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  {learners.length} {learners.length === 1 ? 'Match' : 'Matches'}
                </span>
              </div>
              <UsisGradeSectionList
                className="attendance-grade-section-list"
                grades={sharedGradeSectionListData}
                expandAll
                emptyMessage="No matching records found"
              />
            </div>
          ) : (
            Object.keys(groupedData).length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-xs font-semibold uppercase tracking-wider">
                {hasCachedRoster
                  ? 'No records match this section list search'
                  : 'No cached roster loaded yet. Press Load Learners to fetch the registry.'}
              </div>
            ) : (
              <UsisGradeSectionList
                className="attendance-grade-section-list"
                grades={sharedGradeSectionListData}
                expandAll={listSearchQuery.trim().length > 0}
                emptyMessage="No records match this section list search"
              />
            )
          )}
        </div>
      )}

      {isSyncing && (
        <div className="p-3 bg-primary-600 text-white flex items-center justify-center gap-3">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-md animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse">
            Syncing Master Registry... ({fetchedCount})
          </p>
        </div>
      )}

      <LearnerRegistrationModal
        isOpen={isRegisterOpen}
        learners={rosterLearners}
        selectedLearnerId={selectedId}
        readerValue={activeRfid}
        isSubmitting={isRegistering}
        isUnlinking={isUnlinking}
        errorMessage={registerError}
        onClose={() => {
          if (isRegistering) return;
          if (isUnlinking) return;
          setRegisterError(null);
          setIsRegisterOpen(false);
        }}
        onSubmit={async (value) => {
          setIsRegistering(true);
          setRegisterError(null);
          const result = await onRegisterLearner(value);
          if (!result.ok) {
            setRegisterError(result.error || 'Failed to register learner.');
            setIsRegistering(false);
            return;
          }

          setIsRegistering(false);
          setIsRegisterOpen(false);
        }}
        onUnlinkLearner={handleUnlinkSelectedLearner}
        onReaderValueChange={onReaderValueChange}
      />

      <ConfirmationModal
        isOpen={!!unlinkId}
        onClose={() => setUnlinkId(null)}
        onConfirm={() => {
          if (unlinkId) {
            onUnlink(unlinkId);
            setUnlinkId(null);
          }
        }}
        title="Unlink RFID Tag"
        message="Are you sure you want to unlink the RFID tag from this student? They will need to be paired again to log attendance."
        confirmLabel="Unlink Tag"
      />
    </div>
  );
};

export default LearnerDirectory;
