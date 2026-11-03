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

const select = id => document.querySelector('#' + id);
const source = select('source');
const dataSource = select('data-source');
const shellSource = select('shell-source');
const example = select('example');
const output = select('result');
const status = select('status');
const steps = select('steps');
const lineCount = select('line-count');
const dataStatus = select('data-status');
const history = select('shell-history');
let interpreter = new Interpreter();

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

function updateEditor(textarea, highlight) {
  highlight.innerHTML = colorize(textarea.value);
  highlight.scrollTop = textarea.scrollTop;
  highlight.scrollLeft = textarea.scrollLeft;
  if (textarea === source) {
    const count = textarea.value.split(/\r\n|\n|\r/).length;
    lineCount.textContent = count + (count === 1 ? ' Zeile' : ' Zeilen');
  }
}

for (const [textarea, highlight] of [
  [source, select('source-highlight')],
  [dataSource, select('data-highlight')],
  [shellSource, select('shell-highlight')],
]) {
  textarea.addEventListener('input', () => updateEditor(textarea, highlight));
  textarea.addEventListener('scroll', () => updateEditor(textarea, highlight));
  updateEditor(textarea, highlight);
}

function chooseTab(name) {
  for (const tab of ['program', 'data', 'shell']) {
    const active = tab === name;
    const button = select('tab-' + tab);
    button.className = active ? 'tab active' : 'tab';
    button.setAttribute('aria-selected', String(active));
    select('panel-' + tab).hidden = !active;
  }
}
for (const name of ['program', 'data', 'shell']) {
  select('tab-' + name).addEventListener('click', () => chooseTab(name));
}

function loadExample(name) {
  source.value = JSON.stringify(examples[name], null, 2);
  updateEditor(source, select('source-highlight'));
  output.textContent = 'Drücke „Ausführen“, um den Ausdruck auszuwerten.';
  steps.textContent = 'Noch nicht ausgeführt';
  status.textContent = 'Bereit';
  status.className = 'status';
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

function validateData() {
  try {
    const value = parseJson(dataSource.value);
    dataStatus.textContent = 'Als @data verfügbar';
    dataStatus.className = 'data-status';
    return value;
  } catch (error) {
    dataStatus.textContent = 'Ungültiges JSON';
    dataStatus.className = 'data-status error';
    throw error;
  }
}

function evaluate(text) {
  const data = validateData();
  interpreter.eval({ '@data': ['@quote', data] });
  return interpreter.run(text);
}

function run(text = source.value, inShell = false) {
  if (inShell && !text.trim()) return;
  let answer;
  let failed = false;
  try {
    answer = format(evaluate(text));
    status.textContent = 'Erfolgreich';
    status.className = 'status success';
    steps.textContent = interpreter.steps + ' Auswertungsschritte';
  } catch (error) {
    answer = error.name + ': ' + error.message;
    failed = true;
    status.textContent = 'Fehler';
    status.className = 'status error';
    steps.textContent = error instanceof SyntaxError ?
      'JSON wurde nicht ausgewertet' : interpreter.steps + ' Schritte bis zum Fehler';
  }
  output.textContent = answer;
  if (inShell) {
    const line = document.createElement('div');
    line.className = 'shell-line';
    const command = document.createElement('div');
    command.className = 'shell-command';
    command.textContent = '› ' + text;
    const result = document.createElement('div');
    result.className = failed ? 'shell-answer error' : 'shell-answer';
    result.textContent = answer;
    line.append(command, result);
    history.append(line);
    history.scrollTop = history.scrollHeight;
  }
}

function saveJson(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wireFile(kind, textarea, filename) {
  const input = select('file-' + kind);
  select('load-' + kind).addEventListener('click', () => input.click());
  select('save-' + kind).addEventListener('click', () => saveJson(textarea.value, filename));
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      parseJson(text);
      textarea.value = text;
      updateEditor(textarea, select(kind === 'data' ? 'data-highlight' : 'source-highlight'));
      if (kind === 'data') validateData();
      status.textContent = 'Datei geladen';
      status.className = 'status success';
    } catch (error) {
      status.textContent = 'Fehler';
      status.className = 'status error';
      output.textContent = error.name + ': ' + error.message;
    }
    input.value = '';
  });
}

wireFile('program', source, 'programm.fjson.json');
wireFile('data', dataSource, 'daten.json');
select('run').addEventListener('click', () => run());
select('run-shell').addEventListener('click', () => run(shellSource.value, true));
select('clear-shell').addEventListener('click', () => history.replaceChildren());
select('reset').addEventListener('click', () => {
  interpreter = new Interpreter();
  history.replaceChildren();
  output.textContent = 'Sitzung zurückgesetzt. Drücke „Ausführen“ für einen neuen Start.';
  status.textContent = 'Neue Sitzung';
  status.className = 'status';
  steps.textContent = 'Noch nicht ausgeführt';
});
example.addEventListener('change', () => loadExample(example.value));
for (const textarea of [source, shellSource]) {
  textarea.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      run(textarea.value, textarea === shellSource);
    }
  });
}

dataSource.value = '{\n  "answer": 41,\n  "items": [1, 2, 3]\n}';
updateEditor(dataSource, select('data-highlight'));
validateData();
loadExample(example.value);
chooseTab('program');
