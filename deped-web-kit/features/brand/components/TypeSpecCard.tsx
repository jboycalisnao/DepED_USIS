type TypeSpecCardProps = {
  label: string;
  sample: string;
  stack: string;
  usage: string;
  source: string;
};

export function TypeSpecCard({
  label,
  sample,
  stack,
  usage,
  source,
}: TypeSpecCardProps) {
  return (
    <article className="rounded-[10px] border border-[var(--deped-line)] bg-white p-5">
      <p className="mt-0 mb-0 text-[0.92rem] font-bold text-deped-muted">{label}</p>
      <h3
        className="mt-2 mb-0 font-sans text-[1.35rem] font-bold tracking-[-0.03em] text-deped-ink"
        style={{ fontFamily: stack }}
      >
        {sample}
      </h3>
      <p className="mt-2 text-[0.92rem] font-bold text-deped-muted">{stack}</p>
      <p className="leading-[1.7] text-deped-ink">{usage}</p>
      <p className="mt-[14px] text-[0.92rem] text-deped-muted">{source}</p>
    </article>
  );
}
