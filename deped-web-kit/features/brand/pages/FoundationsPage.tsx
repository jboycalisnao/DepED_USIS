import { PageIntro } from '@/components/ui/PageIntro';
import { ColorPaletteSection } from '../sections/ColorPaletteSection';
import { TypographySection } from '../sections/TypographySection';

export function FoundationsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Foundations"
        title="Base rules for web-ready DepED interfaces"
        description="Use these tokens and type rules before adding module-specific styling. This section sets the baseline for readable, stable, and consistent web interfaces."
      />
      <ColorPaletteSection />
      <TypographySection />
    </>
  );
}
