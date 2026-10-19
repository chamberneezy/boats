// A lake's notices (src/notices.ts): a slim bar with the title on the lake's search and guide, only
// on the days a notice covers; a tap opens the details, the operator's page and when it was last
// checked. Calm, not an alarm: the delayed colour marks it, the trips themselves are already right.
import { TriangleAlert, ChevronDown, ExternalLink } from 'lucide-react';
import { useId, useState, useSyncExternalStore } from 'react';
import { activeNotices, getNotices, subscribeNotices } from '../notices';
import type { LakeNotice } from '../timetable/types';
import { todayDateString } from '../utils';

const longDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function NoticeBar({ notice }: { notice: LakeNotice }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="overflow-hidden rounded-[14px] border-l-4 border-status-delayed bg-surface-card shadow-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-3 text-left"
      >
        <TriangleAlert aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-status-delayed" strokeWidth={2} />
        <span className="flex-1 font-display text-[15px] font-medium leading-5 text-deep-lake">{notice.title}</span>
        <span className="hidden font-body text-[13px] text-stone-grey sm:inline">{open ? 'Hide' : 'Details'}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-[18px] w-[18px] shrink-0 text-alpine-sky transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-2 px-4 pb-4 pl-[46px]">
          {notice.details.map((line, i) => (
            <p key={i} className="m-0 font-body text-[15px] leading-[22px] text-deep-lake/85">
              {line}
            </p>
          ))}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-[13px] text-stone-grey">
            <a href={notice.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-alpine-sky no-underline hover:underline">
              {notice.source.name}
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
            <span>Checked {longDate(notice.updated)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** The notices `lakeId` shows on `date` (default today), or nothing. */
export function LakeNotices({ lakeId, date, className = '' }: { lakeId: string; date?: string; className?: string }) {
  const notices = useSyncExternalStore(subscribeNotices, getNotices);
  const shown = activeNotices(notices, lakeId, date ?? todayDateString());
  if (shown.length === 0) return null;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {shown.map((notice) => (
        <NoticeBar key={notice.id} notice={notice} />
      ))}
    </div>
  );
}
