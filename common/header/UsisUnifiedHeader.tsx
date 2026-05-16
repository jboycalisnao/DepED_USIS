import type { FormEvent, ReactNode } from 'react';
import { USIS_HEADER_IMAGE_PATH } from '../config/usisBranding';

type UsisUnifiedHeaderProps = {
  searchId: string;
  searchLabel: string;
  searchPlaceholder?: string;
  onSearchSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: ReactNode;
};

export function UsisUnifiedHeader({
  searchId,
  searchLabel,
  searchPlaceholder = 'Keywords',
  onSearchSubmit,
  searchValue,
  onSearchChange,
  actions,
}: UsisUnifiedHeaderProps) {
  return (
    <header className="kit-header usis-unified-header">
      <div className="kit-header__utility">
        <span>Department of Education</span>
        <span className="usis-header__module-label" aria-label="Current module" />
      </div>
      <div className="kit-header__main">
        <div className="kit-header__identity">
          <img className="kit-header__logo" src={USIS_HEADER_IMAGE_PATH} alt="USIS header logo" />
          <div className="usis-header__module-block" aria-label="Module identity">
            <span className="usis-header__module-kicker" />
            <strong className="usis-header__module-title" />
          </div>
        </div>
        {actions ? (
          actions
        ) : (
          <form className="kit-header__search" role="search" onSubmit={onSearchSubmit ?? ((event) => event.preventDefault())}>
            <label htmlFor={searchId} className="sr-only">
              {searchLabel}
            </label>
            <input
              id={searchId}
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>
        )}
      </div>
    </header>
  );
}
