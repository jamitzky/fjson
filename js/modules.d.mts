import { EvaluationError, type Interpreter } from './fjson.mjs';

export class ModuleError extends EvaluationError {}
export class ModuleLoader {
  constructor(interpreter: Interpreter, modules?: Record<string, string>);
  readonly interpreter: Interpreter;
  readonly modules: Record<string, string>;
  readonly loaded: Set<string>;
  load(source: string): unknown;
}
