import React, { useMemo, useState } from 'react';
import { Student, User, Section } from '../../../types';
import { FloatingField } from '../../ui/FloatingField';

interface VoterCheckerProps {
  learnerDatabase: Student[];
  voters: User[];
  sections: Section[];
}

const VoterChecker: React.FC<VoterCheckerProps> = ({ learnerDatabase, voters, sections }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 3) return [];

    return learnerDatabase
      .filter((learner) => {
        const fullName = `${learner.firstName} ${learner.lastName}`.toLowerCase();
        return learner.lrn.includes(normalizedQuery) || fullName.includes(normalizedQuery);
      })
      .slice(0, 5);
  }, [learnerDatabase, query]);

  return (
    <section className="election-page__control-card election-settings__checker-card">
      <div className="election-settings__section-header">
        <div className="election-settings__section-copy">
          <p className="election-settings__section-kicker">Voter Status Checker</p>
          <h3 className="election-settings__section-title">Verify individual learner participation</h3>
        </div>
        <span className="election-settings__section-note">{learnerDatabase.length.toLocaleString()} learners</span>
      </div>

      <div className="election-settings__search-field">
        <FloatingField
          as="input"
          label="Enter LRN or name to search"
          aria-label="Enter LRN or name to search"
          placeholder=" "
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {query.length > 0 && query.length < 3 ? (
        <p className="election-settings__helper-note election-settings__helper-note--compact">
          <span className="material-symbols-outlined" aria-hidden="true">
            info
          </span>
          Type at least 3 characters to search.
        </p>
      ) : null}

      <div className="election-settings__search-results">
        {filtered.map((learner) => {
          const section = sections.find((entry) => entry.id === learner.sectionId);
          const hasVoted = voters.find((voter) => voter.studentId === learner.lrn)?.hasVoted;

          return (
            <article key={learner.id} className="election-settings__search-result">
              <div className="election-settings__search-result-copy">
                <h4>{learner.firstName} {learner.lastName}</h4>
                <p>
                  LRN {learner.lrn} · {section?.gradeLevel} {section?.name}
                </p>
              </div>
              <span className={`election-settings__result-chip ${hasVoted ? 'election-settings__result-chip--success' : 'election-settings__result-chip--idle'}`}>
                {hasVoted ? 'Ballot Submitted' : 'Not Yet Voted'}
              </span>
            </article>
          );
        })}

        {query.length >= 3 && filtered.length === 0 ? (
          <div className="election-settings__empty-state">
            <span className="material-symbols-outlined" aria-hidden="true">
              person_off
            </span>
            <p>No matching learners found</p>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default VoterChecker;
