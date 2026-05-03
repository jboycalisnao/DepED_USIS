import { ReactNode } from 'react';

interface InfoCardProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

export function InfoCard({ eyebrow, title, children }: InfoCardProps) {
  return (
    <article className="section-card">
      <div className="section-card__bar" />
      <div className="section-card__content">
        <p className="section-card__eyebrow">{eyebrow}</p>
        <h3 className="mt-2">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </article>
  );
}
