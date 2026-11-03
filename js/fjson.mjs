// fjson core 0.3 and finite logic library for browsers and Node.js.
// No host I/O functions are installed by this module.

export class FjsonError extends Error {}
export class EvaluationError extends FjsonError {}
export class ResolutionError extends EvaluationError {}
export class ArityError extends EvaluationError {}
export class ResourceLimitError extends FjsonError {}

const SPECIAL = new Set([
  '@quote', '@function', '@let', '@letrec', '@if', '@and', '@or', '@try', '@apply',
]);
const UNBOUND = Symbol('unbound');
const SOURCE_ORDER = new WeakMap();
const isName = value => typeof value === 'string' && value.length > 1 && value[0] === '@';
const isLogicName = value => typeof value === 'string' && /^![A-Z][A-Za-z0-9_]*$/.test(value);
const isRecord = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const keys = value => SOURCE_ORDER.get(value) ?? Object.keys(value);
function record(entries) {
  const value = Object.fromEntries(entries);
  SOURCE_ORDER.set(value, entries.map(([key]) => key));
  return value;
}

// JSON.parse silently accepts duplicate keys. This small parser keeps member
// order and rejects duplicates, matching Interpreter.run in Python.
export function parseJson(source) {
  if (typeof source !== 'string') throw new TypeError('JSON source must be a string');
  let i = 0;
  const fail = message => { throw new SyntaxError(`${message} at offset ${i}`); };
  const space = () => { while (/[ \t\r\n]/.test(source[i] ?? '')) i++; };
  const string = () => {
    const start = i++;
    while (i < source.length) {
      if (source[i] === '"') {
        i++;
        try { return JSON.parse(source.slice(start, i)); }
        catch { fail('invalid JSON string'); }
      }
      if (source[i] === '\\') i++;
      i++;
    }
    fail('unterminated JSON string');
  };
  const value = () => {
    space();
    const ch = source[i];
    if (ch === '"') return string();
    if (ch === '[') {
      i++; space();
      const result = [];
      if (source[i] === ']') { i++; return result; }
      while (true) {
        result.push(value()); space();
        if (source[i] === ']') { i++; return result; }
        if (source[i++] !== ',') fail('expected comma');
      }
    }
    if (ch === '{') {
      i++; space();
      const result = Object.create(null);
      const order = [];
      if (source[i] === '}') { i++; SOURCE_ORDER.set(result, order); return result; }
      while (true) {
        space();
        if (source[i] !== '"') fail('expected object key');
        const key = string(); space();
        if (Object.hasOwn(result, key)) fail(`duplicate JSON object key: ${key}`);
        if (source[i++] !== ':') fail('expected colon');
        result[key] = value(); order.push(key); space();
        if (source[i] === '}') { i++; SOURCE_ORDER.set(result, order); return result; }
        if (source[i++] !== ',') fail('expected comma');
      }
    }
    for (const [word, literal] of [['true', true], ['false', false], ['null', null]]) {
      if (source.startsWith(word, i)) { i += word.length; return literal; }
    }
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(source.slice(i));
    if (match) {
      i += match[0].length;
      const number = Number(match[0]);
      if (!Number.isFinite(number) ||
          (!/[.eE]/.test(match[0]) && !Number.isSafeInteger(number))) {
        fail('number outside JavaScript reference range');
      }
      return number;
    }
    fail('invalid JSON value');
  };
  const result = value(); space();
  if (i !== source.length) fail('trailing JSON text');
  return result;
}

function cloneJson(value) {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (isRecord(value)) return record(keys(value).map(key => [key, cloneJson(value[key])]));
  return value;
}

function truthy(value) {
  if (value === null || value === false || value === 0 || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return keys(value).length > 0;
  return true;
}

function number(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new EvaluationError(`${name} expects finite numbers`);
  return value;
}

function jsonEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((item, i) => jsonEqual(item, b[i]));
  if (isRecord(a) && isRecord(b)) {
    const ak = keys(a), bk = keys(b);
    return ak.length === bk.length && ak.every(key => Object.hasOwn(b, key) && jsonEqual(a[key], b[key]));
  }
  return false;
}

