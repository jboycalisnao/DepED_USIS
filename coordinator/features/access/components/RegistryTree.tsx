import { useMemo } from 'react';
import type { RegistryUserRecord } from '../utils/credentialRegistry';

interface RegistryTreeProps {
  autoExpand?: boolean;
  emptyMessage: string;
  onEdit: (record: RegistryUserRecord) => void;
  records: RegistryUserRecord[];
  tertiaryValue: (record: RegistryUserRecord) => string;
}

type RegistryGroup = {
  divisions: Map<string, { label: string; schools: Map<string, { label: string; records: RegistryUserRecord[] }> }>;
  label: string;
};

const sortByLabel = <T extends { label: string }>(entries: T[]) =>
  [...entries].sort((left, right) => left.label.localeCompare(right.label));

export function RegistryTree({
  autoExpand = false,
  emptyMessage,
  onEdit,
  records,
  tertiaryValue,
}: RegistryTreeProps) {
  const groupedRecords = useMemo(() => {
    const regionMap = new Map<string, RegistryGroup>();

    for (const record of records) {
      const regionKey = `${record.regionCode || record.region}`;
      const divisionKey = `${record.divisionCode || record.division}`;
      const schoolKey = `${record.schoolCode}`;

      if (!regionMap.has(regionKey)) {
        regionMap.set(regionKey, { divisions: new Map(), label: record.region });
      }

      const regionEntry = regionMap.get(regionKey)!;
      if (!regionEntry.divisions.has(divisionKey)) {
        regionEntry.divisions.set(divisionKey, { label: record.division, schools: new Map() });
      }

      const divisionEntry = regionEntry.divisions.get(divisionKey)!;
      if (!divisionEntry.schools.has(schoolKey)) {
        divisionEntry.schools.set(schoolKey, { label: record.schoolName, records: [] });
      }

      divisionEntry.schools.get(schoolKey)!.records.push(record);
    }

    return sortByLabel(
      Array.from(regionMap.entries()).map(([regionKey, regionValue]) => ({
        key: regionKey,
        label: regionValue.label,
        divisions: sortByLabel(
          Array.from(regionValue.divisions.entries()).map(([divisionKey, divisionValue]) => ({
            key: divisionKey,
            label: divisionValue.label,
            schools: sortByLabel(
              Array.from(divisionValue.schools.entries()).map(([schoolKey, schoolValue]) => ({
                key: schoolKey,
                label: schoolValue.label,
                records: [...schoolValue.records].sort((left, right) => left.label.localeCompare(right.label)),
              })),
            ),
          })),
        ),
      })),
    );
  }, [records]);

  if (groupedRecords.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <div className="registry-tree">
      {groupedRecords.map((region) => (
        <details
          className="registry-tree__level"
          key={`${region.key}-${autoExpand ? 'expanded' : 'collapsed'}`}
          open={autoExpand}
        >
          <summary className="registry-tree__summary">
            <span className="registry-tree__label">Region</span>
            <strong>{region.label}</strong>
          </summary>

          <div className="registry-tree__children">
            {region.divisions.map((division) => (
              <details
                className="registry-tree__level"
                key={`${region.key}-${division.key}-${autoExpand ? 'expanded' : 'collapsed'}`}
                open={autoExpand}
              >
                <summary className="registry-tree__summary">
                  <span className="registry-tree__label">Division</span>
                  <strong>{division.label}</strong>
                </summary>

                <div className="registry-tree__children">
                  {division.schools.map((school) => (
                    <details
                      className="registry-tree__level"
                      key={`${region.key}-${division.key}-${school.key}-${autoExpand ? 'expanded' : 'collapsed'}`}
                      open={autoExpand}
                    >
                      <summary className="registry-tree__summary">
                        <span className="registry-tree__label">School</span>
                        <strong>{school.label}</strong>
                        <span className="registry-tree__meta">{school.key}</span>
                      </summary>

                      <div className="registry-list registry-tree__accounts">
                        {school.records.map((record) => (
                          <div className="registry-list__item registry-list__item--actionable" key={record.id}>
                            <div className="registry-list__content">
                              <strong>{record.label}</strong>
                              <span>{record.username} | {record.role}</span>
                              <span>{tertiaryValue(record)}</span>
                            </div>
                            <div className="registry-list__actions">
                              <button
                                className="registry-action-button"
                                onClick={() => onEdit(record)}
                                type="button"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
