import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildStandalone } from '../web/build-standalone.mjs';

class Element {
  constructor(tag = 'div') {
    this.tag = tag;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
    this.disabled = false;
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.files = [];
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.scrollHeight = 0;
    this.selectionStart = 0;
    this.style = {
      values: new Map(),
      setProperty(name, value) { this.values.set(name, value); },
    };
  }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  append(...children) { this.children.push(...children); }
  replaceChildren() { this.children = []; }
  click() { this.clicked = true; return this.listeners.get('click')?.(); }
  getBoundingClientRect() {
    return { height: this.tag === 'workarea' ? 600 : 230 };
  }
  setPointerCapture() {}
  releasePointerCapture() {}
}

function documentFor(ids) {
  const elements = new Map(ids.map(id => [id, new Element(
    id === '#workarea' ? 'workarea' : 'div')]));
  elements.created = [];
  globalThis.document = {
    querySelector: selector => elements.get(selector),
    createElement: tag => {
      const element = new Element(tag);
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
const browserCount = JSON.parse(readFileSync(
  new URL('./conformance.json', import.meta.url), 'utf8')).length + 5;
assert.equal(browser.get('#summary').textContent,
  browserCount + ' von ' + browserCount + ' Tests bestanden');
assert.equal(browser.get('#results').children.length, browserCount);
assert.ok(browser.get('#results').children.every(item => item.className === 'pass'));
await browser.get('#run').click();
assert.equal(browser.get('#results').children.length, browserCount);

const ideIds = [
  '#tabs', '#output', '#output-count', '#status', '.statusbar', '#binding-info',
  '#line-count', '#editor-title', '#editor-hint', '#example', '#file-input',
  '#workarea', '#output-pane', '#splitter', '#source', '#highlight',
  '#new-code', '#new-data', '#run', '#open', '#save', '#reset', '#clear-output',
];

async function checkIde(elements) {
  const get = id => elements.get('#' + id);
  const tabs = get('tabs');
  const editor = get('source');
  const output = get('output');
  const result = () => output.children.at(-1).children[1].textContent;
  const edit = text => {
    editor.value = text;
    editor.listeners.get('input')();
  };
  const selectTab = index => tabs.children[index].children[0].click();

  assert.equal(tabs.children.length, 3);
  assert.equal(tabs.children[0].children[0].children[1].textContent, 'Input');
  assert.equal(tabs.children[1].children[0].children[1].textContent, 'Daten');
  assert.equal(tabs.children[2].children[0].children[1].textContent, 'Shell');
  assert.match(editor.value, /@inc/);
  assert.match(get('highlight').innerHTML, /tok-name/);
  get('run').click();
  assert.equal(result(), '42');
  assert.equal(get('output-count').textContent, '1 Eintrag');

  get('new-data').click();
  assert.equal(tabs.children.length, 4);
  assert.equal(get('editor-hint').textContent.includes('@data2'), true);
  edit('{"answer":7}');
  assert.match(get('highlight').innerHTML, /tok-key/);
  assert.match(tabs.children[3].children[0].children[2].textContent, /●/);

  selectTab(0);
  get('example').value = 'data';
  get('example').listeners.get('change')();
  get('run').click();
  assert.equal(result(), '42');
  edit('["@plus", ["@get", "@data2", "answer"], 1]');
  get('run').click();
  assert.equal(result(), '8');

  get('new-code').click();
  assert.equal(tabs.children.length, 5);
  edit('{"@n":9}');
  get('run').click();
  assert.equal(result(), '9');
  selectTab(2);
  edit('["@plus","@n",1]');
  get('run').click();
  assert.equal(result(), '10');

  selectTab(3);
  get('file-input').files = [{ name: 'extra.json', text: async () => '{"answer":12}' }];
  await get('file-input').listeners.get('change')();
  assert.equal(editor.value, '{"answer":12}');
  assert.equal(get('editor-title').textContent, 'extra.json');
  get('save').click();
  const download = elements.created.filter(node => node.tag === 'a').at(-1);
  assert.equal(download.download, 'extra.json');
  assert.equal(download.clicked, true);

  const splitter = get('splitter');
  splitter.listeners.get('pointerdown')({ clientY: 300, pointerId: 1 });
  splitter.listeners.get('pointermove')({ clientY: 250, pointerId: 1 });
  assert.equal(get('workarea').style.values.get('--output-height'), '280px');
  splitter.listeners.get('pointerup')({ pointerId: 1 });
  splitter.listeners.get('keydown')({ key: 'ArrowDown', preventDefault() {} });
  assert.equal(get('workarea').style.values.get('--output-height'), '256px');
  assert.equal(splitter.attributes.get('aria-valuenow'), '256');

  tabs.children[3].children[1].click();
  assert.equal(tabs.children.length, 4);
  selectTab(0);
  edit('["@get","@data2","answer"]');
  get('run').click();
  assert.match(result(), /ResolutionError/);

  get('clear-output').click();
  assert.equal(get('output-count').textContent, '0 Einträge');
  get('reset').click();
  selectTab(3);
  edit('"@n"');
  get('run').click();
  assert.match(result(), /ResolutionError/);

  selectTab(1);
  edit('[1,]');
  selectTab(0);
  edit('["@plus",1,2]');
  get('run').click();
  assert.match(result(), /SyntaxError/);
  assert.match(get('status').textContent, /Daten/);
}

const modular = documentFor(ideIds);
await import('../web/app.mjs');
await checkIde(modular);
console.log('Browser-Testseite: ' + browserCount + '/' + browserCount +
  '; IDE: Tabs, Daten, Ausgabe, Dateien und Splitter geprüft');

const standalone = readFileSync(new URL('../web/fjson-studio.html', import.meta.url), 'utf8');
assert.equal(standalone, buildStandalone(), 'Standalone-Datei muss dem Build entsprechen');
assert.doesNotMatch(standalone, /<(?:script|link)\b[^>]*(?:src|href)=/i);
const scripts = [...standalone.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
const offline = documentFor(ideIds);
runInNewContext(scripts[0][1], {
  document: globalThis.document, URL, Blob, setTimeout,
});
await checkIde(offline);
console.log('Offline-IDE: Einzeldatei, Build-Gleichheit und dieselben Funktionen geprüft');
