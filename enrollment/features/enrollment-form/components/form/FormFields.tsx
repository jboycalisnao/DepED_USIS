import { useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { UsisSearchableSelect } from '../../../../../common/components/ui/UsisSearchableSelect';
import { UsisDateTimePicker } from '../../../../../common/components/ui/UsisDateTimePicker';
import { buildPreviousSchoolYearOptions } from '../../utils/enrollmentFormUtils';

type BaseFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  required?: boolean;
  inputMode?: 'text' | 'search' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal';
  maxLength?: number;
  pattern?: string;
  type?: string;
  disabled?: boolean;
  digitGuideLength?: number;
};

export function TextField({ label, value, onChange, onFocus, required = false, inputMode, maxLength, pattern, type = 'text', disabled = false, digitGuideLength }: BaseFieldProps) {
  const shouldPreserveCase = type === 'email';
  const guidedEntryRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef<HTMLSpanElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const rawValue = String(value || '');
  const normalizedValue = digitGuideLength ? rawValue.replace(/\D/g, '').slice(0, digitGuideLength) : rawValue;
  const hasValue = Boolean(normalizedValue.trim());
  const guideValue = digitGuideLength ? '0'.repeat(digitGuideLength) : '';
  const remainingGuide = digitGuideLength ? guideValue.slice(normalizedValue.length) : '';

  useLayoutEffect(() => {
    if (!digitGuideLength || !isFocused || disabled) return;
    const target = typedRef.current;
    const host = guidedEntryRef.current;
    if (!target || !host) return;
    const frame = window.requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      host.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [digitGuideLength, disabled, isFocused, normalizedValue]);

  const handleGuidedKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!digitGuideLength || disabled) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Backspace') {
      event.preventDefault();
      onChange(normalizedValue.slice(0, -1));
      return;
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      return;
    }
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      if (normalizedValue.length < digitGuideLength) {
        onChange(`${normalizedValue}${event.key}`.slice(0, digitGuideLength));
      }
      return;
    }
    if (event.key.length === 1) {
      event.preventDefault();
    }
  };

  const handleGuidedPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!digitGuideLength || disabled) return;
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, digitGuideLength - normalizedValue.length);
    if (!pastedDigits) return;
    onChange(`${normalizedValue}${pastedDigits}`.slice(0, digitGuideLength));
  };

  return (
    <label className="floating-field">
      <div
        className={digitGuideLength ? 'floating-field__control floating-field__control--guided' : 'floating-field__control'}
        data-has-value={hasValue ? 'true' : 'false'}
        data-disabled={disabled ? 'true' : 'false'}
      >
        {digitGuideLength ? (
          <div
            ref={guidedEntryRef}
            className="floating-field__guided-entry"
            role="textbox"
            aria-multiline="false"
            contentEditable={disabled ? false : true}
            aria-readonly={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            suppressContentEditableWarning
            spellCheck={false}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleGuidedKeyDown}
            onPaste={handleGuidedPaste}
            onMouseDown={(event) => {
              event.preventDefault();
              if (!disabled) {
                guidedEntryRef.current?.focus();
              }
            }}
          >
            <span ref={typedRef} className="floating-field__guided-typed">
              {normalizedValue}
            </span>
            {isFocused && !disabled ? (
              <span className="floating-field__guided-remaining" aria-hidden="true">
                {remainingGuide}
              </span>
            ) : null}
          </div>
        ) : (
          <input
            value={normalizedValue}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => setIsFocused(false)}
            onChange={(event) => {
              const nextValue = event.target.value;
              onChange(shouldPreserveCase ? nextValue : nextValue.toUpperCase());
            }}
            placeholder=" "
            required={required}
            inputMode={inputMode}
            maxLength={maxLength}
            pattern={pattern}
            type={type}
            disabled={disabled}
          />
        )}
        <span>{label}</span>
      </div>
    </label>
  );
}

export function DateField({ label, value, onChange, required = false, disabled = false }: BaseFieldProps) {
  return (
    <UsisDateTimePicker
      ariaLabel={label}
      label={label}
      helperText="Format: mm/dd/yyyy"
      mode="date"
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
    />
  );
}

export function SchoolYearField({
  label,
  value,
  onChange,
  schoolYear,
  disabled = false,
}: BaseFieldProps & { schoolYear: string }) {
  const options = buildPreviousSchoolYearOptions(schoolYear, 5);
  return (
    <UsisSearchableSelect
      ariaLabel={label}
      label="Previous SY"
      floatingLabel
      showLabel={false}
      value={value}
      onChange={onChange}
      disabled={disabled || options.length === 0}
      options={options}
      forceInlineMenu
      placeholder="Search previous school year"
      allowCustomValue={false}
    />
  );
}

type SelectFieldProps = BaseFieldProps & { options: Array<{ value: string; label: string }> | string[] };
export function SelectField({ label, value, onChange, options, disabled = false }: SelectFieldProps) {
  const normalizedOptions = typeof options[0] === 'string' ? (options as string[]).map((option) => ({ value: option, label: option })) : (options as Array<{ value: string; label: string }>);
  return (
    <UsisSearchableSelect
      ariaLabel={label}
      label={label}
      floatingLabel
      showLabel={false}
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={normalizedOptions}
      forceInlineMenu
    />
  );
}
