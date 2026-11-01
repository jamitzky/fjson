"""Small logic library: identity-based variables, unification, and finite search.

Goals are runtime values. Constructing a goal does not execute it; search()
evaluates goals with a bounded number of results and an optional step callback.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass(eq=False, frozen=True)
class LogicVar:
    """A logic variable identified by object identity, not by its name."""

    name: str


class LogicScope:
    def __init__(self) -> None:
        self.variables: dict[str, LogicVar] = {}

    def resolve(self, name: str) -> LogicVar:
        if name not in self.variables:
            self.variables[name] = LogicVar(name)
        return self.variables[name]


class Goal:
    """Marker base class for a suspended logic goal."""


@dataclass(frozen=True)
class UnifyGoal(Goal):
    left: Any
    right: Any


@dataclass(frozen=True)
class ChoiceGoal(Goal):
    left: Goal
    right: Goal


@dataclass(frozen=True)
class ConjGoal(Goal):
    left: Goal
    right: Goal


Substitution = dict[LogicVar, Any]
Step = Callable[[], None]


def _no_step() -> None:
    pass


def walk(term: Any, substitution: Substitution, step: Step = _no_step) -> Any:
    """Follow substitutions until a non-variable or unbound variable appears."""
    while isinstance(term, LogicVar) and term in substitution:
        step()
        term = substitution[term]
    return term


def _occurs(
    variable: LogicVar, term: Any, substitution: Substitution, step: Step
) -> bool:
    pending = [term]
    seen_containers: set[int] = set()
    while pending:
        step()
        value = walk(pending.pop(), substitution, step)
        if value is variable:
            return True
        if isinstance(value, (list, dict)):
            identity = id(value)
            if identity in seen_containers:
                continue
            seen_containers.add(identity)
            pending.extend(value.values() if isinstance(value, dict) else value)
    return False


def _scalar_equal(left: Any, right: Any) -> bool:
    if type(left) is bool or type(right) is bool:
        return type(left) is type(right) and left == right
    if type(left) in (int, float) and type(right) in (int, float):
        return left == right
    if type(left) is not type(right):
        return False
    if left is None or isinstance(left, str):
        return left == right
    return left is right


def unify(
    left: Any, right: Any, substitution: Substitution | None = None,
    step: Step = _no_step,
) -> Substitution | None:
    """Return a new substitution, or None if two terms cannot unify.

    The input substitution is never changed. Structural lists and records are
    supported. The occurs-check rejects bindings that would create cycles.
    """
    result = dict(substitution) if substitution is not None else {}
    pending = [(left, right)]
    while pending:
        step()
        a, b = pending.pop()
        a = walk(a, result, step)
        b = walk(b, result, step)
        if a is b:
            continue
        if isinstance(a, LogicVar):
            if _occurs(a, b, result, step):
                return None
            result[a] = b
            continue
        if isinstance(b, LogicVar):
            if _occurs(b, a, result, step):
                return None
            result[b] = a
            continue
        if isinstance(a, list) and isinstance(b, list):
            if len(a) != len(b):
                return None
            pending.extend(zip(a, b))
            continue
        if isinstance(a, dict) and isinstance(b, dict):
            if a.keys() != b.keys():
                return None
            pending.extend((a[key], b[key]) for key in a)
            continue
        if not _scalar_equal(a, b):
            return None
    return result


def reify(
    term: Any, substitution: Substitution, step: Step = _no_step
) -> Any:
    """Replace bound variables; label each remaining variable in this result."""
    free: dict[LogicVar, int] = {}

    def visit(value: Any) -> Any:
        step()
        value = walk(value, substitution, step)
        if isinstance(value, LogicVar):
            if value not in free:
                free[value] = len(free)
            return {"var": value.name, "index": free[value]}
        if isinstance(value, list):
            return [visit(item) for item in value]
        if isinstance(value, dict):
            return {key: visit(item) for key, item in value.items()}
        return value

    return visit(term)


def search(
    goal: Goal, query: Any, limit: int, step: Step = _no_step
) -> list[Any]:
    """Depth-first, left-to-right search over a finite goal tree.

    A step callback lets an interpreter enforce its evaluation budget.
    """
    if type(limit) is not int or limit < 0:
        raise ValueError("search limit must be a nonnegative integer")
    results: list[Any] = []
    work: list[tuple[tuple[Goal, ...], Substitution]] = [((goal,), {})]
    while work and len(results) < limit:
        step()
        pending, state = work.pop()
        if not pending:
            results.append(reify(query, state, step))
            continue
        head, rest = pending[0], pending[1:]
        if isinstance(head, UnifyGoal):
            next_state = unify(head.left, head.right, state, step)
            if next_state is not None:
                work.append((rest, next_state))
        elif isinstance(head, ChoiceGoal):
            work.append(((head.right, *rest), state))
            work.append(((head.left, *rest), state))
        elif isinstance(head, ConjGoal):
            work.append(((head.left, head.right, *rest), state))
        else:
            raise TypeError("unsupported logic goal")
    return results
