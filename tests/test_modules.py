"""Module directives are loader syntax, not evaluator special forms."""

import unittest

from fjson import Interpreter, ModuleError, ModuleLoader, ResolutionError


class ModuleTests(unittest.TestCase):
    def test_standard_modules_load_on_demand(self):
        fj = Interpreter()
        loader = ModuleLoader(fj)
        with self.assertRaises(ResolutionError):
            fj(["@plus@math", 1, 2])
        result = loader.load(
            '["@plus@math", 40, 2]\n'
            '["@import", "math"]\n'
            '["@import", "logic"]\n'
            '["@run@logic", 1, "!X", ["@unify@logic", "!X", 42]]\n'
        )
        self.assertEqual(result, [42])
        self.assertEqual(fj(["@plus@math", 40, 2]), 42)
        self.assertEqual(loader.loaded, {"math", "logic"})
        self.assertEqual(loader.load('["@import", "math"]\n'), None)

    def test_namespace_closures_share_environment(self):
        fj = Interpreter()
        loader = ModuleLoader(fj)
        self.assertEqual(loader.load(
            '["@namespace", "demo", {"twice": ["@function", ["@x"], '
            '["@inc@demo", ["@inc@demo", "@x"]]], '
            '"inc": ["@function", ["@x"], ["@plus", "@x", 1]]}]\n'
            '["@twice@demo", 40]\n'
        ), 42)
        self.assertEqual(fj(["@inc@demo", 41]), 42)

    def test_registry_import_and_failures(self):
        fj = Interpreter()
        loader = ModuleLoader(fj, {
            "util": '["@import", "math"]\n["@namespace", "util", '
                    '{"inc": ["@function", ["@x"], ["@plus@math", "@x", 1]]}]',
        })
        self.assertEqual(loader.load('["@import", "util"]\n["@inc@util", 41]'), 42)
        with self.assertRaisesRegex(ModuleError, "duplicate binding"):
            loader.load('["@namespace", "util", {"inc": 1}]')
        self.assertEqual(fj(["@inc@util", 41]), 42)
        with self.assertRaisesRegex(ModuleError, "unknown module"):
            loader.load('["@import", "missing"]')
        with self.assertRaisesRegex(ModuleError, "invalid JSONL line"):
            loader.load('["@import", "math",]')
        cyclic = ModuleLoader(Interpreter(), {
            "a": '["@import", "b"]',
            "b": '["@import", "a"]',
        })
        with self.assertRaisesRegex(ModuleError, "import cycle"):
            cyclic.load('["@import", "a"]')
        self.assertEqual(cyclic.loaded, set())


if __name__ == "__main__":
    unittest.main()
