import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { DateTime, Swap } from '../icons/lacus';
import { loadConnectedPiers } from '../connections';
import { isExactPierName, searchPiers } from '../piers';
import type { PierOption } from '../types';
import { formatDateTimeLabel } from '../utils';
import { Button } from './Button';

type Tab = 'route' | 'datetime';
type Field = 'origin' | 'destination';

interface SearchFormProps {
  lakeId: string;
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
  // From the collapsed summary: reverse the direction and search again at once.
  onSwapSearch: () => void;
}

const FIELD_PLACEHOLDER = 'Select a pier';
const EMPTY_PIER: PierOption = { id: '', name: '' };

interface PierPickerProps {
  lakeId: string;
  align: 'left' | 'right';
  query: string;
  excludeId?: string;
  allowedIds?: Set<string>;
  onPick: (pier: PierOption) => void;
}

// Suggestions for the field being typed in. With no text the popular piers are shown as
// presets (or every remaining pier with trips once the other field is chosen).
function PierPicker({ lakeId, align, query, excludeId, allowedIds, onPick }: PierPickerProps) {
  const options = useMemo(() => searchPiers(lakeId, query, excludeId, allowedIds), [lakeId, query, excludeId, allowedIds]);

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
      {options.length === 0 && (
        <li className="font-body text-sm text-stone-grey">
          {query.trim() ? 'No matching pier.' : 'No boats in the week from this date. Try another date.'}
        </li>
      )}
    </ul>
  );
}

interface PierFieldProps {
  label: string;
  align: 'left' | 'right';
  pier: PierOption;
  // Text being typed while the field is active; null when the field is at rest.
  draft: string | null;
  inputRef: Ref<HTMLInputElement>;
  onFocus: () => void;
  onBlur: () => void;
  onDraftChange: (text: string) => void;
  onEnter: () => void;
  onEscape: () => void;
}

