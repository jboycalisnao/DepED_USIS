import type { TeachingNonTeachingCredentialRecord } from '../services/teachingNonTeachingCredentialsService';

const normalizeNamePart = (value: string) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const buildDuplicateCoordinatorKeySet = (records: Pick<TeachingNonTeachingCredentialRecord, 'firstName' | 'lastName'>[]) => {
  const duplicateKeys = new Set<string>();
  records.forEach((record) => {
    const firstName = normalizeNamePart(record.firstName);
    const lastName = normalizeNamePart(record.lastName);
    if (!firstName || !lastName) return;
    duplicateKeys.add(`${firstName}::${lastName}`);
  });
  return duplicateKeys;
};

export const isDuplicateCoordinatorName = (
  firstName: string,
  lastName: string,
  duplicateKeys: Set<string>,
) => {
  const key = `${normalizeNamePart(firstName)}::${normalizeNamePart(lastName)}`;
  return duplicateKeys.has(key);
};
