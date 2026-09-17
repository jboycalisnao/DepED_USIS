export type LearnerMicrosoftAccountRecord = {
  exists: boolean;
  learnerId: string;
  microsoftUserId: string;
  userPrincipalName: string;
  microsoftMailNickname: string;
  microsoftAccountStatus: string;
  microsoftCreatedAt: string;
  microsoftLastSyncedAt: string;
  created?: boolean;
  temporaryPassword?: string;
};

const toText = (value: unknown) => String(value ?? '').trim();

const parseMicrosoftAccountResult = (value: any): LearnerMicrosoftAccountRecord => ({
  exists: Boolean(value?.exists),
  learnerId: toText(value?.learnerId),
  microsoftUserId: toText(value?.microsoftUserId),
  userPrincipalName: toText(value?.userPrincipalName),
  microsoftMailNickname: toText(value?.microsoftMailNickname),
  microsoftAccountStatus: toText(value?.microsoftAccountStatus),
  microsoftCreatedAt: toText(value?.microsoftCreatedAt),
  microsoftLastSyncedAt: toText(value?.microsoftLastSyncedAt),
  created: Boolean(value?.created),
  temporaryPassword: toText(value?.temporaryPassword),
});

const readJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

export async function fetchLearnerMicrosoftAccount(input: { learnerId: string; lrn: string }) {
  const params = new URLSearchParams();
  if (input.learnerId) params.set('learnerId', input.learnerId);
  if (input.lrn) params.set('lrn', input.lrn);
  const response = await fetch(`/api/learner-microsoft-account?${params.toString()}`);
  const result = await readJson(response);
  if (!response.ok) {
    const detailText = toText(result?.details);
    throw new Error(`${toText(result?.error) || 'Unable to load Microsoft account status.'}${detailText ? ` ${detailText}` : ''}`);
  }
  return parseMicrosoftAccountResult(result);
}

export async function createLearnerMicrosoftAccount(input: { learnerId: string; lrn: string }) {
  const response = await fetch('/api/learner-microsoft-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      learnerId: input.learnerId,
      lrn: input.lrn,
    }),
  });
  const result = await readJson(response);
  if (!response.ok) {
    const detailText = toText(result?.details);
    const missing = Array.isArray(result?.missing) ? ` Missing: ${result.missing.join(', ')}.` : '';
    throw new Error(`${toText(result?.error) || 'Unable to create Microsoft account.'}${missing}${detailText ? ` ${detailText}` : ''}`);
  }
  return parseMicrosoftAccountResult(result);
}
