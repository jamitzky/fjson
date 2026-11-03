import json
import unittest
from pathlib import Path

from fjson import Interpreter, ModuleLoader, EvaluationError


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "modules" / "j.fjsonl").read_text(encoding="utf-8")
CASES = json.loads((ROOT / "modules" / "j_cases.json").read_text(encoding="utf-8"))


class JModuleTests(unittest.TestCase):
    def test_shared_cases(self):
        fj = Interpreter()
        loader = ModuleLoader(fj, {"j": SOURCE})
        loader.load('["@import","j"]')
        for case in CASES:
            with self.subTest(case=case["name"]):
                self.assertEqual(fj(case["program"]), case["expected"])

    def test_empty_insert_and_invalid_curry_side(self):
        fj = Interpreter()
        ModuleLoader(fj, {"j": SOURCE}).load('["@import","j"]')
        with self.assertRaises(EvaluationError):
            fj(["@let", {"@f": ["@insert@j", "@plus"]}, ["@f", []]])
        with self.assertRaises(EvaluationError):
            fj(["@curry@j", "@minus", "middle", 10])


if __name__ == "__main__":
    unittest.main()
