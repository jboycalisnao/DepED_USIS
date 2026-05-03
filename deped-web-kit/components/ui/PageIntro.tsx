type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="mt-6 max-w-[860px] border-b border-[var(--deped-line)] px-[var(--page-inset)] pb-5">
      <p className="mb-2 text-[0.75rem] leading-[1.3] font-bold tracking-[0.16em] uppercase text-deped-ink">
        {eyebrow}
      </p>
      <h1 className="m-0 font-sans text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-bold tracking-[-0.03em] text-deped-ink">
        {title}
      </h1>
      <p className="mb-0 leading-[1.7] text-deped-muted">{description}</p>
    </header>
  );
}
