import { SectionShell } from '@/components/ui/SectionShell';
import { CodeSample } from '@/components/ui/CodeSample';
import { GuidanceList } from '../components/GuidanceList';

const dos = [
  'Use official blue, red, yellow, and white as the core identity set.',
  'Keep page copy short, direct, and appropriate for school operations.',
  'Use web-ready tokens and shared form patterns before adding new UI variants.',
  'Refactor by domain so branding pieces can be reused across modules.',
];

const donts = [
  'Do not add decorative visual effects that are not required by the DepED-Web-Kit baseline.',
  'Do not use padded marketing copy or AI-style explanation for routine interface behavior.',
  'Do not design critical forms in ways that depend on heavy animation or unstable network conditions.',
  'Do not leave large mixed-responsibility files in place when a section can be separated cleanly.',
];

const toneRulesCode = `const dos = [
  'Use official blue, red, yellow, and white as the core identity set.',
  'Keep page copy short, direct, and appropriate for school operations.',
  'Use web-ready tokens and shared form patterns before adding new UI variants.',
  'Refactor by domain so branding pieces can be reused across modules.',
];

const donts = [
  'Do not add decorative visual effects that are not required by the DepED-Web-Kit baseline.',
  'Do not use padded marketing copy or AI-style explanation for routine interface behavior.',
  'Do not design critical forms in ways that depend on heavy animation or unstable network conditions.',
  'Do not leave large mixed-responsibility files in place when a section can be separated cleanly.',
];`;

export function ToneSection() {
  return (
    <SectionShell
      eyebrow="Pattern rules"
      title="Usage rules for future USIS screens"
      description="Apply these rules when building login pages, transaction forms, dashboards, and public-facing school service screens."
    >
      <div className="tone-grid">
        <div className="tone-card">
          <h3>Do</h3>
          <GuidanceList items={dos} />
        </div>
        <div className="tone-card tone-card--alt">
          <h3>Do not</h3>
          <GuidanceList items={donts} />
        </div>
      </div>
      <CodeSample title="Pattern rule source" code={toneRulesCode} />
    </SectionShell>
  );
}
