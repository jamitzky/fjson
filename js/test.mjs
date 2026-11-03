import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  Interpreter, LogicVar, ArityError, EvaluationError, ResolutionError,
  ResourceLimitError, parseJson,
} from './fjson.mjs';

test('README functions, declarations, defaults and closures', () => {
  const fj = new Interpreter();
  assert.equal(fj.eval(['@let', {
    '@inc': ['@function', ['@x'], ['@plus', '@x', 1]],
  }, ['@inc', 41]]), 42);
  assert.equal(fj.run('["@let", {"@inc": ["@function", {"@x": 1}, ["@plus", "@x", 1]]}, ["@plus", ["@inc"], ["@inc", 41]]]'), 44);
  fj.eval({ '@x': 41, '@y': ['@plus', '@x', 1] });
  assert.equal(fj.eval('@y'), 42);
  fj.eval({ '@n': 3 });
  fj.eval({ '@f': ['@function', { '@x': ['@plus', '@n', 1] }, '@x'] });
  fj.eval({ '@n': 99 });
  assert.equal(fj.eval(['@f']), 4);
  assert.equal(fj.eval(['@f', 7]), 7);
});

test('special forms, order, recursion and Python truthiness', () => {
  const fj = new Interpreter();
  assert.equal(fj.eval(['@if', [], 1, 2]), 2);
  assert.equal(fj.eval(['@if', {}, 1, 2]), 2);
  assert.deepEqual(fj.eval(['@and', [], '@missing']), []);
  assert.equal(fj.eval(['@or', 7, '@missing']), 7);
  assert.equal(fj.eval(['@le', 2, 3]), true);
  assert.equal(fj.eval(['@eq', true, 1]), false);
  assert.equal(fj.eval(['@apply', '@plus', [40, 2]]), 42);
  assert.deepEqual(fj.eval(['@apply', ['@function', ['@x'], '@x'],
    [['@quote', ['@missing', 2]]]]), ['@missing', 2]);
  assert.equal(fj.eval(['@letrec', {
    '@even': ['@function', ['@n'], ['@if', ['@le', '@n', 0], true,
      ['@odd', ['@minus', '@n', 1]]]],
    '@odd': ['@function', ['@n'], ['@if', ['@le', '@n', 0], false,
      ['@even', ['@minus', '@n', 1]]]],
  }, ['@even', 8]]), true);
  assert.equal(fj.eval(['@try', '@missing', 42]), 42);
  assert.throws(() => fj.eval('@missing'), ResolutionError);
  assert.throws(() => new Interpreter({ maxSteps: 20 }).eval(['@try',
    ['@letrec', { '@loop': ['@function', [], ['@loop']] }, ['@loop']], 42]),
  ResourceLimitError);
});

test('strict JSON source parsing', () => {
  assert.equal(parseJson('{"x":1}').x, 1);
  assert.throws(() => parseJson('{"x":1,"x":2}'), SyntaxError);
  assert.throws(() => parseJson('{"nested":{"x":1,"x":2}}'), SyntaxError);
  assert.throws(() => parseJson('NaN'), SyntaxError);
  assert.throws(() => parseJson('9007199254740993'), SyntaxError);
  assert.throws(() => parseJson('[1,]'), SyntaxError);
  assert.throws(() => parseJson('{"x":1} garbage'), SyntaxError);
  const fj = new Interpreter();
  assert.equal(fj.run('{"@x":41,"@y":["@plus","@x",1]}'), 42);
  assert.deepEqual(fj.eval(['@quote', { '@x': 1 }]), { '@x': 1 });
  assert.throws(() => fj.eval(['@plus', 9007199254740991, 2]), EvaluationError);
});

