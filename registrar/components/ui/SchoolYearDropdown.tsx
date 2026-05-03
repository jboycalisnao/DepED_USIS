import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { SchoolYear } from '../../types';

type SchoolYearDropdownProps = {
  activeSchoolYear: SchoolYear;
  schoolYears: SchoolYear[];
  onChange: (schoolYearId: string) => void;
};

export function SchoolYearDropdown({
  activeSchoolYear,
  schoolYears,
  onChange,
}: SchoolYearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(
    0,
    schoolYears.findIndex((schoolYear) => schoolYear.id === activeSchoolYear.id),
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const selectSchoolYear = (schoolYearId: string) => {
    onChange(schoolYearId);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen((current) => !current);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const offset = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (activeIndex + offset + schoolYears.length) % schoolYears.length;
    const nextSchoolYear = schoolYears[nextIndex];

    if (nextSchoolYear) {
      selectSchoolYear(nextSchoolYear.id);
    }
  };

  return (
    <div className="compact-select registrar-school-year-select" ref={rootRef}>
      <button
        type="button"
        className="compact-select__button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`School year ${activeSchoolYear.label}`}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="compact-select__label">School Year</span>
        <span className="compact-select__value">{activeSchoolYear.label}</span>
        <span className="material-symbols-outlined compact-select__icon" aria-hidden="true">
          keyboard_arrow_down
        </span>
      </button>

      {isOpen && (
        <div className="compact-select__menu" role="listbox" aria-label="School year options">
          {schoolYears.map((schoolYear) => (
            <button
              key={schoolYear.id}
              type="button"
              className="compact-select__option"
              role="option"
              aria-selected={schoolYear.id === activeSchoolYear.id}
              onClick={() => selectSchoolYear(schoolYear.id)}
            >
              <span>{schoolYear.label}</span>
              {schoolYear.isLocked && <small>Locked</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
