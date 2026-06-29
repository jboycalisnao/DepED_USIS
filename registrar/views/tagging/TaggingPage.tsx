import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { getActiveLearnersForYear } from '../../services/dashboardService';
import { UsisSearchableSelect } from '../../../common/components/ui/UsisSearchableSelect';
import { normalizeLearnerTags, parseLearnerTagsInput } from '../../utils/learnerTags';
import { GradeLevel, Section, Student } from '../../types';
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

const TaggingPage: React.FC = () => {
  const { learners, sections, activeSchoolYear, updateLearner, loading, reusableTags, addReusableTag } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedLearners, setExpandedLearners] = useState<Set<string>>(new Set());
  const [draftTagsByLearner, setDraftTagsByLearner] = useState<Record<string, string>>({});
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [fourPsOnly, setFourPsOnly] = useState(false);
  const [isReusableTagModalOpen, setIsReusableTagModalOpen] = useState(false);
  const [isCreatingReusableTag, setIsCreatingReusableTag] = useState(false);
  const [savingLearnerId, setSavingLearnerId] = useState<string | null>(null);

  const activeLearners = useMemo(
    () => getActiveLearnersForYear(learners, sections, activeSchoolYear),
    [learners, sections, activeSchoolYear],
  );

  const filteredLearners = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const selectedTag = selectedTagFilter.trim();
    return activeLearners.filter((learner) => {
      if (fourPsOnly && !learner.is4Ps) {
        return false;
      }

      if (selectedTag && !normalizeLearnerTags(learner.tags).includes(selectedTag)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        learner.lrn,
        buildLearnerLabel(learner),
        resolveSectionLabel(learner, sections),
        normalizeLearnerTags(learner.tags).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
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

  const handleAddDraftTags = (learner: Student) => {
    const draftText = draftTagsByLearner[learner.id] || '';
    const draftTags = parseLearnerTagsInput(draftText);
    if (draftTags.length === 0) return;
    const nextTags = normalizeLearnerTags([normalizeLearnerTags(learner.tags), draftTags]);
    setDraftTagsByLearner((current) => ({ ...current, [learner.id]: '' }));
    void updateLearnerTags(learner, nextTags);
  };

  const handleRemoveTag = (learner: Student, tag: string) => {
    const nextTags = normalizeLearnerTags(learner.tags).filter((entry) => entry !== tag);
    void updateLearnerTags(learner, nextTags);
  };

  const handleClearTags = (learner: Student) => {
    void updateLearnerTags(learner, []);
  };

  const handleAddReusableTagToLearner = (learner: Student, tag: string) => {
    const nextTags = normalizeLearnerTags([normalizeLearnerTags(learner.tags), [tag]]);
    void updateLearnerTags(learner, nextTags);
  };

  const handleCreateReusableTag = async (payload: { label: string; category: string; description: string; color: string }) => {
    setIsCreatingReusableTag(true);
    try {
      const result = await addReusableTag({
        label: payload.label,
        category: payload.category,
        description: payload.description,
        color: payload.color,
      });
      if (!result?.error) {
        setIsReusableTagModalOpen(false);
      }
    } finally {
      setIsCreatingReusableTag(false);
    }
  };

  const learnerCount = filteredLearners.length;
  const taggedLearnerCount = filteredLearners.filter((learner) => normalizeLearnerTags(learner.tags).length > 0).length;
  const tagCount = filteredLearners.reduce((total, learner) => total + normalizeLearnerTags(learner.tags).length, 0);
  const activeTagOptions = useMemo(
    () => activeReusableTags.map((tag) => ({ label: tag.label, value: tag.label })),
    [activeReusableTags],
  );

  return (
    <div className="registrar-tagging-page registrar-learners-page">
      <ReusableTagModal
        isOpen={isReusableTagModalOpen}
        isSaving={isCreatingReusableTag}
        onClose={() => setIsReusableTagModalOpen(false)}
        onSubmit={handleCreateReusableTag}
      />

      <div className="registrar-learners-page__search registrar-tagging-page__toolbar">
        <div className="registrar-learners-page__search-field">
          <label className="floating-field">
            <div className="floating-field__control registrar-learners-page__search-control" data-has-value={searchTerm.trim() ? 'true' : 'false'}>
              <input
                type="text"
                placeholder=" "
                className="registrar-learners-page__search-input"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <span className="registrar-learners-page__search-label">
                <span className="material-symbols-outlined" aria-hidden="true">
                  search
                </span>
                <span>Search learners</span>
              </span>
              {searchTerm.trim() ? (
                <button
                  type="button"
                  className="registrar-search-clear-btn"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear tagging search"
                  title="Clear"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              ) : null}
            </div>
          </label>
        </div>

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
          <button type="button" className="secondary-button" onClick={() => setIsReusableTagModalOpen(true)}>
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
                <span
                  key={tag.id}
                  className="registrar-tagging-page__chip registrar-tagging-page__chip--reusable"
                  style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                >
                  {tag.label}
                </span>
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
                                    const draftText = draftTagsByLearner[learnerId] || '';

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
                                            <div className="registrar-tagging-page__section-title">
                                              <h4>Current Tags</h4>
                                              <button
                                                type="button"
                                                className="registrar-tagging-page__text-button"
                                                onClick={() => handleClearTags(learner)}
                                                disabled={savingLearnerId === learnerId || learnerTags.length === 0}
                                              >
                                                Clear all
                                              </button>
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
                                              <div className="registrar-tagging-page__empty-state registrar-tagging-page__empty-state--compact">
                                                <p>No tags assigned yet.</p>
                                              </div>
                                            )}

                                            <label className="registrar-tagging-page__search-field">
                                              <span>Add tags</span>
                                              <textarea
                                                className="registrar-tagging-page__textarea"
                                                rows={3}
                                                value={draftText}
                                                onChange={(event) =>
                                                  setDraftTagsByLearner((current) => ({
                                                    ...current,
                                                    [learnerId]: event.target.value,
                                                  }))
                                                }
                                                placeholder="Type tags separated by commas, lines, or semicolons"
                                              />
                                            </label>

                                            <div className="registrar-tagging-page__actions">
                                              <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={() => handleAddDraftTags(learner)}
                                                disabled={savingLearnerId === learnerId}
                                              >
                                                Apply typed tags
                                              </button>
                                              <button
                                                type="button"
                                                className="primary-button"
                                                onClick={() =>
                                                  setDraftTagsByLearner((current) => ({
                                                    ...current,
                                                    [learnerId]: '',
                                                  }))
                                                }
                                                disabled={savingLearnerId === learnerId}
                                              >
                                                Clear input
                                              </button>
                                            </div>

                                            <div>
                                              <div className="registrar-tagging-page__section-title">
                                                <h4>Reusable Tags</h4>
                                                <p>Tap a reusable tag to assign it to this learner.</p>
                                              </div>
                                              {activeReusableTags.length > 0 ? (
                                                <div className="registrar-tagging-page__chips">
                                                  {activeReusableTags.map((tag) => (
                                                    <button
                                                      key={tag.id}
                                                      type="button"
                                                      className="registrar-tagging-page__chip registrar-tagging-page__chip--reusable"
                                                      style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                                                      onClick={() => handleAddReusableTagToLearner(learner, tag.label)}
                                                      disabled={savingLearnerId === learnerId}
                                                    >
                                                      {tag.label}
                                                    </button>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="registrar-tagging-page__empty-state registrar-tagging-page__empty-state--compact">
                                                  <p>Create a reusable tag first.</p>
                                                </div>
                                              )}
                                            </div>
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
