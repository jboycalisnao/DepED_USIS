import { useEffect, useMemo, useRef, useState } from 'react';

type SearchableSelectProps = {
  label: string;
  options: string[];
  placeholder: string;
  initialValue?: string;
};

export function SearchableSelect({
  label,
  options,
  placeholder,
  initialValue = '',
}: SearchableSelectProps) {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      option.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  return (
    <div className="catalog-label">
      <span>{label}</span>
      <div className="searchable-select" ref={rootRef}>
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
          {query ? (
            <button
              type="button"
              className="searchable-select__clear"
              aria-label={`Clear ${label}`}
              onClick={() => {
                setQuery('');
                setIsOpen(true);
              }}
            >
              ×
            </button>
          ) : null}
          <button
            type="button"
            className="searchable-select__toggle"
            aria-label={`Toggle ${label} options`}
            onClick={() => setIsOpen((open) => !open)}
          >
            ▾
          </button>
        </div>

        {isOpen ? (
          <div className="searchable-select__menu" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="searchable-select__option"
                  onClick={() => {
                    setQuery(option);
                    setIsOpen(false);
                  }}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="searchable-select__empty">
                No matching options
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
