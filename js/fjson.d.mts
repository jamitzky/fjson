export type JsonValue = null | boolean | number | string | JsonValue[] |
  { [key: string]: JsonValue };

export class FjsonError extends Error {}
export class EvaluationError extends FjsonError {}
export class ResolutionError extends EvaluationError {}
export class ArityError extends EvaluationError {}
export class ResourceLimitError extends FjsonError {}

export class LogicVar { constructor(name: string); readonly name: string; }
export class JsonGraph {
  constructor(data: unknown, options?: { refs?: boolean; id_key?: string; ref_key?: string });
  readonly data: unknown;
  readonly root: GraphNode;
  node(path?: (string | number)[]): GraphNode;
}
export class GraphNode {
  constructor(graph: JsonGraph, path: (string | number)[]);
  readonly graph: JsonGraph;
  readonly path: (string | number)[];
  readonly value: unknown;
}
export class RecordPattern {
  constructor(fields: Record<string, unknown>);
  readonly fields: Record<string, unknown>;
}
export class SomePattern { constructor(item: unknown); readonly item: unknown; }
export class Goal {}
export class UnifyGoal extends Goal {
  constructor(left: unknown, right: unknown);
  readonly left: unknown; readonly right: unknown;
}
export class ChoiceGoal extends Goal {
  constructor(left: Goal, right: Goal);
  readonly left: Goal; readonly right: Goal;
}
export class ConjGoal extends Goal {
  constructor(left: Goal, right: Goal);
  readonly left: Goal; readonly right: Goal;
}
export class MatchGoal extends Goal {
  constructor(data: unknown, pattern: unknown);
  readonly data: unknown; readonly pattern: unknown;
}
export class MemberGoal extends Goal {
  constructor(items: unknown, item: unknown);
  readonly items: unknown; readonly item: unknown;
}
export class PathGoal extends Goal {
  constructor(data: unknown, path: unknown, value: unknown);
  readonly data: unknown; readonly path: unknown; readonly value: unknown;
}
export class EdgeGoal extends Goal {
  constructor(source: unknown, key: unknown, target: unknown);
  readonly source: unknown; readonly key: unknown; readonly target: unknown;
}
export class MatchoGoal extends Goal {
  constructor(data: unknown, pattern: unknown);
  readonly data: unknown; readonly pattern: unknown;
}
export class NodeGoal extends Goal {
  constructor(graph: unknown, identifier: unknown, node: unknown);
  readonly graph: unknown; readonly identifier: unknown; readonly node: unknown;
}
export class NeqGoal extends Goal {
  constructor(left: unknown, right: unknown);
  readonly left: unknown; readonly right: unknown;
}
export class GeGoal extends Goal {
  constructor(left: unknown, right: unknown);
  readonly left: unknown; readonly right: unknown;
}
export class ProjectGoal extends Goal {
  constructor(fn: unknown, args: unknown[], result: unknown);
  readonly fn: unknown; readonly args: unknown[]; readonly result: unknown;
}
export class Closure {
  readonly names: string[];
  readonly defaults: unknown[] | null;
  readonly body: unknown;
  readonly minArity: number;
  readonly maxArity: number;
}

export function parseJson(source: string): JsonValue;

export class Interpreter {
  constructor(options?: { maxSteps?: number; maxDepth?: number });
  readonly maxSteps: number;
  readonly maxDepth: number;
  readonly steps: number;
  run(source: string): unknown;
  eval(expression: JsonValue | LogicVar | Goal | Closure | JsonGraph | GraphNode |
    RecordPattern | SomePattern): unknown;
}
