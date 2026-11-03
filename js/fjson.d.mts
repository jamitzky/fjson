export type JsonValue = null | boolean | number | string | JsonValue[] |
  { [key: string]: JsonValue };

export class FjsonError extends Error {}
export class EvaluationError extends FjsonError {}
export class ResolutionError extends EvaluationError {}
export class ArityError extends EvaluationError {}
export class ResourceLimitError extends FjsonError {}

export class LogicVar { constructor(name: string); readonly name: string; }
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
  eval(expression: JsonValue | LogicVar | Goal | Closure): unknown;
}