class Environment {
  constructor(parent = null, scope = null) {
    this.parent = parent;
    this.values = new Map();
    this.scope = scope ?? parent?.scope ?? new Map();
  }
  resolve(name) {
    if (this.values.has(name)) {
      const value = this.values.get(name);
      if (value === UNBOUND) throw new ResolutionError(`uninitialized reference: ${name}`);
      return value;
    }
    if (this.parent) return this.parent.resolve(name);
    throw new ResolutionError(`unknown reference: ${name}`);
  }
  logic(name) {
    if (!this.scope.has(name)) this.scope.set(name, new LogicVar(name));
    return this.scope.get(name);
  }
}

class Native {
  constructor(name, arity, fn) { this.name = name; this.arity = arity; this.fn = fn; }
}

export class Closure {
  constructor(names, defaults, body, environment) {
    this.names = names; this.defaults = defaults; this.body = body; this.environment = environment;
  }
  get minArity() { return this.defaults === null ? this.names.length : 0; }
  get maxArity() { return this.names.length; }
}

export class LogicVar {
  constructor(name) { this.name = name; }
}

export class Goal {}
export class UnifyGoal extends Goal {
  constructor(left, right) { super(); this.left = left; this.right = right; }
}
export class ChoiceGoal extends Goal {
  constructor(left, right) { super(); this.left = left; this.right = right; }
}
export class ConjGoal extends Goal {
  constructor(left, right) { super(); this.left = left; this.right = right; }
}

function walk(term, substitutions, step) {
  while (term instanceof LogicVar && substitutions.has(term)) {
    step(); term = substitutions.get(term);
  }
  return term;
}

function occurs(variable, term, substitutions, step) {
  const pending = [term], seen = new Set();
  while (pending.length) {
    step();
    const value = walk(pending.pop(), substitutions, step);
    if (value === variable) return true;
    if (Array.isArray(value) || isRecord(value)) {
      if (seen.has(value)) continue;
      seen.add(value);
      pending.push(...(Array.isArray(value) ? value : keys(value).map(key => value[key])));
    }
  }
  return false;
}

function unify(left, right, substitutions, step) {
  const result = new Map(substitutions), pending = [[left, right]];
  while (pending.length) {
    step();
    let [a, b] = pending.pop();
    a = walk(a, result, step); b = walk(b, result, step);
    if (a === b) continue;
    if (a instanceof LogicVar) {
      if (occurs(a, b, result, step)) return null;
      result.set(a, b); continue;
    }
    if (b instanceof LogicVar) {
      if (occurs(b, a, result, step)) return null;
      result.set(b, a); continue;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return null;
      for (let i = 0; i < a.length; i++) pending.push([a[i], b[i]]);
      continue;
    }
    if (isRecord(a) && isRecord(b)) {
      const ak = keys(a), bk = keys(b);
      if (ak.length !== bk.length || ak.some(key => !Object.hasOwn(b, key))) return null;
      for (const key of ak) pending.push([a[key], b[key]]);
      continue;
    }
    if (!jsonEqual(a, b)) return null;
  }
  return result;
}

function reify(term, substitutions, step) {
  const free = new Map();
  const visit = value => {
    step(); value = walk(value, substitutions, step);
    if (value instanceof LogicVar) {
      if (!free.has(value)) free.set(value, free.size);
      return { var: value.name, index: free.get(value) };
    }
    if (Array.isArray(value)) return value.map(visit);
    if (isRecord(value)) return record(keys(value).map(key => [key, visit(value[key])]));
    return value;
  };
  return visit(term);
}

function search(goal, query, limit, step) {
  const results = [], work = [{ pending: [goal], substitutions: new Map() }];
  while (work.length && results.length < limit) {
    step();
    const { pending, substitutions } = work.pop();
    if (!pending.length) { results.push(reify(query, substitutions, step)); continue; }
    const [head, ...rest] = pending;
    if (head instanceof UnifyGoal) {
      const next = unify(head.left, head.right, substitutions, step);
      if (next !== null) work.push({ pending: rest, substitutions: next });
    } else if (head instanceof ChoiceGoal) {
      work.push({ pending: [head.right, ...rest], substitutions });
      work.push({ pending: [head.left, ...rest], substitutions });
    } else if (head instanceof ConjGoal) {
      work.push({ pending: [head.left, head.right, ...rest], substitutions });
    } else throw new TypeError('unsupported logic goal');
  }
  return results;
}

