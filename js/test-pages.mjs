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
    return { height: this.tag === 'workarea' ? 600 : 230,
      width: this.tag === 'lower-pane' ? 800 : this.tag === 'shell-pane' ? 380 : 500 };
  }
  setPointerCapture() {}
  releasePointerCapture() {}
}

function documentFor(ids) {
  const elements = new Map(ids.map(id => [id, new Element(
    id === '#workarea' ? 'workarea' :
      id === '#lower-pane' ? 'lower-pane' :
        id === '#shell-pane' ? 'shell-pane' : 'div')]));
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
  '#lower-pane', '#shell-pane', '#column-splitter', '#shell-source',
  '#shell-highlight', '#run-shell',
  '#new-code', '#new-data', '#run', '#open', '#save', '#reset', '#clear-output',
];
const pageSource = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
for (const name of [
  'fred_match', 'fred_phone', 'fred_email', 'fred_path',
  'fred_adult', 'fred_cities', 'fred_project',
]) assert.ok(pageSource.includes('value="' + name + '"'), name + ' fehlt in der Auswahl');

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

  assert.equal(tabs.children.length, 2);
  assert.equal(tabs.children[0].children[0].children[1].textContent, 'Input');
  assert.equal(tabs.children[1].children[0].children[1].textContent, 'Daten');
  assert.equal(get('shell-source').value, '["@plus", 1, 2]');
  assert.match(get('shell-highlight').innerHTML, /tok-name/);
  assert.match(editor.value, /@inc/);
  assert.match(get('highlight').innerHTML, /tok-name/);
  get('run').click();
  assert.equal(result(), '42');
  assert.equal(get('output-count').textContent, '1 Eintrag');

  get('new-data').click();
  assert.equal(tabs.children.length, 3);
  assert.equal(get('editor-hint').textContent.includes('@data2'), true);
  edit('{"answer":7}');
  assert.match(get('highlight').innerHTML, /tok-key/);
  assert.match(tabs.children[2].children[0].children[2].textContent, /●/);

  selectTab(0);
  get('example').value = 'data';
  get('example').listeners.get('change')();
  get('run').click();
  assert.equal(result(), '42');
  edit('["@plus", ["@get", "@data2", "answer"], 1]');
  get('run').click();
  assert.equal(result(), '8');

  get('new-code').click();
  assert.equal(tabs.children.length, 4);
  edit('{"@n":9}');
  get('run').click();
  assert.equal(result(), '9');
  get('shell-source').value = '["@plus","@n",1]';
  get('shell-source').listeners.get('input')();
  get('run-shell').click();
  assert.equal(result(), '10');

  selectTab(2);
  get('file-input').files = [{ name: 'extra.json', text: async () => '{"answer":12}' }];
  await get('file-input').listeners.get('change')();
  assert.equal(editor.value, '{"answer":12}');
  assert.equal(get('editor-title').textContent, 'extra.json');
  get('shell-source').value = '["@get","@data2","answer"]';
  get('shell-source').listeners.get('keydown')({
    key: 'Enter', ctrlKey: true, preventDefault() {},
  });
  assert.equal(result(), '12');
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

  const columnSplitter = get('column-splitter');
  columnSplitter.listeners.get('pointerdown')({ clientX: 300, pointerId: 2 });
  columnSplitter.listeners.get('pointermove')({ clientX: 350, pointerId: 2 });
  assert.equal(get('lower-pane').style.values.get('--shell-width'), '430px');
  columnSplitter.listeners.get('pointerup')({ pointerId: 2 });
  columnSplitter.listeners.get('keydown')({ key: 'ArrowLeft', preventDefault() {} });
  assert.equal(get('lower-pane').style.values.get('--shell-width'), '406px');
  assert.equal(columnSplitter.attributes.get('aria-valuenow'), '406');

  tabs.children[2].children[1].click();
  assert.equal(tabs.children.length, 3);
  selectTab(0);
  edit('["@get","@data2","answer"]');
  get('run').click();
  assert.match(result(), /ResolutionError/);

  get('clear-output').click();
  assert.equal(get('output-count').textContent, '0 Einträge');
  get('reset').click();
  get('shell-source').value = '"@n"';
  get('run-shell').click();
  assert.match(result(), /ResolutionError/);

  selectTab(1);
  edit('[1,]');
  selectTab(0);
  edit('["@plus",1,2]');
  get('run').click();
  assert.match(result(), /SyntaxError/);
  assert.match(get('status').textContent, /Daten/);

  const fred = JSON.parse(readFileSync(new URL('../examples/fred.json', import.meta.url), 'utf8'));
  const fredCases = [
    ['fred_match', [{ name: 'Fred', surname: 'Smith' }]],
    ['fred_phone', ['01962 001234', '01962 001235']],
    ['fred_email', ['fred.smith@my-work.com', 'fsmith@my-work.com']],
    ['fred_path', [['Other', 'Alternative.Address', 'City']]],
    ['fred_adult', [28]],
    ['fred_cities', [{
      person: 'Fred', main_city: 'Winchester', alternative_city: 'London',
    }]],
    ['fred_project', [29]],
  ];
  for (const [name, expected] of fredCases) {
    get('example').value = name;
    get('example').listeners.get('change')();
    assert.match(get('status').textContent, /@data ersetzt/);
    get('run').click();
    assert.deepEqual(JSON.parse(result()), expected, name);
  }
  selectTab(1);
  assert.deepEqual(JSON.parse(editor.value), fred);
  assert.equal(get('editor-hint').textContent.includes('@data'), true);
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
