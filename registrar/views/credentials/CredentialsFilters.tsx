import { UsisSearchableSelect } from '../../../common/components/ui/UsisSearchableSelect';
import { GradeLevel } from '../../types';

type Option = { label: string; value: string };

type Props = {
  gradeOptions: Option[];
  searchTerm: string;
  sectionOptions: Option[];
  selectedGrade: GradeLevel;
  selectedSectionId: string;
  setSearchTerm: (value: string) => void;
  onChangeGrade: (grade: GradeLevel) => void;
  onChangeSection: (sectionId: string) => void;
};

export function CredentialsFilters({
  gradeOptions,
  searchTerm,
  sectionOptions,
  selectedGrade,
  selectedSectionId,
  setSearchTerm,
  onChangeGrade,
  onChangeSection,
}: Props) {
  return (
    <>
      <div className="registrar-credentials-page__filters">
        <UsisSearchableSelect
          ariaLabel="Grade Level"
          floatingLabel
          forcePortalMenu
          label="Grade Level"
          options={gradeOptions}
          value={selectedGrade}
          onChange={(value) => onChangeGrade(value as GradeLevel)}
        />
        <UsisSearchableSelect
          ariaLabel="Section Scope"
          floatingLabel
          forcePortalMenu
          label="Section Scope"
          options={sectionOptions}
          value={selectedSectionId}
          onChange={onChangeSection}
        />
      </div>
      <div className="floating-field registrar-floating-search">
        <label className="floating-field__control">
          <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder=" " />
          <span>Search Learner</span>
          {searchTerm.trim() && (
            <button
              type="button"
              className="registrar-floating-search__clear"
              onClick={() => setSearchTerm('')}
              aria-label="Clear learner search"
              title="Clear"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          )}
        </label>
      </div>
    </>
  );
}
