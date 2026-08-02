import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { getActiveLearnersForYear } from '../../services/dashboardService';
import { UsisSearchInput } from '../../../common/components/ui/UsisSearchInput';
import { UsisSearchableSelect } from '../../../common/components/ui/UsisSearchableSelect';
import { matchesUsisLearnerSearch } from '../../../common/utils/usisLearnerSearch';
import { normalizeLearnerTags } from '../../utils/learnerTags';
import { GradeLevel, ReusableTag, Section, Student } from '../../types';
import ConfirmationModal from '../../components/ConfirmationModal';
import LearnerTagSelectionModal from './LearnerTagSelectionModal';
import ReusableTagModal from './ReusableTagModal';

const buildLearnerLabel = (learner: Student) =>
  `${learner.lastName}, ${learner.firstName}${learner.middleName ? ` ${learner.middleName}` : ''}`
    .replace(/\s+/g, ' ')
    .trim();

const resolveSectionLabel = (learner: Student, sections: Section[]) => {
  const sectionId = String(learner.sectionId || '').trim();
  const section = sections.find((entry) => String(entry.id || '').trim() === sectionId);
  if (!section) return 'Unassigned';
  return `${section.name}${section.strand ? ` [${section.strand}]` : ''}`;
};

const resolveGradeLabel = (learner: Student, sections: Section[]) => {
  const sectionId = String(learner.sectionId || '').trim();
  const section = sections.find((entry) => String(entry.id || '').trim() === sectionId);
  return section?.gradeLevel || 'Unassigned';
};

const normalizeKey = (value: string[]) => [...value].sort((a, b) => a.localeCompare(b)).join('|');
const tagRequiresPosition = (tag: ReusableTag) => ['club', 'organization'].includes(String(tag.category || '').trim().toLowerCase());
const buildPositionedTagLabel = (tagLabel: string, position: string) => `${tagLabel} - ${position}`.trim();

