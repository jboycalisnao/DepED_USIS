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
  const filteredRecords = useMemo(
    () => records.filter((record) => matchesQuery(record, query)),
    [query, records],
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
      </div>
      <div className="registry-list">
        <RegistryTree
          autoExpand={query.trim().length > 0}
          emptyMessage={query.trim() ? 'No users matched the search.' : emptyMessage}
          onEdit={onEdit}
          records={filteredRecords}
          tertiaryValue={tertiaryValue}
        />
      </div>
    </>
  );
}
