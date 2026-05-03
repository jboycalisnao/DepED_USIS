const steps = [
  'Review the admission period and requirements.',
  'Open the application form.',
  'Complete the required learner and parent/guardian information.',
  'Upload or submit the required documents, if enabled.',
  'Wait for the school screening, examination, or results announcement.',
];

export function ApplicationProcess() {
  return (
    <section className="section-shell">
      <div className="section-shell__header">
        <p className="section-shell__eyebrow">Application Process</p>
        <h2>How to Apply</h2>
      </div>
      <ol className="process-list">
        {steps.map((step) => (
          <li className="info-card" key={step}>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