const TaggingPage: React.FC = () => {
  const { learners, sections, activeSchoolYear, updateLearner, loading, reusableTags, addReusableTag, updateReusableTag } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedLearners, setExpandedLearners] = useState<Set<string>>(new Set());
  const [selectedReusableTagIds, setSelectedReusableTagIds] = useState<Record<string, string[]>>({});
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [fourPsOnly, setFourPsOnly] = useState(false);
  const [isReusableTagModalOpen, setIsReusableTagModalOpen] = useState(false);
  const [editingReusableTag, setEditingReusableTag] = useState<ReusableTag | null>(null);
  const [taggingLearner, setTaggingLearner] = useState<Student | null>(null);
  const [clearTagsLearner, setClearTagsLearner] = useState<Student | null>(null);
  const [isSavingReusableTag, setIsSavingReusableTag] = useState(false);
  const [savingLearnerId, setSavingLearnerId] = useState<string | null>(null);
  const [selectedReusableTagPositions, setSelectedReusableTagPositions] = useState<Record<string, string>>({});

  const activeLearners = useMemo(
    () => getActiveLearnersForYear(learners, sections, activeSchoolYear),
    [learners, sections, activeSchoolYear],
  );

  const filteredLearners = useMemo(() => {
    const selectedTag = selectedTagFilter.trim();
    return activeLearners.filter((learner) => {
      if (fourPsOnly && !learner.is4Ps) {
        return false;
      }

      if (
        selectedTag &&
        !normalizeLearnerTags(learner.tags).some((tag) => tag === selectedTag || tag.startsWith(`${selectedTag} - `))
      ) {
        return false;
      }

      return matchesUsisLearnerSearch(learner, searchTerm, [
        resolveSectionLabel(learner, sections),
        normalizeLearnerTags(learner.tags).join(' '),
      ]);
    });
  }, [activeLearners, fourPsOnly, searchTerm, selectedTagFilter, sections]);

  const groupedLearners = useMemo(() => {
    const groups: Record<string, Record<string, { sectionId?: string; learners: Student[] }>> = {};

    filteredLearners.forEach((learner) => {
      const grade = resolveGradeLabel(learner, sections);
      const sectionId = String(learner.sectionId || '').trim();
      const sectionLabel = resolveSectionLabel(learner, sections);

      if (!groups[grade]) groups[grade] = {};
      if (!groups[grade][sectionLabel]) groups[grade][sectionLabel] = { sectionId: sectionId || undefined, learners: [] };
      groups[grade][sectionLabel].learners.push(learner);
    });

    Object.keys(groups).forEach((grade) => {
      Object.keys(groups[grade]).forEach((sectionLabel) => {
        groups[grade][sectionLabel].learners.sort((a, b) => buildLearnerLabel(a).localeCompare(buildLearnerLabel(b)));
      });
    });

    return groups;
  }, [filteredLearners, sections]);

  const activeReusableTags = useMemo(
    () =>
      reusableTags
        .filter((tag) => tag.isActive !== false && Boolean(tag.label.trim()))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [reusableTags],
  );

  const allTagsUsed = useMemo(() => {
    const tags = new Set<string>();
    learners.forEach((learner) => {
      normalizeLearnerTags(learner.tags).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [learners]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const grades = Object.keys(groupedLearners);
      if (grades.length === 0) return;
      setExpandedGrades(new Set(grades));
      setExpandedSections(new Set(
        Object.entries(groupedLearners).flatMap(([grade, sectionsByGrade]) =>
          Object.keys(sectionsByGrade).map((sectionLabel) => `${grade}::${sectionLabel}`),
        ),
      ));
    }
  }, [expandedGrades.size, groupedLearners, searchTerm]);

  const toggleGrade = (grade: string) => {
    setExpandedGrades((current) => {
      const next = new Set(current);
      if (next.has(grade)) next.delete(grade);
      else next.add(grade);
      return next;
    });
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  };

  const toggleLearner = (learnerId: string) => {
    setExpandedLearners((current) => {
      const next = new Set(current);
      if (next.has(learnerId)) next.delete(learnerId);
      else next.add(learnerId);
      return next;
    });
  };

  const updateLearnerTags = async (learner: Student, nextTags: string[]) => {
    const normalized = normalizeLearnerTags(nextTags);
    const current = normalizeLearnerTags(learner.tags);
    if (normalizeKey(normalized) === normalizeKey(current)) return;

    setSavingLearnerId(learner.id);
    try {
      await updateLearner(learner.id, { tags: normalized });
    } finally {
      setSavingLearnerId(null);
    }
  };

  const handleRemoveTag = (learner: Student, tag: string) => {
    const nextTags = normalizeLearnerTags(learner.tags).filter((entry) => entry !== tag);
    void updateLearnerTags(learner, nextTags);
  };

  const handleConfirmClearTags = async () => {
    if (!clearTagsLearner) return;
    const learner = clearTagsLearner;
    await updateLearnerTags(learner, []);
    setClearTagsLearner(null);
  };

  const handleToggleReusableTagSelection = (learnerId: string, tagId: string, checked: boolean) => {
    setSelectedReusableTagIds((current) => {
      const currentSelections = current[learnerId] || [];
      const nextSelections = checked
        ? Array.from(new Set([...currentSelections, tagId]))
        : currentSelections.filter((entry) => entry !== tagId);
      return { ...current, [learnerId]: nextSelections };
    });
  };

  const handleSetReusableTagPosition = (learnerId: string, tagId: string, position: string) => {
    setSelectedReusableTagPositions((current) => ({
      ...current,
      [`${learnerId}::${tagId}`]: position,
    }));
  };

  const handleOpenLearnerTagModal = (learner: Student) => {
    setTaggingLearner(learner);
  };

  const handleCloseLearnerTagModal = () => {
    setTaggingLearner(null);
  };

  const handleApplyReusableTagsToLearner = async (learner: Student) => {
    const selectedTagIds = selectedReusableTagIds[learner.id] || [];
    const selectedTags = activeReusableTags.filter((tag) => selectedTagIds.includes(tag.id));
    if (selectedTags.length === 0) return false;
    if (selectedTags.some((tag) => tagRequiresPosition(tag) && !String(selectedReusableTagPositions[`${learner.id}::${tag.id}`] || '').trim())) {
      return false;
    }

    let nextTags = normalizeLearnerTags(learner.tags);
    selectedTags.forEach((tag) => {
      const positionKey = `${learner.id}::${tag.id}`;
      const selectedPosition = String(selectedReusableTagPositions[positionKey] || '').trim();
      const tagLabel = tagRequiresPosition(tag) ? buildPositionedTagLabel(tag.label, selectedPosition) : tag.label;
      nextTags = normalizeLearnerTags([
        nextTags.filter((entry) => entry !== tag.label && !entry.startsWith(`${tag.label} - `)),
        [tagLabel],
      ]);
    });

    setSelectedReusableTagIds((current) => ({ ...current, [learner.id]: [] }));
    await updateLearnerTags(learner, nextTags);
    setTaggingLearner(null);
    return true;
  };

  const openCreateReusableTagModal = () => {
    setEditingReusableTag(null);
    setIsReusableTagModalOpen(true);
  };

  const openEditReusableTagModal = (tag: ReusableTag) => {
    setEditingReusableTag(tag);
    setIsReusableTagModalOpen(true);
  };

  const closeReusableTagModal = () => {
    setIsReusableTagModalOpen(false);
    setEditingReusableTag(null);
  };

  const handleSaveReusableTag = async (payload: { label: string; category: string; description: string; color: string; officerPositions: string[] }) => {
    setIsSavingReusableTag(true);
    try {
      const result = editingReusableTag
        ? await updateReusableTag(editingReusableTag.id, {
            label: payload.label,
            category: payload.category,
            description: payload.description,
            color: payload.color,
            officerPositions: payload.officerPositions,
          })
        : await addReusableTag({
            label: payload.label,
            category: payload.category,
            description: payload.description,
            color: payload.color,
            officerPositions: payload.officerPositions,
          });
      if (!result?.error) {
        closeReusableTagModal();
      }
    } finally {
      setIsSavingReusableTag(false);
    }
  };

  const learnerCount = filteredLearners.length;
  const taggedLearnerCount = filteredLearners.filter((learner) => normalizeLearnerTags(learner.tags).length > 0).length;
  const tagCount = filteredLearners.reduce((total, learner) => total + normalizeLearnerTags(learner.tags).length, 0);
  const activeTagOptions = useMemo(
    () => activeReusableTags.map((tag) => ({ label: tag.label, value: tag.label })),
    [activeReusableTags],
  );
  const taggingLearnerSelectedTagIds = taggingLearner ? selectedReusableTagIds[taggingLearner.id] || [] : [];
  const taggingLearnerSelectedPositions = useMemo(() => {
    if (!taggingLearner) return {};
    const prefix = `${taggingLearner.id}::`;
    return Object.fromEntries(
      Object.entries(selectedReusableTagPositions)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => [key.slice(prefix.length), value]),
    );
  }, [selectedReusableTagPositions, taggingLearner]);

  return (
    <div className="registrar-tagging-page registrar-learners-page">
      <ReusableTagModal
        isOpen={isReusableTagModalOpen}
        isSaving={isSavingReusableTag}
        tag={editingReusableTag}
        onClose={closeReusableTagModal}
        onSubmit={handleSaveReusableTag}
      />
      <LearnerTagSelectionModal
        isOpen={Boolean(taggingLearner)}
        isSaving={Boolean(taggingLearner && savingLearnerId === taggingLearner.id)}
        learner={taggingLearner}
        tags={activeReusableTags}
        selectedTagIds={taggingLearnerSelectedTagIds}
        selectedPositions={taggingLearnerSelectedPositions}
        getLearnerLabel={buildLearnerLabel}
        onApply={() => {
          if (taggingLearner) void handleApplyReusableTagsToLearner(taggingLearner);
        }}
        onClose={handleCloseLearnerTagModal}
        onPositionChange={(tagId, position) => {
          if (taggingLearner) handleSetReusableTagPosition(taggingLearner.id, tagId, position);
        }}
        onSelectionChange={(tagId, checked) => {
          if (taggingLearner) handleToggleReusableTagSelection(taggingLearner.id, tagId, checked);
        }}
      />
      <ConfirmationModal
        isOpen={Boolean(clearTagsLearner)}
        title="Clear Learner Tags"
        message={clearTagsLearner ? `Remove all tags assigned to ${buildLearnerLabel(clearTagsLearner)}?` : ''}
        confirmLabel="Clear Tags"
        cancelLabel="Cancel"
        type="danger"
        isLoading={Boolean(clearTagsLearner && savingLearnerId === clearTagsLearner.id)}
        onCancel={() => setClearTagsLearner(null)}
        onConfirm={() => void handleConfirmClearTags()}
      />

      <div className="registrar-learners-page__search registrar-tagging-page__toolbar">
        <UsisSearchInput
          ariaLabel="Search learners"
          clearLabel="Clear tagging search"
          label="Search Learners"
          onChange={setSearchTerm}
          value={searchTerm}
        />

        <div className="registrar-tagging-page__toolbar-actions">
          <UsisSearchableSelect
            ariaLabel="Filter by active tag"
            className="registrar-tagging-page__filter-select"
            floatingLabel
            label="Active Tag"
            onChange={setSelectedTagFilter}
            options={activeTagOptions}
            placeholder="All active tags"
            value={selectedTagFilter}
            showLabel
            allowTyping
            forcePortalMenu
            menuGap={4}
            allowCustomValue={false}
          />
          <button
            type="button"
            className={`registrar-tagging-page__filter-toggle${fourPsOnly ? ' registrar-tagging-page__filter-toggle--active' : ''}`}
            onClick={() => setFourPsOnly((current) => !current)}
            aria-pressed={fourPsOnly}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {fourPsOnly ? 'check_box' : 'check_box_outline_blank'}
            </span>
            4Ps only
          </button>
          <button
            type="button"
            className="registrar-tagging-page__filter-clear"
            onClick={() => {
              setSelectedTagFilter('');
              setFourPsOnly(false);
            }}
            disabled={!selectedTagFilter && !fourPsOnly}
          >
            Clear Filters
          </button>
          <div className="registrar-learners-page__meta-box">
            <span className="registrar-learners-page__meta-label">Learners</span>
            <span className="registrar-learners-page__meta-value">{learnerCount}</span>
          </div>
          <div className="registrar-learners-page__meta-box">
            <span className="registrar-learners-page__meta-label">Tagged</span>
            <span className="registrar-learners-page__meta-value">{taggedLearnerCount}</span>
          </div>
          <div className="registrar-learners-page__meta-box">
            <span className="registrar-learners-page__meta-label">Tag Entries</span>
            <span className="registrar-learners-page__meta-value">{tagCount}</span>
          </div>
          <button type="button" className="secondary-button" onClick={openCreateReusableTagModal}>
            <span className="material-symbols-outlined" aria-hidden="true">
              add
            </span>
            Create Reusable Tag
          </button>
        </div>
      </div>

      <div className="registrar-tagging-page__reusable-panel section-card">
        <div className="section-card__content">
          <div className="registrar-tagging-page__panel-head">
            <div>
              <h3>Reusable Tags</h3>
              <p>Created tags are available for assignment from each learner row below.</p>
            </div>
            <div className="status-badge status-badge--inactive">{activeReusableTags.length} active</div>
          </div>
          <div className="registrar-tagging-page__chips">
            {activeReusableTags.length > 0 ? (
              activeReusableTags.map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  className="registrar-tagging-page__chip registrar-tagging-page__chip--reusable"
                  style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                  onClick={() => openEditReusableTagModal(tag)}
                  aria-label={`Edit reusable tag ${tag.label}`}
                >
                  <span>{tag.label}</span>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    edit
                  </span>
                </button>
              ))
            ) : (
              <div className="registrar-tagging-page__empty-state registrar-tagging-page__empty-state--compact">
                <span className="material-symbols-outlined" aria-hidden="true">
                  local_offer
                </span>
                <p>No reusable tags have been created yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="registrar-learners-page__groups registrar-tagging-page__groups">
        {Object.keys(groupedLearners).length > 0 ? (
          Object.keys(groupedLearners)
            .sort((a, b) => {
              const order = Object.values(GradeLevel);
              return order.indexOf(a as GradeLevel) - order.indexOf(b as GradeLevel);
            })
            .map((grade) => {
              const sectionsByGrade = groupedLearners[grade];
              const totalLearners = Object.values(sectionsByGrade).reduce((sum, entry) => sum + entry.learners.length, 0);
              const totalSections = Object.keys(sectionsByGrade).length;

              return (
                <div key={grade} className="registrar-learners-page__grade">
                  <div className="registrar-learners-page__grade-head">
                    <button
                      type="button"
                      onClick={() => toggleGrade(grade)}
                      className="registrar-learners-page__grade-toggle"
                      aria-expanded={expandedGrades.has(grade)}
                    >
                      <div className="registrar-learners-page__grade-title">
                        <div className="registrar-learners-page__grade-icon">
                          <span className="material-symbols-outlined">
                            {expandedGrades.has(grade) ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                          </span>
                        </div>
                        <div>
                          <h3 className="registrar-learners-page__grade-name">{grade}</h3>
                          <p className="registrar-learners-page__grade-count">
                            {totalLearners} total learners in {totalSections} sections
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {expandedGrades.has(grade) ? (
                    <div className="registrar-learners-page__sections">
                      {(Object.entries(sectionsByGrade) as [string, { sectionId?: string; learners: Student[] }][])
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([sectionLabel, sectionData]) => {
                          const sectionKey = `${grade}::${sectionLabel}`;

                          return (
                            <div key={sectionLabel} className="registrar-learners-page__section">
                              <div className="registrar-learners-page__section-head">
                                <button
                                  type="button"
                                  onClick={() => toggleSection(sectionKey)}
                                  className="registrar-learners-page__section-toggle"
                                  aria-expanded={expandedSections.has(sectionKey)}
                                >
                                  <div className="registrar-learners-page__section-icon">
                                    <span className={`material-symbols-outlined ${expandedSections.has(sectionKey) ? 'is-open' : ''}`}>
                                      chevron_right
                                    </span>
                                  </div>
                                  <span className="registrar-learners-page__section-name">{sectionLabel}</span>
                                  <span className="registrar-learners-page__section-count">- {sectionData.learners.length} Learners</span>
                                </button>
                              </div>

                              {expandedSections.has(sectionKey) ? (
                                <div className="registrar-tagging-page__learner-list">
                                  {sectionData.learners.map((learner) => {
                                    const learnerId = learner.id;
                                    const isOpen = expandedLearners.has(learnerId);
                                    const learnerTags = normalizeLearnerTags(learner.tags);

                                    return (
                                      <article key={learnerId} className="registrar-tagging-page__learner">
                                        <button
                                          type="button"
                                          className="registrar-tagging-page__learner-toggle"
                                          onClick={() => toggleLearner(learnerId)}
                                          aria-expanded={isOpen}
                                        >
                                          <div>
                                            <h4>{buildLearnerLabel(learner)}</h4>
                                            <p>
                                              LRN {learner.lrn || 'N/A'} - {learner.is4Ps ? '4Ps' : 'No 4Ps'}
                                            </p>
                                          </div>
                                          <div className="registrar-tagging-page__learner-meta">
                                            <span className="status-badge status-badge--inactive">
                                              {learnerTags.length} tag{learnerTags.length === 1 ? '' : 's'}
                                            </span>
                                            <span className="material-symbols-outlined" aria-hidden="true">
                                              {isOpen ? 'expand_less' : 'expand_more'}
                                            </span>
                                          </div>
                                        </button>

                                        {isOpen ? (
                                          <div className="registrar-tagging-page__learner-panel">
                                            <section className="registrar-tagging-page__tag-section" aria-labelledby={`current-tags-${learnerId}`}>
                                              <div className="registrar-tagging-page__dropdown-head">
                                                <div>
                                                  <h4 id={`current-tags-${learnerId}`}>Current Tags</h4>
                                                  <p>{learnerTags.length} assigned to this learner.</p>
                                                </div>
                                                {activeReusableTags.length > 0 ? (
                                                  <button
                                                    type="button"
                                                    className="primary-button registrar-tagging-page__dropdown-primary"
                                                    onClick={() => handleOpenLearnerTagModal(learner)}
                                                    disabled={savingLearnerId === learnerId}
                                                  >
                                                    <span className="material-symbols-outlined" aria-hidden="true">
                                                      sell
                                                    </span>
                                                    Add tags
                                                  </button>
                                                ) : null}
                                              </div>

                                              {learnerTags.length > 0 ? (
                                                <div className="registrar-tagging-page__chips">
                                                  {learnerTags.map((tag) => (
                                                    <button
                                                      key={tag}
                                                      type="button"
                                                      className="registrar-tagging-page__chip registrar-tagging-page__chip--assigned"
                                                      onClick={() => handleRemoveTag(learner, tag)}
                                                      disabled={savingLearnerId === learnerId}
                                                      aria-label={`Remove ${tag}`}
                                                    >
                                                      <span>{tag}</span>
                                                      <span className="material-symbols-outlined" aria-hidden="true">
                                                        close
                                                      </span>
                                                    </button>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="notice-box registrar-tagging-page__notice">
                                                  <strong>No current tags</strong>
                                                  <span>No tags are assigned yet.</span>
                                                </div>
                                              )}

                                              <div className="registrar-tagging-page__dropdown-actions">
                                                {activeReusableTags.length === 0 ? (
                                                  <div className="notice-box registrar-tagging-page__notice registrar-tagging-page__notice--inline">
                                                    <strong>No reusable tags</strong>
                                                    <span>Create a reusable tag first.</span>
                                                  </div>
                                                ) : null}
                                                <div className="form-actions registrar-tagging-page__form-actions">
                                                  <button
                                                    type="button"
                                                    className="secondary-button registrar-tagging-page__clear-button"
                                                    onClick={() => setClearTagsLearner(learner)}
                                                    disabled={savingLearnerId === learnerId || learnerTags.length === 0}
                                                  >
                                                    Clear all
                                                  </button>
                                                </div>
                                              </div>
                                            </section>
                                          </div>
                                        ) : null}
                                      </article>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                    </div>
                  ) : null}
                </div>
              );
            })
        ) : (
          <div className="registrar-tagging-page__empty-state">
            <span className="material-symbols-outlined" aria-hidden="true">
              search_off
            </span>
            <p>No learners match your search.</p>
          </div>
        )}
      </div>

      {allTagsUsed.length > 0 ? (
        <section className="section-card registrar-tagging-page__used-panel">
          <div className="section-card__content">
            <div className="registrar-tagging-page__panel-head">
              <div>
                <h3>Tag Directory</h3>
                <p>All tags already present in learner records.</p>
              </div>
              <div className="status-badge status-badge--inactive">{allTagsUsed.length} total</div>
            </div>
            <div className="registrar-tagging-page__chips">
              {allTagsUsed.map((tag) => (
                <span key={tag} className="registrar-tagging-page__chip registrar-tagging-page__chip--static">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default TaggingPage;
