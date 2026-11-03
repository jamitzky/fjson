import { Closure, Goal, Interpreter, LogicVar, parseJson } from '../js/fjson.mjs';

const examples = {
  inc: ['@let', { '@inc': ['@function', ['@x'], ['@plus', '@x', 1]] }, ['@inc', 41]],
  defaults: ['@let', { '@inc': ['@function', { '@x': 1 }, ['@plus', '@x', 1]] },
    ['@plus', ['@inc'], ['@inc', 41]]],
  logic: ['@run', 2, '!X', ['@choice',
    ['@unify', '!X', 'alice'], ['@unify', '!X', 'bob']]],
  recursion: ['@letrec', { '@factorial': ['@function', ['@n'],
    ['@if', ['@le', '@n', 1], 1,
      ['@times', '@n', ['@factorial', ['@minus', '@n', 1]]]]] },
  ['@factorial', 5]],
  quote: ['@quote', { '@message': ['@plus', 40, 2], symbol: '!X' }],
  data: ['@plus', ['@get', '@data', 'answer'], 1],
};

const byId = id => document.querySelector('#' + id);
const editor = byId('source');
const highlight = byId('highlight');
const tabStrip = byId('tabs');
const output = byId('output');
const outputCount = byId('output-count');
const status = byId('status');
const statusbar = document.querySelector('.statusbar');
const bindingInfo = byId('binding-info');
const lineCount = byId('line-count');
const editorTitle = byId('editor-title');
const editorHint = byId('editor-hint');
const example = byId('example');
const fileInput = byId('file-input');
const workarea = byId('workarea');
const outputPane = byId('output-pane');
const splitter = byId('splitter');

let interpreter = new Interpreter();
let tabs = [];
let active = null;
let nextId = 1;
let codeCount = 0;
let dataCount = 0;
let outputEntries = 0;
let outputHeight = 230;
let drag = null;

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  })[char]);
}

const tokenPattern = /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}\[\],:]/g;
function colorize(value) {
  let result = '';
  let end = 0;
  for (const match of value.matchAll(tokenPattern)) {
    result += escapeHtml(value.slice(end, match.index));
    const token = match[0];
    let kind = 'punct';
    if (token.startsWith('"')) {
      kind = /^\s*:/.test(value.slice(match.index + token.length)) ? 'key' :
        token.startsWith('"@') ? 'name' : token.startsWith('"!') ? 'logic' : 'string';
    } else if (/^-?\d/.test(token)) kind = 'number';
    else if (/^(true|false|null)$/.test(token)) kind = 'literal';
    result += '<span class="tok-' + kind + '">' + escapeHtml(token) + '</span>';
    end = match.index + token.length;
  }
  return result + escapeHtml(value.slice(end)) + '\n';
}

function updateEditor() {
  highlight.innerHTML = colorize(editor.value);
  highlight.scrollTop = editor.scrollTop;
  highlight.scrollLeft = editor.scrollLeft;
  const lines = editor.value.split(/\r\n|\n|\r/).length;
  const currentLine = editor.value.slice(0, editor.selectionStart ?? 0)
    .split(/\r\n|\n|\r/).length;
  lineCount.textContent = 'Zeile ' + currentLine + ' · ' + lines +
    (lines === 1 ? ' Zeile' : ' Zeilen');
}

function setStatus(message, failed = false) {
  status.textContent = message;
  statusbar.className = failed ? 'statusbar error' : 'statusbar';
}

function dataBindings() {
  return tabs.filter(tab => tab.kind === 'data')
    .map(tab => tab.binding).join(', ') || 'Keine Daten-Tabs';
}

function renderTabs() {
  tabStrip.replaceChildren();
  for (const tab of tabs) {
    const slot = document.createElement('div');
    slot.className = tab === active ? 'tab-slot active' : 'tab-slot';
    slot.dataset.kind = tab.kind;
    const select = document.createElement('button');
    select.className = 'tab-select';
    select.type = 'button';
    select.setAttribute('role', 'tab');
    select.setAttribute('aria-selected', String(tab === active));
    select.setAttribute('aria-label', tab.label);
    const icon = document.createElement('span');
    icon.className = 'tab-icon';
    icon.textContent = tab.kind === 'data' ? '{}' : tab.kind === 'shell' ? '>' : '◇';
    select.append(icon);
    const label = document.createElement('span');
    label.textContent = tab.label;
    select.append(label);
    if (tab.dirty) {
      const mark = document.createElement('span');
      mark.className = 'dirty-mark';
      mark.textContent = '●';
      select.append(mark);
    }
    select.addEventListener('click', () => activateTab(tab));
    slot.append(select);
    if (tab.kind !== 'shell') {
      const close = document.createElement('button');
      close.className = 'tab-close';
      close.type = 'button';
      close.textContent = '×';
      close.setAttribute('aria-label', tab.label + ' schließen');
      close.addEventListener('click', () => closeTab(tab));
      slot.append(close);
    }
    tabStrip.append(slot);
  }
}

