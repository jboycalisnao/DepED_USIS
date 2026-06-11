import { useEffect, useMemo, useState } from 'react';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../../common/components/ui/UsisGradeSectionList';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { GrantLearnerAccessModal } from './components/GrantLearnerAccessModal';
import { GradeRepresentativeModal } from './components/GradeRepresentativeModal';
import { SectionCredentialContent } from './components/SectionCredentialContent';
import { CLASS_OFFICER_POSITIONS, LEARNER_OPERATION_OPTIONS } from './constants';
import {
  deleteGradeLevelRepresentativeAccess,
  getStoredLearnerCredentialsSchoolYearId,
  grantGradeLevelMerchControlAccess,
  grantLearnerOperationAccess,
  loadGradeLevelRepresentatives,
  loadGrantedLearnerAccessBySections,
  loadLearnerDirectoryBySchoolYear,
  loadRegistrarSchoolYears,
  loadSectionsDirectoryBySchoolYear,
  setStoredLearnerCredentialsSchoolYearId,
  updateLearnerOperationAccess,
  type GrantedLearnerAccessRecord,
  type LearnerSearchRecord,
  type RegistrarSchoolYearRecord,
  type SectionDirectoryRecord,
} from './services/learnerBasedCredentialService';

const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const OPERATION_LABEL_BY_KEY: Record<string, string> = {
  class_section_merch_control: 'Merch Control',
};

const normalizeSearchText = (value: string) => String(value || '').trim().toLowerCase();

const searchLearnersInSection = (learners: LearnerSearchRecord[], sectionId: string, query: string) => {
  const normalizedSectionId = String(sectionId || '').trim();
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedSectionId || normalizedQuery.length < 2) return [];

  return learners
    .filter((learner) => String(learner.sectionId || '').trim() === normalizedSectionId)
    .filter((learner) => {
      const fullName = normalizeSearchText(learner.fullName);
      const lrn = normalizeSearchText(learner.lrn);
      return fullName.includes(normalizedQuery) || lrn.includes(normalizedQuery);
    })
    .slice(0, 20);
};

const searchLearnersByGradeLevelLocal = (
  learners: LearnerSearchRecord[],
  sections: SectionDirectoryRecord[],
  gradeLevel: string,
  query: string,
) => {
  const normalizedGradeLevel = String(gradeLevel || '').trim();
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedGradeLevel || normalizedQuery.length < 2) return [];

  const sectionIds = new Set(
    sections
      .filter((section) => String(section.gradeLevel || '').trim() === normalizedGradeLevel)
      .map((section) => String(section.sectionId || '').trim())
      .filter(Boolean),
  );

  if (sectionIds.size === 0) return [];

  return learners
    .filter((learner) => sectionIds.has(String(learner.sectionId || '').trim()))
    .filter((learner) => {
      const fullName = normalizeSearchText(learner.fullName);
      const lrn = normalizeSearchText(learner.lrn);
      return fullName.includes(normalizedQuery) || lrn.includes(normalizedQuery);
    })
    .slice(0, 20);
};

