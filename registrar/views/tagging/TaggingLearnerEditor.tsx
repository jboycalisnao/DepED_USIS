import React from 'react';

export interface TaggingLearnerEditorData {
  id: string;
  name: string;
  lrn: string;
  sectionLabel: string;
  gradeLabel: string;
  is4Ps: boolean;
  tags: string[];
}

interface TaggingLearnerEditorProps {
  learner: TaggingLearnerEditorData | null;
  draftTagsText: string;
  isSaving: boolean;
  quickTags: string[];
  onDraftTagsTextChange: (value: string) => void;
  onAddDraftTags: () => void;
  onSave: () => void;
  onClearAll: () => void;
  onRemoveTag: (tag: string) => void;
  onAddQuickTag: (tag: string) => void;
}

const TaggingLearnerEditor: React.FC<TaggingLearnerEditorProps> = ({
  learner,
  draftTagsText,
  isSaving,
  quickTags,
  onDraftTagsTextChange,
  onAddDraftTags,
  onSave,
  onClearAll,
  onRemoveTag,
  onAddQuickTag,
}) => {
  return (
    <section className="section-card registrar-tagging-page__panel">
      <div className="section-card__content">
        <div className="registrar-tagging-page__panel-head">
          <div>
            <h3>Tag Learner</h3>
            <p>Add clubs, orgs, or any other affiliation tags.</p>
          </div>
          {learner ? <div className="status-badge status-badge--open">Ready</div> : <div className="status-badge status-badge--inactive">No learner selected</div>}
        </div>

        {learner ? (
          <div className="registrar-tagging-page__editor">
            <div className="registrar-tagging-page__summary">
              <div>
                <h4>{learner.name}</h4>
                <p>{learner.sectionLabel}</p>
              </div>
              <div className="registrar-tagging-page__summary-meta">
                <span>LRN {learner.lrn || 'N/A'}</span>
                <span>{learner.gradeLabel}</span>
                {learner.is4Ps ? <span className="status-badge status-badge--open">4Ps</span> : null}
              </div>
            </div>

            <div>
              <div className="registrar-tagging-page__section-title">
                <h4>Current Tags</h4>
                <button type="button" className="registrar-tagging-page__text-button" onClick={onClearAll} disabled={isSaving || learner.tags.length === 0}>
                  Clear all
                </button>
              </div>
              {learner.tags.length > 0 ? (
                <div className="registrar-tagging-page__chips" aria-label="Current tags">
                  {learner.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="registrar-tagging-page__chip"
                      onClick={() => onRemoveTag(tag)}
                      disabled={isSaving}
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
                <div className="registrar-tagging-page__empty-tags">
                  No tags are assigned yet.
                </div>
              )}
            </div>

            <label className="registrar-tagging-page__search-field">
              <span>Add tags</span>
              <textarea
                className="registrar-tagging-page__textarea"
                value={draftTagsText}
                onChange={(event) => onDraftTagsTextChange(event.target.value)}
                rows={3}
                placeholder="Type tags separated by commas, lines, or semicolons"
              />
            </label>

            <div className="registrar-tagging-page__actions">
              <button type="button" className="secondary-button" onClick={onAddDraftTags} disabled={isSaving}>
                Apply typed tags
              </button>
              <button type="button" className="primary-button" onClick={onSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            <div>
              <div className="registrar-tagging-page__section-title">
                <h4>Suggested Tags</h4>
                <p>Tap a suggestion to add it immediately.</p>
              </div>
              {quickTags.length > 0 ? (
                <div className="registrar-tagging-page__chips">
                  {quickTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="registrar-tagging-page__chip registrar-tagging-page__chip--suggestion"
                      onClick={() => onAddQuickTag(tag)}
                      disabled={isSaving}
                    >
                      <span>{tag}</span>
                      <span className="material-symbols-outlined" aria-hidden="true">
                        add
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="registrar-tagging-page__empty-tags">
                  No suggested tags yet. Add tags to more learners to build the list.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="registrar-tagging-page__empty-state registrar-tagging-page__empty-state--panel">
            <span className="material-symbols-outlined" aria-hidden="true">
              label
            </span>
            <p>Select a learner to manage tags.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TaggingLearnerEditor;
