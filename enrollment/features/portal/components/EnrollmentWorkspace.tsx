type EnrollmentWorkspaceProps = {
  currentPage: 'page1' | 'page2' | 'page3' | 'page4';
};

const pageCopy: Record<EnrollmentWorkspaceProps['currentPage'], { title: string; body: string }> = {
  page1: {
    title: 'Enrollment Dashboard',
    body: 'Manage enrollment intake windows, required forms, and status updates for current school-year enrollment.',
  },
  page2: {
    title: 'Applicant Registry',
    body: 'Review learner application records, validate entry completeness, and route records for registrar confirmation.',
  },
  page3: {
    title: 'Section Planning',
    body: 'Prepare section load distribution and monitor enrollment counts to support class-size and adviser assignment decisions.',
  },
  page4: {
    title: 'Enrollment Reports',
    body: 'Track enrollment progress by grade level and generate school-level summaries for school leadership and district reporting.',
  },
};

export function EnrollmentWorkspace({ currentPage }: EnrollmentWorkspaceProps) {
  const content = pageCopy[currentPage];

  return (
    <section className="section-shell enrollment-workspace" aria-labelledby="enrollment-workspace-title">
      <header className="section-shell__header enrollment-workspace__header">
        <p className="section-shell__eyebrow">Enrollment Module</p>
        <h2 id="enrollment-workspace-title">{content.title}</h2>
        <p className="section-shell__description">{content.body}</p>
      </header>

      <div className="enrollment-workspace__cards">
        <article className="enrollment-info-card">
          <h3>Process Note</h3>
          <p>Use this module as the central enrollment workspace for school-year setup and tracking.</p>
        </article>
        <article className="enrollment-info-card">
          <h3>Module Scope</h3>
          <p>Focused on school enrollment workflows, learner intake records, and operational reporting support.</p>
        </article>
      </div>
    </section>
  );
}
