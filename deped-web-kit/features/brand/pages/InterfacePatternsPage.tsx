import { PageIntro } from '@/components/ui/PageIntro';
import { InterfaceSection } from '../sections/InterfaceSection';
import { ToneSection } from '../sections/ToneSection';

export function InterfacePatternsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Patterns"
        title="Templates and recurring page structures"
        description="Use these references for mastheads, portal cards, search surfaces, and standard service-page layouts. Keep implementation direct and suitable for institutional systems."
      />
      <InterfaceSection />
      <ToneSection />
    </>
  );
}
