
import { Student, Section, SchoolYear, EnrollmentStatus, GradeLevel } from '../types';

export const normalizeSchoolYear = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/^sy\s*/i, '').replace(/\s+/g, ' ');
  const match = normalized.match(/(20\d{2})\s*-\s*(20\d{2})/);
  if (match) return `${match[1]}-${match[2]}`.toLowerCase();
  return normalized.toLowerCase();
};

export const findLearnerEnrollmentForYear = (learner: Student, schoolYearLabel: string) => {
  const targetYear = normalizeSchoolYear(schoolYearLabel);
  if (!targetYear) return null;
  return (learner.enrollments || []).find((entry) => normalizeSchoolYear(entry.schoolYear) === targetYear) || null;
};

export const getLearnerPlacementForYear = (
  learner: Student,
  sections: Section[],
  activeSchoolYear: SchoolYear,
) => {
  const studentSid = String(learner.sectionId || '').trim();
  const currentSection = sections.find((section) => String(section.id).trim() === studentSid);

  if (currentSection && currentSection.schoolYearId === activeSchoolYear.id) {
    return {
      gradeLevel: currentSection.gradeLevel,
      sectionLabel: `${currentSection.name}${currentSection.strand ? ` [${currentSection.strand}]` : ''}`,
      sectionId: currentSection.id,
      source: 'current' as const,
    };
  }

  const historyEntry = findLearnerEnrollmentForYear(learner, activeSchoolYear.label);
  if (historyEntry) {
    const historySectionName = String(historyEntry.section || '').trim();
    const historyGradeLevel = String(historyEntry.gradeLevel || '').trim();
    const matchingSection = sections.find((section) => {
      const sameYear = section.schoolYearId === activeSchoolYear.id;
      const sameName = historySectionName && section.name.toLowerCase() === historySectionName.toLowerCase();
      const sameGrade = !historyGradeLevel || section.gradeLevel === historyGradeLevel;
      return sameYear && sameName && sameGrade;
    });

    return {
      gradeLevel: (historyEntry.gradeLevel || matchingSection?.gradeLevel || 'Unassigned Registry') as GradeLevel | 'Unassigned Registry',
      sectionLabel: matchingSection
        ? `${matchingSection.name}${matchingSection.strand ? ` [${matchingSection.strand}]` : ''}`
        : historySectionName || 'Historical Enrollment',
      sectionId: matchingSection?.id,
      source: 'history' as const,
    };
  }

  return {
    gradeLevel: 'Unassigned Registry' as GradeLevel | 'Unassigned Registry',
    sectionLabel: 'Pending Placement',
    sectionId: undefined,
    source: 'unassigned' as const,
  };
};

export const getActiveLearnersForYear = (
  learners: Student[],
  sections: Section[],
  activeSchoolYear: SchoolYear
) => {
  const activeSectionIds = new Set(
    sections
      .filter(s => s.schoolYearId === activeSchoolYear.id)
      .map(s => s.id)
  );

  return learners.filter(l => {
    const studentSid = String(l.sectionId || '').trim();
    const hasActiveSection = studentSid && activeSectionIds.has(studentSid);
    const hasMatchingSchoolYear = normalizeSchoolYear(l.schoolYear) === normalizeSchoolYear(activeSchoolYear.label);
    const hasMatchingEnrollmentHistory = Boolean(findLearnerEnrollmentForYear(l, activeSchoolYear.label));
    
    return hasActiveSection || hasMatchingSchoolYear || hasMatchingEnrollmentHistory;
  });
};

export const calculateEnrollmentComposition = (
  activeLearners: Student[],
  sections: Section[],
  activeSchoolYear: SchoolYear
) => {
  const levels: Record<string, number> = {
    'Primary (K-6)': 0,
    'Junior High (7-10)': 0,
    'Senior High (11-12)': 0
  };

  activeLearners.forEach(l => {
    const placement = getLearnerPlacementForYear(l, sections, activeSchoolYear);
    const g = placement.gradeLevel;
    if (!g) return;
    if (!Object.values(GradeLevel).includes(g as GradeLevel)) return;
    
    const jhs = [GradeLevel.GRADE_7, GradeLevel.GRADE_8, GradeLevel.GRADE_9, GradeLevel.GRADE_10];
    const shs = [GradeLevel.GRADE_11, GradeLevel.GRADE_12];
    
    if (shs.includes(g as GradeLevel)) levels['Senior High (11-12)']++;
    else if (jhs.includes(g as GradeLevel)) levels['Junior High (7-10)']++;
    else levels['Primary (K-6)']++;
  });

  return Object.entries(levels).map(([name, count]) => ({ name, count }));
};

export const calculateGenderDemographics = (activeLearners: Student[]) => {
  const counts = { Male: 0, Female: 0, Other: 0 };
  activeLearners.forEach(l => {
    const g = (l.gender || 'Other') as keyof typeof counts;
    if (counts[g] !== undefined) counts[g]++;
    else counts.Other++;
  });
  return Object.entries(counts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
};
