import { SectionShell } from '@/components/ui/SectionShell';
import { kitRoutes } from '@/features/navigation/config/routes';
import { PillarCard } from '../components/PillarCard';

export function PillarIndexSection() {
  return (
    <SectionShell
      eyebrow="Services and information"
      title="Core guidance areas"
      description="Use these sections to locate the standard for page structure, tokens, forms, and recurring web patterns."
    >
      <div className="pillar-grid">
        {kitRoutes.map((route) => (
          <PillarCard
            key={route.path}
            title={route.label}
            description={route.description}
            to={route.path}
          />
        ))}
      </div>
    </SectionShell>
  );
}