export class Interpreter {
  constructor({ maxSteps = 100000, maxDepth = 500 } = {}) {
    if (!Number.isSafeInteger(maxSteps) || maxSteps < 1 ||
        !Number.isSafeInteger(maxDepth) || maxDepth < 1)
      throw new RangeError('evaluation limits must be positive integers');
    this.maxSteps = maxSteps; this.maxDepth = maxDepth; this.steps = 0;
    this.global = new Environment();
    const binary = (name, fn) => new Native(name, 2, (a, b) => {
      const result = fn(number(a, name), number(b, name));
      if (!Number.isFinite(result) ||
          (Number.isInteger(result) && !Number.isSafeInteger(result)))
        throw new EvaluationError(`${name} produced a number outside the safe range`);
      return result;
    });
    for (const [name, fn] of [
      ['@plus', (a, b) => a + b], ['@minus', (a, b) => a - b],
      ['@times', (a, b) => a * b], ['@divide', (a, b) => a / b],
    ]) this.global.values.set(name, binary(name, fn));
    this.global.values.set('@le', new Native('@le', 2, (a, b) =>
      number(a, '@le') <= number(b, '@le')));
    this.global.values.set('@eq', new Native('@eq', 2, jsonEqual));
    this.global.values.set('@unify', new Native('@unify', 2, (a, b) => new UnifyGoal(a, b)));
    this.global.values.set('@choice', new Native('@choice', 2, (a, b) => {
      if (!(a instanceof Goal) || !(b instanceof Goal)) throw new EvaluationError('@choice expects two goals');
      return new ChoiceGoal(a, b);
    }));
    this.global.values.set('@conj', new Native('@conj', 2, (a, b) => {
      if (!(a instanceof Goal) || !(b instanceof Goal)) throw new EvaluationError('@conj expects two goals');
      return new ConjGoal(a, b);
    }));
    this.global.values.set('@run', new Native('@run', 3, (limit, query, goal) => {
      if (!Number.isSafeInteger(limit) || limit < 0)
        throw new EvaluationError('@run expects a nonnegative integer limit');
      if (!(goal instanceof Goal)) throw new EvaluationError('@run expects a goal');
      return search(goal, query, limit, () => this.tick(0));
    }));
  }

