import { Student } from '../../types';

export const isPolicyCompliantPassword = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);

export const createPolicyPassword = (learner: Student) => {
  const sanitizedLastName = String(learner.lastName || 'Learner').replace(/[^a-zA-Z]/g, '');
  const firstUpper = (sanitizedLastName.charAt(0) || 'L').toUpperCase();
  const lowerSegment = (sanitizedLastName.slice(1, 4) || 'ear').toLowerCase();
  const digitSegment = String(learner.lrn || '')
    .replace(/\D/g, '')
    .slice(-4)
    .padStart(4, '0');
  const candidate = `${firstUpper}${lowerSegment}${digitSegment}`;
  return candidate.length >= 8 ? candidate : `${candidate}a9`;
};

export const createUniquePolicyPassword = (learner: Student, used: Set<string>) => {
  const base = createPolicyPassword(learner);
  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  let attempt = 1;
  while (attempt < 10000) {
    const suffix = String(attempt).padStart(2, '0');
    const trimmedBase = base.slice(0, Math.max(0, 8 - suffix.length));
    const candidate = `${trimmedBase}${suffix}`;
    if (isPolicyCompliantPassword(candidate) && !used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    attempt += 1;
  }

  const fallback = `${base.slice(0, 5)}Aa9${Date.now().toString().slice(-3)}`.slice(0, 11);
  used.add(fallback);
  return fallback;
};

export const createResetVariantPassword = (learner: Student) => {
  const base = createPolicyPassword(learner);
  const lrnDigits = String(learner.lrn || '').replace(/\D/g, '');
  const lastTwo = lrnDigits.slice(-2).padStart(2, '0');
  const nameHead = String(learner.firstName || 'L').charAt(0).toUpperCase();
  const millis = Date.now().toString().slice(-2);
  const mixed = `${base.slice(0, 3).toUpperCase()}${base.slice(3, 6).toLowerCase()}${lastTwo}${nameHead}${millis}`;
  return mixed.slice(0, 12);
};

export const buildMicrosoftUsername = (learner: Student) => {
  const safeCompact = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '');

  const first = safeCompact(learner.firstName || 'learner');
  const last = safeCompact(learner.lastName || 'user');
  return `${first}.${last}@lr.leonnhs.edu.ph`;
};

export const groupLearnersByGender = (sectionLearners: Student[]) => {
  const normalizeGender = (value: string | undefined | null) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'male') return 'Male';
    if (normalized === 'female') return 'Female';
    return 'Other';
  };

  const grouped: Record<'Male' | 'Female' | 'Other', Student[]> = {
    Male: [],
    Female: [],
    Other: [],
  };

  sectionLearners.forEach((learner) => {
    grouped[normalizeGender(learner.gender)].push(learner);
  });

  (Object.keys(grouped) as Array<keyof typeof grouped>).forEach((key) => {
    grouped[key].sort((a, b) =>
      `${a.lastName || ''}, ${a.firstName || ''}`.toUpperCase().localeCompare(`${b.lastName || ''}, ${b.firstName || ''}`.toUpperCase()),
    );
  });

  return grouped;
};
