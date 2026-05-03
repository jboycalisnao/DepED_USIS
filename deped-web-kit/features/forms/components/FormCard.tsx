import type { PropsWithChildren } from 'react';

type FormCardProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function FormCard({ title, description, children }: FormCardProps) {
  return (
    <article className="rounded-[10px] border border-[var(--deped-line)] bg-white p-[22px]">
      <div className="mb-[18px] max-w-[760px]">
        <h3 className="m-0 font-sans text-[1.35rem] font-bold tracking-[-0.03em] text-deped-ink">
          {title}
        </h3>
        <p className="leading-[1.7] text-deped-muted">{description}</p>
      </div>
      {children}
    </article>
  );
}
