import { useEffect, useMemo, useRef, useState } from 'react';

export type SearchableDropdownOption = {
  value: string;
  label: string;
  meta?: string;
};

type SearchableDropdownProps = {
  label: string;
  options: SearchableDropdownOption[];
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  emptyMessage?: string;
  allowClear?: boolean;
};

export function SearchableDropdown({
  label,
  options,
  value,
  placeholder,
  onChange,
  emptyMessage = 'No matching options',
  allowClear = true,
}: SearchableDropdownProps) {
  const selectedOption = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selectedOption?.label || '');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedOption?.label || '');
  }, [selectedOption?.label]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(selectedOption?.label || '');
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [selectedOption?.label]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || selectedOption?.label === query) return options;

    return options.filter((option) =>
      `${option.label} ${option.meta || ''}`.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query, selectedOption?.label]);

  const selectOption = (option: SearchableDropdownOption) => {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
  };

  return (
    <div className="searchable-select" ref={rootRef}>
      <label className="searchable-select__label">{label}</label>
      <div className="searchable-select__field">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
        />
        {allowClear && (query || value) ? (
          <button
            type="button"
            className="searchable-select__clear"
            aria-label={`Clear ${label}`}
            onClick={() => {
              onChange('');
              setQuery('');
              setIsOpen(true);
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        ) : null}
        <button
          type="button"
          className="searchable-select__toggle"
          aria-label={`Toggle ${label} options`}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">keyboard_arrow_down</span>
        </button>
      </div>

      {isOpen ? (
        <div className="searchable-select__menu" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="searchable-select__option"
                role="option"
                aria-selected={option.value === value}
                onClick={() => selectOption(option)}
              >
                <span>{option.label}</span>
                {option.meta && <small>{option.meta}</small>}
              </button>
            ))
          ) : (
            <div className="searchable-select__empty">{emptyMessage}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
