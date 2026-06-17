import type { TeachingNonTeachingCredentialRecord } from '../services/teachingNonTeachingCredentialsService';

const normalizeNamePart = (value: string) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeIdentity = (value: string) => String(value || '').trim().toLowerCase();

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

export const buildDuplicateUsernameSet = (usernames: string[]) => {
  const duplicateUsernames = new Set<string>();
  usernames.forEach((username) => {
    const normalized = normalizeIdentity(username);
    if (!normalized) return;
    duplicateUsernames.add(normalized);
  });
  return duplicateUsernames;
};

export const buildUploadedDuplicateWarnings = (
  rows: Array<{ firstName: string; lastName: string; username: string }>,
  existingNames: Set<string>,
  existingUsernames: Set<string>,
) => {
  const seenNames = new Set<string>();
  const seenUsernames = new Set<string>();
  const duplicateNames: string[] = [];
  const duplicateUsernames: string[] = [];

  rows.forEach((row) => {
    const nameKey = `${normalizeNamePart(row.firstName)}::${normalizeNamePart(row.lastName)}`;
    const usernameKey = normalizeIdentity(row.username);
    const displayName = [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || 'Unnamed record';

    const nameMatchedExisting = existingNames.has(nameKey);
    const nameMatchedBatch = seenNames.has(nameKey);
    if (nameMatchedExisting || nameMatchedBatch) {
      duplicateNames.push(displayName);
    }

    const usernameMatchedExisting = existingUsernames.has(usernameKey);
    const usernameMatchedBatch = seenUsernames.has(usernameKey);
    if (usernameMatchedExisting || usernameMatchedBatch) {
      duplicateUsernames.push(`${displayName} (${row.username})`);
    }

    seenNames.add(nameKey);
    seenUsernames.add(usernameKey);
  });

  return {
    duplicateNames,
    duplicateUsernames,
  };
};
