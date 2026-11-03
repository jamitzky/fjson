"""Interpreter for the documented FJ@ JSON core.

Only the Python standard library is used. Source programs are JSON values;
closures, native functions, logic variables and goals are runtime values and
are not JSON serializable.
"""

from __future__ import annotations

import copy
import json
import math
from dataclasses import dataclass
from typing import Any, Callable

from .logic import (
    ChoiceGoal,
    ConjGoal,
    GeGoal,
    Goal,
    LogicScope,
    LogicVar,
    MatchGoal,
    MemberGoal,
    NeqGoal,
    PathGoal,
    ProjectGoal,
    UnifyGoal,
    search,
)
from .security import CapabilityGrant, CapabilityPolicy, Effect


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


class SecurityError(FjsonError):
    """A host operation is outside the current capability policy."""


_UNBOUND = object()
_SPECIAL = frozenset({
    "@quote", "@function", "@let", "@letrec", "@if",
    "@and", "@or", "@try", "@apply",
})


def _is_name(value: Any) -> bool:
    return isinstance(value, str) and len(value) > 1 and value.startswith("@")


def _is_logic_name(value: Any) -> bool:
    if not isinstance(value, str) or len(value) < 2 or value[0] != "!":
        return False
    return ("A" <= value[1] <= "Z" and all(
        "A" <= char <= "Z" or "a" <= char <= "z" or
        "0" <= char <= "9" or char == "_" for char in value[2:]
    ))


class Environment:
    def __init__(
        self, parent: Environment | None = None,
        logic_scope: LogicScope | None = None,
    ) -> None:
        self.parent = parent
        self.values: dict[str, Any] = {}
        self.logic_scope = (
            logic_scope if logic_scope is not None else
            parent.logic_scope if parent is not None else LogicScope()
        )

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
    effects: frozenset[Effect] = frozenset()
    operation_id: str | None = None
    scope_type: type | None = None

    def __post_init__(self) -> None:
        if not _is_name(self.name) or type(self.arity) is not int or self.arity < 0 or not callable(self.function):
            raise ValueError("invalid native operation")
        if not isinstance(self.effects, frozenset) or any(
            not isinstance(effect, Effect) for effect in self.effects
        ):
            raise TypeError("native effects must be a frozenset of Effect values")
        if self.effects and not self.operation_id:
            raise ValueError("effectful native operation requires an operation ID")
        if self.operation_id is not None and (
            not isinstance(self.operation_id, str) or not self.operation_id
        ):
            raise ValueError("operation ID must be a nonempty string")
        if self.scope_type is not None and (
            not isinstance(self.scope_type, type) or self.operation_id is None
        ):
            raise ValueError("scoped native requires a scope type and operation ID")


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


def _get(container: Any, key: Any) -> Any:
    if isinstance(container, list):
        if type(key) is not int and not (
            type(key) is float and key.is_integer()
        ):
            raise EvaluationError("@get expects an array and index or object and key")
        if 0 <= key < len(container):
            return container[int(key)]
    elif isinstance(container, dict):
        if type(key) is not str:
            raise EvaluationError("@get expects an array and index or object and key")
        if key in container:
            return container[key]
    else:
        raise EvaluationError("@get expects an array and index or object and key")
    raise EvaluationError("@get key or index does not exist")


