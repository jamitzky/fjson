import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

class Element {
  constructor() {
    this.value = '';
    this.textContent = '';
    this.className = '';
    this.disabled = false;
    this.style = {};
    this.children = [];
    this.listeners = new Map();
  }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
}

function documentFor(ids) {
  const elements = new Map(ids.map(id => [id, new Element()]));
  globalThis.document = {
    querySelector: selector => elements.get(selector),
    createElement: () => new Element(),
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
assert.equal(browser.get('#summary').textContent, '18 von 18 Tests bestanden');
assert.equal(browser.get('#results').children.length, 18);
assert.ok(browser.get('#results').children.every(item => item.className === 'pass'));
await browser.get('#run').listeners.get('click')();
assert.equal(browser.get('#results').children.length, 18);

const ide = documentFor([
  '#source', '#example', '#result', '#status', '#steps', '#line-count', '#run', '#reset',
]);
ide.get('#example').value = 'inc';
await import('../web/app.mjs');
assert.ok(ide.get('#source').value.includes('@inc'));
ide.get('#run').listeners.get('click')();
assert.equal(ide.get('#result').textContent, '42');
assert.equal(ide.get('#status').textContent, 'Erfolgreich');

ide.get('#example').value = 'logic';
ide.get('#example').listeners.get('change')();
ide.get('#run').listeners.get('click')();
assert.equal(ide.get('#result').textContent, '[\n  "alice",\n  "bob"\n]');

ide.get('#source').value = '["@missing"]';
ide.get('#run').listeners.get('click')();
assert.equal(ide.get('#status').textContent, 'Fehler');
assert.match(ide.get('#result').textContent, /ResolutionError/);

ide.get('#source').value = '{"@answer":42}';
ide.get('#run').listeners.get('click')();
ide.get('#source').value = '"@answer"';
ide.get('#run').listeners.get('click')();
assert.equal(ide.get('#result').textContent, '42');

ide.get('#reset').listeners.get('click')();
assert.equal(ide.get('#status').textContent, 'Neue Sitzung');
ide.get('#run').listeners.get('click')();
assert.match(ide.get('#result').textContent, /ResolutionError/);
ide.get('#source').value = '[1,]';
ide.get('#run').listeners.get('click')();
assert.equal(ide.get('#steps').textContent, 'JSON wurde nicht ausgewertet');
console.log('Browser-Testseite: 18/18; IDE: Ausführen, Beispiel, Fehler und Reset geprüft');
