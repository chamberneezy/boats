import { useMemo, useState } from 'react';
import { searchLakeLucernePiers } from '../piers';
import type { PierOption } from '../types';
import { formatDateTimeLabel } from '../utils';
import { Button } from './Button';

type Tab = 'route' | 'datetime';
type Field = 'origin' | 'destination';

interface SearchFormProps {
  origin: PierOption;
  destination: PierOption;
  date: string;
  time: string;
  onOriginChange: (pier: PierOption) => void;
  onDestinationChange: (pier: PierOption) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  // After a search the form folds into a one-line summary that re-opens on tap.
  collapsed: boolean;
  onExpand: () => void;
}

const FIELD_PLACEHOLDER = 'Select a pier';

interface PierPickerProps {
  align: 'left' | 'right';
  query: string;
  excludeId?: string;
  onPick: (pier: PierOption) => void;
}

// Suggestions for the field being typed in. With no text the popular piers are shown as
// presets (or every remaining pier once the other field is chosen).
function PierPicker({ align, query, excludeId, onPick }: PierPickerProps) {
  const options = useMemo(() => searchLakeLucernePiers(query, excludeId), [query, excludeId]);

  return (
    <ul
      role="listbox"
      className="m-0 mt-6 flex max-h-[260px] list-none flex-col gap-3 overflow-y-auto border-t border-hairline p-0 pt-5"
    >
      {options.map((pier) => (
        <li key={pier.id} role="option" aria-selected={false}>
          <button
            type="button"
            // Keep focus in the input so the list doesn't close before the tap registers.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(pier)}
            className={`block w-full cursor-pointer border-0 bg-transparent py-0.5 font-body text-base text-deep-lake ${
              align === 'right' ? 'text-right' : 'text-left'
            }`}
          >
            {pier.name}
          </button>
        </li>
      ))}
      {options.length === 0 && <li className="font-body text-sm text-stone-grey">No matching pier.</li>}
    </ul>
  );
}

interface PierFieldProps {
  label: string;
  align: 'left' | 'right';
  pier: PierOption;
  // Text being typed while the field is active; null when the field is at rest.
  draft: string | null;
  onFocus: () => void;
  onBlur: () => void;
  onDraftChange: (text: string) => void;
  onEnter: () => void;
  onEscape: () => void;
}

function PierField({ label, align, pier, draft, onFocus, onBlur, onDraftChange, onEnter, onEscape }: PierFieldProps) {
  return (
    <label className={`block min-w-0 flex-1 ${align === 'right' ? 'text-right' : ''}`}>
      <span className="block font-body text-[13px] text-stone-grey">{label}</span>
      <input
        value={draft ?? pier.name}
        placeholder={FIELD_PLACEHOLDER}
        autoComplete="off"
        role="combobox"
        aria-expanded={draft !== null}
        onFocus={(e) => {
          e.currentTarget.select();
          onFocus();
        }}
        onBlur={onBlur}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          } else if (e.key === 'Escape') {
            onEscape();
          }
        }}
        className={`mt-0.5 w-full min-w-0 truncate border-0 bg-transparent p-0 font-display text-lg font-semibold text-deep-lake outline-none placeholder:text-stone-grey md:text-2xl ${
          align === 'right' ? 'text-right' : ''
        }`}
      />
    </label>
  );
}

