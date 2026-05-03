import { useState } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

type FloatingInputProps = {
  label: string;
  passwordToggleTabIndex?: number;
} & InputHTMLAttributes<HTMLInputElement>;

type FloatingSelectProps = {
  label: string;
  options: { label: string; value: string }[];
} & SelectHTMLAttributes<HTMLSelectElement>;

export function FloatingInput({ label, ...props }: FloatingInputProps) {
  const { passwordToggleTabIndex, ...controlProps } = props;
  const isPasswordField = controlProps.type === 'password';
  const inputClassName = isPasswordField
    ? ['floating-field__input--password', controlProps.className].filter(Boolean).join(' ')
    : controlProps.className;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input
          {...controlProps}
          type={isPasswordField ? (isPasswordVisible ? 'text' : 'password') : controlProps.type}
          placeholder=" "
          className={inputClassName}
        />
        <span>{label}</span>
        {isPasswordField ? (
          <button
            type="button"
            className="floating-field__password-toggle"
            aria-label={isPasswordVisible ? `Hide ${label}` : `Show ${label}`}
            tabIndex={passwordToggleTabIndex}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
          >
            <PasswordVisibilityIcon visible={isPasswordVisible} />
          </button>
        ) : null}
      </div>
    </label>
  );
}

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="floating-field__password-icon">
        <path d="M3 5l16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M10.6 6.5A10.7 10.7 0 0 1 12 6.4c5.2 0 9 5.6 9 5.6a17.2 17.2 0 0 1-3.4 3.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.1 14.2A3 3 0 0 1 9.8 9.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.2 9A17.1 17.1 0 0 0 3 12s3.8 5.6 9 5.6c1.1 0 2.1-.2 3.1-.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="floating-field__password-icon">
      <path
        d="M1.8 12s4-5.8 10.2-5.8S22.2 12 22.2 12 18.2 17.8 12 17.8 1.8 12 1.8 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function FloatingSelect({ label, options, ...props }: FloatingSelectProps) {
  const hasValue = typeof props.value === 'string' && props.value.length > 0;

  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <select {...props} data-has-value={hasValue ? 'true' : 'false'}>
          {options.map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span>{label}</span>
      </div>
    </label>
  );
}
