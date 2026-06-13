import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  disabled?: boolean;
  emptyQueryMessage?: string;
  floatingLabel?: boolean;
  id?: string;
  label: string;
  minQueryLength?: number;
  onChange: (value: string) => void;
  onQueryChange?: (query: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  forceInlineMenu?: boolean;
  requireQueryBeforeOptions?: boolean;
  serverSearch?: boolean;
  showLabel?: boolean;
  value: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  disabled = false,
  emptyQueryMessage = 'No matching options',
  floatingLabel = false,
  id,
  label,
  minQueryLength = 0,
  onChange,
  onQueryChange,
  options,
  placeholder,
  forceInlineMenu = false,
  requireQueryBeforeOptions = false,
  serverSearch = false,
  showLabel = true,
  value,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, width: 0 });
  const renderInlineMenu = forceInlineMenu;
  const selectedOption = options.find((option) => option.value === value) || null;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (requireQueryBeforeOptions && normalizedQuery.length < minQueryLength) {
      return [];
    }
    if (!normalizedQuery || serverSearch) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [minQueryLength, options, query, requireQueryBeforeOptions, serverSearch]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideRoot = !!rootRef.current?.contains(target);
      const clickedInsideMenu = !!menuRef.current?.contains(target);
      if (!clickedInsideRoot && !clickedInsideMenu) {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (renderInlineMenu) return;

    const updatePosition = () => {
      const fieldRect = fieldRef.current?.getBoundingClientRect();
      if (!fieldRect) return;
      setMenuPosition({
        left: fieldRect.left,
        top: fieldRect.bottom + 8,
        width: fieldRect.width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, renderInlineMenu]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery('');
  };

  const hasValue = Boolean(value?.trim()) || Boolean(selectedOption) || (isOpen && query.trim().length > 0);

  return (
    <div
      className={`searchable-select ${renderInlineMenu && isOpen ? 'searchable-select--inline-menu-open' : ''}`.trim()}
      ref={rootRef}
      style={{ width: '100%', minWidth: 0 }}
    >
      {showLabel && !floatingLabel ? <span className="searchable-select__label">{label}</span> : null}
      <div className={floatingLabel ? 'floating-field searchable-select--floating' : undefined}>
        <div className={floatingLabel ? 'floating-field__control' : 'searchable-select__field'} ref={fieldRef}>
          <input
            aria-label={label}
            className={floatingLabel ? 'coc-input searchable-select__input' : 'searchable-select__input'}
            data-has-value={hasValue ? 'true' : 'false'}
            disabled={disabled}
            id={id}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              onQueryChange?.(nextQuery);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            placeholder={floatingLabel ? ' ' : selectedOption?.label || placeholder || label}
            type="text"
            value={isOpen ? query : selectedOption?.label || ''}
          />
          <button
            aria-label={`Toggle ${label} options`}
            className="searchable-select__toggle"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setQuery('');
              setIsOpen((open) => !open);
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
          {floatingLabel ? <span>{label}</span> : null}
        </div>
      </div>

      {isOpen && renderInlineMenu ? (
        <div ref={menuRef} className="searchable-select__menu searchable-select__menu--inline" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                aria-selected={option.value === value}
                className="searchable-select__option"
                key={option.value}
                onClick={() => selectOption(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="searchable-select__empty">
              {requireQueryBeforeOptions && query.trim().length < minQueryLength
                ? 'Type at least 1 character to search'
                : emptyQueryMessage}
            </div>
          )}
        </div>
      ) : null}
      {isOpen && !renderInlineMenu ? createPortal(
        <div
          ref={menuRef}
          className="searchable-select__menu"
          role="listbox"
          style={{
            position: 'fixed',
            left: `${menuPosition.left}px`,
            top: `${menuPosition.top}px`,
            width: `${menuPosition.width}px`,
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                aria-selected={option.value === value}
                className="searchable-select__option"
                key={option.value}
                onClick={() => selectOption(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="searchable-select__empty">
              {requireQueryBeforeOptions && query.trim().length < minQueryLength
                ? 'Type at least 1 character to search'
                : emptyQueryMessage}
            </div>
          )}
        </div>,
        document.body
      ) : null}
    </div>
  );
};

export default SearchableSelect;
