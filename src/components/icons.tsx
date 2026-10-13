// The two boat kinds keep the icons they always had (owner, 2026-10-13: the Lacus icon set adds only
// the car ferry): Lucide's ship for a motor vessel, and our paddle wheel, drawn on Lucide's grid
// (24px, 2px round strokes). Both are wrapped so they take the same props as the set's icons.

import { Ship, createLucideIcon } from 'lucide-react';
import type { Icon, IconProps } from '../icons/lacus';

// A paddle steamer, shown as its side paddle wheel: a hub and ring with eight paddle blades.
const PaddleWheel = createLucideIcon('PaddleSteamer', [
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

export const PaddleSteamer: Icon = (props: IconProps) => <PaddleWheel strokeWidth={2} {...(props as object)} />;
export const MotorVessel: Icon = (props: IconProps) => <Ship strokeWidth={2} {...(props as object)} />;