function activateTab(tab) {
  active = tab;
  editor.value = tab.content;
  editor.scrollTop = 0;
  editor.scrollLeft = 0;
  editorTitle.textContent = tab.label;
  editorHint.textContent = tab.kind === 'data'
    ? 'JSON-Daten · im Programm als ' + tab.binding + ' verfügbar'
    : tab.kind === 'shell'
      ? 'Shell · Ausdrücke teilen sich die Interpreter-Sitzung'
      : 'fjson · Strg/⌘+Enter zum Ausführen';
  bindingInfo.textContent = dataBindings();
  renderTabs();
  updateEditor();
}

function addTab(kind, initial = false) {
  const number = kind === 'code' ? ++codeCount : kind === 'data' ? ++dataCount : 0;
  const tab = {
    id: nextId++,
    kind,
    label: kind === 'shell' ? 'Shell' :
      kind === 'data' ? (number === 1 ? 'Daten' : 'Daten ' + number) :
        (number === 1 ? 'Input' : 'Input ' + number),
    binding: kind === 'data' ? '@data' + (number === 1 ? '' : number) : null,
    content: kind === 'shell' ? '["@plus", 1, 2]' :
      kind === 'data' ? (number === 1
        ? '{\n  "answer": 41,\n  "items": [1, 2, 3]\n}' : '{}') :
        initial ? JSON.stringify(examples.inc, null, 2) : '["@plus", 1, 2]',
    filename: null,
    dirty: false,
  };
  tabs.push(tab);
  activateTab(tab);
  setStatus(tab.label + ' geöffnet');
  return tab;
}

function closeTab(tab) {
  const index = tabs.indexOf(tab);
  if (index < 0) return;
  tabs.splice(index, 1);
  if (tab.binding) interpreter.global.values.delete(tab.binding);
  if (tab === active) {
    activateTab(tabs[Math.min(index, tabs.length - 1)] ??
      addTab('code'));
  } else renderTabs();
  bindingInfo.textContent = dataBindings();
}

function displayValue(value, seen = new WeakSet()) {
  if (value instanceof LogicVar) return '⟨Logikvariable !' + value.name + '⟩';
  if (value instanceof Closure) return '⟨Funktion (' + value.names.join(', ') + ')⟩';
  if (value instanceof Goal) return '⟨' + value.constructor.name + '⟩';
  if (value && typeof value === 'object' && typeof value.fn === 'function')
    return '⟨Native ' + (value.name ?? 'Funktion') + '⟩';
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '⟨zyklischer Wert⟩';
    seen.add(value);
    if (Array.isArray(value)) return value.map(item => displayValue(item, seen));
    return Object.fromEntries(Object.entries(value).map(
      ([key, item]) => [key, displayValue(item, seen)]));
  }
  return value;
}

function format(value) {
  return JSON.stringify(displayValue(value), null, 2) ?? 'undefined';
}

function bindDataTabs() {
  const values = tabs.filter(tab => tab.kind === 'data').map(tab => {
    try { return [tab.binding, parseJson(tab.content)]; }
    catch (error) {
      throw new SyntaxError(tab.label + ' (' + tab.binding + '): ' + error.message);
    }
  });
  for (const [name, value] of values)
    interpreter.eval({ [name]: ['@quote', value] });
  return values;
}

function appendOutput(tab, result, failed) {
  if (outputEntries === 0) output.replaceChildren();
  const entry = document.createElement('div');
  entry.className = failed ? 'output-entry error' : 'output-entry';
  const label = document.createElement('div');
  label.className = 'output-label';
  label.textContent = tab.label + (tab.binding ? ' · ' + tab.binding : '') +
    (failed ? ' · Fehler' : ' · Ergebnis');
  const value = document.createElement('pre');
  value.className = 'output-value';
  value.textContent = result;
  entry.append(label, value);
  output.append(entry);
  outputEntries++;
  outputCount.textContent = outputEntries + (outputEntries === 1 ? ' Eintrag' : ' Einträge');
  output.scrollTop = output.scrollHeight;
}

