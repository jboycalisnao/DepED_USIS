import { EnrollmentRecord, EnrollmentStatus, GradeLevel, normalizeLearnerStatus, SchoolYear, Section, Student } from '../types';

/**
 * Normalizes school year string for comparisons.
 */
export const normalizeSchoolYearKey = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/^sy\s*/i, '').replace(/\s+/g, ' ');
  const match = normalized.match(/(20\d{2})\s*-\s*(20\d{2})/);
  if (match) return `${match[1]}-${match[2]}`.toLowerCase();
  return normalized.toLowerCase();
};

/**
 * Extracts starting calendar year from strings like "2024-2025", "sy2425", "2024", etc.
 */
export const parseSchoolYearStartYear = (value?: string | null): number => {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  // matches 2024-2025 or 2024
  const match4 = raw.match(/\b(20\d{2})\b/);
  if (match4) return parseInt(match4[1], 10);
  // matches sy2425 or 2425
  const match2 = raw.match(/sy?(\d{2})(\d{2})/i);
  if (match2) return 2000 + parseInt(match2[1], 10);
  return 0;
};

/**
 * Resolves starting calendar year from either a school year label, code, or UUID matching schoolYears.
 */
export const resolveSchoolYearStartYear = (
  schoolYearValue?: string | null,
  schoolYears?: SchoolYear[],
): number => {
  if (!schoolYearValue) return 0;
  const directYear = parseSchoolYearStartYear(schoolYearValue);
  if (directYear > 0) return directYear;

  if (schoolYears && schoolYears.length > 0) {
    const raw = String(schoolYearValue).trim().toLowerCase();
    const matchedSy = schoolYears.find(
      (sy) => String(sy.id).trim().toLowerCase() === raw ||
              String(sy.label).trim().toLowerCase() === raw,
    );
    if (matchedSy?.label) {
      return parseSchoolYearStartYear(matchedSy.label);
    }
  }
  return 0;
};

/**
 * Returns true if targetSchoolYear is strictly earlier than activeSchoolYear.
 */
export const isPreviousSchoolYear = (
  targetSchoolYear?: string | null,
  activeSchoolYear?: string | null,
  schoolYears?: SchoolYear[],
): boolean => {
  const targetYear = resolveSchoolYearStartYear(targetSchoolYear, schoolYears);
  const activeYear = resolveSchoolYearStartYear(activeSchoolYear, schoolYears);
  if (!targetYear || !activeYear) return false;
  return targetYear < activeYear;
};

/**
 * Checks if a given grade level or section string is Grade 12.
 */
export const isGrade12 = (gradeLevel?: string | GradeLevel | null): boolean => {
  const raw = String(gradeLevel || '').trim().toLowerCase();
  if (!raw) return false;
  if (raw === 'grade 12' || raw === 'grade12' || raw === '12' || raw === 'g12') return true;
  if (raw.includes('grade 12') || raw.includes('grade-12') || raw.includes('gr. 12') || raw.includes('gr 12') || raw.includes('g-12') || raw.includes('g12')) return true;
  if (/\b(?:g|grade|gr\.?)\s*12\b/i.test(raw)) return true;
  if (/^12\s*[-–—]/.test(raw)) return true;
  return false;
};

export interface PreviousGrade12Info {
  schoolYear: string;
  sectionName?: string;
  gradeLevel: string;
}

/**
 * Inspects a learner's enrollment history, section, or school year to see if they completed Grade 12
 * in a school year prior to the given active school year.
 */
