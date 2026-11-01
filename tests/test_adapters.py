import sys
import io
import unittest
from pathlib import Path
from unittest.mock import patch

from fjson import (
    CapabilityGrant, CapabilityPolicy, Effect, HttpsScope, Interpreter,
    PathScope, ProcessScope, ResourceLimitError, SecurityError,
    install_host_adapters,
)


class AdapterTests(unittest.TestCase):
    def test_file_scopes_and_default_deny(self):
        root = Path(__file__).resolve().parents[1]
        scope = PathScope(root)
        fj = Interpreter()
        install_host_adapters(fj)

        with self.assertRaises(SecurityError):
            fj(["@fs.read_text", "README.md"])
        fj.policy = CapabilityPolicy(
            frozenset({Effect.READ}), frozenset({"fs.read_text"})
        )
        with self.assertRaises(SecurityError):
            fj(["@fs.read_text", "README.md"])

        fj.policy = CapabilityPolicy(
            frozenset({Effect.READ}),
            frozenset({CapabilityGrant("fs.read_text", scope)}),
        )
        self.assertTrue(fj(["@fs.read_text", "README.md"]).startswith("# fjson"))
        with self.assertRaises(SecurityError):
            fj(["@fs.read_text", "../README.md"])
        with self.assertRaises(SecurityError):
            fj(["@fs.read_text", str(root / "README.md")])
        with self.assertRaises(SecurityError):
            fj(["@fs.write_new_text", "new.txt", "data"])

        fj.policy = CapabilityPolicy(
            frozenset({Effect.WRITE}),
            frozenset({CapabilityGrant("fs.write_new_text", scope)}),
        )
        sink = io.StringIO()
        sink.close = lambda: None
        with patch.object(Path, "open", return_value=sink) as opened:
            self.assertEqual(fj(["@fs.write_new_text", "new.txt", "data"]), "new.txt")
        self.assertEqual(sink.getvalue(), "data")
        self.assertEqual(scope.resolve("new.txt"), root / "new.txt")
        self.assertEqual(opened.call_args.args[0], "x")
        fj.policy = CapabilityPolicy(
            frozenset({Effect.READ, Effect.WRITE}),
            frozenset({
                CapabilityGrant("fs.read_text", PathScope(root, max_bytes=2)),
                CapabilityGrant("fs.write_new_text", PathScope(root, max_bytes=2)),
            }),
        )
        with self.assertRaises(ResourceLimitError):
            fj(["@fs.read_text", "README.md"])
        with self.assertRaises(ResourceLimitError):
            fj(["@fs.write_new_text", "large.txt", "data"])

    def test_process_scope_accepts_only_exact_argv(self):
        scope = ProcessScope(Path(sys.executable), ("-c", "pass"))
        fj = Interpreter(policy=CapabilityPolicy(
            frozenset({Effect.EXEC}),
            frozenset({CapabilityGrant("process.run", scope)}),
        ))
        install_host_adapters(fj)
        self.assertEqual(fj(["@process.run", ["-c", "pass"]]), 0)
        with self.assertRaises(SecurityError):
            fj(["@process.run", ["-c", "print(42)"]])

    def test_https_scope_blocks_private_targets_and_redirects(self):
        scope = HttpsScope(frozenset({"example.org"}), max_bytes=10)
        fj = Interpreter(policy=CapabilityPolicy(
            frozenset({Effect.READ, Effect.NETWORK}),
            frozenset({CapabilityGrant("https.get_text", scope)}),
        ))
        install_host_adapters(fj)
        with self.assertRaises(SecurityError):
            fj(["@https.get_text", "http://example.org/"])
        with self.assertRaises(SecurityError):
            fj(["@https.get_text", "https://evil.example/"])

        address = [(2, 1, 6, "", ("127.0.0.1", 443))]
        with patch("fjson.adapters.socket.getaddrinfo", return_value=address):
            with self.assertRaises(SecurityError):
                fj(["@https.get_text", "https://example.org/"])

        class FakeResponse:
            status = 302
            body = b"ignored"
            def read(self, count):
                return self.body[:count]

        class FakeConnection:
            last_request = None
            last_address = None
            def __init__(self, host, address, timeout):
                self.host, self.address = host, address
                FakeConnection.last_address = address
            def request(self, *args, **kwargs):
                FakeConnection.last_request = args
            def getresponse(self):
                return FakeResponse()
            def close(self):
                pass

        address = [(2, 1, 6, "", ("93.184.215.14", 443))]
        with patch("fjson.adapters.socket.getaddrinfo", return_value=address), patch(
            "fjson.adapters._PinnedHTTPSConnection", FakeConnection
        ):
            with self.assertRaises(SecurityError):
                fj(["@https.get_text", "https://example.org/path"])
            FakeResponse.status = 200
            FakeResponse.body = b"hello"
            self.assertEqual(
                fj(["@https.get_text", "https://example.org/path?q=1"]), "hello"
            )
            self.assertEqual(FakeConnection.last_address, "93.184.215.14")
            self.assertEqual(FakeConnection.last_request[:2], ("GET", "/path?q=1"))
            FakeResponse.body = b"x" * 11
            with self.assertRaises(ResourceLimitError):
                fj(["@https.get_text", "https://example.org/path"])


if __name__ == "__main__":
    unittest.main()
