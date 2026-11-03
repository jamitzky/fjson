import json
import unittest
from pathlib import Path

from fjson import Interpreter


class SharedConformanceTests(unittest.TestCase):
    def test_shared_json_cases(self):
        source = Path(__file__).resolve().parents[1] / "js" / "conformance.json"
        for case in json.loads(source.read_text(encoding="utf-8")):
            with self.subTest(case["name"]):
                self.assertEqual(Interpreter()(case["program"]), case["expected"])


if __name__ == "__main__":
    unittest.main()
