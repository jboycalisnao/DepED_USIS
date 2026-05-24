import { useMemo, useState } from 'react';
import { FloatingField } from '@/features/shared/components/FloatingField';
import type { RegistryUserRecord } from '../utils/credentialRegistry';
import type { UsisModuleKey } from '../utils/moduleAccessRegistry';

interface RegistryDirectoryProps {
  emptyMessage: string;
  moduleAccessByRecordId: Record<string, UsisModuleKey[]>;
  onDelete: (record: RegistryUserRecord) => void;
  onView: (record: RegistryUserRecord) => void;
  onManageModules: (record: RegistryUserRecord) => void;
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
  moduleAccessByRecordId,
  onDelete,
  onView,
  onManageModules,
  records,
  tertiaryValue,
  onEdit,
}: RegistryDirectoryProps) {
  const EyeIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
  const AppsIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
  const EditIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m12 6 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
  const DeleteIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 7V4h6v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 7l1 13h8l1-13" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );

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

  const formatRole = (value: string) =>
    value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const formatModuleLabel = (value: string) =>
    value === 'ia'
      ? 'Integrated Admin (IA)'
      :
    value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

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
        {filteredRecords.length === 0 ? <p>{query.trim() ? 'No users matched the search.' : emptyMessage}</p> : null}
        {filteredRecords.length > 0 ? (
          <div className="registry-table-wrap">
            <table className="registry-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>School</th>
                  <th>Scope</th>
                  <th>Module Access</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.label}</strong></td>
                    <td>{record.username}</td>
                    <td>{record.email}</td>
                    <td>{formatRole(record.role)}</td>
                    <td>{record.schoolCode}</td>
                    <td>{tertiaryValue(record)}</td>
                    <td>
                      {(moduleAccessByRecordId[record.id] || []).length
                        ? (moduleAccessByRecordId[record.id] || []).map(formatModuleLabel).join(', ')
                        : 'Not Set'}
                    </td>
                    <td>
                      <div className="registry-table__actions">
                        <button type="button" className="registry-icon-btn" aria-label="View user details" title="View details" onClick={() => onView(record)}>
                          <EyeIcon />
                        </button>
                        <button type="button" className="registry-icon-btn" aria-label="Manage module access" title="Module access" onClick={() => onManageModules(record)}>
                          <AppsIcon />
                        </button>
                        <button type="button" className="registry-icon-btn registry-icon-btn--primary" aria-label="Edit user" title="Edit" onClick={() => onEdit(record)}>
                          <EditIcon />
                        </button>
                        <button type="button" className="registry-icon-btn registry-icon-btn--danger" aria-label="Delete user" title="Delete" onClick={() => onDelete(record)}>
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
