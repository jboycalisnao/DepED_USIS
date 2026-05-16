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
        learners.map((learner) => {
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
    </>
  );
}
