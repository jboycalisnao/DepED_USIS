import { SectionShell } from '@/components/ui/SectionShell';
import { CodeSample } from '@/components/ui/CodeSample';
import { ColorTokenCard } from '../components/ColorTokenCard';
import { depedColors } from '../tokens/brandTokens';

const colorTokenCardCode = `type BrandColorToken = {
  name: string;
  value: string;
  usage: string;
  source: string;
};

function ColorTokenCard({ token }: { token: BrandColorToken }) {
  return (
    <article className="token-card">
      <div
        className="token-card__swatch"
        style={{ backgroundColor: token.value }}
      />
      <div className="token-card__body">
        <h3>{token.name}</h3>
        <p className="token-card__value">{token.value}</p>
        <p>{token.usage}</p>
        <p className="token-card__meta">{token.source}</p>
      </div>
    </article>
  );
}

export function PaletteExample({ tokens }: { tokens: BrandColorToken[] }) {
  return (
    <div className="token-grid">
      {tokens.map((token) => (
        <ColorTokenCard key={token.name} token={token} />
      ))}
    </div>
  );
}`;

export function ColorPaletteSection() {
  return (
    <SectionShell
      eyebrow="Foundations"
      title="Official colors translated into web-ready tokens"
      description="Primary colors come from the DepEd visual guide. Support tokens are limited to practical neutrals for forms, cards, tables, and portal layouts."
    >
      <div className="token-grid" id="palette">
        {depedColors.map((token) => (
          <ColorTokenCard key={token.variable} token={token} />
        ))}
      </div>
      <CodeSample title="Color token card usage" code={colorTokenCardCode} />
    </SectionShell>
  );
}
