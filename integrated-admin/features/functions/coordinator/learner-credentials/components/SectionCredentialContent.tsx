import { UsisSearchableSelect } from '../../../../../../common/components/ui/UsisSearchableSelect';
import type { GrantedLearnerAccessRecord, LearnerSearchRecord, SectionDirectoryRecord } from '../services/learnerBasedCredentialService';

type Props = {
  operationLabelByKey: Record<string, string>;
  section: SectionDirectoryRecord;
  searchResults: LearnerSearchRecord[];
  grantedRows: GrantedLearnerAccessRecord[];
  selectedLearnerId: string;
  isLoadingSection: boolean;
  onSearchQueryChange: (query: string) => Promise<void>;
  onSelectLearner: (learnerId: string) => void;
  onEdit: (record: GrantedLearnerAccessRecord) => void;
};

export function SectionCredentialContent({
  operationLabelByKey,
  section,
  searchResults,
  grantedRows,
  selectedLearnerId,
  isLoadingSection,
  onSearchQueryChange,
  onSelectLearner,
  onEdit,
}: Props) {
  return (
    <div className="ia-learner-credentials__section-body">
      <UsisSearchableSelect
        ariaLabel={`Search learner in ${section.sectionName}`}
        className="ia-learner-credentials__search-select"
        floatingLabel
        forcePortalMenu
        label={`Search Learner in ${section.sectionName}`}
        minQueryLength={2}
        onChange={onSelectLearner}
        onQueryChange={onSearchQueryChange}
        options={searchResults.map((learner) => ({
          label: `${learner.fullName} (${learner.lrn || '-'})`,
          value: learner.learnerId,
        }))}
        requireQueryBeforeOptions
        serverSearch
        value={selectedLearnerId}
      />
      {isLoadingSection ? <p className="registry-copy">Searching learners...</p> : null}
      <div className="ia-learner-credentials__granted-table-wrap">
        <table className="ia-learner-credentials__granted-table">
          <thead>
            <tr>
              <th>Learner</th>
              <th>LRN</th>
              <th>Position</th>
              <th>Operation</th>
              <th>Granted By</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {grantedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="ia-learner-credentials__empty-cell">No granted learner access in this section.</td>
              </tr>
            ) : grantedRows.map((row) => (
              <tr key={row.credentialId}>
                <td>{row.fullName}</td>
                <td>{row.learnerLrn || '-'}</td>
                <td>{row.positionTitle}</td>
                <td>
                  <span className="ia-learner-credentials__operation-tag">
                    {operationLabelByKey[row.operationKey] || row.operationKey}
                  </span>
                </td>
                <td>{row.grantedBy}</td>
                <td>
                  <button type="button" className="registry-action-button" onClick={() => onEdit(row)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

