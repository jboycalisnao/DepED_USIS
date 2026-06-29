import React from 'react';

export interface TaggingLearnerListItem {
  id: string;
  name: string;
  lrn: string;
  sectionLabel: string;
  tagCount: number;
  is4Ps: boolean;
}

interface TaggingLearnerListProps {
  items: TaggingLearnerListItem[];
  selectedLearnerId: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectLearner: (id: string) => void;
}

const TaggingLearnerList: React.FC<TaggingLearnerListProps> = ({
  items,
  selectedLearnerId,
  searchTerm,
  onSearchChange,
  onSelectLearner,
}) => {
  return (
    <section className="section-card registrar-tagging-page__panel">
      <div className="section-card__content">
        <div className="registrar-tagging-page__panel-head">
          <div>
            <h3>Find Learners</h3>
            <p>Search a learner and open their affiliations.</p>
          </div>
          <div className="status-badge status-badge--inactive">{items.length} listed</div>
        </div>

        <label className="registrar-tagging-page__search-field">
          <span>Search learner</span>
          <input
            className="registrar-tagging-page__search"
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Name, LRN, or section"
          />
        </label>

        <div className="registrar-tagging-page__list" role="list" aria-label="Learners">
          {items.length > 0 ? (
            items.map((item) => {
              const isSelected = item.id === selectedLearnerId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`registrar-tagging-page__learner-row${isSelected ? ' registrar-tagging-page__learner-row--selected' : ''}`}
                  onClick={() => onSelectLearner(item.id)}
                >
                  <div className="registrar-tagging-page__learner-row-main">
                    <div>
                      <h4>{item.name}</h4>
                      <p>{item.sectionLabel}</p>
                    </div>
                    <div className="registrar-tagging-page__learner-row-meta">
                      {item.is4Ps ? <span className="status-badge status-badge--open">4Ps</span> : null}
                      <span className="status-badge status-badge--inactive">{item.tagCount} tag{item.tagCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                  <div className="registrar-tagging-page__learner-row-foot">
                    <span>LRN {item.lrn || 'N/A'}</span>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      chevron_right
                    </span>
                  </div>
                </button>
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
      </div>
    </section>
  );
};

export default TaggingLearnerList;