export function LearnerBasedCredentialsPage() {
  const [schoolYears, setSchoolYears] = useState<RegistrarSchoolYearRecord[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('');
  const [sections, setSections] = useState<SectionDirectoryRecord[]>([]);
  const [learnerDirectory, setLearnerDirectory] = useState<LearnerSearchRecord[]>([]);
  const [resultsBySection, setResultsBySection] = useState<Record<string, LearnerSearchRecord[]>>({});
  const [selectedLearnerBySection, setSelectedLearnerBySection] = useState<Record<string, string>>({});
  const [grantedBySection, setGrantedBySection] = useState<Record<string, GrantedLearnerAccessRecord[]>>({});
  const [gradeRepresentatives, setGradeRepresentatives] = useState<GrantedLearnerAccessRecord[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isRefreshingLearners, setIsRefreshingLearners] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState('');

  const [selectedLearner, setSelectedLearner] = useState<LearnerSearchRecord | null>(null);
  const [editingCredential, setEditingCredential] = useState<GrantedLearnerAccessRecord | null>(null);
  const [positionValue, setPositionValue] = useState('');
  const [operationValue, setOperationValue] = useState(LEARNER_OPERATION_OPTIONS[0]?.value || '');
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);
  const [confirmGrantOpen, setConfirmGrantOpen] = useState(false);

  const [gradeRepModalOpen, setGradeRepModalOpen] = useState(false);
  const [gradeRepResults, setGradeRepResults] = useState<LearnerSearchRecord[]>([]);
  const [isSearchingGradeReps, setIsSearchingGradeReps] = useState(false);
  const [isSubmittingGradeRep, setIsSubmittingGradeRep] = useState(false);

  const [alert, setAlert] = useState<{ message: string; title: string; tone: 'success' | 'danger' | 'warning' } | null>(null);

  const schoolYearOptions = useMemo(
    () => schoolYears.map((schoolYear) => ({ label: schoolYear.label, value: schoolYear.id })),
    [schoolYears],
  );

  const refreshGrantedAccess = async (rows: SectionDirectoryRecord[], directory: LearnerSearchRecord[]) => {
    const sectionIds = rows.map((row) => row.sectionId);
    const [granted, reps] = await Promise.all([
      loadGrantedLearnerAccessBySections(sectionIds, directory),
      loadGradeLevelRepresentatives(directory),
    ]);
    const groupedMap: Record<string, GrantedLearnerAccessRecord[]> = {};
    granted.forEach((row) => {
      if (!groupedMap[row.sectionId]) groupedMap[row.sectionId] = [];
      groupedMap[row.sectionId].push(row);
    });
    setGrantedBySection(groupedMap);
    setGradeRepresentatives(reps);
  };

  const loadSchoolYearContext = async (schoolYearId: string, forceRefreshLearners = false) => {
    const normalizedSchoolYearId = String(schoolYearId || '').trim();
    if (!normalizedSchoolYearId) return;

    setIsRefreshingLearners(forceRefreshLearners);
    try {
      const [sectionRows, learnerRows] = await Promise.all([
        loadSectionsDirectoryBySchoolYear(normalizedSchoolYearId),
        loadLearnerDirectoryBySchoolYear({
          forceRefresh: forceRefreshLearners,
          schoolYearId: normalizedSchoolYearId,
        }),
      ]);

      setSections(sectionRows);
      setLearnerDirectory(learnerRows);
      setResultsBySection({});
      setSelectedLearnerBySection({});
      setSelectedLearner(null);
      setEditingCredential(null);
      setGradeRepResults([]);

      await refreshGrantedAccess(sectionRows, learnerRows);
      setStoredLearnerCredentialsSchoolYearId(normalizedSchoolYearId);
    } catch (nextError: any) {
      setAlert({
        message: nextError?.message || 'Unable to load learner directory.',
        title: 'Load Failed',
        tone: 'danger',
      });
    } finally {
      setIsRefreshingLearners(false);
    }
  };

  const handleSchoolYearChange = async (schoolYearId: string) => {
    const normalizedSchoolYearId = String(schoolYearId || '').trim();
    if (!normalizedSchoolYearId || normalizedSchoolYearId === selectedSchoolYearId) return;
    setSelectedSchoolYearId(normalizedSchoolYearId);
    setStoredLearnerCredentialsSchoolYearId(normalizedSchoolYearId);
    await loadSchoolYearContext(normalizedSchoolYearId);
  };

  const handleRefreshLearners = async () => {
    if (!selectedSchoolYearId) return;
    await loadSchoolYearContext(selectedSchoolYearId, true);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoadingPage(true);
      try {
        const rows = await loadRegistrarSchoolYears();
        if (cancelled) return;
        setSchoolYears(rows);

        const storedSchoolYearId = getStoredLearnerCredentialsSchoolYearId();
        const defaultSchoolYearId =
          rows.find((schoolYear) => schoolYear.id === storedSchoolYearId)?.id ||
          rows.find((schoolYear) => schoolYear.isActive)?.id ||
          rows[0]?.id ||
          '';

        if (!defaultSchoolYearId) {
          setAlert({
            message: 'No registrar school years are available.',
            title: 'Load Failed',
            tone: 'warning',
          });
          return;
        }

        setSelectedSchoolYearId(defaultSchoolYearId);
        setStoredLearnerCredentialsSchoolYearId(defaultSchoolYearId);
        await loadSchoolYearContext(defaultSchoolYearId);
      } catch (nextError: any) {
        if (!cancelled) {
          setAlert({
            message: nextError?.message || 'Unable to load school years.',
            title: 'Load Failed',
            tone: 'danger',
          });
        }
      } finally {
        if (!cancelled) setIsLoadingPage(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo<UsisGradeSectionListGrade[]>(() => {
    const normalizedDirectoryQuery = directoryQuery.trim().toLowerCase();
    const map = new Map<string, SectionDirectoryRecord[]>();
    sections.forEach((row) => {
      const key = row.gradeLevel || 'Unassigned';
      const current = map.get(key) || [];
      current.push(row);
      map.set(key, current);
    });

    return GRADE_LEVELS.map((gradeLevel) => {
      const entries = map.get(gradeLevel) || [];
      const filteredEntries = entries.filter((section) => {
        if (!normalizedDirectoryQuery) return true;
        if (section.sectionName.toLowerCase().includes(normalizedDirectoryQuery)) return true;
        const grantedRows = grantedBySection[section.sectionId] || [];
        return grantedRows.some((row) =>
          row.fullName.toLowerCase().includes(normalizedDirectoryQuery) ||
          row.learnerLrn.toLowerCase().includes(normalizedDirectoryQuery) ||
          row.positionTitle.toLowerCase().includes(normalizedDirectoryQuery) ||
          row.operationKey.toLowerCase().includes(normalizedDirectoryQuery),
        );
      });

      const sectionsForGrade =
        filteredEntries.length > 0
          ? filteredEntries.map((section) => {
              const grantedRows = grantedBySection[section.sectionId] || [];
              return {
                content: (
                  <SectionCredentialContent
                    operationLabelByKey={OPERATION_LABEL_BY_KEY}
                    section={section}
                    grantedRows={grantedRows}
                    isLoadingSection={isRefreshingLearners}
                    searchResults={resultsBySection[section.sectionId] || []}
                    selectedLearnerId={selectedLearnerBySection[section.sectionId] || ''}
                    onSelectLearner={(value) => {
                      setSelectedLearnerBySection((current) => ({ ...current, [section.sectionId]: value }));
                      const selected = (resultsBySection[section.sectionId] || []).find((row) => row.learnerId === value);
                      if (!selected) return;
                      setEditingCredential(null);
                      setSelectedLearner(selected);
                      setPositionValue(CLASS_OFFICER_POSITIONS[0] || '');
                      setOperationValue(LEARNER_OPERATION_OPTIONS[0]?.value || '');
                    }}
                    onSearchQueryChange={async (nextQuery) => {
                      setResultsBySection((current) => ({
                        ...current,
                        [section.sectionId]: searchLearnersInSection(learnerDirectory, section.sectionId, nextQuery),
                      }));
                    }}
                    onEdit={(row) => {
                      setEditingCredential(row);
                      setSelectedLearner({
                        fullName: row.fullName,
                        learnerId: row.learnerId,
                        lrn: row.learnerLrn,
                        sectionId: row.sectionId,
                      });
                      setPositionValue(row.positionTitle);
                      setOperationValue(row.operationKey);
                    }}
                  />
                ),
                count: 0,
                key: section.sectionId,
                label: (
                  <span className="ia-learner-credentials__section-label">
                    <span>{section.sectionName}</span>
                    {grantedRows.length > 0 ? (
                      <span className="ia-learner-credentials__granted-indicator">Has Granted Access - {grantedRows.length}</span>
                    ) : null}
                  </span>
                ),
              };
            })
          : [{
              content: <p className="registry-copy">{normalizedDirectoryQuery ? 'No matching sections for this grade level.' : 'No active sections for this grade level.'}</p>,
              count: 0,
              key: `${gradeLevel}-${normalizedDirectoryQuery ? 'filtered-empty' : 'empty'}`,
              label: normalizedDirectoryQuery ? 'No matching sections' : 'No active sections',
            }];

      return {
        countLabel: `${filteredEntries.length} Active Sections`,
        key: gradeLevel,
        label: gradeLevel,
        sections: sectionsForGrade,
      };
    }).filter((grade) => !normalizedDirectoryQuery || grade.countLabel !== '0 Active Sections');
  }, [directoryQuery, grantedBySection, isRefreshingLearners, learnerDirectory, resultsBySection, sections, selectedLearnerBySection]);

  if (isLoadingPage) {
    return <UsisPageLoader message="Loading learner-based credentials..." />;
  }

  return (
    <section className="section-shell integrated-admin-function">
      <div className="integrated-admin-function__header">
        <h2>Learner-based Credentials</h2>
      </div>
      <article className="ia-learner-credentials__panel">
        <div className="ia-learner-credentials__toolbar">
          <UsisSearchableSelect
            ariaLabel="School Year"
            className="ia-learner-credentials__school-year-select"
            floatingLabel
            forcePortalMenu
            label="School Year"
            onChange={(value) => {
              void handleSchoolYearChange(value);
            }}
            options={schoolYearOptions}
            required
            value={selectedSchoolYearId}
          />
          <label className="floating-field ia-learner-credentials__directory-search">
            <div className="floating-field__control">
              <input
                id="ia-learner-credentials-directory-search"
                type="search"
                value={directoryQuery}
                onChange={(event) => setDirectoryQuery(event.target.value)}
                placeholder=" "
                data-has-value={directoryQuery.trim().length > 0 ? 'true' : 'false'}
                aria-label="Search granted learners or sections"
              />
              <span>Search granted learners or sections</span>
            </div>
          </label>
          <div className="ia-learner-credentials__toolbar-actions">
            <button
              type="button"
              className="secondary-button ia-learner-credentials__refresh-button"
              onClick={() => void handleRefreshLearners()}
              disabled={!selectedSchoolYearId || isRefreshingLearners}
            >
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              {isRefreshingLearners ? 'Refreshing Learners...' : 'Refresh Learners'}
            </button>
            <button
              type="button"
              className="registry-action-button ia-learner-credentials__grade-rep-button"
              onClick={() => setGradeRepModalOpen(true)}
            >
              Grade Representatives
            </button>
          </div>
        </div>

        <UsisGradeSectionList
          className="ia-learner-credentials"
          emptyMessage={directoryQuery.trim() ? 'No matching learners or sections found.' : 'No active sections available.'}
          grades={grouped}
        />
      </article>

      <GradeRepresentativeModal
        gradeLevels={GRADE_LEVELS}
        isOpen={gradeRepModalOpen}
        isSearching={isSearchingGradeReps}
        isSubmitting={isSubmittingGradeRep}
        searchResults={gradeRepResults}
        representatives={gradeRepresentatives}
        onClose={() => setGradeRepModalOpen(false)}
        onSearchLearners={async ({ gradeLevel, query }) => {
          setIsSearchingGradeReps(true);
          try {
            setGradeRepResults(searchLearnersByGradeLevelLocal(learnerDirectory, sections, gradeLevel, query));
          } catch (nextError: any) {
            setAlert({ title: 'Search Failed', message: nextError?.message || 'Unable to search grade-level learners.', tone: 'danger' });
          } finally {
            setIsSearchingGradeReps(false);
          }
        }}
        onAssign={async ({ gradeLevel, learner, positionTitle }) => {
          setIsSubmittingGradeRep(true);
          try {
            await grantGradeLevelMerchControlAccess({
              gradeLevel,
              learnerId: learner.learnerId,
              learnerLrn: learner.lrn,
              positionTitle,
            });
            setAlert({ title: 'Success', message: `${learner.fullName} now has Merch Control access for ${gradeLevel}.`, tone: 'success' });
            await refreshGrantedAccess(sections, learnerDirectory);
            setGradeRepModalOpen(false);
          } catch (nextError: any) {
            setAlert({ title: 'Assignment Failed', message: nextError?.message || 'Unable to assign grade-level representative.', tone: 'danger' });
          } finally {
            setIsSubmittingGradeRep(false);
          }
        }}
        onDeleteRepresentative={async ({ credentialId }) => {
          setIsSubmittingGradeRep(true);
          try {
            await deleteGradeLevelRepresentativeAccess({ credentialId });
            setAlert({ title: 'Success', message: 'Grade-level representative removed successfully.', tone: 'success' });
            await refreshGrantedAccess(sections, learnerDirectory);
          } catch (nextError: any) {
            setAlert({ title: 'Delete Failed', message: nextError?.message || 'Unable to delete representative.', tone: 'danger' });
          } finally {
            setIsSubmittingGradeRep(false);
          }
        }}
      />

      <GrantLearnerAccessModal
        isEditing={Boolean(editingCredential)}
        isSubmitting={isSubmittingGrant}
        learner={selectedLearner}
        onClose={() => {
          setSelectedLearner(null);
          setEditingCredential(null);
        }}
        onOperationChange={setOperationValue}
        onPositionChange={setPositionValue}
        onSubmit={async () => {
          if (!selectedLearner) {
            setAlert({ title: 'Validation', message: 'Select a learner first.', tone: 'warning' });
            return;
          }
          if (!positionValue.trim()) {
            setAlert({ title: 'Validation', message: 'Select a class position before granting access.', tone: 'warning' });
            return;
          }
          if (!operationValue.trim()) {
            setAlert({ title: 'Validation', message: 'Select a module operation before granting access.', tone: 'warning' });
            return;
          }
          setConfirmGrantOpen(true);
        }}
        operationValue={operationValue}
        positionValue={positionValue}
      />

      <UsisAlertModal
        open={confirmGrantOpen}
        title={editingCredential ? 'Confirm Update Access' : 'Confirm Grant Access'}
        message={editingCredential ? 'Save updates to this learner access record?' : 'Grant this learner access to the selected operation?'}
        tone="warning"
        confirmLabel={isSubmittingGrant ? (editingCredential ? 'Saving...' : 'Granting...') : (editingCredential ? 'Save Changes' : 'Grant Access')}
        cancelLabel="Cancel"
        onClose={() => {
          if (!isSubmittingGrant) setConfirmGrantOpen(false);
        }}
        onConfirm={async () => {
          if (!selectedLearner || isSubmittingGrant) return;
          setIsSubmittingGrant(true);
          try {
            setConfirmGrantOpen(false);
            if (editingCredential) {
              await updateLearnerOperationAccess({
                credentialId: editingCredential.credentialId,
                operationKey: operationValue,
                positionTitle: positionValue,
              });
              setAlert({ title: 'Success', message: 'Learner-based credential access updated successfully.', tone: 'success' });
            } else {
              await grantLearnerOperationAccess({
                learnerId: selectedLearner.learnerId,
                learnerLrn: selectedLearner.lrn,
                operationKey: operationValue,
                positionTitle: positionValue,
                sectionId: selectedLearner.sectionId,
              });
              setAlert({ title: 'Success', message: 'Learner-based credential access granted successfully.', tone: 'success' });
            }
            await refreshGrantedAccess(sections, learnerDirectory);
            setSelectedLearner(null);
            setEditingCredential(null);
          } catch (nextError: any) {
            setAlert({
              title: editingCredential ? 'Update Failed' : 'Grant Failed',
              message: nextError?.message || 'Unable to save learner access.',
              tone: 'danger',
            });
          } finally {
            setIsSubmittingGrant(false);
          }
        }}
      />

      <UsisAlertModal
        open={Boolean(alert)}
        title={alert?.title || 'Notice'}
        message={alert?.message || ''}
        tone={alert?.tone || 'info'}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
