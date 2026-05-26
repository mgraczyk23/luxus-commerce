import * as migration_20260526_183744 from './20260526_183744';
import * as migration_20260526_201623 from './20260526_201623';

export const migrations = [
  {
    up: migration_20260526_183744.up,
    down: migration_20260526_183744.down,
    name: '20260526_183744',
  },
  {
    up: migration_20260526_201623.up,
    down: migration_20260526_201623.down,
    name: '20260526_201623'
  },
];
