"""Opt-in, resource-scoped host adapters for fjson."""

from __future__ import annotations

import http.client
import ipaddress
import os
import socket
import ssl
import subprocess
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import SplitResult, urlsplit

from .interpreter import Interpreter, ResourceLimitError, SecurityError
from .security import Effect


@dataclass(frozen=True)
class PathScope:
    root: Path
    max_bytes: int = 1_000_000

    def __post_init__(self) -> None:
        root = Path(self.root).resolve(strict=True)
        if not root.is_dir():
            raise ValueError("path scope root must be a directory")
        if type(self.max_bytes) is not int or self.max_bytes < 1:
            raise ValueError("path byte limit must be positive")
        object.__setattr__(self, "root", root)

    def resolve(self, value: object) -> Path:
        if not isinstance(value, str) or not value:
            raise SecurityError("path must be a nonempty relative string")
        relative = Path(value)
        if relative.is_absolute() or ".." in relative.parts or relative == Path("."):
            raise SecurityError("path escapes the granted directory")
        path = (self.root / relative).resolve(strict=False)
        if not path.is_relative_to(self.root):
            raise SecurityError("path escapes the granted directory")
        return path

    def permits(self, arguments: tuple[object, ...]) -> bool:
        try:
            self.resolve(arguments[0])
            return True
        except (IndexError, SecurityError, OSError, ValueError):
            return False


@dataclass(frozen=True)
class ProcessScope:
    executable: Path
    arguments: tuple[str, ...] = ()
    timeout_seconds: float = 5.0

    def __post_init__(self) -> None:
        raw = Path(self.executable)
        if not raw.is_absolute():
            raise ValueError("process executable must be an absolute path")
        executable = raw.resolve(strict=True)
        if not executable.is_file():
            raise ValueError("process executable must be a file")
        if any(not isinstance(arg, str) for arg in self.arguments):
            raise TypeError("process arguments must be strings")
        if self.timeout_seconds <= 0:
            raise ValueError("process timeout must be positive")
        object.__setattr__(self, "executable", executable)

    def permits(self, arguments: tuple[object, ...]) -> bool:
        return (len(arguments) == 1 and isinstance(arguments[0], list) and
                tuple(arguments[0]) == self.arguments)


@dataclass(frozen=True)
class HttpsScope:
    hosts: frozenset[str]
    max_bytes: int = 1_000_000
    timeout_seconds: float = 5.0

    def __post_init__(self) -> None:
        if not isinstance(self.hosts, frozenset) or not self.hosts or any(
            not isinstance(host, str) or not host or host != host.lower() or
            not host.isascii() or ":" in host or "/" in host
            for host in self.hosts
        ):
            raise ValueError("hosts must be a nonempty set of lowercase DNS names")
        if self.max_bytes < 1 or self.timeout_seconds <= 0:
            raise ValueError("HTTPS limits must be positive")

    def parse(self, value: object) -> SplitResult:
        if not isinstance(value, str):
            raise SecurityError("URL must be a string")
        try:
            url = urlsplit(value)
            host = url.hostname
            port = url.port
        except ValueError as exc:
            raise SecurityError("invalid URL") from exc
        if (url.scheme != "https" or host not in self.hosts or
                port not in (None, 443) or url.username is not None or
                url.password is not None or url.fragment):
            raise SecurityError("URL outside HTTPS scope")
        try:
            ipaddress.ip_address(host)
        except ValueError:
            return url
        raise SecurityError("IP literal URLs are not allowed")

    def permits(self, arguments: tuple[object, ...]) -> bool:
        try:
            self.parse(arguments[0])
            return True
        except (IndexError, SecurityError):
            return False


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host: str, address: str, timeout: float):
        super().__init__(host, port=443, timeout=timeout, context=ssl.create_default_context())
        self._address = address

    def connect(self) -> None:
        plain = socket.create_connection((self._address, 443), self.timeout)
        try:
            self.sock = self._context.wrap_socket(plain, server_hostname=self.host)
        except BaseException:
            plain.close()
            raise


def _read_text(scope: PathScope, name: str) -> str:
    with scope.resolve(name).open("rb") as stream:
        body = stream.read(scope.max_bytes + 1)
    if len(body) > scope.max_bytes:
        raise ResourceLimitError("file exceeds byte limit")
    return body.decode("utf-8")


def _write_new_text(scope: PathScope, name: str, content: str) -> str:
    if not isinstance(content, str):
        raise TypeError("file content must be a string")
    if len(content.encode("utf-8")) > scope.max_bytes:
        raise ResourceLimitError("file content exceeds byte limit")
    path = scope.resolve(name)
    with path.open("x", encoding="utf-8") as stream:
        stream.write(content)
    return name


def _run_process(scope: ProcessScope, arguments: list[str]) -> int:
    try:
        result = subprocess.run(
            [str(scope.executable), *arguments], shell=False, stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            timeout=scope.timeout_seconds, env={},
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ResourceLimitError("process time limit exceeded") from exc
    return result.returncode


def _https_get_text(scope: HttpsScope, value: str) -> str:
    url = scope.parse(value)
    host = url.hostname
    addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    address = next(
        (item[4][0] for item in addresses if ipaddress.ip_address(item[4][0]).is_global),
        None,
    )
    if address is None:
        raise SecurityError("HTTPS target has no public address")
    connection = _PinnedHTTPSConnection(host, address, scope.timeout_seconds)
    try:
        target = url.path or "/"
        if url.query:
            target += "?" + url.query
        connection.request("GET", target, headers={"Accept": "text/plain, application/json"})
        response = connection.getresponse()
        if 300 <= response.status < 400:
            raise SecurityError("HTTPS redirects are not followed")
        if response.status < 200 or response.status >= 300:
            raise OSError(f"HTTPS status {response.status}")
        body = response.read(scope.max_bytes + 1)
        if len(body) > scope.max_bytes:
            raise ResourceLimitError("HTTPS response exceeds byte limit")
        return body.decode("utf-8")
    finally:
        connection.close()


def install_host_adapters(interpreter: Interpreter) -> None:
    """Expose four scoped operations; no grants are added by installation."""
    interpreter.register_native(
        "@fs.read_text", 1, _read_text, operation_id="fs.read_text",
        effects=frozenset({Effect.READ}), scope_type=PathScope,
    )
    interpreter.register_native(
        "@fs.write_new_text", 2, _write_new_text,
        operation_id="fs.write_new_text", effects=frozenset({Effect.WRITE}),
        scope_type=PathScope,
    )
    interpreter.register_native(
        "@process.run", 1, _run_process, operation_id="process.run",
        effects=frozenset({Effect.EXEC}), scope_type=ProcessScope,
    )
    interpreter.register_native(
        "@https.get_text", 1, _https_get_text, operation_id="https.get_text",
        effects=frozenset({Effect.READ, Effect.NETWORK}), scope_type=HttpsScope,
    )
