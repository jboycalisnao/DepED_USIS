export type RepositoryPost = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  audience: string;
  publishedOn: string;
  tags: string[];
};

export const repositoryPosts: RepositoryPost[] = [
  {
    slug: 'quarterly-assessment-calendar',
    title: 'Quarterly Assessment Calendar',
    summary: 'Published schedule for major quizzes, long tests, and quarterly performance task deadlines.',
    body:
      'This posting keeps academic assessment dates in one place so teachers and learners can plan ahead and avoid missed requirements.',
    category: 'Assessment',
    audience: 'All learners',
    publishedOn: 'June 24, 2026',
    tags: ['Quarterly', 'Assessment', 'Calendar'],
  },
  {
    slug: 'subject-advisory-grade-10',
    title: 'Grade 10 Subject Advisory',
    summary: 'Official notice for grade 10 subjects, class sections, and learning reference reminders.',
    body:
      'Use this entry for subject-specific reminders, module links, and section-level academic guidance issued by teachers or coordinators.',
    category: 'Advisory',
    audience: 'Grade 10',
    publishedOn: 'June 24, 2026',
    tags: ['Grade 10', 'Advisory', 'Subjects'],
  },
  {
    slug: 'performance-task-reference-pack',
    title: 'Performance Task Reference Pack',
    summary: 'Shared reference materials for performance tasks, rubrics, and submission formatting.',
    body:
      'Store rubrics, task briefs, and reference files together so students can access the same academic support materials from one post.',
    category: 'Learning Resource',
    audience: 'Senior High',
    publishedOn: 'June 23, 2026',
    tags: ['Rubric', 'Reference', 'Task'],
  },
  {
    slug: 'make-up-class-notice',
    title: 'Make-Up Class Notice',
    summary: 'Important schedule adjustment for a rescheduled academic session.',
    body:
      'This entry should be used when a class must move to a new time or date and the school needs one official reference post for the change.',
    category: 'Schedule',
    audience: 'Affected sections',
    publishedOn: 'June 22, 2026',
    tags: ['Schedule', 'Make-up Class', 'Notice'],
  },
  {
    slug: 'research-submission-guidelines',
    title: 'Research Submission Guidelines',
    summary: 'Posting template for school research outputs, format rules, and document naming.',
    body:
      'Keep research expectations consistent by publishing format rules, deadlines, and submission handling notes in a single academic repository post.',
    category: 'Guidelines',
    audience: 'Research classes',
    publishedOn: 'June 21, 2026',
    tags: ['Research', 'Submission', 'Guidelines'],
  },
  {
    slug: 'classroom-materials-index',
    title: 'Classroom Materials Index',
    summary: 'Index of lesson files, handouts, and supporting classroom materials.',
    body:
      'Use this area as an organized index for handouts and subject materials so teachers can point learners to one stable reference location.',
    category: 'Reference',
    audience: 'Teachers and learners',
    publishedOn: 'June 20, 2026',
    tags: ['Materials', 'Index', 'Reference'],
  },
];
