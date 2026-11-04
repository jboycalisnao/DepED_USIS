import { useState } from 'react';
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
  const rawValue = String(value || '');
  const normalizedValue = digitGuideLength ? rawValue.replace(/\D/g, '').slice(0, digitGuideLength) : rawValue;
  const hasValue = Boolean(normalizedValue.trim());
  const remainingCount = digitGuideLength ? Math.max(0, digitGuideLength - normalizedValue.length) : 0;

  if (digitGuideLength) {
    return (
      <label className="floating-field">
        <div
          className="floating-field__control floating-field__control--guided"
          data-has-value={hasValue ? 'true' : 'false'}
          data-disabled={disabled ? 'true' : 'false'}
        >
          <input
            value={normalizedValue}
            onFocus={onFocus}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, digitGuideLength);
              onChange(digits);
            }}
            placeholder=" "
            required={required}
            inputMode="numeric"
            maxLength={digitGuideLength}
            pattern="[0-9]*"
            type="text"
            disabled={disabled}
            className="floating-field__guided-input"
          />
          <div className="floating-field__guided-overlay" aria-hidden="true">
            <span className="floating-field__guided-typed">{normalizedValue}</span>
            <span className="floating-field__guided-remaining">{'0'.repeat(remainingCount)}</span>
          </div>
          <span>{label}</span>
        </div>
      </label>
    );
  }

  return (
    <label className="floating-field">
      <div
        className="floating-field__control"
        data-has-value={hasValue ? 'true' : 'false'}
        data-disabled={disabled ? 'true' : 'false'}
      >
        <input
          value={normalizedValue}
          onFocus={onFocus}
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