test('logic variables, unification, choice and occurs-check', () => {
  const fj = new Interpreter();
  const [x, again] = fj.eval(['!X', '!X']);
  assert.ok(x instanceof LogicVar);
  assert.equal(x, again);
  assert.notEqual(x, fj.eval('!X'));
  assert.equal(fj.eval(['@quote', '!X']), '!X');
  assert.deepEqual(fj.eval(['@run', 2, '!X', ['@choice',
    ['@unify', '!X', 'alice'], ['@unify', '!X', 'bob']]]), ['alice', 'bob']);
  assert.deepEqual(fj.eval(['@run', 1, '!X',
    ['@unify', '!X', ['node', '!X']]]), []);
  assert.deepEqual(fj.eval(['@run', 1, ['!X', '!X', '!Y'],
    ['@unify', 1, 1]]), [[
    { var: 'X', index: 0 }, { var: 'X', index: 0 }, { var: 'Y', index: 1 },
  ]]);
  assert.deepEqual(fj.eval(['@run', 1, ['!X', '!Y'],
    ['@unify', { left: '!X', right: '!Y' }, { right: 2, left: 1 }]]), [[1, 2]]);
  assert.throws(() => fj.eval(['@choice', 1, 2]), EvaluationError);
  fj.eval({ '@clause': ['@function', ['@person'],
    ['@unify', ['parent', '!Y', '@person'], ['parent', 'alice', 'bob']]] });
  const first = fj.eval(['@clause', 'bob']);
  const second = fj.eval(['@clause', 'bob']);
  assert.notEqual(first.left[1], second.left[1]);
  assert.deepEqual(fj.eval(['@run', 1, first.left[1], first]), ['alice']);
});

test('shared JSON examples execute', () => {
  for (const [name, expected] of [['inc', 42], ['parent', ['bob']]]) {
    const source = readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8');
    assert.deepEqual(new Interpreter().run(source), expected);
  }
});

test('shared Python and JavaScript conformance cases', () => {
  const source = readFileSync(new URL('./conformance.json', import.meta.url), 'utf8');
  for (const { name, program, expected } of parseJson(source)) {
    assert.deepEqual(new Interpreter().eval(program), JSON.parse(JSON.stringify(expected)), name);
  }
});

test('graph reference errors, options and bounded traversal', () => {
  const fj = new Interpreter();
  assert.throws(() => fj.eval(['@patho', { a: 1 }, { a: 1 }, ['a'], '!X']), ArityError);
  fj.eval({ '@broken': ['@graph', { link: { '$ref': 'missing' } }, { refs: true }] });
  assert.throws(() => fj.eval(['@run', 1, '!Target',
    ['@edgeo', '@broken', 'link', '!Target']]),
  /unknown graph reference/);
  fj.eval({ '@duplicate': ['@graph', { a: { id: 'same' }, b: { id: 'same' } }] });
  assert.throws(() => fj.eval(['@run', 1, '!Node',
    ['@nodeo', '@duplicate', 'same', '!Node']]),
  /duplicate graph id/);
  assert.throws(() => fj.eval(['@graph', {}, { refs: 1 }]), EvaluationError);
  const bounded = new Interpreter({ maxSteps: 40 });
  bounded.eval({ '@g': ['@graph', { a: [1, 2, 3, 4, 5] }] });
  assert.throws(() => bounded.eval(['@run', 10, '!Path',
    ['@patho', '@g', '!Path', '!Value']]), ResourceLimitError);
});

test('numeric and sequence errors remain bounded and explicit', () => {
  const fj = new Interpreter();
  for (const expression of [
    ['@range', 0, 10, 0], ['@mod', 1, 0], ['@mod', true, 2],
    ['@sqrt', -1], ['@pow', -1, 0.5],
  ]) assert.throws(() => fj.eval(expression), EvaluationError);
  assert.throws(() => fj.eval(['@map', '@plus', [1, 2]]), ArityError);
  assert.throws(() => fj.eval(['@filter', '@plus', 'not an array']), EvaluationError);
  assert.throws(() => new Interpreter({ maxSteps: 30 }).eval(['@range', 100]),
    ResourceLimitError);
  assert.throws(() => new Interpreter({ maxSteps: 45 }).eval(
    ['@map', ['@function', ['@x'], '@x'], Array(100).fill(1)]),
  ResourceLimitError);
});
