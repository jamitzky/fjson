import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Interpreter } from './fjson.mjs';
import { ModuleLoader } from './modules.mjs';

const source = readFileSync(new URL('../modules/j.fjsonl', import.meta.url), 'utf8');
const cases = JSON.parse(readFileSync(new URL('../modules/j_cases.json', import.meta.url), 'utf8'));

test('J module uses only existing fjson runtime forms', () => {
  const fj = new Interpreter();
  new ModuleLoader(fj, { j: source }).load('["@import","j"]');
  for (const item of cases)
    assert.deepEqual(fj.eval(item.program), item.expected, item.name);
  assert.throws(() => fj.eval(['@let', { '@f': ['@insert@j', '@plus'] }, ['@f', []]]));
  assert.throws(() => fj.eval(['@curry@j', '@minus', 'middle', 10]));
});
