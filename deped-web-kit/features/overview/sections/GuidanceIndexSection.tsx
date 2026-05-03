import { SectionShell } from '@/components/ui/SectionShell';
import { Link } from 'react-router-dom';

const guidanceEntries = [
  {
    name: 'Web-ready tokens',
    source: 'Foundations',
    description: 'Color, spacing, and type rules for DepED interfaces.',
    to: '/foundations',
  },
  {
    name: 'Form field catalog',
    source: 'Forms',
    description: 'Text, choice, upload, and login field patterns for data-entry screens.',
    to: '/forms',
  },
  {
    name: 'Portal layout reference',
    source: 'Patterns',
    description: 'Masthead, login, card, and service-page structure for institutional portals.',
    to: '/patterns',
  },
  {
    name: 'Operational scope',
    source: 'Overview',
    description: 'Usage constraints, target stack, and local-network design direction.',
    to: '/overview',
  },
];

export function GuidanceIndexSection() {
  return (
    <SectionShell
      eyebrow="Find guidance"
      title="Indexed references"
      description="Use this index to locate the relevant standard quickly."
    >
      <div
        className="border-t border-[var(--deped-line)]"
        role="table"
        aria-label="Guidance index"
      >
        <div
          className="grid grid-cols-1 gap-[18px] border-b border-[var(--deped-line)] py-[14px] text-[0.92rem] font-bold text-deped-muted md:grid-cols-[minmax(180px,0.95fr)_minmax(120px,0.5fr)_1.4fr]"
          role="row"
        >
          <span role="columnheader">Name</span>
          <span role="columnheader">Source</span>
          <span role="columnheader">Description</span>
        </div>
        {guidanceEntries.map((entry) => (
          <Link
            key={entry.name}
            className="grid grid-cols-1 gap-[18px] border-b border-[var(--deped-line)] py-[14px] md:grid-cols-[minmax(180px,0.95fr)_minmax(120px,0.5fr)_1.4fr]"
            to={entry.to}
            role="row"
          >
            <strong role="cell" className="text-deped-blue">
              {entry.name}
            </strong>
            <span role="cell" className="leading-[1.6] text-deped-ink">
              {entry.source}
            </span>
            <span role="cell" className="leading-[1.6] text-deped-ink">
              {entry.description}
            </span>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}
