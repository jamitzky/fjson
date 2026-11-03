"""Graph view and relational JSON traversal."""

import unittest

from fjson import ArityError, EvaluationError, Interpreter, ResourceLimitError


class GraphTests(unittest.TestCase):
    def test_fred_patterns_and_rules(self):
        person = {
            "FirstName": "Fred", "Age": 28,
            "Address": {"City": "Winchester"},
            "Phone": [
                {"type": "office", "number": "123"},
                {"type": "home", "number": "456"},
                {"type": "office", "number": "789"},
            ],
        }
        fj = Interpreter()
        fj.eval({"@person": ["@graph", ["@quote", person]]})
        self.assertEqual(fj.eval(["@run", 10, "!N", ["@matcho", "@person",
            ["@record", {"Phone": ["@some", ["@record", {
                "type": "office", "number": "!N"}]]}]]]), ["123", "789"])
        self.assertEqual(fj.eval(["@run", 1, "!City", ["@patho", "@person",
            ["Address", "City"], "!City"]]), ["Winchester"])
        self.assertEqual(fj.eval(["@run", 1, "!City", ["@patho", person,
            ["Address", "City"], "!City"]]), ["Winchester"])
        with self.assertRaises(ArityError):
            fj.eval(["@patho", "@person", "@person", ["Address"], "!Value"])
        fj.eval({"@adult": ["@function", ["@person", "@age"],
            ["@conj", ["@edgeo", "@person", "Age", "@age"],
                ["@ge", "@age", 18]]]})
        self.assertEqual(fj.eval(["@run", 1, "!Age",
            ["@adult", "@person", "!Age"]]), [28])

    def test_reference_traversal_is_opt_in(self):
        data = {"people": [{"id": "fred", "employer": {"$ref": "acme"}}],
                "companies": [{"id": "acme", "office": {"City": "Winchester"}}]}
        fj = Interpreter()
        fj.eval({"@literal": ["@graph", ["@quote", data]]})
        fj.eval({"@linked": ["@graph", ["@quote", data], {"refs": True}]})
        query = lambda graph: ["@run", 1, "!City", ["@conj",
            ["@nodeo", graph, "fred", "!Person"],
            ["@patho", "!Person", ["employer", "office", "City"], "!City"]]]
        self.assertEqual(fj.eval(query("@literal")), [])
        self.assertEqual(fj.eval(query("@linked")), ["Winchester"])
        self.assertEqual(fj.eval(["@run", 1, "!Node",
            ["@nodeo", "@linked", "acme", "!Node"]]),
            [{"node": ["companies", 0]}])

    def test_missing_null_duplicates_and_limits(self):
        fj = Interpreter()
        self.assertEqual(fj.eval(["@run", 1, "!Value",
            ["@edgeo", {"a": None}, "a", "!Value"]]), [None])
        self.assertEqual(fj.eval(["@run", 1, "!Value",
            ["@edgeo", {"a": None}, "b", "!Value"]]), [])
        fj.eval({"@g": ["@graph", {"a": {"id": "same"}, "b": {"id": "same"}}]})
        with self.assertRaisesRegex(EvaluationError, "duplicate graph id"):
            fj.eval(["@run", 1, "!Node", ["@nodeo", "@g", "same", "!Node"]])
        fj.eval({"@broken": ["@graph", {"link": {"$ref": "missing"}}, {"refs": True}]})
        with self.assertRaisesRegex(EvaluationError, "unknown graph reference"):
            fj.eval(["@run", 1, "!Target",
                ["@edgeo", "@broken", "link", "!Target"]])
        with self.assertRaisesRegex(EvaluationError, "invalid @graph reference options"):
            fj.eval(["@graph", {}, {"refs": 1}])
        bounded = Interpreter(max_steps=40)
        bounded.eval({"@g": ["@graph", {"a": [1, 2, 3, 4, 5]}]})
        with self.assertRaises(ResourceLimitError):
            bounded.eval(["@run", 10, "!Path", ["@patho", "@g", "!Path", "!Value"]])


if __name__ == "__main__":
    unittest.main()
