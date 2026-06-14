import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function getAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  if (typeof window === 'undefined') {
    return pathOrUrl;
  }

  return `${window.location.origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
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

type LearnerPortalSeoProps = {
  isAuthenticated: boolean;
};

export function LearnerPortalSeo({ isAuthenticated }: LearnerPortalSeoProps) {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const baseTitle = 'USIS School Portal';
    const sharedDescription =
      'Learner self-service access portal for grades, attendance, services, and school records.';
    const imageUrl = getAbsoluteUrl('/common/assets/Web-Kit_Header_Logo.png');
    const canonicalUrl = `${window.location.origin}${location.pathname}`;

    let title = baseTitle;
    let description = sharedDescription;
    let robots = 'index,follow';

    if (!isAuthenticated) {
      if (location.pathname.startsWith('/get-credential')) {
        title = 'Get Learner Portal Credential | USIS School Portal';
        description = 'Retrieve or prepare learner access credentials for the school portal.';
      } else {
        title = 'Learner Login | USIS School Portal';
        description = 'Sign in to the learner portal to view records, services, and school updates.';
      }
    } else {
      if (location.pathname === '/grades') {
        title = 'Grades | USIS School Portal';
        description = 'View learner grades and academic records in the school portal.';
      } else if (location.pathname === '/services') {
        title = 'Services | USIS School Portal';
        description = 'Open learner services such as attendance, documents, enrollment history, and support.';
      } else if (location.pathname === '/services/help-ticket') {
        title = 'Help Ticket | USIS School Portal';
        description = 'Submit a learner help ticket using registrar profile details and school support categories.';
      } else if (location.pathname === '/profile') {
        title = 'Profile | USIS School Portal';
        description = 'Review learner profile details in the school portal.';
      } else {
        title = 'Dashboard | USIS School Portal';
        description = sharedDescription;
      }
    }

    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/get-credential')) {
      robots = 'noindex,nofollow';
    }

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'DepED USIS');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:secure_url', imageUrl);
    upsertMeta('property', 'og:image:type', 'image/png');
    upsertMeta('property', 'og:image:width', '1826');
    upsertMeta('property', 'og:image:height', '335');
    upsertMeta('property', 'og:image:alt', title);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertMeta('name', 'twitter:image:alt', title);
    upsertLink('canonical', 'learner-portal-canonical', canonicalUrl);
  }, [isAuthenticated, location.pathname]);

  return null;
}
