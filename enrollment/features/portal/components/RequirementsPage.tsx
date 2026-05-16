export function RequirementsPage() {
  return (
    <main className="page-frame">
      <div className="content-width">
        <section className="section-shell enrollment-hint">
          <header className="section-shell__header">
            <p className="section-shell__eyebrow">Enrollment Module</p>
            <h2>Enrollment Requirements</h2>
            <p className="section-shell__description">
              Reference requirements for Grades 7 to 12 based on the posted enrollment advisory.
            </p>
          </header>
          <article className="notice-box enrollment-hint__box">
            <strong>Enrollment Period (From Advisory)</strong>
            <span>June 9 to 13, 2025</span>
          </article>
          <article className="notice-box enrollment-hint__box">
            <strong>Grade 7 and Grade 11</strong>
            <span>Photocopy of Birth Certificate.</span>
            <span>SF 9 (Learner&apos;s Report Card).</span>
            <span>Accomplished Basic Education Enrollment Form (BEEF).</span>
          </article>
          <article className="notice-box enrollment-hint__box">
            <strong>Grades 8 to 10 and Grade 12</strong>
            <span>SF 9 (Learner&apos;s Report Card) for transferees.</span>
            <span>Accomplished Confirmation Slip.</span>
          </article>
          <article className="notice-box enrollment-hint__box">
            <strong>Balik-Aral and Transferees (Grades 7 to 12)</strong>
            <span>Photocopy of Birth Certificate.</span>
            <span>SF 9 from school last attended.</span>
            <span>Accomplished Basic Education Enrollment Form (BEEF).</span>
          </article>
          <article className="notice-box enrollment-hint__box">
            <strong>Birth Certificate Alternative</strong>
            <span>
              If PSA Birth Certificate is unavailable, submit a birth certificate from the Local Civil Registrar or a Barangay
              Certification containing the learner&apos;s name, parents&apos; names, date of birth, and sex.
            </span>
          </article>
        </section>
      </div>
    </main>
  );
}
