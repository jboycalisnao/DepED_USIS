import { useEffect, useState, type FormEvent } from 'react';
import { TicketForm } from '../components/TicketForm';
import { addHelpTicket, type HelpTicketDraft, type HelpTicketRecord } from '../services/ticketStore';
import { lookupLearnerByLrn } from '../services/learnerLookup';

const initialDraft: HelpTicketDraft = {
  category: '',
  contactNo: '',
  details: '',
  gradeLevel: '',
  learnerLrn: '',
  learnerName: '',
  section: '',
  subject: '',
};

export function SubmitTicketPage() {
  const [draft, setDraft] = useState<HelpTicketDraft>(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<HelpTicketRecord | null>(null);
  const [learnerFieldsLocked, setLearnerFieldsLocked] = useState(false);

  useEffect(() => {
    const normalizedLrn = draft.learnerLrn.replace(/\D/g, '').slice(0, 12);
    if (normalizedLrn.length !== 12) {
      setLearnerFieldsLocked(false);
      setDraft((current) => {
        if (current.learnerId || current.learnerName || current.gradeLevel || current.section) {
          return { ...current, learnerId: '', learnerName: '', gradeLevel: '', section: '' };
        }
        return current;
      });
      return;
    }

    const timer = window.setTimeout(() => {
      void lookupLearnerByLrn(normalizedLrn).then((result) => {
        setDraft((current) => {
          if (current.learnerLrn !== normalizedLrn) return current;
          const nextLearnerName = result?.learnerName || '';
          const nextGradeLevel = result?.gradeLevel || '';
          const nextSection = result?.section || '';
          const nextLearnerId = result?.learnerId || '';
          if (
            current.learnerId === nextLearnerId &&
            current.learnerName === nextLearnerName &&
            current.gradeLevel === nextGradeLevel &&
            current.section === nextSection
          ) {
            return current;
          }
          return {
            ...current,
            gradeLevel: nextGradeLevel,
            learnerId: nextLearnerId,
            learnerName: nextLearnerName,
            section: nextSection,
          };
        });
        setLearnerFieldsLocked(Boolean(result));
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draft.learnerLrn]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const nextTicket = await addHelpTicket(draft);
      setNotice(nextTicket);
      setDraft(initialDraft);
      setLearnerFieldsLocked(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-shell">
      <div className="page-intro">
        <p className="page-intro__eyebrow">School Help Portal</p>
        <h1>Submit a learner help ticket.</h1>
        <p>Use the learner LRN to file a concern, then keep the generated reference number for follow-up.</p>
      </div>

      <article className="section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <h3>Submit a Ticket</h3>
          <p>Send a learner concern to the school help desk. Use the learner LRN so the office can match the request to the correct record.</p>
          {notice ? (
            <div className="notice-box">
              <strong>Ticket Submitted</strong>
              <span>Ticket submitted. Reference No. {notice.referenceNo}. Please keep this number for follow-up.</span>
            </div>
          ) : null}
          <TicketForm
            draft={draft}
            learnerFieldsLocked={learnerFieldsLocked}
            isSubmitting={isSubmitting}
            onChange={setDraft}
            onSubmit={handleSubmit}
          />
        </div>
      </article>
    </section>
  );
}