  run(source) { return this.eval(parseJson(source)); }
  eval(expression) {
    this.steps = 0; this.global.scope = new Map();
    return this.evaluate(expression, this.global, 0);
  }
  tick(depth) {
    this.steps++;
    if (this.steps > this.maxSteps) throw new ResourceLimitError('evaluation step limit exceeded');
    if (depth > this.maxDepth) throw new ResourceLimitError('evaluation depth limit exceeded');
  }
  binding(name) {
    if (!isName(name) || SPECIAL.has(name))
      throw new EvaluationError('binding name must be a non-reserved @ name');
    return name;
  }
  length(expr, expected) {
    if (expr.length !== expected) throw new ArityError(`${expr[0]} expects ${expected - 1} operands`);
  }
  accepts(fn, count) {
    if (fn instanceof Native) return fn.arity === count;
    if (fn instanceof Closure) return fn.minArity <= count && count <= fn.maxArity;
    return false;
  }
  invoke(fn, values, depth) {
    this.tick(depth);
    if (!this.accepts(fn, values.length)) {
      if (fn instanceof Native || fn instanceof Closure)
        throw new ArityError(`wrong number of arguments: ${values.length}`);
      throw new EvaluationError('value is not callable');
    }
    if (fn instanceof Native) return fn.fn(...values);
    const local = new Environment(fn.environment, new Map());
    fn.names.forEach((name, i) => local.values.set(name,
      i < values.length ? values[i] : fn.defaults[i]));
    return this.evaluate(fn.body, local, depth + 1);
  }
  evaluate(expr, env, depth) {
    this.tick(depth);
    if (typeof expr === 'string') {
      if (expr === '@') throw new ResolutionError('invalid reference: @');
      if (isLogicName(expr)) return env.logic(expr.slice(1));
      return isName(expr) ? env.resolve(expr) : expr;
    }
    if (expr === null || typeof expr === 'boolean') return expr;
    if (typeof expr === 'number') {
      if (!Number.isFinite(expr)) throw new EvaluationError('non-finite number');
      return expr;
    }
    if (expr instanceof LogicVar || expr instanceof Goal ||
        expr instanceof Native || expr instanceof Closure) return expr;
    if (isRecord(expr)) {
      const names = keys(expr);
      const declarations = names.filter(name => name.startsWith('@'));
      if (declarations.length) {
        if (declarations.length !== names.length)
          throw new EvaluationError('declaration object cannot mix @ names and data keys');
        names.forEach(name => this.binding(name));
        let result = null;
        for (const name of names) {
          result = this.evaluate(expr[name], env, depth + 1);
          env.values.set(name, result);
        }
        return result;
      }
      return record(names.map(name => [name, this.evaluate(expr[name], env, depth + 1)]));
    }
    if (!Array.isArray(expr)) throw new EvaluationError(`unsupported source value: ${typeof expr}`);
    if (!expr.length) return [];
    const head = expr[0];
    if (typeof head === 'string' && SPECIAL.has(head)) return this.special(expr, env, depth + 1);
    if (head === '@') throw new ResolutionError('invalid reference: @');
    if (isName(head)) {
      const fn = env.resolve(head);
      if (!(fn instanceof Native || fn instanceof Closure))
        throw new EvaluationError(`reference is not callable: ${head}`);
      if (!this.accepts(fn, expr.length - 1))
        throw new ArityError(`${head} does not accept ${expr.length - 1} arguments`);
      const values = expr.slice(1).map(item => this.evaluate(item, env, depth + 1));
      return this.invoke(fn, values, depth + 1);
    }
    return expr.map(item => this.evaluate(item, env, depth + 1));
  }
  special(expr, env, depth) {
    const head = expr[0];
    if (head === '@quote') { this.length(expr, 2); return cloneJson(expr[1]); }
    if (head === '@function') {
      this.length(expr, 3);
      const parameters = expr[1];
      if (!Array.isArray(parameters) && !isRecord(parameters))
        throw new EvaluationError('@function parameters must be an array or object');
      const names = Array.isArray(parameters) ? parameters : keys(parameters);
      if (new Set(names).size !== names.length ||
          names.some(name => !isName(name) || SPECIAL.has(name)))
        throw new EvaluationError('@function parameters must be distinct @ names');
      const defaults = isRecord(parameters) ?
        names.map(name => this.evaluate(parameters[name], env, depth + 1)) : null;
      return new Closure(names, defaults, expr[2], env);
    }
    if (head === '@let' || head === '@letrec') {
      this.length(expr, 3);
      const bindings = expr[1];
      if (!isRecord(bindings)) throw new EvaluationError(`${head} expects a binding object`);
      const names = keys(bindings);
      names.forEach(name => this.binding(name));
      const local = new Environment(env);
      if (head === '@letrec') names.forEach(name => local.values.set(name, UNBOUND));
      for (const name of names) local.values.set(name,
        this.evaluate(bindings[name], local, depth + 1));
      return this.evaluate(expr[2], local, depth + 1);
    }
    if (head === '@if') {
      this.length(expr, 4);
      return this.evaluate(expr[truthy(this.evaluate(expr[1], env, depth + 1)) ? 2 : 3],
        env, depth + 1);
    }
    if (head === '@and' || head === '@or') {
      let result = head === '@and';
      for (const item of expr.slice(1)) {
        result = this.evaluate(item, env, depth + 1);
        if ((head === '@and' && !truthy(result)) || (head === '@or' && truthy(result))) return result;
      }
      return result;
    }
    if (head === '@try') {
      if (![2, 3].includes(expr.length)) throw new ArityError('@try expects body and optional fallback');
      try { return this.evaluate(expr[1], env, depth + 1); }
      catch (error) {
        if (!(error instanceof EvaluationError)) throw error;
        return expr.length === 3 ? this.evaluate(expr[2], env, depth + 1) :
          { error: error.constructor.name, message: error.message };
      }
    }
    if (head === '@apply') {
      this.length(expr, 3);
      const fn = this.evaluate(expr[1], env, depth + 1);
      const values = this.evaluate(expr[2], env, depth + 1);
      if (!Array.isArray(values)) throw new EvaluationError('@apply expects an argument array');
      return this.invoke(fn, values, depth + 1);
    }
    throw new EvaluationError(`unknown special form: ${head}`);
  }
}
