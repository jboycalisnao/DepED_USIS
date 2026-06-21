import type { PublicEnrollmentSubmission } from '../types';

export type EnrollmentSubmissionNameMatchStatus = 'exact' | 'close' | 'none';

export type EnrollmentSubmissionNameMatch = {
  inputName: string;
  normalizedInput: string;
  status: EnrollmentSubmissionNameMatchStatus;
  score: number;
  matchedSubmission: PublicEnrollmentSubmission | null;
  matchedName: string;
  note: string;
};

const toText = (value: unknown) => String(value || '').trim();

const stripDiacritics = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeName = (value: string) =>
  stripDiacritics(
    String(value || '')
      .toLowerCase()
      .replace(/[,./\\|()[\]{}'"\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

const sortTokens = (value: string) => normalizeName(value).split(' ').filter(Boolean).sort().join(' ');

const uniqueTokens = (value: string) => Array.from(new Set(normalizeName(value).split(' ').filter(Boolean)));

const isSingleInitial = (value: string) => /^[a-z]$/.test(normalizeName(value).replace(/\s+/g, ''));

const tokensMatchExactly = (left: string, right: string) => {
  const leftToken = normalizeName(left);
  const rightToken = normalizeName(right);
  if (!leftToken || !rightToken) return false;
  if (leftToken === rightToken) return true;
  if (isSingleInitial(leftToken) && leftToken[0] === rightToken[0]) return true;
  if (isSingleInitial(rightToken) && rightToken[0] === leftToken[0]) return true;
  return false;
};

const tokensMatchInOrder = (leftTokens: string[], rightTokens: string[]) => {
  if (leftTokens.length < 2 || leftTokens.length > rightTokens.length) return false;
  for (let index = 0; index < leftTokens.length; index += 1) {
    if (!tokensMatchExactly(leftTokens[index] || '', rightTokens[index] || '')) return false;
  }

  if (leftTokens.length === rightTokens.length) return true;
  return leftTokens.length >= 3 && isSingleInitial(leftTokens[leftTokens.length - 1] || '');
};

const levenshteinDistance = (left: string, right: string) => {
  const a = left;
  const b = right;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous: number[] = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
};

const similarity = (left: string, right: string) => {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const sortedA = sortTokens(a);
  const sortedB = sortTokens(b);
  const tokenA = uniqueTokens(a);
  const tokenB = uniqueTokens(b);
  const sharedTokens = tokenA.filter((token) => tokenB.includes(token)).length;
  const tokenUnion = new Set([...tokenA, ...tokenB]).size || 1;
  const tokenIntersectionScore = sharedTokens / Math.max(Math.min(tokenA.length, tokenB.length), 1);
  const jaccardScore = sharedTokens / tokenUnion;
  const sequenceScore = 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length, 1);
  const sortedScore = 1 - levenshteinDistance(sortedA, sortedB) / Math.max(sortedA.length, sortedB.length, 1);

  return Math.max(sequenceScore, sortedScore, tokenIntersectionScore, jaccardScore);
};

const isExactNormalizedMatch = (inputName: string, candidateName: string) => {
  const input = normalizeName(inputName);
  const candidate = normalizeName(candidateName);
  if (!input || !candidate) return false;
  if (input === candidate) return true;

  const inputTokens = input.split(' ').filter(Boolean);
  const candidateTokens = candidate.split(' ').filter(Boolean);
  return tokensMatchInOrder(inputTokens, candidateTokens);
};

const buildName = (submission: PublicEnrollmentSubmission) => {
  const payload = submission.payload || ({} as any);
  const parts = [
    submission.last_name || payload.lastName || payload.last_name,
    submission.first_name || payload.firstName || payload.first_name,
    submission.middle_name || payload.middleName || payload.middle_name,
  ].map((value) => toText(value)).filter(Boolean);
  return parts.join(' ');
};

const buildNameCandidates = (submission: PublicEnrollmentSubmission) => {
  const payload = submission.payload || ({} as any);
  const first = toText(submission.first_name || payload.firstName || payload.first_name);
  const middle = toText(submission.middle_name || payload.middleName || payload.middle_name);
  const last = toText(submission.last_name || payload.lastName || payload.last_name);
  const full = [first, middle, last].filter(Boolean).join(' ');
  const lastFirst = [last, first, middle].filter(Boolean).join(' ');
  const firstLast = [first, last, middle].filter(Boolean).join(' ');
  return Array.from(new Set([full, lastFirst, firstLast].map((item) => item.trim()).filter(Boolean)));
};

export function formatSubmissionDisplayName(submission: PublicEnrollmentSubmission) {
  const name = buildName(submission);
  const lrn = toText(submission.lrn || submission.payload?.lrn);
  if (!name && !lrn) return 'Unnamed learner';
  return name || lrn;
}

export function formatSubmissionNameWithCommas(submission: PublicEnrollmentSubmission | null | undefined) {
  if (!submission) return 'Unnamed learner';
  const payload = submission.payload || ({} as any);
  const last = toText(submission.last_name || payload.lastName || payload.last_name);
  const first = toText(submission.first_name || payload.firstName || payload.first_name);
  const middle = toText(submission.middle_name || payload.middleName || payload.middle_name);
  const parts = [last, first, middle].filter(Boolean);
  if (parts.length === 0) return formatSubmissionDisplayName(submission);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`;
  return `${parts[0]}, ${parts[1]}, ${parts.slice(2).join(' ')}`;
}

export function parseEnrollmentNameList(rawValue: string) {
  return String(rawValue || '')
    .split(/\r?\n|;|\t/)
    .map((line) => line.trim())
    .filter((line) => {
      const normalized = normalizeName(line);
      return normalized && !['name', 'learner name', 'student name', 'section list'].includes(normalized);
    });
}

export function matchEnrollmentSubmissionNames(
  pastedNames: string[],
  submissions: PublicEnrollmentSubmission[],
  closeMatchThreshold = 0.74,
): EnrollmentSubmissionNameMatch[] {
  return pastedNames.map((inputName) => {
    const normalizedInput = normalizeName(inputName);
    let bestScore = 0;
    let bestSubmission: PublicEnrollmentSubmission | null = null;
    let bestMatchedName = '';

    for (const submission of submissions) {
      const submissionCandidates = buildNameCandidates(submission);
      const submissionName = formatSubmissionDisplayName(submission);
      if (submissionCandidates.some((candidate) => isExactNormalizedMatch(normalizedInput, candidate)) || isExactNormalizedMatch(normalizedInput, submissionName)) {
        return {
          inputName,
          normalizedInput,
          status: 'exact',
          score: 1,
          matchedSubmission: submission,
          matchedName: submissionName,
          note: 'Exact or normalized exact match found in submissions.',
        };
      }
      const candidateScore = Math.max(
        ...submissionCandidates.map((candidate) => similarity(normalizedInput, candidate)),
        similarity(normalizedInput, submissionName),
      );

      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestSubmission = submission;
        bestMatchedName = submissionName;
      }
    }

    if (!bestSubmission || bestScore <= 0) {
      return {
        inputName,
        normalizedInput,
        status: 'none',
        score: 0,
        matchedSubmission: null,
        matchedName: '',
        note: 'No submission match found.',
      };
    }

    if (bestScore >= closeMatchThreshold) {
      return {
        inputName,
        normalizedInput,
        status: 'close',
        score: bestScore,
        matchedSubmission: bestSubmission,
        matchedName: bestMatchedName,
        note: 'Close match found. Please verify the spelling or order of names.',
      };
    }

    return {
      inputName,
      normalizedInput,
      status: 'none',
      score: bestScore,
      matchedSubmission: null,
      matchedName: bestMatchedName,
      note: 'No submission match found.',
    };
  });
}
