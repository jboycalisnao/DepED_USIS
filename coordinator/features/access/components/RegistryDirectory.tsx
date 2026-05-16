import { useMemo, useState } from 'react';
import { FloatingField } from '@/features/shared/components/FloatingField';
import { RegistryTree } from './RegistryTree';
import type { RegistryUserRecord } from '../utils/credentialRegistry';

interface RegistryDirectoryProps {
  emptyMessage: string;
  records: RegistryUserRecord[];
  tertiaryValue: (record: RegistryUserRecord) => string;
  onEdit: (record: RegistryUserRecord) => void;
}

const matchesQuery = (record: RegistryUserRecord, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    record.label,
    record.username,
    record.email,
    record.role,
    record.schoolCode,
    record.schoolName,
    record.scope,
    record.region,
    record.division,
  ]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
};

export function RegistryDirectory({
  emptyMessage,
  records,
  tertiaryValue,
  onEdit,
}: RegistryDirectoryProps) {
  const [query, setQuery] = useState('');
  const [credentialType, setCredentialType] = useState('all');
  const credentialTypeOptions = useMemo(() => {
    const uniqueRoles = Array.from(new Set(records.map((record) => record.role).filter(Boolean))).sort();
    return [{ label: 'All Credential Types', value: 'all' }].concat(
      uniqueRoles.map((role) => ({
        label: role
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
        value: role,
      })),
    );
  }, [records]);

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          matchesQuery(record, query) &&
          (credentialType === 'all' || record.role === credentialType),
      ),
    [credentialType, query, records],
  );

  return (
    <>
      <div className="registry-toolbar">
        <FloatingField
          id={`registry-search-${emptyMessage.replace(/\s+/g, '-').toLowerCase()}`}
          label="Search Users"
          onChange={(event) => setQuery(event.target.value)}
          value={query}
        />
        <label className="registry-select">
          <span>Credential Type</span>
          <select
            aria-label="Filter by credential type"
            value={credentialType}
            onChange={(event) => setCredentialType(event.target.value)}
          >
            {credentialTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="registry-list">
        <RegistryTree
          emptyMessage={query.trim() ? 'No users matched the search.' : emptyMessage}
          onEdit={onEdit}
          records={filteredRecords}
          tertiaryValue={tertiaryValue}
        />
      </div>
    </>
  );
}
