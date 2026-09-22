// One entry per lake. Adding a lake means adding an entry here (and its photo/pier names in the
// app); the job itself is the same for every lake.

export interface LakeConfig {
  id: string;
  // Text found in the operator's name in the feed's agency.txt.
  agencyNameIncludes: string;
  // Route types (route_desc) that are boats. Replacement buses and the like are left out.
  boatCategories: string[];
  minTransferMinutes: number;
  maxWaitMinutes: number;
  transferMinutesByStop: Record<string, number>;
}

export const LAKES: Record<string, LakeConfig> = {
  'lake-lucerne': {
    id: 'lake-lucerne',
    agencyNameIncludes: 'Vierwaldstättersee',
    boatCategories: ['BAT', 'BAV'],
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
  'lake-zurich': {
    id: 'lake-zurich',
    // Matches "Zürichsee-Schifffahrtsgesellschaft AG (ZSG)" (agency_id 194), not the separate
    // "Zürichsee-Fähre Horgen-Meilen AG" car ferry operator.
    agencyNameIncludes: 'Zürichsee-Schifffahrtsgesellschaft',
    boatCategories: ['BAT'], // No BAV (paddle steamer) route_desc is published for this operator.
    minTransferMinutes: 5,
    maxWaitMinutes: 960,
    transferMinutesByStop: {},
  },
};
