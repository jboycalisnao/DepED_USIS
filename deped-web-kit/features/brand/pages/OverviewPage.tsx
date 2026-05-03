import { PageIntro } from '@/components/ui/PageIntro';
import { GuidanceIndexSection } from '@/features/overview/sections/GuidanceIndexSection';
import { PillarIndexSection } from '@/features/overview/sections/PillarIndexSection';

export function OverviewPage() {
  return (
    <>
      <PageIntro
        eyebrow="Overview"
        title="Design guidance for DepED web services"
        description="Mandatory visual direction, interface constraints, and reusable guidance for USIS modules. Use this site as the reference point for web-ready DepED patterns."
      />
      <PillarIndexSection />
      <GuidanceIndexSection />
    </>
  );
}
