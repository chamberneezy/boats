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
      <label className="mb-1.5 block font-heading text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11.5px]">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for a lake pier…"
          className="w-full rounded-2xl border-[1.5px] border-hairline bg-mist px-4 py-3 pl-10 text-[12px] font-medium text-slate-900 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20 sm:py-3.5 sm:pl-11 sm:text-[15px]"
        />
      </div>
      {isOpen && options.length > 0 && (
        <ul className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-2xl border border-hairline bg-white py-1 shadow-lg">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => handleSelect(option)}
                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-mist"
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
