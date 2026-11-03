import {
  Interpreter, LogicVar, ResolutionError, ResourceLimitError, parseJson,
} from './fjson.mjs';

const runButton = document.querySelector('#run');
const summary = document.querySelector('#summary');
const results = document.querySelector('#results');

function equal(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function report(name, fn) {
  const item = document.createElement('li');
  const label = document.createElement('span');
  label.textContent = name;
  item.append(label);
  try {
    fn();
    item.className = 'pass';
    return true;
  } catch (error) {
    item.className = 'fail';
    const detail = document.createElement('small');
    detail.textContent = `${error.name}: ${error.message}`;
    label.append(detail);
    return false;
  } finally {
    results.append(item);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  runButton.disabled = true;
  results.replaceChildren();
  summary.textContent = 'Tests laufen …';
  let passed = 0;
  let total = 0;
  const check = (name, fn) => { total++; if (report(name, fn)) passed++; };

  try {
    const response = await fetch('./conformance.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Testdaten: HTTP ${response.status}`);
    const cases = parseJson(await response.text());
    for (const { name, program, expected } of cases) {
      check(name, () => {
        const actual = new Interpreter().eval(program);
        expect(equal(actual, expected),
          `Erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`);
      });
    }
  } catch (error) {
    check('Konformitätsfälle laden', () => { throw error; });
  }

  check('Globale Deklaration bleibt in der Sitzung', () => {
    const fj = new Interpreter();
    fj.eval({ '@answer': 42 });
    expect(fj.eval('@answer') === 42, 'Deklaration ging verloren');
  });
  check('Logische Variablen sind pro Aufruf frisch', () => {
    const fj = new Interpreter();
    const [a, again] = fj.eval(['!X', '!X']);
    expect(a instanceof LogicVar && a === again && a !== fj.eval('!X'),
      'Variablenidentität stimmt nicht');
  });
  check('Unbekannter Name meldet ResolutionError', () => {
    try { new Interpreter().eval('@missing'); }
    catch (error) { expect(error instanceof ResolutionError, 'Falscher Fehlertyp'); return; }
    throw new Error('Fehler wurde nicht ausgelöst');
  });
  check('Schrittlimit stoppt Rekursion', () => {
    try {
      new Interpreter({ maxSteps: 20 }).eval(['@letrec',
        { '@loop': ['@function', [], ['@loop']] }, ['@loop']]);
    } catch (error) {
      expect(error instanceof ResourceLimitError, 'Falscher Fehlertyp');
      return;
    }
    throw new Error('Rekursion wurde nicht gestoppt');
  });
  check('Doppelte JSON-Schlüssel werden abgewiesen', () => {
    try { parseJson('{"x":1,"x":2}'); }
    catch (error) { expect(error instanceof SyntaxError, 'Falscher Fehlertyp'); return; }
    throw new Error('Doppelter Schlüssel wurde akzeptiert');
  });

  summary.textContent = `${passed} von ${total} Tests bestanden`;
  summary.style.color = passed === total ? '#147354' : '#a22';
  runButton.disabled = false;
}

runButton.addEventListener('click', runTests);
runTests();
