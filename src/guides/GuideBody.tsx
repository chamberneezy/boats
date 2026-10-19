// The guide's text in the site's type: Kanit headings, Karma body, tables as white cards with
// hairlines, questions that open and close as on Home.
import { inline, tableRows, type GuideBlock } from './markdown';

const BODY = 'm-0 font-body text-[16px] leading-[26px] text-deep-lake md:text-[17px] md:leading-[27px]';

export function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="mt-8 flex flex-col gap-5 md:mt-10">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h2':
            return (
              <h2 key={i} className="m-0 mt-8 font-display text-[24px] font-semibold leading-[30px] text-deep-lake md:mt-12 md:text-[30px] md:leading-[36px]">
                {block.lines[0]}
              </h2>
            );
          case 'p':
            return (
              <p key={i} className={BODY}>
                {inline(block.lines[0])}
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className={`${BODY} flex list-disc flex-col gap-1.5 pl-5 marker:text-alpine-sky`}>
                {block.lines.map((line, j) => (
                  <li key={j}>{inline(line)}</li>
                ))}
              </ul>
            );
          case 'table': {
            const { head, rows } = tableRows(block.lines);
            return (
              <div key={i} className="overflow-x-auto rounded-[14px] bg-surface-card shadow-card">
                <table className="w-full border-collapse font-body text-[14px] leading-5 text-deep-lake md:text-[15px]">
                  {head && (
                    <thead>
                      <tr>
                        {head.map((cell, j) => (
                          <th key={j} className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left font-display text-[13px] font-medium text-stone-grey">
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {rows.map((row, j) => (
                      <tr key={j} className="border-b border-hairline last:border-0">
                        {row.map((cell, k) => (
                          <td key={k} className={`px-4 py-3 align-top tabular-nums ${k === 0 ? 'font-display font-medium' : ''}`}>
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          case 'faq':
            return (
              <details key={i} className="group border-b border-hairline">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[17px] font-medium text-deep-lake [&::-webkit-details-marker]:hidden">
                  {block.lines[0]}
                  <span aria-hidden="true" className="font-display text-[22px] leading-none text-alpine-sky transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className={`${BODY} pb-4 text-deep-lake/80`}>{inline(block.lines[1])}</p>
              </details>
            );
          case 'hr':
            return <hr key={i} className="my-4 border-0 border-t border-hairline" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
