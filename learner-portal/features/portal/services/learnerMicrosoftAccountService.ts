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
  password?: string;
  statusMessage?: string;
  checkedLive?: boolean;
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
  password: toText(value?.password),
  statusMessage: toText(value?.statusMessage),
  checkedLive: Boolean(value?.checkedLive),
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

export async function fetchLearnerMicrosoftAccount(input: { learnerId: string; lrn: string; refresh?: boolean }) {
  const params = new URLSearchParams();
  if (input.learnerId) params.set('learnerId', input.learnerId);
  if (input.lrn) params.set('lrn', input.lrn);
  if (input.refresh) params.set('refresh', 'true');
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
