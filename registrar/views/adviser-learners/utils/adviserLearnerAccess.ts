import type { Section, SchoolYear, Student } from '../../../types';

const normalizeName = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractAdviserUsername = (value: string) => {
  const text = String(value || '').trim().toLowerCase();
  const match = text.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : '';
};

const stripAdviserUsername = (value: string) =>
  String(value || '')
    .replace(/\s*\([^)]+\)\s*$/, '')
    .trim();

const splitTokens = (value: string) =>
  normalizeName(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);

const sharesFirstAndLastTokens = (left: string, right: string) => {
  const leftTokens = splitTokens(left);
  const rightTokens = splitTokens(right);
  if (leftTokens.length < 2 || rightTokens.length < 2) return false;
  return leftTokens[0] === rightTokens[0] && leftTokens[leftTokens.length - 1] === rightTokens[rightTokens.length - 1];
};

export type AdviserSectionGroup = {
  section: Section;
  learners: Student[];
};

export const resolveAdviserLinkedSections = (
  sections: Section[],
  coordinatorName: string,
  coordinatorUsername: string,
  activeSchoolYear: SchoolYear,
) => {
  const target = normalizeName(coordinatorName);
  const targetUsername = normalizeName(coordinatorUsername);
  if (!target && !targetUsername) return [];

  return sections.filter((section) => {
    if (String(section.schoolYearId || '').trim() !== String(activeSchoolYear.id || '').trim()) return false;
    const adviserName = String(section.adviserName || '').trim();
    const adviserUsername = normalizeName(extractAdviserUsername(adviserName));
    if (targetUsername && adviserUsername && adviserUsername === targetUsername) return true;
    const strippedAdviserName = stripAdviserUsername(adviserName);
    return normalizeName(strippedAdviserName) === target || sharesFirstAndLastTokens(strippedAdviserName, coordinatorName);
  });
};

export const groupLearnersByLinkedSection = (
  learners: Student[],
  sections: Section[],
  coordinatorName: string,
  coordinatorUsername: string,
  activeSchoolYear: SchoolYear,
): AdviserSectionGroup[] => {
  const linkedSections = resolveAdviserLinkedSections(sections, coordinatorName, coordinatorUsername, activeSchoolYear);
  const sectionIdSet = new Set(linkedSections.map((section) => String(section.id || '').trim()));

  return linkedSections
    .map((section) => ({
      section,
      learners: learners
        .filter((learner) => String(learner.sectionId || '').trim() === String(section.id || '').trim())
        .sort((a, b) => `${a.lastName}, ${a.firstName}`.toUpperCase().localeCompare(`${b.lastName}, ${b.firstName}`.toUpperCase())),
    }))
    .filter((entry) => sectionIdSet.has(String(entry.section.id || '').trim()));
};
