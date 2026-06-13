import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SchoolYear } from '../../../types';
import { useStore } from '../../../supabaseStore';

type Props = {
  schoolYears: SchoolYear[];
};

export function SchoolYearSearchableSelect({ schoolYears }: Props) {
  const store = useStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedSyId, setSelectedSyId] = useState(store.activeSchoolYear.id);

  useEffect(() => {
    setSelectedSyId(store.activeSchoolYear.id);
  }, [store.activeSchoolYear.id]);

  const selectedSchoolYear = useMemo(
    () => schoolYears.find((schoolYear) => schoolYear.id === selectedSyId) || null,
    [schoolYears, selectedSyId],
  );

  const selectedLabel = selectedSchoolYear
    ? `SY ${selectedSchoolYear.label}${selectedSchoolYear.id === store.activeSchoolYear.id ? ' (ACTIVE)' : ''}`
    : '';

  const options = useMemo(
    () =>
      schoolYears.map((schoolYear) => ({
        value: schoolYear.id,
        label: `SY ${schoolYear.label}${schoolYear.id === store.activeSchoolYear.id ? ' (ACTIVE)' : ''}`,
      })),
    [schoolYears, store.activeSchoolYear.id],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
      setQuery('');
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const selectYear = async (syId: string) => {
    setSelectedSyId(syId);
    setIsOpen(false);
    setQuery('');
    await store.setActiveSchoolYear(syId);
  };

  return (
    <div className={`election-settings__school-year-select${isOpen ? ' election-settings__school-year-select--open' : ''}`} ref={rootRef}>
      <label className="floating-field election-settings__school-year-field">
        <div className="floating-field__control election-settings__school-year-control">
          <input
            aria-label="Active School Year"
            data-has-value={Boolean(isOpen ? query || selectedLabel : selectedLabel).toString()}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder=" "
            type="text"
            value={isOpen ? query || selectedLabel : selectedLabel}
          />
          <button
            aria-label="Toggle school year options"
            className="election-settings__school-year-toggle"
            onClick={() => {
              setIsOpen((open) => !open);
              if (!isOpen) setQuery('');
            }}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
              <path
                d="M7 10l5 5 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="election-settings__school-year-label">Active School Year</span>
        </div>
      </label>

      {isOpen ? (
        <div className="election-settings__school-year-menu" ref={menuRef} role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === selectedSyId}
                className="election-settings__school-year-option"
                onClick={() => selectYear(option.value)}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="election-settings__school-year-empty">No matching school years</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
