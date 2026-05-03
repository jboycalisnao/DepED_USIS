import { Link } from 'react-router-dom';

type PillarCardProps = {
  title: string;
  description: string;
  to: string;
};

export function PillarCard({ title, description, to }: PillarCardProps) {
  return (
    <article className="rounded-[10px] border border-[var(--deped-line)] bg-white p-5">
      <h3 className="m-0 font-sans text-[1.35rem] font-bold tracking-[-0.03em] text-deped-ink">
        <Link className="text-deped-blue" to={to}>
          {title}
        </Link>
      </h3>
      <p className="mb-0 leading-[1.7] text-deped-muted">{description}</p>
    </article>
  );
}
