import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Interpreter } from './fjson.mjs';
import { fredData, refsData, lessonSource } from '../web/showcase.mjs';
import { tutorialGroups, tutorialSteps } from '../web/tutorial.mjs';
import { ModuleLoader } from './modules.mjs';
import { jModuleSource } from '../web/j-library.mjs';

test('guided tutorial has substantial explanations and executable steps', () => {
  assert.ok(tutorialGroups.length >= 7);
  assert.ok(tutorialSteps.length >= 25);
  const ids = new Set();
  for (const group of tutorialGroups) {
    assert.ok(group.title && group.steps.length >= 2);
    for (const item of group.steps) {
      assert.ok(!ids.has(item.id), item.id);
      ids.add(item.id);
      assert.ok(item.markdown.trim().length > 200, item.id);
      assert.ok(item.markdown.includes('`') || item.markdown.includes('**'), item.id);
      const fj = new Interpreter();
      if (item.lesson.module === 'j')
        new ModuleLoader(fj, { j: jModuleSource }).load('["@import","j"]');
      const data = item.lesson.data === 'fred' ? fredData :
        item.lesson.data === 'refs' ? refsData : { answer: 41, items: [1, 2, 3] };
      fj.eval({ '@data': ['@quote', data] });
      assert.deepEqual(fj.run(JSON.stringify(lessonSource(item.lesson))),
        item.lesson.expected, item.id);
    }
  }
  assert.equal(ids.size, tutorialSteps.length);
});
