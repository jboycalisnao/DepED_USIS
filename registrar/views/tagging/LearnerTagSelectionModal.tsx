import React, { useMemo } from 'react';
import { UsisChoiceOption } from '../../../common/components/ui/UsisChoiceOption';
import { UsisSearchableSelect } from '../../../common/components/ui/UsisSearchableSelect';
import { ReusableTag, Student } from '../../types';

type Props = {
  isOpen: boolean;
  isSaving: boolean;
  learner: Student | null;
  tags: ReusableTag[];
  selectedTagIds: string[];
  selectedPositions: Record<string, string>;
  getLearnerLabel: (learner: Student) => string;
  onApply: () => void;
  onClose: () => void;
  onPositionChange: (tagId: string, position: string) => void;
  onSelectionChange: (tagId: string, checked: boolean) => void;
};

const tagRequiresPosition = (tag: ReusableTag) => ['club', 'organization'].includes(String(tag.category || '').trim().toLowerCase());

const resolveCategoryLabel = (tag: ReusableTag) => String(tag.category || '').trim() || 'Other';

const LearnerTagSelectionModal: React.FC<Props> = ({
  isOpen,
  isSaving,
  learner,
  tags,
  selectedTagIds,
  selectedPositions,
  getLearnerLabel,
  onApply,
  onClose,
  onPositionChange,
  onSelectionChange,
}) => {
  const groupedTags = useMemo(() => {
    const groups = new Map<string, ReusableTag[]>();
    tags.forEach((tag) => {
      const category = resolveCategoryLabel(tag);
      groups.set(category, [...(groups.get(category) || []), tag]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tags]);

  if (!isOpen || !learner) return null;

  const hasMissingRequiredPosition = tags.some((tag) => (
    selectedTagIds.includes(tag.id) &&
    tagRequiresPosition(tag) &&
    !String(selectedPositions[tag.id] || '').trim()
  ));

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="registrar-learner-tagging-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Learner Tagging</p>
            <h3 id="registrar-learner-tagging-title">{getLearnerLabel(learner)}</h3>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close learner tagging modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-dialog__body registrar-tagging-page__tag-modal-body">
          {groupedTags.length > 0 ? (
            groupedTags.map(([category, categoryTags]) => (
              <section key={category} className="registrar-tagging-page__tag-category">
                <div className="registrar-tagging-page__section-title">
                  <div>
                    <h4>{category}</h4>
                    <p>{categoryTags.length} available tag{categoryTags.length === 1 ? '' : 's'}</p>
                  </div>
                </div>

                <div className="registrar-tagging-page__choice-grid">
                  {categoryTags.map((tag) => {
                    const requiresPosition = tagRequiresPosition(tag);
                    const positionOptions = (tag.officerPositions || []).map((position) => String(position || '').trim()).filter(Boolean);
                    const isSelected = selectedTagIds.includes(tag.id);

                    return (
                      <div key={tag.id} className="registrar-tagging-page__choice-card">
                        <UsisChoiceOption
                          checked={isSelected}
                          controlType="checkbox"
                          description={requiresPosition ? 'Position required' : tag.description || 'Reusable tag'}
                          disabled={isSaving}
                          label={tag.label}
                          name={`learner-${learner.id}-tags`}
                          onChange={(checked) => onSelectionChange(tag.id, checked)}
                          stacked
                          value={tag.id}
                        />

                          {requiresPosition && isSelected ? (
                            positionOptions.length > 0 ? (
                              <UsisSearchableSelect
                                ariaLabel={`Position for ${tag.label}`}
                                className="registrar-tagging-page__position-dropdown"
                                disabled={isSaving}
                                floatingLabel
                                label="Position"
                                onChange={(position) => onPositionChange(tag.id, position)}
                                options={positionOptions.map((position) => ({
                                  label: position,
                                  value: position,
                                }))}
                                placeholder="Select position"
                                value={selectedPositions[tag.id] || ''}
                                showLabel
                                allowTyping
                                allowCustomValue={false}
                                forcePortalMenu
                                menuGap={4}
                              />
                            ) : (
                            <div className="notice-box registrar-tagging-page__notice registrar-tagging-page__notice--inline">
                              <strong>No positions configured</strong>
                              <span>Edit this tag template to add positions.</span>
                            </div>
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <div className="notice-box registrar-tagging-page__notice">
              <strong>No reusable tags</strong>
              <span>Create a reusable tag first.</span>
            </div>
          )}
        </div>

        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__primary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-dialog__blue"
            onClick={onApply}
            disabled={isSaving || selectedTagIds.length === 0 || hasMissingRequiredPosition}
          >
            {isSaving ? 'Saving...' : 'Apply Selected Tags'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearnerTagSelectionModal;
