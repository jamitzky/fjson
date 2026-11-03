import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildStandalone } from '../web/build-standalone.mjs';

class Element {
  constructor() {
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
    this.disabled = false;
    this.hidden = false;
    this.style = {};
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.files = [];
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.scrollHeight = 0;
  }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  append(...children) { this.children.push(...children); }
  replaceChildren() { this.children = []; }
  click() { this.clicked = true; return this.listeners.get('click')?.(); }
}

function documentFor(ids) {
  const elements = new Map(ids.map(id => [id, new Element()]));
  elements.created = [];
  globalThis.document = {
    querySelector: selector => elements.get(selector),
    createElement: () => {
      const element = new Element();
      elements.created.push(element);
      return element;
    },
  };
  return elements;
}

const browser = documentFor(['#run', '#summary', '#results']);
globalThis.fetch = async url => ({
  ok: url === './conformance.json',
  text: async () => readFileSync(new URL('./conformance.json', import.meta.url), 'utf8'),
});
await import('./browser-test.mjs');
for (let attempt = 0; attempt < 20 && browser.get('#run').disabled; attempt++)
  await new Promise(resolve => setTimeout(resolve, 0));
const expectedBrowserTests = JSON.parse(readFileSync(
  new URL('./conformance.json', import.meta.url), 'utf8')).length + 5;
assert.equal(browser.get('#summary').textContent,
  expectedBrowserTests + ' von ' + expectedBrowserTests + ' Tests bestanden');
assert.equal(browser.get('#results').children.length, expectedBrowserTests);
assert.ok(browser.get('#results').children.every(item => item.className === 'pass'));
await browser.get('#run').click();
assert.equal(browser.get('#results').children.length, expectedBrowserTests);

const ideIds = [
  'source', 'source-highlight', 'data-source', 'data-highlight', 'shell-source',
  'shell-highlight', 'example', 'result', 'status', 'steps', 'line-count',
  'data-status', 'shell-history', 'run', 'run-shell', 'clear-shell', 'reset',
  'load-program', 'save-program', 'file-program', 'load-data', 'save-data',
  'file-data', 'tab-program', 'tab-data', 'tab-shell',
  'panel-program', 'panel-data', 'panel-shell',
].map(id => '#' + id);

async function checkIde(elements) {
  const get = id => elements.get('#' + id);
  assert.ok(get('source').value.includes('@inc'));
  assert.match(get('source-highlight').innerHTML, /tok-name/);
  get('run').click();
  assert.equal(get('result').textContent, '42');
  assert.equal(get('status').textContent, 'Erfolgreich');

  get('example').value = 'logic';
  get('example').listeners.get('change')();
  get('run').click();
  assert.equal(get('result').textContent, '[\n  "alice",\n  "bob"\n]');

  get('tab-data').click();
  assert.equal(get('panel-program').hidden, true);
  assert.equal(get('panel-data').hidden, false);
  assert.equal(get('tab-data').attributes.get('aria-selected'), 'true');
  get('file-data').files = [{ text: async () => '{"answer":41,"items":[1,2,3]}' }];
  await get('file-data').listeners.get('change')();
  get('example').value = 'data';
  get('example').listeners.get('change')();
  get('run').click();
  assert.equal(get('result').textContent, '42');

  get('data-source').value = '{"answer":5}';
  get('data-source').listeners.get('input')();
  get('run').click();
  assert.equal(get('result').textContent, '6');
  get('save-data').click();
  assert.equal(elements.created.at(-1).download, 'daten.json');
  assert.equal(elements.created.at(-1).clicked, true);

  get('data-source').value = '[1,]';
  get('run').click();
  assert.equal(get('data-status').textContent, 'Ungültiges JSON');
  assert.equal(get('steps').textContent, 'JSON wurde nicht ausgewertet');
  get('data-source').value = '{"answer":41}';

  get('tab-shell').click();
  get('shell-source').value = '["@get","@data","answer"]';
  get('run-shell').click();
  assert.equal(get('result').textContent, '41');
  assert.equal(get('shell-history').children.length, 1);
  get('shell-source').value = '{"@n":9}';
  get('run-shell').click();
  get('shell-source').value = '["@plus","@n",1]';
  get('run-shell').click();
  assert.equal(get('result').textContent, '10');
  get('clear-shell').click();
  assert.equal(get('shell-history').children.length, 0);

  get('tab-program').click();
  get('source').value = '["@missing"]';
  get('run').click();
  assert.match(get('result').textContent, /ResolutionError/);
  get('source').value = '{"@answer":42}';
  get('run').click();
  get('source').value = '"@answer"';
  get('run').click();
  assert.equal(get('result').textContent, '42');
  get('save-program').click();
  assert.equal(elements.created.at(-1).download, 'programm.fjson.json');
  get('reset').click();
  get('run').click();
  assert.match(get('result').textContent, /ResolutionError/);
  get('source').value = '[1,]';
  get('run').click();
  assert.equal(get('steps').textContent, 'JSON wurde nicht ausgewertet');
}

const ide = documentFor(ideIds);
ide.get('#example').value = 'inc';
await import('../web/app.mjs');
await checkIde(ide);
console.log('Browser-Testseite: ' + expectedBrowserTests + '/' +
  expectedBrowserTests + '; modulare IDE: Daten, Tabs, Shell, Dateien und Fehler geprüft');

const standalone = readFileSync(new URL('../web/fjson-studio.html', import.meta.url), 'utf8');
assert.equal(standalone, buildStandalone(), 'Standalone-Datei muss dem Build entsprechen');
assert.doesNotMatch(standalone, /<(?:script|link)\b[^>]*(?:src|href)=/i);
const scripts = [...standalone.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
const offline = documentFor(ideIds);
offline.get('#example').value = 'inc';
runInNewContext(scripts[0][1], {
  document: globalThis.document, URL, Blob, setTimeout,
});
await checkIde(offline);
console.log('Offline-IDE: Einzeldatei, Build-Gleichheit und dieselben Funktionen geprüft');
