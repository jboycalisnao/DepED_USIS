import { useEffect } from 'react';

type StructuredData = Record<string, unknown> | Array<Record<string, unknown>>;

type PortalSeoProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  image?: string;
  structuredData?: StructuredData;
};

function getAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  if (typeof window === 'undefined') {
    return pathOrUrl;
  }

  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;

  return `${window.location.origin}${normalizedPath}`;
}

function upsertMeta(attribute: 'name' | 'property', key: string, value: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = value;
}

function upsertLink(rel: string, id: string, href: string) {
  let element = document.head.querySelector(`link#${id}`) as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement('link');
    element.id = id;
    element.rel = rel;
    document.head.appendChild(element);
  }

  element.rel = rel;
  element.href = href;
}

function upsertJsonLd(data: StructuredData) {
  let element = document.head.querySelector('#sp-portal-jsonld') as HTMLScriptElement | null;

  if (!element) {
    element = document.createElement('script');
    element.id = 'sp-portal-jsonld';
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

export function PortalSeo({
  title,
  description,
  canonicalPath,
  robots = 'index,follow',
  image = '/common/assets/Web-Kit_Header_Logo.png',
  structuredData,
}: PortalSeoProps) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.title = title;

    const canonicalUrl = getAbsoluteUrl(canonicalPath || window.location.pathname);

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'DepED USIS');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', getAbsoluteUrl(image));
    upsertMeta('property', 'og:image:secure_url', getAbsoluteUrl(image));
    upsertMeta('property', 'og:image:type', 'image/png');
    upsertMeta('property', 'og:image:width', '1826');
    upsertMeta('property', 'og:image:height', '335');
    upsertMeta('property', 'og:image:alt', title);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', getAbsoluteUrl(image));
    upsertMeta('name', 'twitter:image:alt', title);
    upsertLink('canonical', 'sp-portal-canonical', canonicalUrl);

    if (structuredData) {
      upsertJsonLd(structuredData);
    } else {
      const existing = document.head.querySelector('#sp-portal-jsonld');

      if (existing) {
        existing.remove();
      }
    }
  }, [canonicalPath, description, image, robots, structuredData, title]);

  return null;
}
