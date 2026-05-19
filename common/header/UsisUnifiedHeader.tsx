import type { FormEvent, ReactNode } from 'react';
import { USIS_HEADER_IMAGE_PATH } from '../config/usisBranding';

type UsisUnifiedHeaderProps = {
  homeHref?: string;
  searchId?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  onSearchSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: ReactNode;
};

export function UsisUnifiedHeader({
  homeHref = '/',
  actions,
}: UsisUnifiedHeaderProps) {
  return (
    <header className="kit-header usis-unified-header">
      <div className="kit-header__utility">
        <span>Leon National High School</span>
        <span className="usis-header__module-label" aria-label="Current module" />
      </div>
      <div className="kit-header__main">
        <div className="kit-header__identity">
          <a className="kit-header__logo-link" href={homeHref} aria-label="Go to module landing page">
            <img className="kit-header__logo" src={USIS_HEADER_IMAGE_PATH} alt="USIS header logo" />
          </a>
          <div className="usis-header__module-block" aria-label="Module identity">
            <span className="usis-header__module-kicker" />
            <strong className="usis-header__module-title" />
          </div>
        </div>
        {actions || null}
      </div>
    </header>
  );
}
