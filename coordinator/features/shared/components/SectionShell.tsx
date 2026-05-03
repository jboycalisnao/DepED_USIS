import { ReactNode } from 'react';

interface SectionShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function SectionShell({ eyebrow, title, description, children }: SectionShellProps) {
  return (
    <section className="section-shell">
      <div className="section-shell__header">
        <p className="section-shell__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="section-shell__description">{description}</p>
      </div>
      {children}
    </section>
  );
}
