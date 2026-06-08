
import React, { useState, useMemo } from 'react';
import { Learner } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { normalizeRfidValue } from '../utils/rfid';
import {
  UsisGradeSectionList,
  type UsisGradeSectionListGrade,
} from '../../common/components/ui/UsisGradeSectionList';

interface LearnerDirectoryProps {
  learners: Learner[];
  uidMappings: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUnlink: (id: string) => void;
  onLoadRoster: () => void;
  isLoading: boolean;
  isSearching: boolean;
  isSyncing: boolean;
  fetchedCount: number;
  hasCachedRoster: boolean;
  lastSyncedAt: string;
}

const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

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

const isMale = (learner: Learner) => genderRank(learner.gender) === 0;
const isFemale = (learner: Learner) => genderRank(learner.gender) === 1;

const LearnerItem: React.FC<{
  learner: Learner;
  uidMappings: Record<string, string>;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onUnlink: (id: string) => void;
}> = ({ learner, uidMappings, isSelected, onSelect, onUnlink }) => {
  const localTag = uidMappings[learner.id];
  const dbTag = normalizeRfidValue(learner.rfid);
  const tag = localTag || dbTag;
  const isLocallyMapped = !!localTag;
  
  return (
    <div 
      className={`flex items-center justify-between p-4 pl-8 transition-colors border-b border-gray-100 last:border-none ${isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
    >
      <div className="flex-grow min-w-0 pr-4">
        <div className="text-sm font-semibold text-gray-900 truncate">
          {learner.last_name}, {learner.first_name}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
            LRN: {learner.lrn || 'N/A'}
          </div>
          <div className="text-[10px] font-medium text-primary-600/60 uppercase tracking-wider truncate">
            {learner.grade_level} • {learner.section_name}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="hidden sm:block">
          {tag ? (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-md border ${isLocallyMapped ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-200'}`}>
              <span className={`material-symbols-outlined text-[12px] leading-none ${isLocallyMapped ? 'text-primary-600' : 'text-gray-400'}`}>
                {isLocallyMapped ? 'tag' : 'database'}
              </span>
              <span className={`text-[10px] font-mono font-bold ${isLocallyMapped ? 'text-primary-700' : 'text-gray-600'}`}>{tag}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-accent-50 border border-accent-100 rounded-md">
              <span className="material-symbols-outlined text-[12px] text-accent-600 leading-none">link_off</span>
              <span className="text-[10px] font-bold text-accent-700 uppercase tracking-wider">Unlinked</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isLocallyMapped && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUnlink(learner.id);
              }}
              className="p-2 text-gray-400 hover:text-accent-600 hover:bg-accent-50 rounded-md transition-all"
              title="Unlink RFID Tag"
            >
              <span className="material-symbols-outlined text-xl leading-none">link_off</span>
            </button>
          )}
          
          <button 
            type="button"
            onClick={() => onSelect(isSelected ? null : learner.id)} 
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all active:scale-90 border-2 ${
              isSelected 
              ? 'bg-primary-600 text-white border-primary-600 shadow-md' 
              : 'bg-white border-gray-200 text-gray-300 hover:border-primary-600 hover:text-primary-600'
            }`}
            title={isSelected ? "Deselect student" : "Select student"}
          >
            <span className="material-symbols-outlined text-lg leading-none">
              {isSelected ? 'check' : 'add'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const LearnerDirectory: React.FC<LearnerDirectoryProps> = ({
  learners, uidMappings, selectedId, onSelect, onUnlink, onLoadRoster, isLoading, isSearching, isSyncing, fetchedCount, hasCachedRoster, lastSyncedAt
}) => {
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  const groupedData = useMemo(() => {
    const localQuery = listSearchQuery.trim().toLowerCase();
    const groups: Record<string, Record<string, Learner[]>> = {};

    learners.forEach(learner => {
      const grade = learner.grade_level || 'NO GRADE ASSIGNED';
      const section = learner.section_name || 'Unassigned';
      const fullName = `${learner.last_name || ''} ${learner.first_name || ''}`.toLowerCase();
      const lrn = (learner.lrn || '').toLowerCase();
      const sectionSearchArea = `${grade} ${section}`.toLowerCase();

      if (localQuery) {
        const matches =
          fullName.includes(localQuery) ||
          lrn.includes(localQuery) ||
          sectionSearchArea.includes(localQuery);
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
          secAcc[sec] = sections[sec].sort(learnerGenderNameSort);
          return secAcc;
        }, {} as Record<string, Learner[]>);
      return acc;
    }, {} as Record<string, Record<string, Learner[]>>);
  }, [learners, isSearching, listSearchQuery]);

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
            <div className="border-t border-gray-200 bg-white">
              <div className="px-4 py-2 bg-primary-50 border-b border-primary-100">
                <p className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">
                  Male
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {sectionLearners.filter(isMale).map((learner) => (
                  <LearnerItem
                    key={learner.id}
                    learner={learner}
                    uidMappings={uidMappings}
                    isSelected={selectedId === learner.id}
                    onSelect={onSelect}
                    onUnlink={setUnlinkId}
                  />
                ))}
                {sectionLearners.filter(isMale).length === 0 ? (
                  <p className="px-8 py-3 text-[11px] text-gray-400">No male learners</p>
                ) : null}
              </div>

              <div className="px-4 py-2 bg-accent-50 border-y border-accent-100">
                <p className="text-[10px] font-bold text-accent-700 uppercase tracking-wider">
                  Female
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {sectionLearners.filter(isFemale).map((learner) => (
                  <LearnerItem
                    key={learner.id}
                    learner={learner}
                    uidMappings={uidMappings}
                    isSelected={selectedId === learner.id}
                    onSelect={onSelect}
                    onUnlink={setUnlinkId}
                  />
                ))}
                {sectionLearners.filter(isFemale).length === 0 ? (
                  <p className="px-8 py-3 text-[11px] text-gray-400">No female learners</p>
                ) : null}
              </div>
            </div>
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
      {isLoading ? (
          <div className="p-40 text-center flex flex-col items-center gap-6">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-primary-600 rounded-md animate-spin" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Querying Registry...</p>
          </div>
      ) : (
        <div className="p-4 space-y-4">
          {!isSearching && (
            <div className="px-2">
              <label htmlFor="global-section-search" className="sr-only">
                Search shared global section list
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] leading-none">
                  search
                </span>
                <input
                  id="global-section-search"
                  type="text"
                  value={listSearchQuery}
                  onChange={(event) => setListSearchQuery(event.target.value)}
                  placeholder="Search shared global section list (grade, section, learner, LRN)"
                  className="w-full rounded-md border border-gray-200 bg-white py-3 pl-11 pr-4 text-[13px] text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
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

