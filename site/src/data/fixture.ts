import fixtureSource from './intercity-car-6.json';
import { loadRailFixture } from './validate-fixture';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const railFixture = deepFreeze(loadRailFixture(fixtureSource));
