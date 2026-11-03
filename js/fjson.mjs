// fjson core 0.3 and finite logic library for browsers and Node.js.
// No host I/O functions are installed by this module.

export class FjsonError extends Error {
  constructor(message) { super(message); this.name = new.target.name; }
}
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

export class JsonGraph {
  constructor(data, options = {}) {
    if (!isRecord(options) || keys(options).some(key => !['refs', 'id_key', 'ref_key'].includes(key)))
      throw new EvaluationError('@graph options must contain only refs, id_key and ref_key');
    this.followRefs = options.refs ?? false;
    this.idKey = options.id_key ?? 'id';
    this.refKey = options.ref_key ?? '$ref';
    if (typeof this.followRefs !== 'boolean' ||
        [this.idKey, this.refKey].some(key => typeof key !== 'string' || !key))
      throw new EvaluationError('invalid @graph reference options');
    this.data = data; this.nodes = new Map(); this.ids = null;
  }
  node(path = []) {
    const key = JSON.stringify(path);
    if (!this.nodes.has(key)) this.nodes.set(key, new GraphNode(this, path));
    return this.nodes.get(key);
  }
  get root() { return this.node(); }
  indexIds(step) {
    if (this.ids !== null) return this.ids;
    const result = new Map(), work = [{ path: [], value: this.data, ancestors: new Set() }];
    while (work.length) {
      step();
      const { path, value, ancestors } = work.pop();
      if (!Array.isArray(value) && !isRecord(value)) continue;
      if (ancestors.has(value)) continue;
      const next = new Set(ancestors); next.add(value);
      if (isRecord(value) && Object.hasOwn(value, this.idKey) &&
          typeof value[this.idKey] === 'string') {
        const id = value[this.idKey];
        if (result.has(id)) throw new EvaluationError(`duplicate graph id: ${id}`);
        result.set(id, this.node(path));
      }
      const entries = rawEdges(value);
      for (let i = entries.length - 1; i >= 0; i--) {
        const [key, child] = entries[i];
        work.push({ path: [...path, key], value: child, ancestors: next });
      }
    }
    this.ids = result;
    return result;
  }
  byId(id, step) { return this.indexIds(step).get(id); }
  edges(node, step) {
    return rawEdges(node.value).map(([key, child]) => {
      step();
      if (this.followRefs && isRecord(child) && keys(child).length === 1 &&
          Object.hasOwn(child, this.refKey) && typeof child[this.refKey] === 'string') {
        const target = this.byId(child[this.refKey], step);
        if (!target) throw new EvaluationError(`unknown graph reference: ${child[this.refKey]}`);
        return [key, target];
      }
      return [key, Array.isArray(child) || isRecord(child) ? this.node([...node.path, key]) : child];
    });
  }
}

