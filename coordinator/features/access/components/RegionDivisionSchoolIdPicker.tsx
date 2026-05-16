import { useEffect, useMemo } from 'react';
import { SearchableSelect } from '@/features/shared/components/SearchableSelect';
import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';
import {
  buildDivisionSchoolId,
  buildRegionalSchoolId,
  buildRegionOptions,
  getDivisionOptionsByRegion,
  getRegionCodeByShortName,
  resolveActorRegionShortName,
} from '../utils/regionDivisionSchoolId';

interface RegionDivisionSchoolIdPickerProps {
  access: CoordinatorAccessRecord;
  role: 'regional_usis_coordinator' | 'division_usis_coordinator';
  selectedDivisionCode: string;
  selectedRegion: string;
  currentSchoolCode: string;
  onDivisionCodeChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onSchoolCodeChange: (value: string) => void;
}

export function RegionDivisionSchoolIdPicker({
  access,
  role,
  selectedDivisionCode,
  selectedRegion,
  currentSchoolCode,
  onDivisionCodeChange,
  onRegionChange,
  onSchoolCodeChange,
}: RegionDivisionSchoolIdPickerProps) {
  const actorRegion = resolveActorRegionShortName(access.region);
  const canSelectRegion = access.isSuperAdmin;
  const regionOptions = useMemo(() => buildRegionOptions(), []);

  const safeRegion = canSelectRegion ? selectedRegion : actorRegion;

  const divisionOptions = useMemo(() => {
    if (!safeRegion) return [];
    return getDivisionOptionsByRegion(safeRegion).map((entry) => ({
      label: `${entry.divisionOffice} (${entry.localType}: ${entry.provinceOrCity}) [${entry.divisionCode}]`,
      value: entry.divisionCode,
    }));
  }, [safeRegion]);

  const safeDivisionCode =
    role === 'division_usis_coordinator'
      ? selectedDivisionCode || divisionOptions[0]?.value || ''
      : '00';

  const regionSchoolId = safeRegion ? buildRegionalSchoolId(safeRegion) : '';
  const completeSchoolId =
    !safeRegion
      ? ''
      : role === 'regional_usis_coordinator'
        ? regionSchoolId
        : safeDivisionCode
          ? buildDivisionSchoolId(safeRegion, safeDivisionCode)
          : '';

  useEffect(() => {
    if (!canSelectRegion && selectedRegion !== actorRegion) {
      onRegionChange(actorRegion);
    }
  }, [actorRegion, canSelectRegion, onRegionChange, selectedRegion]);

  useEffect(() => {
    if (role === 'division_usis_coordinator' && safeDivisionCode !== selectedDivisionCode) {
      onDivisionCodeChange(safeDivisionCode);
    }
  }, [onDivisionCodeChange, role, safeDivisionCode, selectedDivisionCode]);

  useEffect(() => {
    if (completeSchoolId && completeSchoolId !== currentSchoolCode) {
      onSchoolCodeChange(completeSchoolId);
    }
  }, [completeSchoolId, currentSchoolCode, onSchoolCodeChange]);

  return (
    <>
      <SearchableSelect
        disabled={!canSelectRegion}
        label="Region"
        onChange={onRegionChange}
        options={[
          { label: 'Select a region', value: '' },
          ...regionOptions,
        ]}
        value={safeRegion}
      />

      {role === 'division_usis_coordinator' ? (
        <SearchableSelect
          disabled={!safeRegion}
          label="Division Office"
          onChange={onDivisionCodeChange}
          options={
            divisionOptions.length
              ? divisionOptions
              : [{ label: safeRegion ? 'No mapped divisions' : 'Select a region first', value: '' }]
          }
          value={safeDivisionCode}
        />
      ) : null}

      <label className="registry-select">
        <span>Region School ID Prefix</span>
        <div className="searchable-select__field">
          <input readOnly type="text" value={regionSchoolId || 'N/A'} />
          <button disabled type="button">▼</button>
        </div>
      </label>

      <label className="registry-select">
        <span>Generated Login School ID</span>
        <div className="searchable-select__field">
          <input readOnly type="text" value={completeSchoolId || 'N/A'} />
          <button disabled type="button">▼</button>
        </div>
      </label>

      <p className="registry-copy">
        Region code: <strong>{safeRegion ? getRegionCodeByShortName(safeRegion) : 'N/A'}</strong>
        {role === 'division_usis_coordinator' ? ` | Division code: ${safeDivisionCode || 'N/A'}` : ''}
      </p>
    </>
  );
}
