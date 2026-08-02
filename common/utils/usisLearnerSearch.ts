export type UsisLearnerSearchRecord = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  lrn?: string;
  loginUsername?: string;
  loginStatus?: string;
};

const normalizeSearchText = (value: unknown) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const matchesUsisLearnerSearch = (
  learner: UsisLearnerSearchRecord,
  query: string,
  extraSearchText: Array<unknown> = [],
) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const firstName = String(learner.firstName || '');
  const lastName = String(learner.lastName || '');
  const middleName = String(learner.middleName || '');

  const candidates = [
    `${lastName}, ${firstName} ${middleName}`,
    `${firstName} ${middleName} ${lastName}`,
    `${firstName} ${lastName} ${middleName}`,
    [
      lastName,
      firstName,
      middleName,
      `${firstName} ${lastName}`,
      `${firstName} ${middleName}`,
      `${middleName} ${lastName}`,
    ].join(' '),
    learner.lrn,
    learner.loginUsername,
    learner.loginStatus,
    ...extraSearchText,
  ];

  return candidates.some((candidate) => normalizeSearchText(candidate).includes(normalizedQuery));
};
