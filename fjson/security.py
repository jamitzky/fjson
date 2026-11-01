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
class CapabilityPolicy:
    """An immutable, default-deny grant set supplied by the Python host.

    Effects are independent categories. A grant authorizes one exact native
    operation ID. Resource scopes are deliberately not represented yet.
    """

    allowed_effects: frozenset[Effect] = frozenset()
    grants: frozenset[str] = frozenset()

    def __post_init__(self) -> None:
        if not isinstance(self.allowed_effects, frozenset) or any(
            not isinstance(effect, Effect) for effect in self.allowed_effects
        ):
            raise TypeError("allowed_effects must be a frozenset of Effect values")
        if not isinstance(self.grants, frozenset) or any(
            not isinstance(grant, str) or not grant for grant in self.grants
        ):
            raise TypeError("grants must be a frozenset of nonempty operation IDs")
