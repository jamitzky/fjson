// JSONL module directives; the evaluator in fjson.mjs remains unchanged.
import { EvaluationError, Interpreter, parseJson } from './fjson.mjs';

export class ModuleError extends EvaluationError {}

const simple = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(value);
const standard = new Map([
  ['math', [
    'plus', 'minus', 'times', 'divide', 'pow', 'mod', 'negate', 'abs',
    'floor', 'ceil', 'trunc', 'round', 'sqrt', 'min', 'max',
    'lt', 'le', 'gt', 'gte',
  ]],
  ['logic', [
    'unify', 'membero', 'patho', 'graph', 'edgeo', 'matcho', 'nodeo',
    'record', 'some', 'neqo', 'ge', 'project', 'choice', 'conj', 'run',
  ]],
]);

function documents(source) {
  if (typeof source !== 'string') throw new TypeError('JSONL source must be a string');
  const result = [];
  source.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try { result.push(parseJson(line)); }
    catch (error) { throw new ModuleError(`invalid JSONL line ${index + 1}: ${error.message}`); }
  });
  return result;
}

export class ModuleLoader {
  constructor(interpreter, modules = {}) {
    if (!(interpreter instanceof Interpreter)) throw new TypeError('interpreter must be an Interpreter');
    if (modules === null || typeof modules !== 'object' || Array.isArray(modules))
      throw new ModuleError('module registry must be an object');
    if (Object.entries(modules).some(([name, source]) =>
      !simple(name) || typeof source !== 'string' || standard.has(name)))
      throw new ModuleError('module registry requires simple names and JSONL strings');
    this.interpreter = interpreter;
    this.modules = { ...modules };
    this.loaded = new Set();
    this.loading = new Set();
  }

  load(source) {
    const directives = [], expressions = [];
    for (const doc of documents(source)) {
      if (Array.isArray(doc) && ['@import', '@namespace'].includes(doc[0]))
        directives.push(doc);
      else expressions.push(doc);
    }
    const values = this.interpreter.global.values;
    const before = new Map(values), loadedBefore = new Set(this.loaded);
    try { directives.forEach(doc => this.directive(doc)); }
    catch (error) {
      values.clear();
      for (const [key, value] of before) values.set(key, value);
      this.loaded = loadedBefore;
      this.loading.clear();
      throw error;
    }
    let result = null;
    for (const expression of expressions) result = this.interpreter.eval(expression);
    return result;
  }

  directive(doc) {
    if (doc[0] === '@import') {
      if (doc.length !== 2 || !simple(doc[1]))
        throw new ModuleError('@import expects a simple module name');
      this.import(doc[1]);
      return;
    }
    if (doc.length !== 3 || !simple(doc[1]) || doc[2] === null ||
        typeof doc[2] !== 'object' || Array.isArray(doc[2]))
      throw new ModuleError('@namespace expects a simple name and definition object');
    const values = this.interpreter.global.values;
    for (const name of Object.keys(doc[2])) {
      if (!simple(name)) throw new ModuleError('namespace exports require simple names');
      const qualified = `@${name}@${doc[1]}`;
      if (values.has(qualified)) throw new ModuleError(`duplicate binding: ${qualified}`);
    }
    for (const [name, expression] of Object.entries(doc[2]))
      this.interpreter.eval({ [`@${name}@${doc[1]}`]: expression });
  }

  import(name) {
    if (this.loaded.has(name)) return;
    if (this.loading.has(name)) throw new ModuleError(`import cycle: ${name}`);
    this.loading.add(name);
    try {
      if (standard.has(name)) {
        const values = this.interpreter.global.values;
        for (const exportName of standard.get(name)) {
          const qualified = `@${exportName}@${name}`;
          if (values.has(qualified)) throw new ModuleError(`duplicate binding: ${qualified}`);
          values.set(qualified, values.get(`@${exportName}`));
        }
      } else if (Object.hasOwn(this.modules, name)) {
        for (const doc of documents(this.modules[name])) {
          if (!Array.isArray(doc) || !['@import', '@namespace'].includes(doc[0]))
            throw new ModuleError(`module ${name} may contain only directives`);
          this.directive(doc);
        }
      } else throw new ModuleError(`unknown module: ${name}`);
      this.loaded.add(name);
    } finally { this.loading.delete(name); }
  }
}
