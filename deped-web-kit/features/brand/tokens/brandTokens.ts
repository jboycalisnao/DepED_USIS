export type BrandColorToken = {
  name: string;
  variable: string;
  value: string;
  usage: string;
  source: string;
};

export const depedColors: BrandColorToken[] = [
  {
    name: 'DepEd Blue',
    variable: '--deped-blue',
    value: '#0038A8',
    usage: 'Primary headers, navigation, trust anchors, and primary buttons.',
    source: 'Seal blue, RGB 0-56-168, Pantone 286',
  },
  {
    name: 'DepEd Red',
    variable: '--deped-red',
    value: '#CE1126',
    usage: 'Important calls to action, active states, and emphasis.',
    source: 'Seal red, RGB 206-17-38, Pantone 186',
  },
  {
    name: 'DepEd Yellow',
    variable: '--deped-yellow',
    value: '#FCD116',
    usage: 'Warm highlights, badges, and subtle support accents.',
    source: 'Seal yellow, RGB 252-209-22, Pantone 116',
  },
  {
    name: 'Deep Ink',
    variable: '--deped-ink',
    value: '#12233D',
    usage: 'Readable body text and dark surfaces paired with white.',
    source: 'Derived for accessible UI use from official palette context',
  },
  {
    name: 'Soft Canvas',
    variable: '--deped-canvas',
    value: '#F5F7FB',
    usage: 'Section backgrounds, cards, and neutral page rhythm.',
    source: 'UI support tone for web consistency',
  },
  {
    name: 'White',
    variable: '--deped-white',
    value: '#FFFFFF',
    usage: 'Preferred background for official marks and clean content areas.',
    source: 'Seal white, RGB 255-255-255',
  },
];

export const typographyGuidance = [
  {
    label: 'Official identity reference',
    sample: 'DepEd identity mark',
    stack: '"Helvetica Neue", Helvetica, sans-serif',
    usage:
      'Do not replace the official DepEd wordmark typography with web fonts. The visual guide identifies REVUE for "DepEd" and Adobe Garamond Semibold for "Department of Education" in the official logo system.',
    source:
      'DepEd visual identity manual, logo typography guidance',
  },
  {
    label: 'Web-kit interface text',
    sample: 'Web form and portal text',
    stack: '"Helvetica Neue", Helvetica, sans-serif',
    usage:
      'Use Helvetica for headings, labels, helper text, body copy, and form content inside DepED-Web-Kit. This is a web interface rule, not a replacement for official logo typography.',
    source:
      'Web-kit standard aligned with the guide’s practical digital text direction',
  },
  {
    label: 'Operational emphasis',
    sample: 'Section tabs and compact controls',
    stack: '"Helvetica Neue", Helvetica, sans-serif',
    usage:
      'Use heavier weight and tighter spacing for tabs, chips, status labels, and compact navigation while staying within the same Helvetica family.',
    source:
      'DepED-Web-Kit interface standard',
  },
];
