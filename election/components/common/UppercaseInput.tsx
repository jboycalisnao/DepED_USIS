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
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {label}
        </label>
      )}
      <input
        {...props}
        value={value}
        onChange={handleChange}
        className={`coc-input w-full ${error ? 'border-red-300 bg-red-50' : ''} ${className || ''}`}
      />
    </div>
  );
};

export default UppercaseInput;