export class GraphNode {
  constructor(graph, path) { this.graph = graph; this.path = path; }
  get value() { return this.path.reduce((value, key) => value[key], this.graph.data); }
}
export class RecordPattern {
  constructor(fields) { this.fields = fields; }
}
export class SomePattern {
  constructor(item) { this.item = item; }
}
function rawEdges(value) {
  return Array.isArray(value) ? value.map((item, i) => [i, item]) :
    isRecord(value) ? keys(value).map(key => [key, value[key]]) : [];
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
export class MemberGoal extends Goal {
  constructor(items, item) { super(); this.items = items; this.item = item; }
}
export class PathGoal extends Goal {
  constructor(data, path, value) { super(); this.data = data; this.path = path; this.value = value; }
}
export class EdgeGoal extends Goal {
  constructor(source, key, target) { super(); Object.assign(this, { source, key, target }); }
}
export class MatchoGoal extends Goal {
  constructor(data, pattern) { super(); Object.assign(this, { data, pattern }); }
}
export class NodeGoal extends Goal {
  constructor(graph, identifier, node) { super(); Object.assign(this, { graph, identifier, node }); }
}
export class NeqGoal extends Goal {
  constructor(left, right) { super(); this.left = left; this.right = right; }
}
export class GeGoal extends Goal {
  constructor(left, right) { super(); this.left = left; this.right = right; }
}
export class ProjectGoal extends Goal {
  constructor(fn, args, result) { super(); this.fn = fn; this.args = args; this.result = result; }
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

function match(data, pattern, substitutions, step) {
  let result = new Map(substitutions);
  const pending = [[data, pattern]];
  while (pending.length) {
    step();
    let [value, expected] = pending.pop();
    value = walk(value, result, step); expected = walk(expected, result, step);
    if (value instanceof LogicVar) return null;
    if (isRecord(value) && isRecord(expected)) {
      const names = keys(expected);
      if (names.some(key => !Object.hasOwn(value, key))) return null;
      for (const key of names) pending.push([value[key], expected[key]]);
      continue;
    }
    if (Array.isArray(value) && Array.isArray(expected)) {
      if (value.length !== expected.length) return null;
      for (let i = 0; i < value.length; i++) pending.push([value[i], expected[i]]);
      continue;
    }
    result = unify(value, expected, result, step);
    if (result === null) return null;
  }
  return result;
}

function resolved(term, substitutions, step) {
  step();
  const value = walk(term, substitutions, step);
  if (value instanceof LogicVar) return [false, null];
  if (Array.isArray(value)) {
    const parts = value.map(item => resolved(item, substitutions, step));
    return [parts.every(([ok]) => ok), parts.map(([, item]) => item)];
  }
  if (isRecord(value)) {
    const parts = keys(value).map(key => [key, resolved(value[key], substitutions, step)]);
    return [parts.every(([, [ok]]) => ok),
      record(parts.map(([key, [, item]]) => [key, item]))];
  }
  return [true, value];
}

function paths(data, step) {
  const result = [], work = [{ path: [], value: data, ancestors: new Set() }];
  while (work.length) {
    step();
    const { path, value, ancestors } = work.pop();
    result.push([path, value]);
    if (Array.isArray(value) || isRecord(value)) {
      if (ancestors.has(value)) continue;
      const next = new Set(ancestors); next.add(value);
      const entries = Array.isArray(value) ? value.map((item, i) => [i, item]) :
        keys(value).map(key => [key, value[key]]);
      for (let i = entries.length - 1; i >= 0; i--) {
        const [key, item] = entries[i];
        work.push({ path: [...path, key], value: item, ancestors: next });
      }
    }
  }
  return result;
}

function atPath(data, path, step) {
  if (!Array.isArray(path)) return [false, null];
  let value = data;
  for (const key of path) {
    step();
    if (isRecord(value) && typeof key === 'string' && Object.hasOwn(value, key))
      value = value[key];
    else if (Array.isArray(value) && Number.isSafeInteger(key) &&
             key >= 0 && key < value.length) value = value[key];
    else return [false, null];
  }
  return [true, value];
}

function reify(term, substitutions, step) {
  const free = new Map();
  const visit = value => {
    step(); value = walk(value, substitutions, step);
    if (value instanceof LogicVar) {
      if (!free.has(value)) free.set(value, free.size);
      return { var: value.name, index: free.get(value) };
    }
    if (value instanceof GraphNode) return { node: [...value.path] };
    if (value instanceof JsonGraph) return { node: [] };
    if (Array.isArray(value)) return value.map(visit);
    if (isRecord(value)) return record(keys(value).map(key => [key, visit(value[key])]));
    return value;
  };
  return visit(term);
}

function matcho(data, pattern, substitutions, step) {
  step(); data = walk(data, substitutions, step);
  if (data instanceof GraphNode) data = data.value;
  else if (data instanceof JsonGraph) data = data.data;
  if (pattern instanceof RecordPattern) {
    if (!isRecord(data) || keys(pattern.fields).some(key => !Object.hasOwn(data, key))) return [];
    let states = [substitutions];
    for (const key of keys(pattern.fields))
      states = states.flatMap(state => matcho(data[key], pattern.fields[key], state, step));
    return states;
  }
  if (pattern instanceof SomePattern)
    return Array.isArray(data) ? data.flatMap(item => matcho(item, pattern.item, substitutions, step)) : [];
  const next = match(data, pattern, substitutions, step);
  return next === null ? [] : [next];
}

function graphAtPath(graph, start, path, step) {
  if (!Array.isArray(path)) return [false, null];
  let current = start;
  for (const key of path) {
    step();
    if (!(current instanceof GraphNode)) return [false, null];
    const edge = graph.edges(current, step).find(([label]) => jsonEqual(label, key));
    if (!edge) return [false, null];
    current = edge[1];
  }
  return [true, current];
}

function graphPaths(graph, start, step) {
  const result = [], work = [{ path: [], node: start, ancestors: new Set() }];
  while (work.length) {
    step();
    const { path, node, ancestors } = work.pop();
    result.push([path, node]);
    if (!(node instanceof GraphNode) || ancestors.has(node)) continue;
    const next = new Set(ancestors); next.add(node);
    const edges = graph.edges(node, step);
    for (let i = edges.length - 1; i >= 0; i--) {
      const [key, target] = edges[i];
      work.push({ path: [...path, key], node: target, ancestors: next });
    }
  }
  return result;
}

function sameSubstitutions(left, right) {
  return left.size === right.size && [...left].every(([key, value]) => right.get(key) === value);
}

function settle(delayed, substitutions, step, project) {
  let remaining = delayed;
  let current = substitutions;
  while (remaining.length) {
    const next = [];
    let progressed = false;
    for (const goal of remaining) {
      step();
      if (goal instanceof NeqGoal) {
        const possible = unify(goal.left, goal.right, current, step);
        if (possible === null) progressed = true;
        else if (sameSubstitutions(possible, current)) return null;
        else next.push(goal);
      } else if (goal instanceof GeGoal) {
        const [leftReady, left] = resolved(goal.left, current, step);
        const [rightReady, right] = resolved(goal.right, current, step);
        if (!leftReady || !rightReady) next.push(goal);
        else if (typeof left !== 'number' || typeof right !== 'number' ||
                 !Number.isFinite(left) || !Number.isFinite(right) || left < right) return null;
        else progressed = true;
      } else if (goal instanceof ProjectGoal) {
        const [ready, args] = resolved(goal.args, current, step);
        if (!ready) next.push(goal);
        else {
          current = unify(goal.result, project(goal.fn, args), current, step);
          if (current === null) return null;
          progressed = true;
        }
      } else throw new TypeError('unsupported delayed goal');
    }
    if (!progressed) return null;
    remaining = next;
  }
  return current;
}

function search(goal, query, limit, step, project) {
  const results = [], work = [{ pending: [goal], substitutions: new Map(), delayed: [] }];
  while (work.length && results.length < limit) {
    step();
    const { pending, substitutions, delayed } = work.pop();
    if (!pending.length) {
      const state = settle(delayed, substitutions, step, project);
      if (state !== null) results.push(reify(query, state, step));
      continue;
    }
    const [head, ...rest] = pending;
    if (head instanceof UnifyGoal) {
      const next = unify(head.left, head.right, substitutions, step);
      if (next !== null) work.push({ pending: rest, substitutions: next, delayed });
    } else if (head instanceof MemberGoal) {
      const items = walk(head.items, substitutions, step);
      if (Array.isArray(items)) {
        for (let i = items.length - 1; i >= 0; i--) {
          const next = unify(items[i], head.item, substitutions, step);
          if (next !== null) work.push({ pending: rest, substitutions: next, delayed });
        }
      }
    } else if (head instanceof PathGoal) {
      const data = walk(head.data, substitutions, step);
      if (!(data instanceof LogicVar)) {
        const [known, path] = resolved(head.path, substitutions, step);
        let candidates;
        if (data instanceof JsonGraph || data instanceof GraphNode) {
          const graph = data instanceof JsonGraph ? data : data.graph;
          const start = data instanceof JsonGraph ? data.root : data;
          const [found, value] = known ? graphAtPath(graph, start, path, step) : [false, null];
          candidates = known ? (found ? [[path, value]] : []) : graphPaths(graph, start, step);
        } else {
          const [found, value] = known ? atPath(data, path, step) : [false, null];
          candidates = known ? (found ? [[path, value]] : []) : paths(data, step);
        }
        for (const [path, value] of candidates.reverse()) {
          let next = unify(head.path, path, substitutions, step);
          if (next !== null) next = unify(head.value, value, next, step);
          if (next !== null) work.push({ pending: rest, substitutions: next, delayed });
        }
      }
    } else if (head instanceof EdgeGoal) {
      const source = walk(head.source, substitutions, step);
      if (!(source instanceof LogicVar)) {
        const edges = source instanceof JsonGraph ? source.edges(source.root, step) :
          source instanceof GraphNode ? source.graph.edges(source, step) : rawEdges(source);
        for (const [key, target] of edges.reverse()) {
          let next = unify(head.key, key, substitutions, step);
          if (next !== null) next = unify(head.target, target, next, step);
          if (next !== null) work.push({ pending: rest, substitutions: next, delayed });
        }
      }
    } else if (head instanceof MatchoGoal) {
      for (const next of matcho(head.data, head.pattern, substitutions, step).reverse())
        work.push({ pending: rest, substitutions: next, delayed });
    } else if (head instanceof NodeGoal) {
      const graph = walk(head.graph, substitutions, step);
      if (graph instanceof JsonGraph) {
        const id = walk(head.identifier, substitutions, step);
        const entries = id instanceof LogicVar ? [...graph.indexIds(step)] :
          typeof id === 'string' ? [[id, graph.byId(id, step)]] : [];
        for (const [key, node] of entries.reverse()) {
          if (!node) continue;
          let next = unify(head.identifier, key, substitutions, step);
          if (next !== null) next = unify(head.node, node, next, step);
          if (next !== null) work.push({ pending: rest, substitutions: next, delayed });
        }
      }
    } else if (head instanceof NeqGoal || head instanceof GeGoal || head instanceof ProjectGoal) {
      work.push({ pending: rest, substitutions, delayed: [...delayed, head] });
    } else if (head instanceof ChoiceGoal) {
      work.push({ pending: [head.right, ...rest], substitutions, delayed });
      work.push({ pending: [head.left, ...rest], substitutions, delayed });
    } else if (head instanceof ConjGoal) {
      work.push({ pending: [head.left, head.right, ...rest], substitutions, delayed });
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
    const unary = (name, fn) => new Native(name, 1, value => {
      const result = fn(number(value, name));
      if (!Number.isFinite(result) ||
          (Number.isInteger(result) && !Number.isSafeInteger(result)))
        throw new EvaluationError(`${name} produced a number outside the safe range`);
      return result;
    });
    for (const [name, fn] of [
      ['@plus', (a, b) => a + b], ['@minus', (a, b) => a - b],
      ['@times', (a, b) => a * b], ['@divide', (a, b) => a / b],
      ['@pow', (a, b) => a ** b], ['@min', Math.min], ['@max', Math.max],
    ]) this.global.values.set(name, binary(name, fn));
    for (const [name, fn] of [
      ['@negate', a => -a], ['@abs', Math.abs], ['@floor', Math.floor],
      ['@ceil', Math.ceil], ['@trunc', Math.trunc],
      ['@round', a => Math.sign(a) * Math.floor(Math.abs(a) + 0.5)],
      ['@sqrt', Math.sqrt],
    ]) this.global.values.set(name, unary(name, fn));
    this.global.values.set('@mod', new Native('@mod', 2, (a, b) => {
      if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b))
        throw new EvaluationError('@mod expects integers');
      if (b === 0) throw new EvaluationError('@mod division by zero');
      let result = a % b;
      if (result !== 0 && (result > 0) !== (b > 0)) result += b;
      return result;
    }));
    this.global.values.set('@lt', new Native('@lt', 2, (a, b) =>
      number(a, '@lt') < number(b, '@lt')));
    this.global.values.set('@le', new Native('@le', 2, (a, b) =>
      number(a, '@le') <= number(b, '@le')));
    this.global.values.set('@gt', new Native('@gt', 2, (a, b) =>
      number(a, '@gt') > number(b, '@gt')));
    this.global.values.set('@gte', new Native('@gte', 2, (a, b) =>
      number(a, '@gte') >= number(b, '@gte')));
    this.global.values.set('@not', new Native('@not', 1, value => !truthy(value)));
    this.global.values.set('@eq', new Native('@eq', 2, jsonEqual));
    this.global.values.set('@get', new Native('@get', 2, (container, key) => {
      if (Array.isArray(container) && Number.isSafeInteger(key)) {
        if (key >= 0 && key < container.length) return container[key];
      } else if (isRecord(container) && typeof key === 'string') {
        if (Object.hasOwn(container, key)) return container[key];
      } else throw new EvaluationError('@get expects an array and index or object and key');
      throw new EvaluationError('@get key or index does not exist');
    }));
    this.global.values.set('@length', new Native('@length', 1, value => {
      if (Array.isArray(value)) return value.length;
      if (isRecord(value)) return keys(value).length;
      throw new EvaluationError('@length expects an array or object');
    }));
    this.global.values.set('@list', new Native('@list', null, (...items) => items));
    this.global.values.set('@range', new Native('@range', [1, 2, 3], (...args) => {
      if (args.some(value => !Number.isSafeInteger(value)))
        throw new EvaluationError('@range expects integers');
      const [start, stop, stride] = args.length === 1 ? [0, args[0], 1] :
        args.length === 2 ? [args[0], args[1], 1] : args;
      if (stride === 0) throw new EvaluationError('@range step must not be zero');
      const result = [];
      for (let value = start; stride > 0 ? value < stop : value > stop; value += stride) {
        this.tick(0);
        if (!Number.isSafeInteger(value)) throw new EvaluationError('@range exceeded safe integer range');
        result.push(value);
      }
      return result;
    }));
    const sequenceArgs = (name, fn, items, arity) => {
      if (!(fn instanceof Native || fn instanceof Closure) || !Array.isArray(items))
        throw new EvaluationError(`${name} expects a function and an array`);
      if (!this.accepts(fn, arity))
        throw new ArityError(`${name} callback must accept ${arity} arguments`);
    };
    this.global.values.set('@map', new Native('@map', 2, (fn, items) => {
      sequenceArgs('@map', fn, items, 1);
      return items.map(item => this.invoke(fn, [item], 0));
    }));
    this.global.values.set('@filter', new Native('@filter', 2, (fn, items) => {
      sequenceArgs('@filter', fn, items, 1);
      return items.filter(item => truthy(this.invoke(fn, [item], 0)));
    }));
    this.global.values.set('@reduce', new Native('@reduce', 3, (fn, items, initial) => {
      sequenceArgs('@reduce', fn, items, 2);
      let result = initial;
      for (const item of items) result = this.invoke(fn, [result, item], 0);
      return result;
    }));
    this.global.values.set('@unify', new Native('@unify', 2, (a, b) => new UnifyGoal(a, b)));
    this.global.values.set('@membero', new Native('@membero', 2, (items, item) =>
      new MemberGoal(items, item)));
    this.global.values.set('@patho', new Native('@patho', 3, (data, path, value) =>
      new PathGoal(data, path, value)));
    this.global.values.set('@graph', new Native('@graph', [1, 2], (...args) =>
      new JsonGraph(...args)));
    this.global.values.set('@edgeo', new Native('@edgeo', 3, (source, key, target) =>
      new EdgeGoal(source, key, target)));
    this.global.values.set('@matcho', new Native('@matcho', 2, (data, pattern) =>
      new MatchoGoal(data, pattern)));
    this.global.values.set('@nodeo', new Native('@nodeo', 3, (graph, id, node) =>
      new NodeGoal(graph, id, node)));
    this.global.values.set('@record', new Native('@record', 1, fields => {
      if (!isRecord(fields)) throw new EvaluationError('@record expects an object');
      return new RecordPattern(fields);
    }));
    this.global.values.set('@some', new Native('@some', 1, item => new SomePattern(item)));
    this.global.values.set('@neqo', new Native('@neqo', 2, (a, b) => new NeqGoal(a, b)));
    this.global.values.set('@ge', new Native('@ge', 2, (a, b) => new GeGoal(a, b)));
    this.global.values.set('@project', new Native('@project', 3, (fn, args, result) => {
      if (!(fn instanceof Native || fn instanceof Closure) || !Array.isArray(args))
        throw new EvaluationError('@project expects a function and argument array');
      return new ProjectGoal(fn, args, result);
    }));
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
      return search(goal, query, limit, () => this.tick(0),
        (fn, args) => this.invoke(fn, args, 0));
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
    if (fn instanceof Native) return fn.arity === null ||
      (Array.isArray(fn.arity) ? fn.arity.includes(count) : fn.arity === count);
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
        expr instanceof Native || expr instanceof Closure || expr instanceof JsonGraph ||
        expr instanceof GraphNode || expr instanceof RecordPattern ||
        expr instanceof SomePattern) return expr;
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
