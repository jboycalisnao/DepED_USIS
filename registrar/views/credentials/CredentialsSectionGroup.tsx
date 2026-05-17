import React from 'react';
import { Student } from '../../types';

type CredentialsSectionGroupProps = {
  createPolicyPassword: (learner: Student) => string;
  isExpanded: boolean;
  learners: Student[];
  onCreateMicrosoftAccount: (learner: Student) => void;
  pendingMicrosoftAccountLearnerId: string | null;
  onToggle: () => void;
  sectionLabel: string;
  selectedLearnerIds: Set<string>;
  toggleLearner: (id: string) => void;
};

export function CredentialsSectionGroup({
  createPolicyPassword,
  isExpanded,
  learners,
  onCreateMicrosoftAccount,
  pendingMicrosoftAccountLearnerId,
  onToggle,
  sectionLabel,
  selectedLearnerIds,
  toggleLearner,
}: CredentialsSectionGroupProps) {
  const normalizeGender = (value: string | undefined | null) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'male') return 'Male';
    if (normalized === 'female') return 'Female';
    return 'Other';
  };

  const sortByLastName = (a: Student, b: Student) =>
    `${a.lastName || ''}, ${a.firstName || ''}`.toUpperCase().localeCompare(`${b.lastName || ''}, ${b.firstName || ''}`.toUpperCase());

  const genderGroups: Array<{ key: 'Male' | 'Female' | 'Other'; learners: Student[] }> = [
    { key: 'Male', learners: [] },
    { key: 'Female', learners: [] },
    { key: 'Other', learners: [] },
  ];

  learners.forEach((learner) => {
    const gender = normalizeGender(learner.gender);
    const target = genderGroups.find((entry) => entry.key === gender);
    if (target) target.learners.push(learner);
  });
  genderGroups.forEach((group) => group.learners.sort(sortByLastName));

  return (
    <>
      <tr className="registrar-credentials-page__section-row">
        <td colSpan={9}>
          <button type="button" className="registrar-credentials-page__section-toggle" onClick={onToggle}>
            <span className={`material-symbols-outlined ${isExpanded ? 'is-open' : ''}`} aria-hidden="true">
              chevron_right
            </span>
            <strong>{sectionLabel}</strong>
            <span>{learners.length}</span>
          </button>
        </td>
      </tr>
      {isExpanded &&
        genderGroups
          .filter((group) => group.learners.length > 0)
          .map((group) => (
            <React.Fragment key={`${sectionLabel}-${group.key}`}>
              <tr className="registrar-credentials-page__gender-row">
                <td colSpan={9}>
                  <strong>{group.key}</strong> - {group.learners.length}
                </td>
              </tr>
              {group.learners.map((learner) => {
                const hasMicrosoftAccount = Boolean((learner.microsoftUpn || '').trim() || (learner.microsoftUserId || '').trim());
                const isPending = pendingMicrosoftAccountLearnerId === learner.id;
                return (
                  <tr key={learner.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedLearnerIds.has(learner.id)}
                        onChange={() => toggleLearner(learner.id)}
                        aria-label={`Select ${learner.lastName}, ${learner.firstName}`}
                      />
                    </td>
                    <td>{sectionLabel}</td>
                    <td>{learner.lrn}</td>
                    <td>{learner.lastName}, {learner.firstName}</td>
                    <td>{learner.loginUsername || learner.lrn}</td>
                    <td>{learner.loginPassword || createPolicyPassword(learner)}</td>
                    <td>{learner.loginStatus || 'Active'}</td>
                    <td>
                      <button
                        type="button"
                        className="icon-btn registrar-credentials-page__ms-icon-btn"
                        onClick={() => onCreateMicrosoftAccount(learner)}
                        disabled={isPending || hasMicrosoftAccount}
                        title={hasMicrosoftAccount ? `Microsoft Account Linked: ${learner.microsoftUpn || learner.microsoftUserId}` : 'Create Microsoft Account'}
                        aria-label={hasMicrosoftAccount ? 'Microsoft Account Linked' : 'Create Microsoft Account'}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {isPending ? 'sync' : hasMicrosoftAccount ? 'verified' : 'person_add'}
                        </span>
                      </button>
                    </td>
                    <td className="mono registrar-credentials-page__ms-email-cell" title={learner.microsoftUpn || 'Not Linked'}>
                      {learner.microsoftUpn || 'Not Linked'}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
    </>
  );
}
