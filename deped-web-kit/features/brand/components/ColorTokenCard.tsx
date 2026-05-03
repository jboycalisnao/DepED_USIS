import type { BrandColorToken } from '../tokens/brandTokens';

type ColorTokenCardProps = {
  token: BrandColorToken;
};

export function ColorTokenCard({ token }: ColorTokenCardProps) {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[var(--deped-line)] bg-white">
      <div
        className="min-h-[120px]"
        style={{ backgroundColor: token.value }}
        aria-hidden="true"
      />
      <div className="p-5">
        <h3 className="m-0 font-sans text-[1.35rem] font-bold tracking-[-0.03em] text-deped-ink">
          {token.name}
        </h3>
        <p className="mt-2 text-[0.92rem] font-bold text-deped-muted">{token.value}</p>
        <p className="leading-[1.7] text-deped-ink">{token.usage}</p>
        <p className="text-[0.92rem] font-medium leading-[1.7] text-deped-muted">{token.source}</p>
      </div>
    </article>
  );
}
