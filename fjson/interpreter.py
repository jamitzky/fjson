"""Interpreter for the documented FJ@ JSON core.

Only the Python standard library is used. Source programs are JSON values;
closures and native functions are runtime values and are not JSON serializable.
"""

from __future__ import annotations

import copy
import json
import math
from dataclasses import dataclass
from typing import Any, Callable


class FjsonError(Exception):
    """Base class for language errors."""


class EvaluationError(FjsonError):
    """Invalid expression or operation."""


class ResolutionError(EvaluationError):
    """Unknown or as yet uninitialized reference."""


class ArityError(EvaluationError):
    """Wrong number of arguments."""


class ResourceLimitError(FjsonError):
    """Evaluation exceeded a configured limit."""


_UNBOUND = object()
_SPECIAL = frozenset({
    "@quote", "@function", "@define", "@let", "@letrec", "@if",
    "@do", "@and", "@or", "@try", "@pipe", "@apply",
})


def _is_name(value: Any) -> bool:
    return isinstance(value, str) and len(value) > 1 and value.startswith("@")


class Environment:
    def __init__(self, parent: Environment | None = None) -> None:
        self.parent = parent
        self.values: dict[str, Any] = {}

    def resolve(self, name: str) -> Any:
        if name in self.values:
            value = self.values[name]
            if value is _UNBOUND:
                raise ResolutionError(f"uninitialized reference: {name}")
            return value
        if self.parent is not None:
            return self.parent.resolve(name)
        raise ResolutionError(f"unknown reference: {name}")


@dataclass(frozen=True)
class Native:
    name: str
    arity: int
    function: Callable[..., Any]


@dataclass
class Closure:
    names: tuple[str, ...]
    defaults: tuple[Any, ...] | None
    body: Any
    environment: Environment

    @property
    def min_arity(self) -> int:
        return len(self.names) if self.defaults is None else 0

    @property
    def max_arity(self) -> int:
        return len(self.names)


def _number(value: Any, operation: str) -> int | float:
    if type(value) not in (int, float) or (
        isinstance(value, float) and not math.isfinite(value)
    ):
        raise EvaluationError(f"{operation} expects finite numbers")
    return value


def _binary_number(name: str, operation: Callable[[Any, Any], Any]) -> Native:
    def run(a: Any, b: Any) -> Any:
        left, right = _number(a, name), _number(b, name)
        try:
            result = operation(left, right)
        except (ArithmeticError, OverflowError) as exc:
            raise EvaluationError(f"{name}: {exc}") from exc
        if isinstance(result, float) and not math.isfinite(result):
            raise EvaluationError(f"{name} produced a non-finite number")
        return result

    return Native(name, 2, run)


