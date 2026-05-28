
import React, { useState, useMemo } from 'react';
import { Learner } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { normalizeRfidValue } from '../utils/rfid';

interface LearnerDirectoryProps {
  learners: Learner[];
  uidMappings: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUnlink: (id: string) => void;
  isLoading: boolean;
  isSearching: boolean;
  isSyncing: boolean;
  fetchedCount: number;
}

const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

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
  learners, uidMappings, selectedId, onSelect, onUnlink, isLoading, isSearching, isSyncing, fetchedCount
}) => {
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  const groupedData = useMemo(() => {
    if (isSearching) return {}; 

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
          secAcc[sec] = sections[sec].sort((a, b) => 
            (a.last_name || '').localeCompare(b.last_name || '')
          );
          return secAcc;
        }, {} as Record<string, Learner[]>);
      return acc;
    }, {} as Record<string, Record<string, Learner[]>>);
  }, [learners, isSearching, listSearchQuery]);

  const toggleGrade = (grade: string) => {
    const next = new Set(expandedGrades);
    if (next.has(grade)) next.delete(grade);
    else next.add(grade);
    setExpandedGrades(next);
  };

  const toggleSection = (sectionKey: string) => {
    const next = new Set(expandedSections);
    if (next.has(sectionKey)) next.delete(sectionKey);
    else next.add(sectionKey);
    setExpandedSections(next);
  };

  return (
    <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm min-h-[500px]">
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
              <div className="max-h-[700px] overflow-y-auto no-scrollbar">
                {learners.length === 0 ? (
                  <div className="p-20 text-center text-gray-300 font-semibold uppercase text-xs tracking-wider">
                    No matching records found
                  </div>
                ) : (
                  learners.map(learner => (
                    <LearnerItem 
                      key={learner.id}
                      learner={learner}
                      uidMappings={uidMappings}
                      isSelected={selectedId === learner.id}
                      onSelect={onSelect}
                      onUnlink={setUnlinkId}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            Object.keys(groupedData).length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-xs font-semibold uppercase tracking-wider">
                No records match this section list search
              </div>
            ) : (
            Object.entries(groupedData).map(([grade, sections]) => {
              const isUnassignedGroup = grade === 'NO GRADE ASSIGNED';
              const gradeStudentCount = Object.values(sections).flat().length;

              return (
                <div key={grade} className={`rounded-md overflow-hidden border border-gray-200 ${isUnassignedGroup ? 'bg-gray-50' : 'bg-white shadow-sm'}`}>
                  <button 
                    onClick={() => toggleGrade(grade)}
                    className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`material-symbols-outlined text-xl leading-none ${isUnassignedGroup ? 'text-gray-400' : 'text-primary-600'}`}>
                        {expandedGrades.has(grade) ? 'expand_more' : 'chevron_right'}
                      </span>
                      <h3 className="text-sm font-bold tracking-tight text-gray-900">
                        {grade}
                      </h3>
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                        {gradeStudentCount} {gradeStudentCount === 1 ? 'Record' : 'Records'}
                      </span>
                    </div>
                  </button>

                  {expandedGrades.has(grade) && (
                    <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                      {Object.entries(sections).map(([sectionName, sectionLearners]) => {
                        const sectionKey = `${grade}-${sectionName}`;
                        const isExpanded = expandedSections.has(sectionKey);
                        
                        return (
                          <div key={sectionKey} className="bg-gray-50/50 rounded-md border border-gray-200 overflow-hidden">
                            <button 
                              onClick={() => toggleSection(sectionKey)}
                              className="w-full flex items-center justify-between p-4 hover:bg-white transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Section:</span>
                                <span className="text-xs font-bold text-primary-700">{sectionName}</span>
                                <span className="text-[10px] text-gray-500 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">
                                  {sectionLearners.length}
                                </span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="divide-y divide-gray-100 border-t border-gray-200 bg-white">
                                {sectionLearners.map(learner => (
                                  <LearnerItem 
                                    key={learner.id}
                                    learner={learner}
                                    uidMappings={uidMappings}
                                    isSelected={selectedId === learner.id}
                                    onSelect={onSelect}
                                    onUnlink={setUnlinkId}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }))
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

