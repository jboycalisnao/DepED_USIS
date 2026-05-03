import { PageIntro } from '@/components/ui/PageIntro';
import { FormCatalogSection } from '../sections/FormCatalogSection';

export function FormCatalogPage() {
  return (
    <>
      <PageIntro
        eyebrow="Forms"
        title="Form patterns for school transactions"
        description="Use these controls for login, enrollment, requests, validation, and administrative workflows. Keep labels visible, field groups clear, and interactions lightweight."
      />
      <FormCatalogSection />
    </>
  );
}