def _json_equal(a: Any, b: Any) -> bool:
    if type(a) is bool or type(b) is bool:
        return type(a) is type(b) and a == b
    if type(a) in (int, float) and type(b) in (int, float):
        return a == b
    if type(a) is not type(b):
        return False
    if isinstance(a, list):
        return len(a) == len(b) and all(_json_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(_json_equal(a[k], b[k]) for k in a)
    return a == b


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON object key: {key}")
        result[key] = value
    return result


def _reject_constant(value: str) -> Any:
    raise ValueError(f"non-JSON numeric constant: {value}")


class Interpreter:
    """Persistent FJ@ session with lexical scope and bounded evaluation."""

    def __init__(self, *, max_steps: int = 100_000, max_depth: int = 500) -> None:
        if max_steps < 1 or max_depth < 1:
            raise ValueError("evaluation limits must be positive")
        self.max_steps = max_steps
        self.max_depth = max_depth
        self.steps = 0
        self.global_env = Environment()
        builtins = {
            "@add": _binary_number("@add", lambda a, b: a + b),
            "@minus": _binary_number("@minus", lambda a, b: a - b),
            "@times": _binary_number("@times", lambda a, b: a * b),
            "@divide": _binary_number("@divide", lambda a, b: a / b),
            "@le": _binary_number("@le", lambda a, b: a <= b),
            "@eq": Native("@eq", 2, _json_equal),
        }
        builtins["@plus"] = builtins["@add"]
        self.global_env.values.update(builtins)

    def run(self, source: str) -> Any:
        """Parse JSON text and evaluate it in this persistent session."""
        expression = json.loads(
            source, object_pairs_hook=_unique_object, parse_constant=_reject_constant
        )
        return self(expression)

    def __call__(self, expression: Any) -> Any:
        """Evaluate a JSON-compatible Python value in this session."""
        return self.eval(expression)

    def eval(self, expression: Any) -> Any:
        """Evaluate a JSON-compatible Python value (also available via call)."""
        self.steps = 0
        return self._eval(expression, self.global_env, 0)

    def _tick(self, depth: int) -> None:
        self.steps += 1
        if self.steps > self.max_steps:
            raise ResourceLimitError("evaluation step limit exceeded")
        if depth > self.max_depth:
            raise ResourceLimitError("evaluation depth limit exceeded")

    def _eval(self, expression: Any, env: Environment, depth: int) -> Any:
        self._tick(depth)
        if isinstance(expression, str):
            if expression == "@":
                raise ResolutionError("invalid reference: @")
            return env.resolve(expression) if _is_name(expression) else expression
        if expression is None or isinstance(expression, (bool, int, float)):
            if isinstance(expression, float) and not math.isfinite(expression):
                raise EvaluationError("non-finite number")
            return expression
        if isinstance(expression, dict):
            return {key: self._eval(value, env, depth + 1)
                    for key, value in expression.items()}
        if not isinstance(expression, list):
            raise EvaluationError(f"unsupported source value: {type(expression).__name__}")
        if not expression:
            return []
        if isinstance(expression[0], str) and expression[0] in _SPECIAL:
            return self._special(expression, env, depth + 1)

        # FJ@ prefers infix for three-element arrays, then prefix, then postfix.
        candidates: list[tuple[int, list[Any]]] = []
        if len(expression) == 3:
            candidates.append((1, [expression[0], expression[2]]))
        candidates.append((0, expression[1:]))
        if len(expression) > 1:
            candidates.append((len(expression) - 1, expression[:-1]))
        wrong_arity = False
        for position, arguments in candidates:
            word = expression[position]
            if not isinstance(word, str) or not _is_name(word):
                continue
            try:
                function = env.resolve(word)
            except ResolutionError:
                continue
            if isinstance(function, (Native, Closure)) and not self._accepts(
                function, len(arguments)
            ):
                wrong_arity = True
            if self._accepts(function, len(arguments)):
                values = [self._eval(arg, env, depth + 1) for arg in arguments]
                return self._invoke(function, values, depth + 1)
        if wrong_arity:
            raise ArityError("no callable in the array accepts its argument count")
        return [self._eval(item, env, depth + 1) for item in expression]

    @staticmethod
    def _accepts(function: Any, count: int) -> bool:
        if isinstance(function, Native):
            return function.arity == count
        if isinstance(function, Closure):
            return function.min_arity <= count <= function.max_arity
        return False

    def _invoke(self, function: Any, values: list[Any], depth: int) -> Any:
        self._tick(depth)
        if not self._accepts(function, len(values)):
            if isinstance(function, (Native, Closure)):
                raise ArityError(f"wrong number of arguments: {len(values)}")
            raise EvaluationError("value is not callable")
        if isinstance(function, Native):
            return function.function(*values)
        local = Environment(function.environment)
        for index, name in enumerate(function.names):
            local.values[name] = (
                values[index] if index < len(values) else function.defaults[index]
            )
        return self._eval(function.body, local, depth + 1)

    def _special(self, expr: list[Any], env: Environment, depth: int) -> Any:
        head = expr[0]
        if head == "@quote":
            self._length(expr, 2)
            return copy.deepcopy(expr[1])
        if head == "@function":
            self._length(expr, 3)
            parameters = expr[1]
            if not isinstance(parameters, (list, dict)):
                raise EvaluationError("@function parameters must be an array or object")
            names = tuple(parameters if isinstance(parameters, list) else parameters.keys())
            if len(names) != len(set(names)) or any(
                not _is_name(name) or name in _SPECIAL for name in names
            ):
                raise EvaluationError("@function parameters must be distinct @ names")
            defaults = (
                tuple(self._eval(value, env, depth + 1)
                      for value in parameters.values())
                if isinstance(parameters, dict) else None
            )
            return Closure(names, defaults, expr[2], env)
        if head == "@define":
            self._length(expr, 3)
            name = self._binding_name(expr[1])
            value = self._eval(expr[2], env, depth + 1)
            env.values[name] = value
            return value
        if head in ("@let", "@letrec"):
            self._length(expr, 3)
            bindings = expr[1]
            if not isinstance(bindings, dict):
                raise EvaluationError(f"{head} expects a binding object")
            names = [self._binding_name(name) for name in bindings]
            local = Environment(env)
            if head == "@letrec":
                local.values.update({name: _UNBOUND for name in names})
            for name, value_expr in bindings.items():
                local.values[name] = self._eval(value_expr, local, depth + 1)
            return self._eval(expr[2], local, depth + 1)
        if head == "@if":
            self._length(expr, 4)
            branch = 2 if self._eval(expr[1], env, depth + 1) else 3
            return self._eval(expr[branch], env, depth + 1)
        if head == "@do":
            result = None
            for item in expr[1:]:
                result = self._eval(item, env, depth + 1)
            return result
        if head in ("@and", "@or"):
            result: Any = head == "@and"
            for item in expr[1:]:
                result = self._eval(item, env, depth + 1)
                if (head == "@and" and not result) or (head == "@or" and result):
                    return result
            return result
        if head == "@try":
            if len(expr) not in (2, 3):
                raise ArityError("@try expects body and optional fallback")
            try:
                return self._eval(expr[1], env, depth + 1)
            except EvaluationError as exc:
                if len(expr) == 3:
                    return self._eval(expr[2], env, depth + 1)
                return {"error": type(exc).__name__, "message": str(exc)}
        if head == "@apply":
            self._length(expr, 3)
            function = self._eval(expr[1], env, depth + 1)
            values = self._eval(expr[2], env, depth + 1)
            if not isinstance(values, list):
                raise EvaluationError("@apply expects an argument array")
            return self._invoke(function, values, depth + 1)
        if head == "@pipe":
            if len(expr) < 2:
                raise ArityError("@pipe expects an initial value")
            current = self._eval(expr[1], env, depth + 1)
            for stage in expr[2:]:
                if _is_name(stage):
                    function = env.resolve(stage)
                    current = self._invoke(function, [current], depth + 1)
                elif isinstance(stage, list) and len(stage) >= 2 and _is_name(stage[-1]):
                    function = env.resolve(stage[-1])
                    values = [self._eval(item, env, depth + 1) for item in stage[:-1]]
                    current = self._invoke(function, [*values, current], depth + 1)
                else:
                    raise EvaluationError("invalid @pipe stage")
            return current
        raise EvaluationError(f"unknown special form: {head}")

    @staticmethod
    def _length(expr: list[Any], expected: int) -> None:
        if len(expr) != expected:
            raise ArityError(f"{expr[0]} expects {expected - 1} operands")

    @staticmethod
    def _binding_name(name: Any) -> str:
        if not _is_name(name) or name in _SPECIAL:
            raise EvaluationError("binding name must be a non-reserved @ name")
        return name

