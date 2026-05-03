import { useEffect, useMemo, useRef, useState } from 'react';

type SearchableSelectOption = {
  label: string;
  value: string;
};

interface SearchableSelectProps {
  id?: string;
  label: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  value: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  label,
  onChange,
  options,
  placeholder,
  value,
}) => {
  const selectedOption = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selectedOption?.label || '');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedOption?.label || '');
  }, [selectedOption?.label]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <div className="text-left">
      <label className="mb-3 block text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500" htmlFor={id}>
        {label}
      </label>
      <div className="relative" ref={rootRef}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            id={id}
            type="text"
            value={query}
            placeholder={placeholder}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            className="w-full rounded-l-[12px] border border-r-0 border-[rgba(18,35,61,0.14)] bg-[#fbfcff] px-4 py-[14px] text-[16px] text-[#12233d] outline-none transition-all duration-200 focus:relative focus:z-[2] focus:border-[rgba(0,56,168,0.44)] focus:shadow-[0_0_0_4px_rgba(0,56,168,0.08)]"
          />
          {query ? (
            <button
              type="button"
              className="cursor-pointer border border-r-0 border-[rgba(18,35,61,0.14)] bg-[#fbfcff] px-4 font-bold text-[#0038a8] transition-colors hover:bg-[#eef4ff]"
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
            className="cursor-pointer rounded-r-[12px] border border-[rgba(18,35,61,0.14)] bg-[#fbfcff] px-4 font-bold text-[#12233d] transition-colors hover:bg-[#eef4ff]"
            aria-label={`Toggle ${label} options`}
            onClick={() => setIsOpen((open) => !open)}
          >
            ▾
          </button>
        </div>

        {isOpen ? (
          <div
            className="absolute top-[calc(100%+8px)] right-0 left-0 z-10 overflow-hidden rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-white shadow-[0_18px_36px_rgba(18,35,61,0.08)]"
            role="listbox"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="block w-full cursor-pointer border-b border-[rgba(18,35,61,0.08)] bg-white px-[14px] py-3 text-left text-[16px] text-[#12233d] transition-colors last:border-b-0 hover:bg-[#eef4ff]"
                  onClick={() => {
                    onChange(option.value);
                    setQuery(option.label);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="bg-white px-[14px] py-3 text-[16px] text-slate-500">
                No matching options
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SearchableSelect;
