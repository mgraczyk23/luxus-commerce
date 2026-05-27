import * as migration_20260526_183744 from './20260526_183744';
import * as migration_20260526_201623 from './20260526_201623';
import * as migration_20260527_131922 from './20260527_131922';
import * as migration_20260527_133754 from './20260527_133754';
import * as migration_20260527_144911 from './20260527_144911';
import * as migration_20260527_173301 from './20260527_173301';
import * as migration_20260527_182852 from './20260527_182852';
import * as migration_20260527_185508 from './20260527_185508';

export const migrations = [
  {
    up: migration_20260526_183744.up,
    down: migration_20260526_183744.down,
    name: '20260526_183744',
  },
  {
    up: migration_20260526_201623.up,
    down: migration_20260526_201623.down,
    name: '20260526_201623',
  },
  {
    up: migration_20260527_131922.up,
    down: migration_20260527_131922.down,
    name: '20260527_131922',
  },
  {
    up: migration_20260527_133754.up,
    down: migration_20260527_133754.down,
    name: '20260527_133754',
  },
  {
    up: migration_20260527_144911.up,
    down: migration_20260527_144911.down,
    name: '20260527_144911',
  },
  {
    up: migration_20260527_173301.up,
    down: migration_20260527_173301.down,
    name: '20260527_173301',
  },
  {
    up: migration_20260527_182852.up,
    down: migration_20260527_182852.down,
    name: '20260527_182852',
  },
  {
    up: migration_20260527_185508.up,
    down: migration_20260527_185508.down,
    name: '20260527_185508',
  },
];