function runActive() {
  if (!active) return;
  try {
    const values = bindDataTabs();
    const result = active.kind === 'data'
      ? values.find(([name]) => name === active.binding)?.[1]
      : interpreter.run(active.content);
    appendOutput(active, format(result), false);
    setStatus(active.label + ' ausgeführt · ' + interpreter.steps + ' Schritte');
  } catch (error) {
    appendOutput(active, error.name + ': ' + error.message, true);
    setStatus(error.name + ': ' + error.message, true);
  }
}

function saveActive() {
  if (!active) return;
  const filename = active.filename ??
    (active.kind === 'data' ? active.binding.slice(1) + '.json' :
      active.kind === 'shell' ? 'shell.fjson.json' : 'input' + active.id + '.fjson.json');
  const url = URL.createObjectURL(new Blob([active.content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  active.filename = filename;
  active.dirty = false;
  renderTabs();
  setStatus(filename + ' gespeichert');
}

async function openFile() {
  const file = fileInput.files?.[0];
  if (!file || !active) return;
  try {
    const text = await file.text();
    parseJson(text);
    active.content = text;
    active.filename = file.name;
    active.label = file.name;
    active.dirty = false;
    activateTab(active);
    setStatus(file.name + ' geladen');
  } catch (error) {
    setStatus(error.name + ': ' + error.message, true);
    appendOutput(active, error.name + ': ' + error.message, true);
  }
  fileInput.value = '';
}

function clearOutput() {
  output.replaceChildren();
  const empty = document.createElement('p');
  empty.className = 'empty-output';
  empty.textContent = 'Ausführen zeigt Ergebnisse und Fehler hier an.';
  output.append(empty);
  outputEntries = 0;
  outputCount.textContent = '0 Einträge';
}

function setOutputHeight(height) {
  const max = Math.max(100, workarea.getBoundingClientRect().height - 150);
  outputHeight = Math.max(100, Math.min(max, Math.round(height)));
  workarea.style.setProperty('--output-height', outputHeight + 'px');
  splitter.setAttribute('aria-valuemax', String(max));
  splitter.setAttribute('aria-valuenow', String(outputHeight));
}

splitter.addEventListener('pointerdown', event => {
  drag = {
    y: event.clientY,
    height: outputPane.getBoundingClientRect().height || outputHeight,
  };
  splitter.className = 'splitter dragging';
  splitter.setPointerCapture?.(event.pointerId);
});
splitter.addEventListener('pointermove', event => {
  if (drag) setOutputHeight(drag.height + drag.y - event.clientY);
});
for (const name of ['pointerup', 'pointercancel']) {
  splitter.addEventListener(name, event => {
    drag = null;
    splitter.className = 'splitter';
    splitter.releasePointerCapture?.(event.pointerId);
  });
}
splitter.addEventListener('keydown', event => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    setOutputHeight(outputHeight + (event.key === 'ArrowUp' ? 24 : -24));
  }
});

byId('new-code').addEventListener('click', () => addTab('code'));
byId('new-data').addEventListener('click', () => addTab('data'));
byId('run').addEventListener('click', runActive);
byId('open').addEventListener('click', () => fileInput.click());
byId('save').addEventListener('click', saveActive);
byId('clear-output').addEventListener('click', clearOutput);
fileInput.addEventListener('change', openFile);
byId('reset').addEventListener('click', () => {
  interpreter = new Interpreter();
  clearOutput();
  setStatus('Neue Interpreter-Sitzung');
});
example.addEventListener('change', () => {
  const code = active?.kind === 'code' ? active :
    tabs.find(tab => tab.kind === 'code') ?? addTab('code');
  code.content = JSON.stringify(examples[example.value], null, 2);
  code.dirty = true;
  activateTab(code);
  setStatus('Beispiel geladen');
});
editor.addEventListener('input', () => {
  active.content = editor.value;
  active.dirty = true;
  updateEditor();
  renderTabs();
});
editor.addEventListener('scroll', updateEditor);
editor.addEventListener('click', updateEditor);
editor.addEventListener('keyup', updateEditor);
editor.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    runActive();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveActive();
  }
});

addTab('code', true);
addTab('data', true);
addTab('shell', true);
activateTab(tabs[0]);
setStatus('Bereit');
