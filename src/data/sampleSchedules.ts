// SAMPLE DATA for the Schedules screen — copied from the design mockup, not real timetables.
// Lake Lucerne uses real departures instead (loadUpcomingDepartures); every other lake shows
// these until real per-lake data exists (see the planned backend).
import { LAKES } from '../lakes';

export interface SampleDeparture {
  time: string;
  destination: string;
}

const DEPARTURES: Record<string, SampleDeparture[]> = {
  'lake-lucerne': [{ time: '14:05', destination: 'Weggis' }, { time: '15:20', destination: 'Vitznau' }],
  'lake-geneva': [{ time: '13:40', destination: 'Montreux' }, { time: '16:15', destination: 'Lausanne' }],
  'lake-thun': [{ time: '12:50', destination: 'Interlaken' }, { time: '14:30', destination: 'Spiez' }],
  'lake-brienz': [{ time: '13:10', destination: 'Giessbach' }, { time: '15:00', destination: 'Iseltwald' }],
  'lake-zurich': [{ time: '11:45', destination: 'Rapperswil' }, { time: '14:00', destination: 'Thalwil' }],
  'lake-lugano': [{ time: '12:20', destination: 'Gandria' }, { time: '15:35', destination: 'Morcote' }],
  'lake-maggiore': [{ time: '13:00', destination: 'Ascona' }, { time: '16:40', destination: 'Locarno' }],
  'lake-constance': [{ time: '10:55', destination: 'Lindau' }, { time: '14:20', destination: 'Romanshorn' }],
  'lake-neuchatel': [{ time: '12:05', destination: 'Estavayer' }, { time: '15:10', destination: 'Yverdon' }],
  'lake-biel': [{ time: '11:30', destination: 'Erlach' }, { time: '14:45', destination: 'Twann' }],
  'lake-murten': [{ time: '13:25', destination: 'Praz' }, { time: '16:05', destination: 'Sugiez' }],
  'lake-zug': [{ time: '12:40', destination: 'Arth' }, { time: '15:50', destination: 'Cham' }],
};

export const SAMPLE_SCHEDULES = LAKES.map((lake) => ({ lake, departures: DEPARTURES[lake.id] ?? [] }));
