// "Boats on Swiss lakes" (owner, 2026-10-19): what Lacus is, in words, for riders planning ahead,
// tourists before they travel, and for search engines and AI answers. It sits below the features
// and the lakes, out of the way of the page's main work, and uses the lakes list's type and rules.
// Plain facts only; the questions are marked up as a FAQ for search engines.
import { HOME_LAKES } from './data';

const POINTS: { title: string; text: string }[] = [
  {
    title: 'Plan before you travel',
    text: 'Pick a lake and a date, and see every boat between two piers, with changes where a trip needs them. It works for a day in July as well as for a winter Sunday, when far fewer boats run.',
  },
  {
    title: 'All twelve lakes',
    text: 'From Lake Lucerne and Lake Geneva to Lake Lugano and Lake Maggiore: about 240 piers and their regular boats, the paddle steamers included.',
  },
  {
    title: 'Timetables from the operators',
    text: 'Lacus reads the official Swiss timetable data three times a day, so seasonal changes and new piers appear as soon as the operators publish them.',
  },
  {
    title: 'Special cruises',
    text: 'Fondue, full moon and fireworks boats, with the operators’ own names, dates and prices, in the Lacus app.',
  },
];

const lakeList = HOME_LAKES.map((lake) => lake.name);
const LAKE_NAMES = `${lakeList.slice(0, -1).join(', ')} and ${lakeList[lakeList.length - 1]}`;

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Which Swiss lakes does Lacus cover?',
    a: `Twelve: ${LAKE_NAMES}.`,
  },
  {
    q: 'Do the boats run all year?',
    a: 'On many lakes they do, with far fewer boats in winter; on others the regular boats stop between late autumn and spring, and some piers are served in summer only. Lacus shows the boats that run on the date you choose.',
  },
  {
    q: 'Are Swiss travel passes valid on the boats?',
    a: 'On most regular lake boats the GA travelcard and the Swiss Travel Pass are valid, and the Half Fare travelcard gives 50% off. Special cruises are usually sold separately; each operator’s shop has the details.',
  },
  {
    q: 'Where do I buy a ticket?',
    a: 'From the boat operator. Lacus links each trip to the operator’s own web shop, and on many lines you can also buy a ticket at the pier.',
  },
  {
    q: 'Is Lacus free?',
    a: 'The website and the free app show every timetable. Lacus Premium adds picking piers on the map and the special cruises of every lake.',
  },
];

const FAQ_JSON = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: QUESTIONS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

export function HomeGuide() {
  return (
    <section className="hm-guide" aria-labelledby="hm-guide-title">
      <div className="hm-guide-head">
        <span className="hm-eyebrow">Boats on Swiss lakes</span>
        <h2 id="hm-guide-title" className="hm-guide-title">
          Every Swiss lake boat, in one timetable.
        </h2>
        <p className="hm-guide-lead">
          Lacus brings together the boat timetables of twelve Swiss lakes. Find a trip between any two piers, see which boat runs it, and plan a day on the
          water before you even arrive in Switzerland.
        </p>
      </div>

      <div className="hm-guide-points">
        {POINTS.map(({ title, text }) => (
          <div key={title} className="hm-guide-point">
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <div className="hm-guide-faq">
        <h3 className="hm-guide-faq-title">Questions riders ask</h3>
        {QUESTIONS.map(({ q, a }) => (
          <details key={q} className="hm-guide-q">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSON }} />
    </section>
  );
}
