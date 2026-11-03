"""JSONL module loader; directives are handled outside the core evaluator."""

from __future__ import annotations

import json
import re
from typing import Any, Mapping

from .interpreter import EvaluationError, Interpreter, _reject_constant, _unique_object


class ModuleError(EvaluationError):
    """Invalid module directive, import, or name conflict."""


_PART = re.compile(r"[A-Za-z][A-Za-z0-9_]*\Z")
_STANDARD = {
    "math": (
        "plus", "minus", "times", "divide", "pow", "mod", "negate",
        "abs", "floor", "ceil", "trunc", "round", "sqrt", "min",
        "max", "lt", "le", "gt", "gte",
    ),
    "logic": (
        "unify", "membero", "patho", "graph", "edgeo", "matcho",
        "nodeo", "record", "some", "neqo", "ge", "project",
        "choice", "conj", "run",
    ),
}


def _part(value: Any) -> bool:
    return isinstance(value, str) and _PART.fullmatch(value) is not None


def _documents(source: str) -> list[Any]:
    if not isinstance(source, str):
        raise TypeError("JSONL source must be a string")
    documents = []
    for number, line in enumerate(source.splitlines(), 1):
        if not line.strip():
            continue
        try:
            documents.append(json.loads(
                line, object_pairs_hook=_unique_object, parse_constant=_reject_constant
            ))
        except (ValueError, json.JSONDecodeError) as exc:
            raise ModuleError(f"invalid JSONL line {number}: {exc}") from exc
    return documents


class ModuleLoader:
    """Load named JSONL modules and evaluate a JSONL program afterward."""

    def __init__(
        self, interpreter: Interpreter, modules: Mapping[str, str] | None = None,
    ) -> None:
        if not isinstance(interpreter, Interpreter):
            raise TypeError("interpreter must be an Interpreter")
        self.interpreter = interpreter
        self.modules = dict(modules or {})
        if any(not _part(name) or not isinstance(source, str)
               for name, source in self.modules.items()):
            raise ModuleError("module registry requires simple names and JSONL strings")
        if any(name in _STANDARD for name in self.modules):
            raise ModuleError("standard module name cannot be replaced")
        self.loaded: set[str] = set()
        self._loading: set[str] = set()

    def load(self, source: str) -> Any:
        """Process directives first, then evaluate expressions in document order."""
        documents = _documents(source)
        directives, expressions = [], []
        for doc in documents:
            if isinstance(doc, list) and doc and doc[0] in ("@import", "@namespace"):
                directives.append(doc)
            else:
                expressions.append(doc)
        values = self.interpreter.global_env.values
        before = values.copy()
        loaded_before = self.loaded.copy()
        try:
            for directive in directives:
                self._directive(directive)
        except Exception:
            values.clear()
            values.update(before)
            self.loaded = loaded_before
            self._loading.clear()
            raise
        result = None
        for expression in expressions:
            result = self.interpreter(expression)
        return result

    def _directive(self, doc: list[Any]) -> None:
        if doc[0] == "@import":
            if len(doc) != 2 or not _part(doc[1]):
                raise ModuleError("@import expects a simple module name")
            self._import(doc[1])
            return
        if len(doc) != 3 or not _part(doc[1]) or not isinstance(doc[2], dict):
            raise ModuleError("@namespace expects a simple name and definition object")
        namespace, definitions = doc[1], doc[2]
        values = self.interpreter.global_env.values
        for name in definitions:
            if not _part(name):
                raise ModuleError("namespace exports require simple names")
            qualified = f"@{name}@{namespace}"
            if qualified in values:
                raise ModuleError(f"duplicate binding: {qualified}")
        for name, expression in definitions.items():
            self.interpreter({f"@{name}@{namespace}": expression})

    def _import(self, name: str) -> None:
        if name in self.loaded:
            return
        if name in self._loading:
            raise ModuleError(f"import cycle: {name}")
        self._loading.add(name)
        try:
            if name in _STANDARD:
                values = self.interpreter.global_env.values
                for export in _STANDARD[name]:
                    qualified = f"@{export}@{name}"
                    if qualified in values:
                        raise ModuleError(f"duplicate binding: {qualified}")
                    values[qualified] = values[f"@{export}"]
            elif name in self.modules:
                for doc in _documents(self.modules[name]):
                    if not isinstance(doc, list) or not doc or doc[0] not in ("@import", "@namespace"):
                        raise ModuleError(f"module {name} may contain only directives")
                    self._directive(doc)
            else:
                raise ModuleError(f"unknown module: {name}")
            self.loaded.add(name)
        finally:
            self._loading.remove(name)
