import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Interpreter } from './fjson.mjs';
import { fredData, refsData, showcaseGroups, shellGroups, lessonSource } from '../web/showcase.mjs';
import { ModuleLoader } from './modules.mjs';
import { jModuleSource } from '../web/j-library.mjs';

function session(preset, module = null) {
  const fj = new Interpreter();
  if (module === 'j') new ModuleLoader(fj, { j: jModuleSource }).load('["@import","j"]');
  const data = preset === 'fred' ? fredData : preset === 'refs' ? refsData :
    { answer: 41, items: [1, 2, 3] };
  fj.eval({ '@data': ['@quote', data] });
  return fj;
}

test('each showcase lesson is executable and has the documented result', () => {
  const ids = new Set();
  let count = 0;
  for (const group of showcaseGroups) {
    assert.ok(group.title && group.lessons.length > 0);
    for (const item of group.lessons) {
      assert.ok(!ids.has(item.id), `duplicate lesson: ${item.id}`);
      ids.add(item.id);
      assert.ok(item.note.length > 20, item.id);
      const source = lessonSource(item);
      assert.equal(source['@kommentar'], 'Hinweis: ' + item.note);
      assert.deepEqual(session(item.data, item.module).run(JSON.stringify(source)), item.expected, item.id);
      count++;
    }
  }
  assert.ok(count >= 40);
});

test('each shell snippet is executable in its data context', () => {
  let count = 0;
  for (const group of shellGroups) {
    assert.ok(group.title && group.snippets.length > 0);
    for (const item of group.snippets) {
      assert.deepEqual(session(item.data).run(JSON.stringify(item.source)), item.expected, item.title);
      count++;
    }
  }
  assert.ok(count >= 10);
});