export const findLearnerPreviousGrade12Record = (
  learner: Student,
  activeSchoolYearLabel: string,
  sections?: Section[],
  schoolYears?: SchoolYear[],
): PreviousGrade12Info | null => {
  const activeYearNum = resolveSchoolYearStartYear(activeSchoolYearLabel, schoolYears);
  if (!activeYearNum) return null;

  // 1. Check enrollment history (sorted or scanned for previous year Grade 12)
  const history: EnrollmentRecord[] = Array.isArray(learner.enrollments) ? learner.enrollments : [];
  for (const entry of history) {
    const entryYearNum = resolveSchoolYearStartYear(entry.schoolYear, schoolYears);
    const entryGrade =
      entry.gradeLevel ||
      (entry as any).submissionPayload?.gradeLevel ||
      (entry as any).submissionPayload?.gradeToEnroll ||
      (entry as any).grade_level;

    if (entryYearNum > 0 && entryYearNum < activeYearNum) {
      if (isGrade12(entryGrade) || isGrade12(entry.section)) {
        return {
          schoolYear: entry.schoolYear,
          sectionName: entry.section,
          gradeLevel: String(entryGrade || entry.section || 'Grade 12'),
        };
      }
    }
  }

  // 2. Check learner section linkage if section belongs to a previous school year
  if (sections && learner.sectionId) {
    const sid = String(learner.sectionId).trim();
    const section = sections.find((s) => String(s.id).trim() === sid);
    if (section && (isGrade12(section.gradeLevel) || isGrade12(section.name))) {
      const sectionYearNum = resolveSchoolYearStartYear(section.schoolYearId, schoolYears);
      if (sectionYearNum > 0 && sectionYearNum < activeYearNum) {
        return {
          schoolYear: section.schoolYearId,
          sectionName: section.name,
          gradeLevel: String(section.gradeLevel || 'Grade 12'),
        };
      }
    }
  }

  // 3. Check learner's own schoolYear and section/payload
  const learnerYearNum = resolveSchoolYearStartYear(learner.schoolYear, schoolYears);
  if (learnerYearNum > 0 && learnerYearNum < activeYearNum) {
    if (sections && learner.sectionId) {
      const section = sections.find((s) => String(s.id).trim() === String(learner.sectionId).trim());
      if (section && (isGrade12(section.gradeLevel) || isGrade12(section.name))) {
        return {
          schoolYear: learner.schoolYear || section.schoolYearId,
          sectionName: section.name,
          gradeLevel: String(section.gradeLevel || 'Grade 12'),
        };
      }
    }

    const learnerDirectGrade =
      (learner as any).gradeLevel ||
      (learner as any).grade_level ||
      (learner as any).lastGradeLevel ||
      (learner as any).last_grade_level;
    if (isGrade12(learnerDirectGrade)) {
      return {
        schoolYear: learner.schoolYear,
        gradeLevel: String(learnerDirectGrade),
      };
    }
  }

  return null;
};

/**
 * Checks if a learner is actively enrolled / re-enrolled in the active school year.
 */
export const isLearnerActivelyEnrolledInYear = (
  learner: Student,
  activeSchoolYearId: string,
  activeSchoolYearLabel: string,
  sections?: Section[],
  schoolYears?: SchoolYear[],
): boolean => {
  const activeYearNum = resolveSchoolYearStartYear(activeSchoolYearLabel, schoolYears);
  const activeNormalized = normalizeSchoolYearKey(activeSchoolYearLabel);

  if (sections && learner.sectionId) {
    const sid = String(learner.sectionId).trim();
    const currentSection = sections.find((s) => String(s.id).trim() === sid);
    if (currentSection) {
      if (
        currentSection.schoolYearId === activeSchoolYearId ||
        normalizeSchoolYearKey(currentSection.schoolYearId) === activeNormalized
      ) {
        return true;
      }
      const sectionYearNum = resolveSchoolYearStartYear(currentSection.schoolYearId, schoolYears);
      if (activeYearNum > 0 && sectionYearNum === activeYearNum) {
        return true;
      }
    }
  }

  if (learner.schoolYear) {
    if (normalizeSchoolYearKey(learner.schoolYear) === activeNormalized) {
      return true;
    }
    const learnerYearNum = resolveSchoolYearStartYear(learner.schoolYear, schoolYears);
    if (activeYearNum > 0 && learnerYearNum === activeYearNum) {
      return true;
    }
  }

  const history: EnrollmentRecord[] = Array.isArray(learner.enrollments) ? learner.enrollments : [];
  return history.some((entry) => {
    if (normalizeSchoolYearKey(entry.schoolYear) === activeNormalized) return true;
    const entryYearNum = resolveSchoolYearStartYear(entry.schoolYear, schoolYears);
    return activeYearNum > 0 && entryYearNum === activeYearNum;
  });
};

/**
 * Core rule: A Grade 12 learner from a school year prior to the active school year
 * that is not re-enrolled in the current school year is automatically understood
 * and considered as having Graduate status.
 */
export const isPreviousYearGrade12Graduate = (
  learner: Student,
  activeSchoolYearLabel: string,
  sections?: Section[],
  activeSchoolYearId?: string,
  schoolYears?: SchoolYear[],
): boolean => {
  // If actively enrolled/re-enrolled in the current active school year, they are current students
  if (activeSchoolYearId && isLearnerActivelyEnrolledInYear(learner, activeSchoolYearId, activeSchoolYearLabel, sections, schoolYears)) {
    return false;
  }

  const prevGrade12 = findLearnerPreviousGrade12Record(learner, activeSchoolYearLabel, sections, schoolYears);
  return Boolean(prevGrade12);
};

/**
 * Resolves a learner's effective status taking automatic Grade 12 graduation into account.
 * - If learner completed Grade 12 in a previous school year and wasn't marked Transfer Out / Drop Out, returns GRADUATED.
 * - Preserves explicit Dropout or Transfer Out if recorded.
 */
