import { Closure, Goal, Interpreter, LogicVar } from '../js/fjson.mjs';

const examples = {
  inc: ['@let',
    { '@inc': ['@function', ['@x'], ['@plus', '@x', 1]] },
    ['@inc', 41]],
  defaults: ['@let',
    { '@inc': ['@function', { '@x': 1 }, ['@plus', '@x', 1]] },
    ['@plus', ['@inc'], ['@inc', 41]]],
  logic: ['@run', 2, '!X', ['@choice',
    ['@unify', '!X', 'alice'], ['@unify', '!X', 'bob']]],
  recursion: ['@letrec',
    { '@factorial': ['@function', ['@n'],
      ['@if', ['@le', '@n', 1], 1,
        ['@times', '@n', ['@factorial', ['@minus', '@n', 1]]]]] },
    ['@factorial', 5]],
  quote: ['@quote', { '@message': ['@plus', 40, 2], 'symbol': '!X' }],
};

const source = document.querySelector('#source');
const example = document.querySelector('#example');
const output = document.querySelector('#result');
const status = document.querySelector('#status');
const steps = document.querySelector('#steps');
const lineCount = document.querySelector('#line-count');
let interpreter = new Interpreter();

function updateLines() {
  const count = source.value.split(/\r\n|\n|\r/).length;
  lineCount.textContent = `${count} ${count === 1 ? 'Zeile' : 'Zeilen'}`;
}

function loadExample(name) {
  source.value = JSON.stringify(examples[name], null, 2);
  updateLines();
  output.textContent = 'Drücke „Ausführen“, um den Ausdruck auszuwerten.';
  steps.textContent = 'Noch nicht ausgeführt';
  status.textContent = 'Bereit';
  status.className = 'status';
}

function displayValue(value, seen = new WeakSet()) {
  if (value instanceof LogicVar) return `⟨Logikvariable !${value.name}⟩`;
  if (value instanceof Closure) return `⟨Funktion (${value.names.join(', ')})⟩`;
  if (value instanceof Goal) return `⟨${value.constructor.name}⟩`;
  if (value && typeof value === 'object' && typeof value.fn === 'function')
    return `⟨Native ${value.name ?? 'Funktion'}⟩`;
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '⟨zyklischer Wert⟩';
    seen.add(value);
    if (Array.isArray(value)) return value.map(item => displayValue(item, seen));
    return Object.fromEntries(Object.entries(value).map(
      ([key, item]) => [key, displayValue(item, seen)]));
  }
  return value;
}

function run() {
  try {
    const value = interpreter.run(source.value);
    output.textContent = JSON.stringify(displayValue(value), null, 2) ?? 'undefined';
    status.textContent = 'Erfolgreich';
    status.className = 'status success';
    steps.textContent = `${interpreter.steps} Auswertungsschritte`;
  } catch (error) {
    output.textContent = `${error.name}: ${error.message}`;
    status.textContent = 'Fehler';
    status.className = 'status error';
    steps.textContent = error instanceof SyntaxError ?
      'JSON wurde nicht ausgewertet' : `${interpreter.steps} Schritte bis zum Fehler`;
  }
}

document.querySelector('#run').addEventListener('click', run);
document.querySelector('#reset').addEventListener('click', () => {
  interpreter = new Interpreter();
  output.textContent = 'Sitzung zurückgesetzt. Drücke „Ausführen“ für einen neuen Start.';
  status.textContent = 'Neue Sitzung';
  status.className = 'status';
  steps.textContent = 'Noch nicht ausgeführt';
});
example.addEventListener('change', () => loadExample(example.value));
source.addEventListener('input', updateLines);
source.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    run();
  }
});

loadExample(example.value);