export function SearchForm({
  origin,
  destination,
  date,
  time,
  onOriginChange,
  onDestinationChange,
  onDateChange,
  onTimeChange,
  onSearch,
  isLoading,
  collapsed,
  onExpand,
}: SearchFormProps) {
  const [tab, setTab] = useState<Tab>('route');
  const [activeField, setActiveField] = useState<Field | null>(null);
  // What the user has typed into the active field. null = untouched, so the suggestions
  // show the presets instead of filtering by the currently selected pier's name.
  const [typed, setTyped] = useState<string | null>(null);

  const dateTimeLabel = formatDateTimeLabel(date, time);
  const routeLabel = `${origin.name || 'Origin'} → ${destination.name || 'Destination'}`;
  const canSearch = Boolean(origin.id && destination.id) && !isLoading;

  function closePicker() {
    setActiveField(null);
    setTyped(null);
  }

  function openField(field: Field) {
    setActiveField(field);
    setTyped(null);
  }

  function swap() {
    onOriginChange(destination);
    onDestinationChange(origin);
    closePicker();
  }

  function pick(field: Field, pier: PierOption) {
    (field === 'origin' ? onOriginChange : onDestinationChange)(pier);
    closePicker();
  }

  function pickFirstMatch(field: Field) {
    const excludeId = (field === 'origin' ? destination.id : origin.id) || undefined;
    const [first] = searchLakeLucernePiers(typed ?? '', excludeId);
    if (first) pick(field, first);
  }

  if (collapsed) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onExpand();
          }
        }}
        className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-surface-card px-3.5 py-3 shadow-card md:gap-4 md:rounded-[16px] md:px-6 md:py-5"
      >
        <div className="min-w-0 flex-1">
          <div className="font-body text-[10px] text-stone-grey md:text-[11px]">Origin</div>
          <div className="truncate font-display text-sm font-semibold text-deep-lake md:text-base">{origin.name}</div>
        </div>
        <span className="text-[13px] text-stone-grey md:text-[15px]" aria-hidden="true">
          →
        </span>
        <div className="min-w-0 flex-1 text-right">
          <div className="font-body text-[10px] text-stone-grey md:text-[11px]">Destination</div>
          <div className="truncate font-display text-sm font-semibold text-deep-lake md:text-base">{destination.name}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative pt-9 md:pt-11">
        {/* The inactive tab peeks out from behind the main card. */}
        <button
          type="button"
          onClick={() => {
            setTab(tab === 'route' ? 'datetime' : 'route');
            closePicker();
          }}
          className="absolute right-6 top-0 z-[1] max-w-[62%] cursor-pointer truncate rounded-[14px] border-0 bg-surface-card px-4 pb-5 pt-3.5 font-display text-sm font-semibold text-deep-lake shadow-card md:right-8 md:max-w-[50%] md:px-[18px] md:pb-[22px] md:pt-4 md:text-[15px]"
        >
          {tab === 'route' ? dateTimeLabel : routeLabel}
        </button>

        <div className="relative z-[2] rounded-[14px] bg-surface-card p-5 shadow-card md:rounded-[16px] md:p-8">
          {tab === 'route' ? (
            <>
              <div className="flex items-center gap-3 md:gap-5">
                <PierField
                  label="Origin"
                  align="left"
                  pier={origin}
                  draft={activeField === 'origin' ? (typed ?? origin.name) : null}
                  onFocus={() => openField('origin')}
                  onBlur={closePicker}
                  onDraftChange={setTyped}
                  onEnter={() => pickFirstMatch('origin')}
                  onEscape={closePicker}
                />
                <div className="h-11 w-px bg-hairline" aria-hidden="true" />
                <button
                  type="button"
                  onClick={swap}
                  aria-label="Swap origin and destination"
                  className="cursor-pointer border-0 bg-transparent p-0 text-xl text-stone-grey"
                >
                  →
                </button>
                <div className="h-11 w-px bg-hairline" aria-hidden="true" />
                <PierField
                  label="Destination"
                  align="right"
                  pier={destination}
                  draft={activeField === 'destination' ? (typed ?? destination.name) : null}
                  onFocus={() => openField('destination')}
                  onBlur={closePicker}
                  onDraftChange={setTyped}
                  onEnter={() => pickFirstMatch('destination')}
                  onEscape={closePicker}
                />
              </div>

              {activeField && (
                <PierPicker
                  key={activeField}
                  align={activeField === 'origin' ? 'left' : 'right'}
                  query={typed ?? ''}
                  excludeId={(activeField === 'origin' ? destination.id : origin.id) || undefined}
                  onPick={(pier) => pick(activeField, pier)}
                />
              )}
            </>
          ) : (
            <>
              <div className="font-body text-[13px] text-stone-grey">Date and time</div>
              <div className="mt-1 font-display text-[22px] font-semibold text-deep-lake md:text-[28px]">{dateTimeLabel}</div>
              <div className="mt-4 grid grid-cols-2 gap-3.5 md:gap-5">
                <label className="min-w-0">
                  <span className="mb-1.5 block font-body text-sm text-deep-lake">Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => onDateChange(e.target.value)}
                    className="w-full min-w-0 rounded-[10px] border border-stone-grey bg-surface-card px-3.5 py-3 font-body text-base text-deep-lake outline-none focus:border-deep-lake"
                  />
                </label>
                <label className="min-w-0">
                  <span className="mb-1.5 block font-body text-sm text-deep-lake">Time</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => onTimeChange(e.target.value)}
                    className="w-full min-w-0 rounded-[10px] border border-stone-grey bg-surface-card px-3.5 py-3 font-body text-base text-deep-lake outline-none focus:border-deep-lake"
                  />
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={onSearch} disabled={!canSearch}>
          {isLoading ? 'Searching…' : 'Search sailings'}
        </Button>
      </div>
    </div>
  );
}
