"""Host-owned effect and capability policy for native operations."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Effect(str, Enum):
    READ = "read"
    WRITE = "write"
    EXEC = "exec"
    NETWORK = "network"


@dataclass(frozen=True)
class CapabilityGrant:
    """Host-issued permission for one operation and one resource scope."""

    operation_id: str
    scope: object

    def __post_init__(self) -> None:
        if not isinstance(self.operation_id, str) or not self.operation_id:
            raise ValueError("grant requires a nonempty operation ID")
        if self.scope is None or not callable(getattr(self.scope, "permits", None)):
            raise TypeError("grant scope must provide permits(arguments)")


@dataclass(frozen=True)
class CapabilityPolicy:
    """An immutable, default-deny grant set supplied by the Python host.

    Effects are independent categories. A grant authorizes one exact native
    operation ID. A scoped native accepts only matching CapabilityGrant values;
    old unscoped string grants cannot authorize a scoped native.
    """

    allowed_effects: frozenset[Effect] = frozenset()
    grants: frozenset[str | CapabilityGrant] = frozenset()

    def __post_init__(self) -> None:
        if not isinstance(self.allowed_effects, frozenset) or any(
            not isinstance(effect, Effect) for effect in self.allowed_effects
        ):
            raise TypeError("allowed_effects must be a frozenset of Effect values")
        if not isinstance(self.grants, frozenset) or any(
            not ((isinstance(grant, str) and bool(grant)) or
                 isinstance(grant, CapabilityGrant)) for grant in self.grants
        ):
            raise TypeError("grants must contain operation IDs or CapabilityGrant values")
