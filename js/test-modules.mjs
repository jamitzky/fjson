import test from 'node:test';
import assert from 'node:assert/strict';
import { Interpreter, ResolutionError } from './fjson.mjs';
import { ModuleError, ModuleLoader } from './modules.mjs';

test('standard math and logic modules load on demand', () => {
  const fj = new Interpreter(), loader = new ModuleLoader(fj);
  assert.throws(() => fj.eval(['@plus@math', 1, 2]), ResolutionError);
  assert.deepEqual(loader.load(
    '["@plus@math",40,2]\n' +
    '["@import","math"]\n' +
    '["@import","logic"]\n' +
    '["@run@logic",1,"!X",["@unify@logic","!X",42]]'), [42]);
  assert.equal(fj.eval(['@plus@math', 40, 2]), 42);
  assert.deepEqual([...loader.loaded], ['math', 'logic']);
  assert.equal(loader.load('["@import","math"]'), null);
});

test('namespace closures share an environment and imports use an explicit registry', () => {
  const fj = new Interpreter();
  const loader = new ModuleLoader(fj, {
    util: '["@import","math"]\n["@namespace","util",' +
      '{"twice":["@function",["@x"],["@inc@util",["@inc@util","@x"]]],' +
      '"inc":["@function",["@x"],["@plus@math","@x",1]]}]',
  });
  assert.equal(loader.load('["@import","util"]\n["@twice@util",40]'), 42);
  assert.throws(() => loader.load('["@namespace","util",{"inc":1}]'), ModuleError);
  assert.equal(fj.eval(['@inc@util', 41]), 42);
  assert.throws(() => loader.load('["@import","missing"]'), /unknown module/);
  assert.throws(() => loader.load('["@import","math",]'), /invalid JSONL line/);
  const cyclic = new ModuleLoader(new Interpreter(), {
    a: '["@import","b"]', b: '["@import","a"]',
  });
  assert.throws(() => cyclic.load('["@import","a"]'), /import cycle/);
  assert.equal(cyclic.loaded.size, 0);
});