def _length(value: Any) -> int:
    if not isinstance(value, (list, dict)):
        raise EvaluationError("@length expects an array or object")
    return len(value)


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

    def __init__(
        self, *, max_steps: int = 100_000, max_depth: int = 500,
        policy: CapabilityPolicy | None = None,
    ) -> None:
        if max_steps < 1 or max_depth < 1:
            raise ValueError("evaluation limits must be positive")
        if policy is not None and not isinstance(policy, CapabilityPolicy):
            raise TypeError("policy must be a CapabilityPolicy")
        self.max_steps = max_steps
        self.max_depth = max_depth
        self.policy = policy if policy is not None else CapabilityPolicy()
        self.steps = 0
        self.global_env = Environment()
        builtins = {
            "@plus": _binary_number("@plus", lambda a, b: a + b),
            "@minus": _binary_number("@minus", lambda a, b: a - b),
            "@times": _binary_number("@times", lambda a, b: a * b),
            "@divide": _binary_number("@divide", lambda a, b: a / b),
            "@le": _binary_number("@le", lambda a, b: a <= b),
            "@eq": Native("@eq", 2, _json_equal),
            "@get": Native("@get", 2, _get),
            "@length": Native("@length", 1, _length),
            "@unify": Native("@unify", 2, UnifyGoal),
            "@match": Native("@match", 2, MatchGoal),
            "@membero": Native("@membero", 2, MemberGoal),
            "@patho": Native("@patho", 3, PathGoal),
            "@neqo": Native("@neqo", 2, NeqGoal),
            "@ge": Native("@ge", 2, GeGoal),
            "@guard": Native("@guard", 1, self._logic_guard),
            "@project": Native("@project", 3, self._logic_project),
            "@choice": Native("@choice", 2, self._logic_choice),
            "@conj": Native("@conj", 2, self._logic_conj),
            "@run": Native("@run", 3, self._logic_run),
        }
        self.global_env.values.update(builtins)

    def register_native(
        self, name: str, arity: int, function: Callable[..., Any], *,
        operation_id: str, effects: frozenset[Effect],
        scope_type: type | None = None,
    ) -> None:
        """Register a host function; JSON programs cannot call this method."""
        if not _is_name(name) or name in _SPECIAL:
            raise ValueError("native name must be a non-reserved @ name")
        if name in self.global_env.values:
            raise ValueError(f"native name already registered: {name}")
        if not operation_id:
            raise ValueError("host operation requires an operation ID")
        self.global_env.values[name] = Native(
            name, arity, function, effects, operation_id, scope_type
        )

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
        self.global_env.logic_scope = LogicScope()
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
            if _is_logic_name(expression):
                return env.logic_scope.resolve(expression[1:])
            return env.resolve(expression) if _is_name(expression) else expression
        if expression is None or isinstance(expression, (bool, int, float)):
            if isinstance(expression, float) and not math.isfinite(expression):
                raise EvaluationError("non-finite number")
            return expression
        if isinstance(expression, (LogicVar, Goal, Native, Closure)):
            return expression
        if isinstance(expression, dict):
            if any(not isinstance(key, str) for key in expression):
                raise EvaluationError("object keys must be strings")
            declaration_keys = [key for key in expression if isinstance(key, str)
                                and key.startswith("@")]
            if declaration_keys:
                if len(declaration_keys) != len(expression):
                    raise EvaluationError("declaration object cannot mix @ names and data keys")
                names = [self._binding_name(key) for key in expression]
                result = None
                for name, value_expr in expression.items():
                    result = self._eval(value_expr, env, depth + 1)
                    env.values[name] = result
                return result
            return {key: self._eval(value, env, depth + 1)
                    for key, value in expression.items()}
        if not isinstance(expression, list):
            raise EvaluationError(f"unsupported source value: {type(expression).__name__}")
        if not expression:
            return []
        if isinstance(expression[0], str) and expression[0] in _SPECIAL:
            return self._special(expression, env, depth + 1)
        if expression[0] == "@":
            raise ResolutionError("invalid reference: @")
        if _is_name(expression[0]):
            function = env.resolve(expression[0])
            if not isinstance(function, (Native, Closure)):
                raise EvaluationError(f"reference is not callable: {expression[0]}")
            if not self._accepts(function, len(expression) - 1):
                raise ArityError(
                    f"{expression[0]} does not accept {len(expression) - 1} arguments"
                )
            values = [self._eval(arg, env, depth + 1) for arg in expression[1:]]
            return self._invoke(function, values, depth + 1)
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
            if not function.effects.issubset(self.policy.allowed_effects):
                missing = sorted(effect.value for effect in
                                 function.effects - self.policy.allowed_effects)
                raise SecurityError(f"effect denied for {function.name}: {', '.join(missing)}")
            if function.scope_type is not None:
                for grant in self.policy.grants:
                    if (isinstance(grant, CapabilityGrant) and
                            grant.operation_id == function.operation_id and
                            isinstance(grant.scope, function.scope_type) and
                            grant.scope.permits(tuple(values))):
                        return function.function(grant.scope, *values)
                raise SecurityError(f"capability denied: {function.operation_id}")
            if (function.operation_id is not None and
                    function.operation_id not in self.policy.grants):
                raise SecurityError(f"capability denied: {function.operation_id}")
            return function.function(*values)
        local = Environment(function.environment, LogicScope())
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

    @staticmethod
    def _logic_choice(left: Any, right: Any) -> Goal:
        if not isinstance(left, Goal) or not isinstance(right, Goal):
            raise EvaluationError("@choice expects two goals")
        return ChoiceGoal(left, right)

    @staticmethod
    def _logic_conj(left: Any, right: Any) -> Goal:
        if not isinstance(left, Goal) or not isinstance(right, Goal):
            raise EvaluationError("@conj expects two goals")
        return ConjGoal(left, right)

    def _logic_run(self, limit: Any, query: Any, goal: Any) -> list[Any]:
        if type(limit) is not int or limit < 0:
            raise EvaluationError("@run expects a nonnegative integer limit")
        if not isinstance(goal, Goal):
            raise EvaluationError("@run expects a goal")
        return search(
            goal, query, limit, lambda: self._tick(0),
            lambda function, args: self._invoke(function, args, 0),
        )

    @staticmethod
    def _logic_guard(goal: Any) -> Goal:
        if not isinstance(goal, Goal):
            raise EvaluationError("@guard expects a goal")
        return goal

    @staticmethod
    def _logic_project(function: Any, arguments: Any, result: Any) -> Goal:
        if not isinstance(function, (Native, Closure)) or not isinstance(arguments, list):
            raise EvaluationError("@project expects a function and argument array")
        return ProjectGoal(function, arguments, result)
