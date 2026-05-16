import { useMemo } from 'react';
import type { RegistryUserRecord } from '../utils/credentialRegistry';

interface RegistryTreeProps {
  emptyMessage: string;
  onEdit: (record: RegistryUserRecord) => void;
  records: RegistryUserRecord[];
  tertiaryValue: (record: RegistryUserRecord) => string;
}

const formatRole = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function RegistryTree({
  emptyMessage,
  onEdit,
  records,
  tertiaryValue,
}: RegistryTreeProps) {
  const sortedRecords = useMemo(() => {
    return [...records].sort((left, right) => left.label.localeCompare(right.label));
  }, [records]);

  if (sortedRecords.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <div className="registry-tree registry-tree--flat">
      {sortedRecords.map((record) => (
        <div className="registry-list__item registry-list__item--actionable registry-list__item--enhanced" key={record.id}>
          <div className="registry-list__content">
            <div className="registry-list__title-row">
              <strong>{record.label}</strong>
              <span className="registry-role-chip">{formatRole(record.role)}</span>
            </div>
            <span>{record.username}</span>
            <span>{record.email}</span>
            <span className="registry-list__meta-row">
              <span>{record.schoolCode}</span>
              <span>{tertiaryValue(record)}</span>
            </span>
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
  );
}
