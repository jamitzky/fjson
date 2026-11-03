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


@dataclass(frozen=True)
class MatchGoal(Goal):
    data: Any
    pattern: Any


@dataclass(frozen=True)
class MemberGoal(Goal):
    items: Any
    item: Any


@dataclass(frozen=True)
class PathGoal(Goal):
    data: Any
    path: Any
    value: Any


@dataclass(frozen=True)
class NeqGoal(Goal):
    left: Any
    right: Any


@dataclass(frozen=True)
class GeGoal(Goal):
    left: Any
    right: Any


@dataclass(frozen=True)
class ProjectGoal(Goal):
    function: Any
    arguments: Any
    result: Any


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


def match(
    data: Any, pattern: Any, substitution: Substitution | None = None,
    step: Step = _no_step,
) -> Substitution | None:
    """Unify a pattern with data; pattern objects may omit data keys."""
    result = dict(substitution) if substitution is not None else {}
    pending = [(data, pattern)]
    while pending:
        step()
        value, expected = pending.pop()
        value = walk(value, result, step)
        expected = walk(expected, result, step)
        if isinstance(value, LogicVar):
            return None
        if isinstance(expected, dict) and isinstance(value, dict):
            if not expected.keys() <= value.keys():
                return None
            pending.extend((value[key], item) for key, item in expected.items())
            continue
        if isinstance(expected, list) and isinstance(value, list):
            if len(expected) != len(value):
                return None
            pending.extend(zip(value, expected))
            continue
        next_result = unify(value, expected, result, step)
        if next_result is None:
            return None
        result = next_result
    return result


def _resolved(term: Any, state: Substitution, step: Step) -> tuple[bool, Any]:
    """Return a term with all bound variables replaced, if fully ground."""
    step()
    value = walk(term, state, step)
    if isinstance(value, LogicVar):
        return False, None
    if isinstance(value, list):
        parts = [_resolved(item, state, step) for item in value]
        return all(ok for ok, _ in parts), [item for _, item in parts]
    if isinstance(value, dict):
        parts = {key: _resolved(item, state, step) for key, item in value.items()}
        return all(ok for ok, _ in parts.values()), {
            key: item for key, (_, item) in parts.items()
        }
    return True, value


def _paths(data: Any, step: Step):
    """Enumerate root and descendant paths in document order."""
    work = [([], data, frozenset())]
    while work:
        step()
        path, value, ancestors = work.pop()
        yield path, value
        if isinstance(value, (list, dict)):
            identity = id(value)
            if identity in ancestors:
                continue
            next_ancestors = ancestors | {identity}
            entries = (enumerate(value) if isinstance(value, list)
                       else value.items())
            for key, item in reversed(list(entries)):
                work.append(([*path, key], item, next_ancestors))


def _at_path(data: Any, path: Any, step: Step) -> tuple[bool, Any]:
    if not isinstance(path, list):
        return False, None
    value = data
    for key in path:
        step()
        if isinstance(value, dict) and type(key) is str and key in value:
            value = value[key]
        elif (isinstance(value, list) and
              (type(key) is int or type(key) is float and key.is_integer()) and
              0 <= key < len(value)):
            value = value[int(key)]
        else:
            return False, None
    return True, value


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
    goal: Goal, query: Any, limit: int, step: Step = _no_step,
    project: Callable[[Any, list[Any]], Any] | None = None,
) -> list[Any]:
    """Depth-first, left-to-right search over a finite goal tree.

    A step callback lets an interpreter enforce its evaluation budget.
    """
    if type(limit) is not int or limit < 0:
        raise ValueError("search limit must be a nonnegative integer")
    results: list[Any] = []
    work: list[tuple[tuple[Goal, ...], Substitution, tuple[Goal, ...]]] = [
        ((goal,), {}, ())
    ]
    while work and len(results) < limit:
        step()
        pending, state, delayed = work.pop()
        if not pending:
            settled = _settle(delayed, state, step, project)
            if settled is not None:
                results.append(reify(query, settled, step))
            continue
        head, rest = pending[0], pending[1:]
        if isinstance(head, UnifyGoal):
            next_state = unify(head.left, head.right, state, step)
            if next_state is not None:
                work.append((rest, next_state, delayed))
        elif isinstance(head, MatchGoal):
            next_state = match(head.data, head.pattern, state, step)
            if next_state is not None:
                work.append((rest, next_state, delayed))
        elif isinstance(head, MemberGoal):
            items = walk(head.items, state, step)
            if isinstance(items, list):
                for item in reversed(items):
                    next_state = unify(item, head.item, state, step)
                    if next_state is not None:
                        work.append((rest, next_state, delayed))
        elif isinstance(head, PathGoal):
            data = walk(head.data, state, step)
            if not isinstance(data, LogicVar):
                known, path = _resolved(head.path, state, step)
                if known:
                    found, value = _at_path(data, path, step)
                    candidates = [(path, value)] if found else []
                else:
                    candidates = list(_paths(data, step))
                for path, value in reversed(candidates):
                    next_state = unify(head.path, path, state, step)
                    if next_state is not None:
                        next_state = unify(head.value, value, next_state, step)
                    if next_state is not None:
                        work.append((rest, next_state, delayed))
        elif isinstance(head, (NeqGoal, GeGoal, ProjectGoal)):
            work.append((rest, state, (*delayed, head)))
        elif isinstance(head, ChoiceGoal):
            work.append(((head.right, *rest), state, delayed))
            work.append(((head.left, *rest), state, delayed))
        elif isinstance(head, ConjGoal):
            work.append(((head.left, head.right, *rest), state, delayed))
        else:
            raise TypeError("unsupported logic goal")
    return results


def _settle(
    delayed: tuple[Goal, ...], state: Substitution, step: Step,
    project: Callable[[Any, list[Any]], Any] | None,
) -> Substitution | None:
    """Resolve delayed constraints after ordinary goals have bound variables."""
    remaining = delayed
    current = state
    while remaining:
        next_remaining: list[Goal] = []
        progressed = False
        for goal in remaining:
            step()
            if isinstance(goal, NeqGoal):
                possible = unify(goal.left, goal.right, current, step)
                if possible is None:
                    progressed = True
                elif possible == current:
                    return None
                else:
                    next_remaining.append(goal)
            elif isinstance(goal, GeGoal):
                left_ok, left = _resolved(goal.left, current, step)
                right_ok, right = _resolved(goal.right, current, step)
                if not (left_ok and right_ok):
                    next_remaining.append(goal)
                elif type(left) not in (int, float) or type(right) not in (int, float) or left < right:
                    return None
                else:
                    progressed = True
            elif isinstance(goal, ProjectGoal):
                ready, args = _resolved(goal.arguments, current, step)
                if not ready:
                    next_remaining.append(goal)
                else:
                    if project is None:
                        raise TypeError("project goal requires an interpreter callback")
                    next_state = unify(goal.result, project(goal.function, args), current, step)
                    if next_state is None:
                        return None
                    current = next_state
                    progressed = True
            else:
                raise TypeError("unsupported delayed goal")
        if not progressed:
            return None
        remaining = tuple(next_remaining)
    return current
