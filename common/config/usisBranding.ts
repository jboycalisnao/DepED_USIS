const DEFAULT_SCHOOL_NAME = 'Leon National High School';
const DEFAULT_SCHOOL_ID = '302522';

const envSchoolName = import.meta.env.VITE_USIS_SCHOOL_NAME?.trim();
const envSchoolId = import.meta.env.VITE_USIS_SCHOOL_ID?.trim();

export const USIS_SCHOOL_NAME = envSchoolName || DEFAULT_SCHOOL_NAME;
export const USIS_SCHOOL_ID = envSchoolId || DEFAULT_SCHOOL_ID;
export const USIS_FAVICON_PATH = new URL('../assets/USIS_Icon.png', import.meta.url).href;
export const USIS_HEADER_IMAGE_PATH = new URL('../assets/Leon-NHS_USIS-Header-Image.png', import.meta.url).href;
const USIS_TAB_SUFFIX = 'Leon NHS USIS';

type ApplyDocumentBrandingOptions = {
  moduleTitle: string;
};

const faviconRelList = ['icon', 'shortcut icon', 'apple-touch-icon'] as const;

function upsertFavicon(rel: (typeof faviconRelList)[number], href: string) {
  let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

export function applyDocumentBranding({ moduleTitle }: ApplyDocumentBrandingOptions) {
  document.title = `${moduleTitle} | ${USIS_TAB_SUFFIX}`;
  faviconRelList.forEach((rel) => upsertFavicon(rel, USIS_FAVICON_PATH));
}
