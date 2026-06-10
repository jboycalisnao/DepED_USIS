import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface UsisSearchableSelectOption {
  label: string;
  value: string;
}

interface UsisSearchableSelectProps {
  allowCustomValue?: boolean;
  allowTyping?: boolean;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  emptyQueryMessage?: string;
  floatingLabel?: boolean;
  label?: string;
  minQueryLength?: number;
  onChange: (value: string) => void;
  onQueryChange?: (query: string) => void;
  options: UsisSearchableSelectOption[];
  placeholder?: string;
  requireQueryBeforeOptions?: boolean;
  serverSearch?: boolean;
  showLabel?: boolean;
  value: string;
  forceInlineMenu?: boolean;
  forcePortalMenu?: boolean;
  required?: boolean;
}

export function UsisSearchableSelect({
  allowCustomValue = false,
  allowTyping = true,
  ariaLabel,
  className = '',
  disabled = false,
  emptyQueryMessage = 'No matching options',
  floatingLabel = false,
  label,
  minQueryLength = 0,
  onChange,
  onQueryChange,
  options,
  placeholder,
  requireQueryBeforeOptions = false,
  serverSearch = false,
  showLabel = false,
  value,
  forceInlineMenu = false,
  forcePortalMenu = false,
  required = false,
}: UsisSearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; width: number }>({
    left: 0,
    top: 0,
    width: 0,
  });
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [renderInlineInModal, setRenderInlineInModal] = useState(false);

  const selected = options.find((option) => option.value === value) || null;

  const filtered = useMemo(() => {
    if (!allowTyping) return options;
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
      const path = (event.composedPath?.() || []) as EventTarget[];
      const clickedInsideRoot = !!rootRef.current && (rootRef.current.contains(target) || path.includes(rootRef.current));
      const clickedInsideMenu = !!menuRef.current && (menuRef.current.contains(target) || path.includes(menuRef.current));
      if (clickedInsideRoot || clickedInsideMenu) return;
      if (!clickedInsideRoot) {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (forceInlineMenu) {
      setRenderInlineInModal(true);
      setPortalHost(null);
      return;
    }
    if (forcePortalMenu) {
      setRenderInlineInModal(false);
      setPortalHost(document.body);
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
    }
    const modalDialogHost = rootRef.current?.closest('.modal-dialog') as HTMLElement | null;
    const shouldRenderInline = Boolean(modalDialogHost);
    setRenderInlineInModal(shouldRenderInline);
    setPortalHost(shouldRenderInline ? null : document.body);
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
  }, [forceInlineMenu, isOpen]);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery('');
  };

  const normalizedQuery = query.trim();
  const customValueAvailable = allowCustomValue && allowTyping && normalizedQuery.length > 0 && !filtered.some((option) => option.label.toLowerCase() === normalizedQuery.toLowerCase());
  const hasValue = Boolean(value?.trim()) || Boolean(selected) || (isOpen && normalizedQuery.length > 0);
  const displayValue = isOpen ? query : selected?.label || (allowCustomValue ? value : '');

  useEffect(() => {
    if (!floatingLabel) return;

    const input = fieldRef.current?.querySelector('input') as HTMLInputElement | null;
    const labelNode = fieldRef.current?.querySelector('.searchable-select__floating-label') as HTMLElement | null;
    const labelStyle = labelNode ? window.getComputedStyle(labelNode) : null;
    const inputStyle = input ? window.getComputedStyle(input) : null;
    const labelRect = labelNode?.getBoundingClientRect() ?? null;
    const inputRect = input?.getBoundingClientRect() ?? null;
    const labelCenter = labelRect
      ? {
          x: labelRect.left + labelRect.width / 2,
          y: labelRect.top + labelRect.height / 2,
        }
      : null;
    const elementAtLabelCenter =
      labelCenter && typeof document !== 'undefined'
        ? (document.elementFromPoint(labelCenter.x, labelCenter.y) as HTMLElement | null)
        : null;
    const labelIsVisuallyHidden =
      !!labelNode &&
      (!!labelStyle &&
        (labelStyle.display === 'none' ||
          labelStyle.visibility === 'hidden' ||
          Number.parseFloat(labelStyle.opacity || '1') === 0 ||
          !labelRect ||
          labelRect.width === 0 ||
          labelRect.height === 0));

    console.warn('[UsisSearchableSelect] floating-label debug', {
      ariaLabel,
      className,
      disabled,
      floatingLabel,
      hasValue,
      isOpen,
      label: label || ariaLabel,
      labelComputed: labelStyle
        ? {
            color: labelStyle.color,
            display: labelStyle.display,
            fontSize: labelStyle.fontSize,
            opacity: labelStyle.opacity,
            top: labelStyle.top,
            transform: labelStyle.transform,
            visibility: labelStyle.visibility,
            zIndex: labelStyle.zIndex,
          }
        : null,
      labelDiagnostics: {
        hasLabelNode: !!labelNode,
        labelRect: labelRect
          ? {
              bottom: labelRect.bottom,
              height: labelRect.height,
              left: labelRect.left,
              right: labelRect.right,
              top: labelRect.top,
              width: labelRect.width,
            }
          : null,
        labelCenter,
        elementAtLabelCenter: elementAtLabelCenter
          ? {
              className: elementAtLabelCenter.className,
              tagName: elementAtLabelCenter.tagName,
            }
          : null,
        inputRect: inputRect
          ? {
              bottom: inputRect.bottom,
              height: inputRect.height,
              left: inputRect.left,
              right: inputRect.right,
              top: inputRect.top,
              width: inputRect.width,
            }
          : null,
        labelIsVisuallyHidden,
      },
      inputComputed: inputStyle
        ? {
            height: inputStyle.height,
            minHeight: inputStyle.minHeight,
            opacity: inputStyle.opacity,
            paddingRight: inputStyle.paddingRight,
            paddingTop: inputStyle.paddingTop,
            visibility: inputStyle.visibility,
          }
        : null,
      placeholder: input?.placeholder,
      renderInlineInModal,
      selectedLabel: selected?.label ?? null,
      value,
    });
  }, [ariaLabel, className, disabled, floatingLabel, hasValue, isOpen, label, renderInlineInModal, selected?.label, value]);
  const menuBody = (
    <div
      className={`searchable-select__menu${renderInlineInModal ? ' searchable-select__menu--inline' : ''}`}
      ref={menuRef}
      role="listbox"
      onWheel={(event) => {
        event.stopPropagation();
      }}
      onTouchMove={(event) => {
        event.stopPropagation();
      }}
      style={
        renderInlineInModal
          ? undefined
          : { left: `${menuPosition.left}px`, top: `${menuPosition.top}px`, width: `${menuPosition.width}px` }
      }
    >
      {customValueAvailable ? (
        <button
          type="button"
          className="searchable-select__option searchable-select__option--custom"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            selectValue(normalizedQuery);
          }}
          onClick={() => selectValue(normalizedQuery)}
        >
          Use “{normalizedQuery}”
        </button>
      ) : null}
      {filtered.length > 0 ? (
        filtered.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-selected={option.value === value}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectValue(option.value);
            }}
            onClick={() => selectValue(option.value)}
            className="searchable-select__option"
          >
            {option.label}
          </button>
        ))
      ) : (
        <div className="searchable-select__empty">
          {requireQueryBeforeOptions && query.trim().length < minQueryLength
            ? 'Type at least 1 character to search options'
            : emptyQueryMessage}
        </div>
      )}
    </div>
  );

  return (
    <div className={`searchable-select ${!allowTyping ? 'searchable-select--readonly' : ''} ${className}`.trim()} ref={rootRef}>
      {showLabel && !floatingLabel ? (
        <span className={`searchable-select__label${required ? ' searchable-select__label--required' : ''}`}>
          <span className="searchable-select__label-text">{label || ariaLabel}</span>
          {required ? <span className="searchable-select__required-marker" aria-hidden="true"> *</span> : null}
        </span>
      ) : null}
      <div className={floatingLabel ? 'floating-field searchable-select--floating' : undefined}>
        <div className={floatingLabel ? 'floating-field__control' : 'searchable-select__field'} ref={fieldRef}>
          <input
            aria-label={ariaLabel}
            aria-required={required || undefined}
            data-has-value={hasValue ? 'true' : 'false'}
            disabled={disabled}
            onChange={(event) => {
              if (!allowTyping) return;
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              onQueryChange?.(nextQuery);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (!allowCustomValue || event.key !== 'Enter') return;
              if (!normalizedQuery) return;
              event.preventDefault();
              selectValue(normalizedQuery);
            }}
            placeholder={floatingLabel ? ' ' : selected?.label || placeholder || label || ariaLabel}
            readOnly={!allowTyping}
            type="text"
            value={displayValue}
          />
          <button
            aria-label={`Toggle ${ariaLabel} options`}
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
          {floatingLabel ? (
            <div className={required ? 'searchable-select__floating-label searchable-select__label--required' : 'searchable-select__floating-label'}>
              <span className="searchable-select__label-text">{label || ariaLabel}</span>
              {required ? <span className="searchable-select__required-marker" aria-hidden="true"> *</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      {isOpen && renderInlineInModal ? menuBody : null}
      {isOpen && !renderInlineInModal && typeof document !== 'undefined' && portalHost
        ? createPortal(menuBody, portalHost)
        : null}
    </div>
  );
}