export const resolveEffectiveLearnerStatus = (
  learner: Student,
  activeSchoolYearLabel: string,
  sections?: Section[],
  activeSchoolYearId?: string,
  schoolYears?: SchoolYear[],
): EnrollmentStatus => {
  const rawStatus = normalizeLearnerStatus(learner.status);

  // Preserve explicit Transfer Out and Drop Out if explicitly assigned
  if (rawStatus === EnrollmentStatus.TRANSFER_OUT || rawStatus === EnrollmentStatus.DROP_OUT) {
    return rawStatus;
  }

  // If already marked Graduated, return Graduated
  if (rawStatus === EnrollmentStatus.GRADUATED) {
    return EnrollmentStatus.GRADUATED;
  }

  // Check if they are a Grade 12 learner from a previous school year not re-enrolled
  if (isPreviousYearGrade12Graduate(learner, activeSchoolYearLabel, sections, activeSchoolYearId, schoolYears)) {
    return EnrollmentStatus.GRADUATED;
  }

  return rawStatus;
};

/**
 * Resolves the school year immediately preceding the active school year.
 */
export const resolvePreviousSchoolYear = (
  activeSchoolYear: SchoolYear,
  schoolYears?: SchoolYear[],
): { label: string; id?: string; startYear: number } | null => {
  const activeStartYear = resolveSchoolYearStartYear(activeSchoolYear.label, schoolYears);
  if (!activeStartYear) return null;

  if (schoolYears && schoolYears.length > 0) {
    const priorYears = schoolYears
      .map((sy) => ({ sy, startYear: resolveSchoolYearStartYear(sy.label, schoolYears) }))
      .filter((item) => item.startYear > 0 && item.startYear < activeStartYear)
      .sort((a, b) => b.startYear - a.startYear);

    if (priorYears.length > 0) {
      return {
        label: priorYears[0].sy.label,
        id: priorYears[0].sy.id,
        startYear: priorYears[0].startYear,
      };
    }
  }

  const priorStart = activeStartYear - 1;
  return {
    label: `${priorStart}-${priorStart + 1}`,
    startYear: priorStart,
  };
};

/**
 * Checks if a learner was enrolled or attended in a specified school year.
 */
export const wasLearnerEnrolledInYear = (
  learner: Student,
  targetYearStart: number,
  targetYearLabel?: string,
  targetYearId?: string,
  sections?: Section[],
  schoolYears?: SchoolYear[],
): boolean => {
  const targetNormalized = targetYearLabel ? normalizeSchoolYearKey(targetYearLabel) : '';

  // 1. Check enrollment history
  const history: EnrollmentRecord[] = Array.isArray(learner.enrollments) ? learner.enrollments : [];
  for (const entry of history) {
    if (targetNormalized && normalizeSchoolYearKey(entry.schoolYear) === targetNormalized) {
      return true;
    }
    const entryYear = resolveSchoolYearStartYear(entry.schoolYear, schoolYears);
    if (targetYearStart > 0 && entryYear === targetYearStart) {
      return true;
    }
  }

  // 2. Check learner's section
  if (sections && learner.sectionId) {
    const sid = String(learner.sectionId).trim();
    const section = sections.find((s) => String(s.id).trim() === sid);
    if (section) {
      if (targetYearId && section.schoolYearId === targetYearId) return true;
      if (targetNormalized && normalizeSchoolYearKey(section.schoolYearId) === targetNormalized) return true;
      const sectionYear = resolveSchoolYearStartYear(section.schoolYearId, schoolYears);
      if (targetYearStart > 0 && sectionYear === targetYearStart) return true;
    }
  }

  // 3. Check learner's schoolYear field
  if (learner.schoolYear) {
    if (targetNormalized && normalizeSchoolYearKey(learner.schoolYear) === targetNormalized) return true;
    const learnerYear = resolveSchoolYearStartYear(learner.schoolYear, schoolYears);
    if (targetYearStart > 0 && learnerYear === targetYearStart) return true;
  }

  return false;
};

/**
 * Checks if a learner was in the previous school year but not able to enroll back in the current active school year.
 * Excludes Grade 12 graduates who already completed their schooling.
 */
export const isPreviousYearUnreturnedLearner = (
  learner: Student,
  activeSchoolYear: SchoolYear,
  sections?: Section[],
  schoolYears?: SchoolYear[],
): boolean => {
  // If actively enrolled/re-enrolled in the current active school year, they returned
  if (isLearnerActivelyEnrolledInYear(learner, activeSchoolYear.id, activeSchoolYear.label, sections, schoolYears)) {
    return false;
  }

  // If graduated (e.g. Grade 12 graduate), they completed their studies rather than failing to re-enroll
  if (resolveEffectiveLearnerStatus(learner, activeSchoolYear.label, sections, activeSchoolYear.id, schoolYears) === EnrollmentStatus.GRADUATED) {
    return false;
  }

  const prevSY = resolvePreviousSchoolYear(activeSchoolYear, schoolYears);
  if (!prevSY) return false;

  return wasLearnerEnrolledInYear(learner, prevSY.startYear, prevSY.label, prevSY.id, sections, schoolYears);
};


