import { Closure, Goal, Interpreter, LogicVar, parseJson } from '../js/fjson.mjs';
import { fredData, refsData, showcaseGroups, shellGroups, lessonSource } from './showcase.mjs';

const byId = id => document.querySelector('#' + id);
const editor = byId('source');
const highlight = byId('highlight');
const dataEditor = byId('data-source');
const dataHighlight = byId('data-highlight');
const editorPane = byId('editor-pane');
const dataPane = byId('data-pane');
const shellSource = byId('shell-source');
const shellHighlight = byId('shell-highlight');
const tabStrip = byId('tabs');
const output = byId('output');
const outputCount = byId('output-count');
const status = byId('status');
const statusbar = document.querySelector('.statusbar');
const bindingInfo = byId('binding-info');
const lineCount = byId('line-count');
const editorTitle = byId('editor-title');
const editorHint = byId('editor-hint');
const dataTitle = byId('data-title');
const dataHint = byId('data-hint');
const codeMenu = byId('code-menu');
const codeMenuButton = byId('code-menu-button');
const codeMenuContent = byId('code-menu-content');
const shellMenu = byId('shell-menu');
const shellMenuButton = byId('shell-menu-button');
const shellMenuContent = byId('shell-menu-content');
const fileInput = byId('file-input');
const workarea = byId('workarea');
const lowerPane = byId('lower-pane');
const topPane = byId('top-pane');
const editorSplitter = byId('editor-splitter');
const shellPane = byId('shell-pane');
const splitter = byId('splitter');
const columnSplitter = byId('column-splitter');

let interpreter = new Interpreter();
let tabs = [];
let active = null;
let selectedCode = null;
let selectedData = null;
let nextId = 1;
let codeCount = 0;
let dataCount = 0;
let outputEntries = 0;
let outputHeight = 230;
let drag = null;
let shellWidth = 380;
let columnDrag = null;
let codeWidth = 500;
let editorDrag = null;

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

function updateLineCount(source) {
  const lines = source.value.split(/\r\n|\n|\r/).length;
  const currentLine = source.value.slice(0, source.selectionStart ?? 0)
    .split(/\r\n|\n|\r/).length;
  lineCount.textContent = 'Zeile ' + currentLine + ' · ' + lines +
    (lines === 1 ? ' Zeile' : ' Zeilen');
}

function updateEditor(source, colored) {
  colored.innerHTML = colorize(source.value);
  colored.scrollTop = source.scrollTop;
  colored.scrollLeft = source.scrollLeft;
  if ((source === editor && active === selectedCode) ||
      (source === dataEditor && active === selectedData)) updateLineCount(source);
}

const updateCode = () => updateEditor(editor, highlight);
const updateData = () => updateEditor(dataEditor, dataHighlight);

function formatExample(value, depth = 0) {
  const leaf = item => item === null || typeof item !== 'object';
  if (leaf(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.every(leaf)) return JSON.stringify(value);
    const prefix = value.findIndex(item => !leaf(item));
    const first = prefix < 0 ? value.length : prefix;
    const head = '[' + value.slice(0, first).map(JSON.stringify).join(', ');
    const lines = [head + (first ? ',' : '')];
    for (let i = first; i < value.length; i++)
      lines.push('  '.repeat(depth + 1) + formatExample(value[i], depth + 1) +
        (i + 1 < value.length ? ',' : ''));
    lines.push('  '.repeat(depth) + ']');
    return lines.join('\n');
  }
  const entries = Object.entries(value);
  if (entries.every(([, item]) => leaf(item))) return JSON.stringify(value);
  const lines = ['{'];
  entries.forEach(([key, item], i) => lines.push('  '.repeat(depth + 1) +
    JSON.stringify(key) + ': ' + formatExample(item, depth + 1) +
    (i + 1 < entries.length ? ',' : '')));
  lines.push('  '.repeat(depth) + '}');
  return lines.join('\n');
}

