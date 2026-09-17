import { useRef, useState, type ChangeEvent, type MouseEvent } from 'react';

export type MaabIdInputProps = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function MaabIdInput({
  value = '',
  onChange,
  disabled = false,
  label = 'MAAB ID No. (Optional)',
  className = '',
}: MaabIdInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cleanDigits = String(value || '').replace(/\D/g, '').slice(0, 7);
  const hasValue = cleanDigits.length > 0;
  const isComplete = cleanDigits.length === 7;
  const showMask = isFocused || hasValue;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextDigits = e.target.value.replace(/\D/g, '').slice(0, 7);
    onChange(nextDigits);
  };

  const handleClear = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    // Keep focus inside the input so user can type immediately
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const slots = Array.from({ length: 7 }, (_, i) => cleanDigits[i] || null);

  return (
    <label
      className={`floating-field srcy-maab-field ${className}`.trim()}
      onClick={() => inputRef.current?.focus()}
    >
      <div
        className={`floating-field__control srcy-maab-control ${isFocused ? 'srcy-maab-control--focused' : ''} ${isComplete ? 'srcy-maab-control--complete' : ''}`}
        data-has-value={hasValue ? 'true' : 'false'}
        data-disabled={disabled ? 'true' : 'false'}
      >
        {/* Underlying native input capturing keystrokes, paste, and mobile numeric keypad */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={7}
          value={cleanDigits}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className="srcy-maab-native-input"
          placeholder=" "
          autoComplete="off"
          aria-label={label}
        />

        {/* Visual 7-Slot Input Mask with Circle Icon Placeholders - only visible when focused or populated */}
        {showMask ? (
          <div className="srcy-maab-mask-row">
            <div className="srcy-maab-slots" aria-hidden="true">
              {slots.map((digit, index) => {
                const isFilled = digit !== null;
                const isCurrent = isFocused && index === cleanDigits.length && !disabled;

                return (
                  <div
                    key={index}
                    className={`srcy-maab-slot ${isFilled ? 'srcy-maab-slot--filled' : 'srcy-maab-slot--empty'} ${isCurrent ? 'srcy-maab-slot--current' : ''}`}
                  >
                    {isFilled ? (
                      <span className="srcy-maab-slot__digit">{digit}</span>
                    ) : (
                      <span
                        className="material-symbols-outlined srcy-maab-slot__circle"
                        title="Digit slot"
                      >
                        radio_button_unchecked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Vertically centered right-side controls: X clear button (when focused with value) and 7-digit counter */}
        {showMask ? (
          <div className="srcy-maab-meta" aria-hidden="true">
            {hasValue && isFocused && !disabled ? (
              <button
                type="button"
                className="srcy-maab-clear-btn"
                onMouseDown={(e) => {
                  // Prevent input blur so focus remains active
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={handleClear}
                title="Clear MAAB ID"
                aria-label="Clear MAAB ID"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            ) : null}
            <span
              className={`srcy-maab-counter ${isComplete ? 'srcy-maab-counter--complete' : ''}`}
              title="7 digits required for full MAAB ID"
            >
              {cleanDigits.length}/7
            </span>
          </div>
        ) : null}

        {/* Floating Label */}
        <span className="srcy-maab-label">{label}</span>
      </div>
    </label>
  );
}
