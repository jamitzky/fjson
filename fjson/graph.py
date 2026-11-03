"""Lazy graph view over JSON values.

Object keys and array indexes are edges. Compound children receive stable
document-position handles. Optional $ref resolution is explicit.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Iterator


class GraphError(ValueError):
    """Invalid graph configuration or ambiguous/broken reference."""


@dataclass(frozen=True)
class GraphNode:
    graph: JsonGraph
    path: tuple[str | int, ...]

    @property
    def value(self) -> Any:
        value = self.graph.data
        for key in self.path:
            value = value[key]
        return value


@dataclass(frozen=True)
class RecordPattern:
    fields: dict[str, Any]


@dataclass(frozen=True)
class SomePattern:
    item: Any


class JsonGraph:
    """View a JSON tree as a graph without copying the input document."""

    def __init__(self, data: Any, options: dict[str, Any] | None = None) -> None:
        options = {} if options is None else options
        if not isinstance(options, dict) or set(options) - {"refs", "id_key", "ref_key"}:
            raise GraphError("@graph options must contain only refs, id_key and ref_key")
        self.follow_refs = options.get("refs", False)
        self.id_key = options.get("id_key", "id")
        self.ref_key = options.get("ref_key", "$ref")
        if type(self.follow_refs) is not bool or any(
            not isinstance(key, str) or not key for key in (self.id_key, self.ref_key)
        ):
            raise GraphError("invalid @graph reference options")
        self.data = data
        self._nodes: dict[tuple[str | int, ...], GraphNode] = {}
        self._ids: dict[str, GraphNode] | None = None

    def node(self, path: tuple[str | int, ...] = ()) -> GraphNode:
        if path not in self._nodes:
            self._nodes[path] = GraphNode(self, path)
        return self._nodes[path]

    @property
    def root(self) -> GraphNode:
        return self.node()

    def _index_ids(self, step: Callable[[], None]) -> dict[str, GraphNode]:
        if self._ids is not None:
            return self._ids
        result: dict[str, GraphNode] = {}
        work = [((), self.data, frozenset())]
        while work:
            step()
            path, value, ancestors = work.pop()
            if not isinstance(value, (dict, list)):
                continue
            identity = id(value)
            if identity in ancestors:
                continue
            next_ancestors = ancestors | {identity}
            if isinstance(value, dict):
                identifier = value.get(self.id_key)
                if isinstance(identifier, str):
                    if identifier in result:
                        raise GraphError(f"duplicate graph id: {identifier}")
                    result[identifier] = self.node(path)
                entries = value.items()
            else:
                entries = enumerate(value)
            for key, item in reversed(list(entries)):
                work.append(((*path, key), item, next_ancestors))
        self._ids = result
        return result

    def by_id(self, identifier: str, step: Callable[[], None]) -> GraphNode | None:
        return self._index_ids(step).get(identifier)

    def identities(self, step: Callable[[], None]) -> Iterator[tuple[str, GraphNode]]:
        return iter(self._index_ids(step).items())

    def edges(
        self, node: GraphNode, step: Callable[[], None]
    ) -> Iterator[tuple[str | int, Any]]:
        value = node.value
        entries = value.items() if isinstance(value, dict) else (
            enumerate(value) if isinstance(value, list) else ()
        )
        for key, child in entries:
            step()
            if (self.follow_refs and isinstance(child, dict) and
                    set(child) == {self.ref_key} and
                    isinstance(child[self.ref_key], str)):
                target = self.by_id(child[self.ref_key], step)
                if target is None:
                    raise GraphError(f"unknown graph reference: {child[self.ref_key]}")
                yield key, target
            elif isinstance(child, (dict, list)):
                yield key, self.node((*node.path, key))
            else:
                yield key, child


def raw_edges(value: Any) -> Iterator[tuple[str | int, Any]]:
    if isinstance(value, dict):
        return iter(value.items())
    if isinstance(value, list):
        return iter(enumerate(value))
    return iter(())
