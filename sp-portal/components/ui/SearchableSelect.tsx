import { useEffect, useMemo, useRef, useState } from 'react';

export type SearchableSelectOption = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  required?: boolean;
  value: string;
};

export function SearchableSelect({
  label,
  name,
  onChange,
  options,
  placeholder,
  required,
  value,
}: SearchableSelectProps) {
  const selectedOption = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selectedOption?.label || '');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedOption?.label || '');
  }, [selectedOption?.label]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || selectedOption?.label === query) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query, selectedOption?.label]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(selectedOption?.label || '');
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [selectedOption?.label]);

  const selectOption = (option: SearchableSelectOption) => {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
  };

  return (
    <div className="searchable-select" ref={rootRef}>
      <span className="searchable-select__label">{label}</span>
      <input name={name} required={required} type="hidden" value={value} />
      <div className="searchable-select__field">
        <input
          type="text"
          aria-label={label}
          aria-expanded={isOpen}
          aria-controls={`${name}-options`}
          role="combobox"
          value={query}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
        />
        {value ? (
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
            x
          </button>
        ) : null}
        <button
          type="button"
          className="searchable-select__toggle"
          aria-label={`Toggle ${label} options`}
          onClick={() => setIsOpen((open) => !open)}
        >
          v
        </button>
      </div>

      {isOpen ? (
        <div className="searchable-select__menu" id={`${name}-options`} role="listbox">
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
                {option.label}
              </button>
            ))
          ) : (
            <div className="searchable-select__empty">No matching options</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
