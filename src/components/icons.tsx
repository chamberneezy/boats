// Icons Lucide does not have, drawn on its grid (24px, 2px round strokes) and built with its own
// factory so they take the same props and defaults as the rest.

import { createLucideIcon } from 'lucide-react';

// A paddle steamer, shown as its side paddle wheel: a hub and ring with eight paddle blades.
export const PaddleSteamer = createLucideIcon('PaddleSteamer', [
  ['circle', { cx: '12', cy: '12', r: '6', key: 'ring' }],
  ['circle', { cx: '12', cy: '12', r: '1.5', key: 'hub' }],
  [
    'path',
    {
      d: 'M18 12h4.5M6 12H1.5M12 6V1.5M12 18v4.5M16.24 7.76l3.19-3.19M7.76 16.24l-3.19 3.19M7.76 7.76 4.57 4.57M16.24 16.24l3.19 3.19',
      key: 'paddles',
    },
  ],
]);
