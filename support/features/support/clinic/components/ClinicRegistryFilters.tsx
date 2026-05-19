import type { ClinicRegistryFilter } from '../types';
import { ClinicFloatingField } from './ClinicFloatingField';
import { CLINIC_DISPOSITIONS } from './ClinicSummaryCards';

type ClinicRegistryFiltersProps = {
  value: ClinicRegistryFilter;
  onChange: (next: ClinicRegistryFilter) => void;
};

export function ClinicRegistryFilters({ value, onChange }: ClinicRegistryFiltersProps) {
  return (
    <div className="clinic-registry-filters">
      <ClinicFloatingField label="Search LRN / Learner / Visit Code" hint="Type LRN, learner name, or visit code">
        <input value={value.query} data-has-value={value.query ? 'true' : 'false'} onChange={(event) => onChange({ ...value, query: event.target.value })} placeholder=" " />
      </ClinicFloatingField>
      <ClinicFloatingField label="Disposition">
        <select value={value.disposition} data-has-value="true" onChange={(event) => onChange({ ...value, disposition: event.target.value as ClinicRegistryFilter['disposition'] })}>
          <option value="All">All</option>
          {CLINIC_DISPOSITIONS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </ClinicFloatingField>
    </div>
  );
}
