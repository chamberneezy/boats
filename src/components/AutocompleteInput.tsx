import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { searchLakeLucernePiers } from '../piers';
import type { PierOption } from '../types';

interface AutocompleteInputProps {
  label: string;
  value: PierOption;
  onSelect: (pier: PierOption) => void;
  excludeId?: string;
}

export function AutocompleteInput({ label, value, onSelect, excludeId }: AutocompleteInputProps) {
  const [inputText, setInputText] = useState(value.name);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputText(value.name);
  }, [value]);

  const options = useMemo(
    () => searchLakeLucernePiers(inputText, excludeId),
    [inputText, excludeId],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(pier: PierOption) {
    onSelect(pier);
    setInputText(pier.name);
    setIsOpen(false);
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="mb-1 block text-sm font-medium text-slate-500">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for a lake pier…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-lake-dark focus:ring-2 focus:ring-lake-dark/20"
        />
      </div>
      {isOpen && options.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => handleSelect(option)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
