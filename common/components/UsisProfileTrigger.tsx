import React, { useEffect, useMemo, useRef, useState } from 'react';

type UsisProfileTriggerProps = {
  name: string;
  role?: string;
  onLogout: () => void;
  ariaLabel?: string;
};

export function UsisProfileTrigger({
  name,
  role = 'School Coordinator',
  onLogout,
  ariaLabel = 'Profile menu',
}: UsisProfileTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    const source = String(name || '').trim();
    if (!source) return 'U';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((token) => token.charAt(0).toUpperCase())
      .join('');
  }, [name]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  return (
    <div className="usis-profile-trigger" ref={rootRef}>
      <button
        type="button"
        className="usis-profile-trigger__button"
        title={role}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="usis-profile-trigger__avatar" aria-hidden="true">
          {initials}
        </span>
      </button>

      {isOpen ? (
        <div className="usis-profile-popover" role="menu" aria-label={ariaLabel}>
          <div className="usis-profile-popover__avatar" aria-hidden="true">
            {initials}
          </div>
          <p className="usis-profile-popover__name">{name}</p>
          <p className="usis-profile-popover__meta">{role}</p>
          <div className="usis-profile-popover__divider" />
          <button type="button" className="usis-profile-popover__logout" onClick={onLogout}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="usis-profile-popover__logout-icon">
              <path d="M3 4.5h10v15H3v-15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="m18 8 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

