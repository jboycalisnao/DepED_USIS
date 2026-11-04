export type UsisLearnerSearchRecord = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  lrn?: string;
  loginUsername?: string;
  loginStatus?: string;
};

export const normalizeSearchText = (value: unknown): string =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const buildUsisLearnerSearchText = (
  learner: UsisLearnerSearchRecord,
  extraSearchText: Array<unknown> = [],
): string => {
  const firstName = String(learner.firstName || '').trim().toLowerCase();
  const lastName = String(learner.lastName || '').trim().toLowerCase();
  const middleName = String(learner.middleName || '').trim().toLowerCase();
  const lrn = String(learner.lrn || '').trim().toLowerCase();
  const loginUsername = String(learner.loginUsername || '').trim().toLowerCase();
  const loginStatus = String(learner.loginStatus || '').trim().toLowerCase();

  const noSpaceLastName = lastName.replace(/\s+/g, '');
  const noSpaceFirstName = firstName.replace(/\s+/g, '');

  const extraParts = extraSearchText
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .filter(Boolean)
    .map((item) => String(item).toLowerCase());

  return [
    `${lastName}, ${firstName} ${middleName}`,
    `${firstName} ${lastName}`,
    `${lastName} ${firstName}`,
    noSpaceLastName,
    noSpaceFirstName,
    lrn,
    loginUsername,
    loginStatus,
    ...extraParts,
  ]
    .join(' ')
    .replace(/\s+/g, ' ');
};

export const createLearnerSearchMatcher = (query: string) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return () => true;
  }

  const cleanTokens = normalizedQuery
    .replace(/[,;]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  return (
    learner: UsisLearnerSearchRecord,
    precomputedSearchText?: string,
    extraSearchText: Array<unknown> = [],
  ): boolean => {
    const searchText = precomputedSearchText || buildUsisLearnerSearchText(learner, extraSearchText);

    // Fast-path: direct substring match for the full phrase
    if (searchText.includes(normalizedQuery)) return true;

    // Token-based match: all entered words must appear in learner's search string
    return cleanTokens.every((token) => searchText.includes(token));
  };
};

export const matchesUsisLearnerSearch = (
  learner: UsisLearnerSearchRecord,
  query: string,
  extraSearchText: Array<unknown> = [],
): boolean => {
  const matcher = createLearnerSearchMatcher(query);
  return matcher(learner, undefined, extraSearchText);
};
