import { SectionShell } from '@/components/ui/SectionShell';
import { CodeSample } from '@/components/ui/CodeSample';
import { TypeSpecCard } from '../components/TypeSpecCard';
import { typographyGuidance } from '../tokens/brandTokens';

const typographyCardCode = `type TypeSpec = {
  label: string;
  sample: string;
  stack: string;
  usage: string;
  source: string;
};

function TypeSpecCard({ spec }: { spec: TypeSpec }) {
  return (
    <article className="type-card">
      <p className="type-card__label">{spec.label}</p>
      <h3 style={{ fontFamily: spec.stack }}>{spec.sample}</h3>
      <p className="type-card__stack">{spec.stack}</p>
      <p>{spec.usage}</p>
      <p className="type-card__source">{spec.source}</p>
    </article>
  );
}

export function TypographyExample({ specs }: { specs: TypeSpec[] }) {
  return (
    <div className="type-grid">
      {specs.map((spec) => (
        <TypeSpecCard key={spec.label} spec={spec} />
      ))}
    </div>
  );
}`;

export function TypographySection() {
  return (
    <SectionShell
      eyebrow="Typography"
      title="Official identity reference and web interface typography"
      description="The official DepEd identity uses its own logo typography. DepED-Web-Kit uses Helvetica for interface text only, to keep the web system consistent and practical."
    >
      <div className="type-grid">
        {typographyGuidance.map((spec) => (
          <TypeSpecCard
            key={spec.label}
            label={spec.label}
            sample={spec.sample}
            stack={spec.stack}
            usage={spec.usage}
            source={spec.source}
          />
        ))}
      </div>
      <CodeSample title="Typography card usage" code={typographyCardCode} />
    </SectionShell>
  );
}
