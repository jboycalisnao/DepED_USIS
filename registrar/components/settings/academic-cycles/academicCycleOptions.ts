import { SearchableSelectOption } from '../../ui/SearchableSelect';

export function getAcademicCycleYearOptions(currentYear: number): SearchableSelectOption[] {
  return Array.from({ length: 13 }, (_, index) => currentYear - 2 + index).map((year) => ({
    label: `${year}`,
    value: `${year}`,
  }));
}
