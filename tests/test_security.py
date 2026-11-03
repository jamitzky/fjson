import unittest

from fjson import CapabilityPolicy, Effect, Interpreter, SecurityError


class SecurityTests(unittest.TestCase):
    def test_default_deny_and_independent_effects(self):
        calls = []
        fj = Interpreter()
        fj.register_native(
            "@fetch", 1, lambda url: calls.append(url) or "ok",
            operation_id="http.fetch",
            effects=frozenset({Effect.READ, Effect.NETWORK}),
        )
        with self.assertRaises(SecurityError):
            fj(["@fetch", "https://example.org"])
        self.assertEqual(calls, [])

        fj.policy = CapabilityPolicy(
            frozenset({Effect.READ}), frozenset({"http.fetch"})
        )
        with self.assertRaises(SecurityError):
            fj(["@fetch", "https://example.org"])
        self.assertEqual(calls, [])

        fj.policy = CapabilityPolicy(
            frozenset({Effect.READ, Effect.NETWORK}), frozenset({"fs.read"})
        )
        with self.assertRaises(SecurityError):
            fj(["@fetch", "https://example.org"])
        self.assertEqual(calls, [])

        fj.policy = CapabilityPolicy(
            frozenset({Effect.READ, Effect.NETWORK}), frozenset({"http.fetch"})
        )
        self.assertEqual(fj(["@fetch", "https://example.org"]), "ok")
        self.assertEqual(calls, ["https://example.org"])

    def test_indirect_calls_and_try_cannot_bypass_policy(self):
        calls = []
        fj = Interpreter()
        fj.register_native(
            "@host.write", 1, lambda value: calls.append(value) or value,
            operation_id="fs.write", effects=frozenset({Effect.WRITE}),
        )
        fj({"@wrapper": ["@function", ["@x"], ["@host.write", "@x"]]})
        for expression in (
            ["@host.write", "data"],
            ["@wrapper", "data"],
            ["@apply", "@host.write", ["data"]],
            ["@run", 1, "!Y", ["@project", "@host.write", ["data"], "!Y"]],
            ["@try", ["@wrapper", "data"], "ignored"],
        ):
            with self.assertRaises(SecurityError):
                fj(expression)
        self.assertEqual(calls, [])

        fj.policy = CapabilityPolicy(
            frozenset({Effect.WRITE}), frozenset({"fs.write"})
        )
        self.assertEqual(fj(["@wrapper", "data"]), "data")
        self.assertEqual(calls, ["data"])
        self.assertEqual(
            fj(["@run", 1, "!Y", ["@project", "@host.write", ["more"], "!Y"]]),
            ["more"],
        )
        self.assertEqual(calls, ["data", "more"])

    def test_register_rejects_invalid_metadata(self):
        fj = Interpreter()
        with self.assertRaises(ValueError):
            fj.register_native("@if", 1, lambda x: x,
                               operation_id="bad", effects=frozenset())
        with self.assertRaises(ValueError):
            fj.register_native("@plus", 2, lambda x, y: x + y,
                               operation_id="bad", effects=frozenset())
        with self.assertRaises(ValueError):
            fj.register_native("@host", 1, lambda x: x,
                               operation_id="", effects=frozenset({Effect.READ}))
        with self.assertRaises(TypeError):
            CapabilityPolicy(frozenset({"read"}), frozenset())


if __name__ == "__main__":
    unittest.main()