function updateShell() {
  shellHighlight.innerHTML = colorize(shellSource.value);
  shellHighlight.scrollTop = shellSource.scrollTop;
  shellHighlight.scrollLeft = shellSource.scrollLeft;
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
    slot.className = tab === active ? 'tab-slot active' :
      tab === selectedCode || tab === selectedData ? 'tab-slot selected' : 'tab-slot';
    slot.dataset.kind = tab.kind;
    const select = document.createElement('button');
    select.className = 'tab-select';
    select.type = 'button';
    select.setAttribute('role', 'tab');
    select.setAttribute('aria-selected', String(tab === active));
    select.setAttribute('aria-label', tab.label);
    const icon = document.createElement('span');
    icon.className = 'tab-icon';
    icon.textContent = tab.kind === 'data' ? '{}' : '◇';
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
    const close = document.createElement('button');
    close.className = 'tab-close';
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', tab.label + ' schließen');
    close.addEventListener('click', () => closeTab(tab));
    slot.append(close);
    tabStrip.append(slot);
  }
}

function activateFocus(tab) {
  if (!tab || active === tab) return;
  active = tab;
  editorPane.className = tab.kind === 'code' ? 'editor-pane selected' : 'editor-pane';
  dataPane.className = tab.kind === 'data' ? 'data-pane selected' : 'data-pane';
  updateLineCount(tab.kind === 'data' ? dataEditor : editor);
  renderTabs();
}

function activateTab(tab) {
  active = tab;
  const source = tab.kind === 'data' ? dataEditor : editor;
  if (tab.kind === 'data') {
    selectedData = tab;
    dataTitle.textContent = tab.label;
    dataHint.textContent = 'JSON-Daten · im Programm als ' + tab.binding + ' verfügbar';
  } else {
    selectedCode = tab;
    editorTitle.textContent = tab.label;
    editorHint.textContent = 'Code · Strg/⌘+Enter zum Ausführen';
  }
  source.value = tab.content;
  source.scrollTop = 0;
  source.scrollLeft = 0;
  editorPane.className = active === selectedCode ? 'editor-pane selected' : 'editor-pane';
  dataPane.className = active === selectedData ? 'data-pane selected' : 'data-pane';
  bindingInfo.textContent = dataBindings();
  renderTabs();
  if (tab.kind === 'data') updateData();
  else updateCode();
  updateLineCount(source);
}

