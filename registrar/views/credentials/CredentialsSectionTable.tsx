import React from 'react';
import { Student } from '../../types';
import { createPolicyPassword, groupLearnersByGender } from './credentialsHelpers';

type Group = {
  learners: Student[];
  sectionId: string;
  sectionLabel: string;
};

type Props = {
  allVisibleSelected: boolean;
  copyCellValue: (value: string, label: string) => void;
  groupedBySection: Group[];
  pendingMicrosoftAccountLearnerId: string | null;
  pendingStatusToggleLearnerId: string | null;
  selectedLearnerIds: Set<string>;
  onCreateMicrosoftAccount: (learner: Student) => void;
  onToggleLearner: (id: string) => void;
  onToggleLearnerStatus: (learner: Student) => void;
  onToggleSelectAll: () => void;
  onViewLearner: (learnerId: string) => void;
};

export function CredentialsSectionTable({
  allVisibleSelected,
  copyCellValue,
  groupedBySection,
  pendingMicrosoftAccountLearnerId,
  pendingStatusToggleLearnerId,
  selectedLearnerIds,
  onCreateMicrosoftAccount,
  onToggleLearner,
  onToggleLearnerStatus,
  onToggleSelectAll,
  onViewLearner,
}: Props) {
  return (
    <>
      {groupedBySection.map((group) => {
        const genderGroups = groupLearnersByGender(group.learners);
        return (
          <div className="registrar-credentials-page__table" key={group.sectionId}>
            <table className="usis-table">
              <colgroup>
                <col style={{ width: '46px' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '21%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allVisibleSelected} onChange={onToggleSelectAll} aria-label="Select all listed learners" />
                  </th>
                  <th>Section</th>
                  <th>LRN</th>
                  <th>Learner Name</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Status</th>
                  <th>Microsoft</th>
                  <th>Microsoft Email</th>
                </tr>
              </thead>
              <tbody>
                {(['Male', 'Female', 'Other'] as const)
                  .map((gender) => [gender, genderGroups[gender]] as const)
                  .filter(([, learnersByGender]) => learnersByGender.length > 0)
                  .map(([gender, learnersByGender]) => (
                    <React.Fragment key={`${group.sectionId}-${gender}`}>
                      <tr className="registrar-credentials-page__gender-row">
                        <td colSpan={9}>
                          <strong>{gender}</strong> - {learnersByGender.length}
                        </td>
                      </tr>
                      {learnersByGender.map((learner) => {
                        const hasMicrosoftAccount = Boolean((learner.microsoftUpn || '').trim() || (learner.microsoftUserId || '').trim());
                        const isPending = pendingMicrosoftAccountLearnerId === learner.id;
                        const statusText = String(learner.loginStatus || 'Active').trim();
                        const isActive = statusText.toLowerCase() === 'active';
                        return (
                          <tr key={learner.id} className="registrar-credentials-page__learner-row" onClick={() => onViewLearner(learner.id)}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedLearnerIds.has(learner.id)}
                                onChange={() => onToggleLearner(learner.id)}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Select ${learner.lastName}, ${learner.firstName}`}
                              />
                            </td>
                            <td>{group.sectionLabel}</td>
                            <td>{learner.lrn}</td>
                            <td>{learner.lastName}, {learner.firstName}</td>
                            <td>
                              <button type="button" className="registrar-credentials-page__copy-cell" onClick={(event) => { event.stopPropagation(); copyCellValue(learner.loginUsername || learner.lrn, 'Username'); }} title="Copy username" aria-label="Copy username">
                                <span>{learner.loginUsername || learner.lrn}</span>
                                <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                              </button>
                            </td>
                            <td>
                              <button type="button" className="registrar-credentials-page__copy-cell" onClick={(event) => { event.stopPropagation(); copyCellValue(learner.loginPassword || createPolicyPassword(learner), 'Password'); }} title="Copy password" aria-label="Copy password">
                                <span>{learner.loginPassword || createPolicyPassword(learner)}</span>
                                <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`registrar-credentials-page__status-tag ${isActive ? 'is-active' : 'is-inactive'}`}
                                onClick={(event) => { event.stopPropagation(); onToggleLearnerStatus(learner); }}
                                disabled={pendingStatusToggleLearnerId === learner.id}
                                title="Toggle login status"
                                aria-label={`Set status to ${isActive ? 'Inactive' : 'Active'}`}
                              >
                                {pendingStatusToggleLearnerId === learner.id ? 'Updating...' : statusText}
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="icon-btn registrar-credentials-page__ms-icon-btn"
                                onClick={(event) => { event.stopPropagation(); onCreateMicrosoftAccount(learner); }}
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
                              <button type="button" className="registrar-credentials-page__copy-cell" onClick={(event) => { event.stopPropagation(); copyCellValue(learner.microsoftUpn || '', 'Microsoft email'); }} title="Copy Microsoft email" aria-label="Copy Microsoft email">
                                <span>{learner.microsoftUpn || 'Not Linked'}</span>
                                <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
