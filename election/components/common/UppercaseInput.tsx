import React from 'react';

interface UppercaseInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: boolean;
}

const UppercaseInput: React.FC<UppercaseInputProps> = ({ 
  label, 
  value, 
  onValueChange, 
  error, 
  className,
  ...props 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Enforce uppercase at the data level immediately
    onValueChange(e.target.value.toUpperCase());
  };

  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input
          {...props}
          value={value}
          onChange={handleChange}
          data-has-value={String(Boolean(String(value || '').trim()))}
          placeholder=" "
          className={`coc-input w-full ${error ? 'border-red-300 bg-red-50' : ''} ${className || ''}`}
        />
        {label ? <span>{label}</span> : null}
      </div>
    </label>
  );
};

export default UppercaseInput;