function addTab(kind, initial = false) {
  const number = kind === 'code' ? ++codeCount : ++dataCount;
  const tab = {
    id: nextId++,
    kind,
    label: kind === 'data' ? (number === 1 ? 'Daten' : 'Daten ' + number) :
      (number === 1 ? 'Input' : 'Input ' + number),
    binding: kind === 'data' ? '@data' + (number === 1 ? '' : number) : null,
    content: kind === 'data' ? (number === 1
      ? '{\n  "answer": 41,\n  "items": [1, 2, 3]\n}' : '{}') :
      initial ? formatExample(lessonSource(showcaseGroups[1].lessons[0])) : '["@plus", 1, 2]',
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
  const previousActive = active;
  tabs.splice(index, 1);
  if (tab.binding) interpreter.global.values.delete(tab.binding);
  if (tab === selectedCode || tab === selectedData) {
    const replacement = tabs.find(item => item.kind === tab.kind) ?? addTab(tab.kind);
    activateTab(replacement);
  } else renderTabs();
  if (previousActive !== tab && tabs.includes(previousActive)) activateFocus(previousActive);
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
  if (!selectedCode) return;
  try {
    bindDataTabs();
    const result = interpreter.run(selectedCode.content);
    appendOutput(selectedCode, format(result), false);
    setStatus(selectedCode.label + ' ausgeführt · ' + interpreter.steps + ' Schritte');
  } catch (error) {
    appendOutput(selectedCode, error.name + ': ' + error.message, true);
    setStatus(error.name + ': ' + error.message, true);
  }
}

function runShell() {
  if (!shellSource.value.trim()) return;
  const shell = { label: 'Shell', binding: null };
  try {
    bindDataTabs();
    const result = interpreter.run(shellSource.value);
    appendOutput(shell, format(result), false);
    setStatus('Shell ausgeführt · ' + interpreter.steps + ' Schritte');
  } catch (error) {
    appendOutput(shell, error.name + ': ' + error.message, true);
    setStatus(error.name + ': ' + error.message, true);
  }
}

function saveActive() {
  if (!active) return;
  const filename = active.filename ??
    (active.kind === 'data' ? active.binding.slice(1) + '.json' :
      'input' + active.id + '.fjson.json');
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
    height: lowerPane.getBoundingClientRect().height || outputHeight,
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

function setShellWidth(width) {
  const max = Math.max(120, lowerPane.getBoundingClientRect().width - 127);
  shellWidth = Math.max(120, Math.min(max, Math.round(width)));
  lowerPane.style.setProperty('--shell-width', shellWidth + 'px');
  columnSplitter.setAttribute('aria-valuemax', String(max));
  columnSplitter.setAttribute('aria-valuenow', String(shellWidth));
}

function setCodeWidth(width) {
  const max = Math.max(120, topPane.getBoundingClientRect().width - 127);
  codeWidth = Math.max(120, Math.min(max, Math.round(width)));
  topPane.style.setProperty('--code-width', codeWidth + 'px');
  editorSplitter.setAttribute('aria-valuemax', String(max));
  editorSplitter.setAttribute('aria-valuenow', String(codeWidth));
}

editorSplitter.addEventListener('pointerdown', event => {
  editorDrag = {
    x: event.clientX,
    width: editorPane.getBoundingClientRect().width || codeWidth,
  };
  editorSplitter.className = 'column-splitter dragging';
  editorSplitter.setPointerCapture?.(event.pointerId);
});
editorSplitter.addEventListener('pointermove', event => {
  if (editorDrag) setCodeWidth(editorDrag.width + event.clientX - editorDrag.x);
});
for (const name of ['pointerup', 'pointercancel']) {
  editorSplitter.addEventListener(name, event => {
    editorDrag = null;
    editorSplitter.className = 'column-splitter';
    editorSplitter.releasePointerCapture?.(event.pointerId);
  });
}
editorSplitter.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    setCodeWidth(codeWidth + (event.key === 'ArrowRight' ? 24 : -24));
  }
});

columnSplitter.addEventListener('pointerdown', event => {
  columnDrag = {
    x: event.clientX,
    width: shellPane.getBoundingClientRect().width || shellWidth,
  };
  columnSplitter.className = 'column-splitter dragging';
  columnSplitter.setPointerCapture?.(event.pointerId);
});
columnSplitter.addEventListener('pointermove', event => {
  if (columnDrag) setShellWidth(columnDrag.width + event.clientX - columnDrag.x);
});
for (const name of ['pointerup', 'pointercancel']) {
  columnSplitter.addEventListener(name, event => {
    columnDrag = null;
    columnSplitter.className = 'column-splitter';
    columnSplitter.releasePointerCapture?.(event.pointerId);
  });
}
columnSplitter.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    setShellWidth(shellWidth + (event.key === 'ArrowRight' ? 24 : -24));
  }
});

byId('new-code').addEventListener('click', () => addTab('code'));
byId('new-data').addEventListener('click', () => addTab('data'));
byId('run').addEventListener('click', runActive);
byId('run-shell').addEventListener('click', runShell);
byId('open').addEventListener('click', () => fileInput.click());
byId('save').addEventListener('click', saveActive);
byId('clear-output').addEventListener('click', clearOutput);
fileInput.addEventListener('change', openFile);
byId('reset').addEventListener('click', () => {
  interpreter = new Interpreter();
  clearOutput();
  setStatus('Neue Interpreter-Sitzung');
});
function closeMenu(content, button) {
  content.hidden = true;
  button.setAttribute('aria-expanded', 'false');
}

function toggleMenu(content, button, otherContent, otherButton) {
  const opening = content.hidden;
  closeMenu(otherContent, otherButton);
  content.hidden = !opening;
  button.setAttribute('aria-expanded', String(opening));
}