function PierField({ label, align, pier, draft, inputRef, onFocus, onBlur, onDraftChange, onEnter, onEscape }: PierFieldProps) {
  return (
    <label className={`block min-w-0 flex-1 ${align === 'right' ? 'text-right' : ''}`}>
      <span className="block font-body text-[13px] text-stone-grey">{label}</span>
      <input
        ref={inputRef}
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
  lakeId,
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
  onSwapSearch,
}: SearchFormProps) {
  const [tab, setTab] = useState<Tab>('route');
  const [activeField, setActiveField] = useState<Field | null>(null);
  // What the user has typed into the active field. null = untouched, so the suggestions
  // show the presets instead of filtering by the currently selected pier's name.
  const [typed, setTyped] = useState<string | null>(null);
  const originInputRef = useRef<HTMLInputElement>(null);

  // For every pier, the piers a search from this date and time finds a trip to. The pickers offer
  // only those pairs, so a rider can never pick two piers that give "No trips found". Null while it
  // loads, or when the timetable package can't answer for the date (then nothing is filtered).
  const [connected, setConnected] = useState<Map<string, Set<string>> | null>(null);
  useEffect(() => {
    let cancelled = false;
    setConnected(null);
    loadConnectedPiers(date, time, lakeId).then((pairs) => {
      if (!cancelled) setConnected(pairs);
    });
    return () => {
      cancelled = true;
    };
  }, [date, time, lakeId]);

  // The piers each field may offer, given the pier in the other one.
  const allowed = useMemo(() => {
    if (!connected) return { origin: undefined, destination: undefined };
    const all = [...connected.keys()];
    const known = (id: string) => Boolean(id) && connected.has(id);
    return {
      origin: new Set(
        known(destination.id) ? all.filter((id) => connected.get(id)!.has(destination.id)) : all.filter((id) => connected.get(id)!.size > 0),
      ),
      destination: known(origin.id) ? connected.get(origin.id)! : new Set(all.filter((id) => all.some((from) => connected.get(from)!.has(id)))),
    } satisfies Record<Field, Set<string> | undefined>;
  }, [connected, origin.id, destination.id]);
  const allowedFor = (field: Field) => allowed[field];

  // Swapping is offered only when boats run the other way too.
  const canSwap = !connected || !connected.has(destination.id) || !origin.id || connected.get(destination.id)!.has(origin.id);

  // A new date or time can leave the chosen pair with no boat: the destination (and an origin with
  // no boat at all) is then cleared, so the rider picks again from what sails.
  useEffect(() => {
    if (collapsed || !connected || !origin.id || !connected.has(origin.id)) return;
    const onward = connected.get(origin.id)!;
    if (onward.size === 0) onOriginChange(EMPTY_PIER);
    if (destination.id && !onward.has(destination.id)) onDestinationChange(EMPTY_PIER);
    // Only a new answer for a new date, time or lake is checked here; picks are filtered already.
  }, [connected]);

  // Once a search has been made the form folds up. Whatever tab it was on, it must reopen on
  // the origin/destination tab when the rider taps the summary, not on date and time.
  useEffect(() => {
    if (!collapsed) return;
    setTab('route');
    setActiveField(null);
    setTyped(null);
  }, [collapsed]);

  const destinationInputRef = useRef<HTMLInputElement>(null);

  const dateTimeLabel = formatDateTimeLabel(date, time);
  const routeLabel = `${origin.name || 'Origin'} → ${destination.name || 'Destination'}`;
  const canSearch = Boolean(origin.id && destination.id) && !isLoading;

  function closePicker() {
    setActiveField(null);
    setTyped(null);
  }

  // Leaving a field the rider cleared (backspaced to empty) but never picked a new pier in must
  // actually clear it, not silently snap back to whatever was selected before - otherwise
  // deleting the destination and tapping Origin looks like it did nothing.
  function handleBlur(field: Field) {
    if (typed !== null && !typed.trim()) {
      (field === 'origin' ? onOriginChange : onDestinationChange)(EMPTY_PIER);
    }
    closePicker();
  }

  function openField(field: Field) {
    setActiveField(field);
    setTyped(null);
  }

  function swap() {
    if (!canSwap) return;
    onOriginChange(destination);
    onDestinationChange(origin);
    closePicker();
  }

  function pick(field: Field, pier: PierOption) {
    (field === 'origin' ? onOriginChange : onDestinationChange)(pier);
    closePicker();
    if (field === 'origin' && !destination.id) {
      // Origin settled: carry straight on to the destination and open its suggestions.
      destinationInputRef.current?.focus();
    } else {
      (field === 'origin' ? originInputRef : destinationInputRef).current?.blur();
    }
  }

  // Typing an exact, unambiguous name ("Weggis") picks it without needing a tap. A name that
  // is also the start of another pier ("Meggen" / "Meggenhorn") waits for an explicit choice.
  function handleTyping(field: Field, text: string) {
    setTyped(text);
    if (!text.trim()) return;
    const excludeId = (field === 'origin' ? destination.id : origin.id) || undefined;
    const matches = searchPiers(lakeId, text, excludeId, allowedFor(field));
    if (matches.length === 1 && isExactPierName(matches[0], text)) pick(field, matches[0]);
  }

  function pickFirstMatch(field: Field) {
    const excludeId = (field === 'origin' ? destination.id : origin.id) || undefined;
    const [first] = searchPiers(lakeId, typed ?? '', excludeId, allowedFor(field));
    if (first) pick(field, first);
  }

  if (collapsed) {
    // The two ends reopen the form; the swap button between them reverses the trip.
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-surface-card px-3.5 py-3 shadow-card md:gap-4 md:rounded-[16px] md:px-6 md:py-5">
        <button
          type="button"
          onClick={onExpand}
          className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
        >
          <div className="font-body text-[10px] text-stone-grey md:text-[11px]">Origin</div>
          <div className="truncate font-display text-sm font-semibold text-deep-lake md:text-base">{origin.name}</div>
        </button>
        <button
          type="button"
          onClick={onSwapSearch}
          disabled={!canSwap}
          aria-label="Swap origin and destination"
          title={canSwap ? 'Swap origin and destination' : 'No trips the other way'}
          className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-[12px] border border-hairline bg-surface-page text-deep-lake transition-colors hover:bg-surface-sunken disabled:cursor-default disabled:opacity-35 disabled:hover:bg-surface-page"
        >
          <Swap className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onExpand}
          className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-right"
        >
          <div className="font-body text-[10px] text-stone-grey md:text-[11px]">Destination</div>
          <div className="truncate font-display text-sm font-semibold text-deep-lake md:text-base">{destination.name}</div>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative pt-9 md:pt-11">
        {/* The inactive tab peeks out from behind the main card: its left edge is flush with the card and
            its padding matches the card's, so its text lines up with the fields below. */}
        <button
          type="button"
          onClick={() => {
            setTab(tab === 'route' ? 'datetime' : 'route');
            closePicker();
          }}
          className="absolute left-0 top-0 z-[1] max-w-[62%] cursor-pointer truncate rounded-[14px] border-0 bg-surface-card px-5 pb-5 pt-2 text-left font-display text-sm font-semibold text-deep-lake shadow-card md:max-w-[50%] md:px-8 md:pb-[22px] md:pt-3 md:text-[15px]"
        >
          {tab === 'route' ? dateTimeLabel : routeLabel}
        </button>

        <div className="relative z-[2] rounded-[14px] bg-surface-card p-5 shadow-card md:rounded-[16px] md:p-8">
          {/* Both tabs are always laid out in the same cell of a grid, and the inactive one is only
              hidden. The card is therefore always as tall as the taller of the two, so switching tabs
              never resizes it or moves anything below it. */}
          <div className="grid">
            <div
              className={`col-start-1 row-start-1 ${tab === 'route' ? '' : 'invisible'}`}
              aria-hidden={tab !== 'route'}
            >
              <div className="flex items-center gap-3 md:gap-5">
                <PierField
                  label="Origin"
                  align="left"
                  pier={origin}
                  draft={activeField === 'origin' ? (typed ?? origin.name) : null}
                  inputRef={originInputRef}
                  onFocus={() => openField('origin')}
                  onBlur={() => handleBlur('origin')}
                  onDraftChange={(text) => handleTyping('origin', text)}
                  onEnter={() => pickFirstMatch('origin')}
                  onEscape={closePicker}
                />
                <div className="h-11 w-px bg-hairline" aria-hidden="true" />
                <button
                  type="button"
                  onClick={swap}
                  disabled={!canSwap}
                  aria-label="Swap origin and destination"
                  title={canSwap ? 'Swap origin and destination' : 'No trips the other way'}
                  className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-[12px] border border-hairline bg-surface-page text-deep-lake transition-colors hover:bg-surface-sunken disabled:cursor-default disabled:opacity-35 disabled:hover:bg-surface-page"
                >
                  <Swap className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="h-11 w-px bg-hairline" aria-hidden="true" />
                <PierField
                  label="Destination"
                  align="right"
                  pier={destination}
                  draft={activeField === 'destination' ? (typed ?? destination.name) : null}
                  inputRef={destinationInputRef}
                  onFocus={() => openField('destination')}
                  onBlur={() => handleBlur('destination')}
                  onDraftChange={(text) => handleTyping('destination', text)}
                  onEnter={() => pickFirstMatch('destination')}
                  onEscape={closePicker}
                />
              </div>

              {activeField && (
                <PierPicker
                  key={activeField}
                  lakeId={lakeId}
                  align={activeField === 'origin' ? 'left' : 'right'}
                  query={typed ?? ''}
                  excludeId={(activeField === 'origin' ? destination.id : origin.id) || undefined}
                  allowedIds={allowedFor(activeField)}
                  onPick={(pier) => pick(activeField, pier)}
                />
              )}
            </div>
            <div
              className={`col-start-1 row-start-1 ${tab === 'datetime' ? '' : 'invisible'}`}
              aria-hidden={tab !== 'datetime'}
            >
              <div className="font-body text-[13px] text-stone-grey">Date and time</div>
              {/* The value is the control: a transparent native date-time input lies over it, so a
                  tap opens the phone's own picker (and a click opens the browser's on desktop). */}
              <div className="relative flex items-center justify-between gap-3 py-2.5">
                <span className="font-display text-[22px] font-semibold text-deep-lake md:text-[28px]">{dateTimeLabel}</span>
                <DateTime className="h-6 w-6 flex-shrink-0 text-alpine-sky" aria-hidden="true" />
                <input
                  type="datetime-local"
                  value={`${date}T${time}`}
                  onChange={(e) => {
                    const [nextDate, nextTime] = e.target.value.split('T');
                    if (nextDate && nextTime) {
                      onDateChange(nextDate);
                      onTimeChange(nextTime);
                    }
                  }}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  aria-label="Date and time"
                  className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={onSearch} disabled={!canSearch}>
          {isLoading ? 'Searching…' : 'Search trips'}
        </Button>
      </div>
    </div>
  );
}
