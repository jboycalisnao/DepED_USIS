import type { PropsWithChildren } from 'react';

type SectionShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function SectionShell({
  eyebrow,
  title,
  description,
  children,
}: SectionShellProps) {
  return (
    <section className="mt-6 bg-transparent px-[var(--page-inset)]">
      <div className="mb-[22px] max-w-[820px]">
        <p className="mb-2 text-[0.75rem] leading-[1.3] font-bold tracking-[0.16em] uppercase text-deped-ink">
          {eyebrow}
        </p>
        <h2 className="m-0 font-sans text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.08] font-bold tracking-[-0.03em] text-deped-ink">
          {title}
        </h2>
        <p className="leading-[1.7] text-deped-muted">{description}</p>
      </div>
      <div className="mt-[10px]">{children}</div>
    </section>
  );
}