function loadDemoData(preset) {
  if (!preset) return;
  const data = tabs.find(tab => tab.binding === '@data') ?? addTab('data');
  data.binding = '@data';
  data.label = preset === 'fred' ? 'Fred · Daten' : 'Referenzen · Daten';
  data.filename = preset === 'fred' ? 'fred.json' : 'graph_refs.json';
  data.content = formatExample(preset === 'fred' ? fredData : refsData);
  data.dirty = true;
  activateTab(data);
}

function loadLesson(item) {
  const code = selectedCode ?? addTab('code');
  loadDemoData(item.data);
  code.content = formatExample(lessonSource(item));
  code.dirty = true;
  activateTab(code);
  closeMenu(codeMenuContent, codeMenuButton);
  setStatus(item.title + ' geladen' + (item.data ? ' · @data ersetzt' : ''));
}

function loadSnippet(item) {
  loadDemoData(item.data);
  shellSource.value = formatExample(item.source);
  updateShell();
  closeMenu(shellMenuContent, shellMenuButton);
  setStatus(item.title + ' in die Shell eingefügt' +
    (item.data ? ' · @data ersetzt' : ''));
  shellSource.focus?.();
}

function fillMenu(content, groups, itemsKey, onChoose) {
  content.replaceChildren();
  content.hidden = true;
  for (const group of groups) {
    const section = document.createElement('details');
    const heading = document.createElement('summary');
    heading.textContent = group.title;
    section.append(heading);
    for (const item of group[itemsKey]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.title;
      button.title = item.note ?? item.title;
      button.dataset.example = item.id ?? item.title;
      button.addEventListener('click', () => onChoose(item));
      section.append(button);
    }
    content.append(section);
  }
}

fillMenu(codeMenuContent, showcaseGroups, 'lessons', loadLesson);
fillMenu(shellMenuContent, shellGroups, 'snippets', loadSnippet);
codeMenuButton.addEventListener('click', () => toggleMenu(
  codeMenuContent, codeMenuButton, shellMenuContent, shellMenuButton));
shellMenuButton.addEventListener('click', () => toggleMenu(
  shellMenuContent, shellMenuButton, codeMenuContent, codeMenuButton));
document.addEventListener?.('click', event => {
  if (!codeMenu.contains(event.target)) closeMenu(codeMenuContent, codeMenuButton);
  if (!shellMenu.contains(event.target)) closeMenu(shellMenuContent, shellMenuButton);
});
document.addEventListener?.('keydown', event => {
  if (event.key === 'Escape') {
    closeMenu(codeMenuContent, codeMenuButton);
    closeMenu(shellMenuContent, shellMenuButton);
  }
});
editor.addEventListener('input', () => {
  selectedCode.content = editor.value;
  selectedCode.dirty = true;
  activateFocus(selectedCode);
  updateCode();
  renderTabs();
});
dataEditor.addEventListener('input', () => {
  selectedData.content = dataEditor.value;
  selectedData.dirty = true;
  activateFocus(selectedData);
  updateData();
  renderTabs();
});
editor.addEventListener('scroll', updateCode);
editor.addEventListener('click', () => { activateFocus(selectedCode); updateCode(); });
editor.addEventListener('keyup', updateCode);
dataEditor.addEventListener('scroll', updateData);
dataEditor.addEventListener('click', () => { activateFocus(selectedData); updateData(); });
dataEditor.addEventListener('keyup', updateData);
editor.addEventListener('keydown', event => {
  activateFocus(selectedCode);
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    runActive();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveActive();
  }
});
dataEditor.addEventListener('keydown', event => {
  activateFocus(selectedData);
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    runActive();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveActive();
  }
});

shellSource.addEventListener('input', updateShell);
shellSource.addEventListener('scroll', updateShell);
shellSource.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    runShell();
  }
});

addTab('code', true);
addTab('data', true);
activateTab(tabs[0]);
shellSource.value = '["@plus", 1, 2]';
updateShell();
setShellWidth(shellPane.getBoundingClientRect().width || shellWidth);
setCodeWidth(editorPane.getBoundingClientRect().width || codeWidth);
setStatus('Bereit');
