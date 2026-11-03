import json
import unittest
from pathlib import Path

from fjson import EvaluationError, Interpreter, LogicVar, ResourceLimitError
from fjson.logic import UnifyGoal, reify, unify


class LogicLibraryTests(unittest.TestCase):
    def setUp(self):
        self.fj = Interpreter()

    def fred(self):
        path = Path(__file__).resolve().parents[1] / "examples" / "fred.json"
        with path.open(encoding="utf-8") as file:
            person = json.load(file)
        self.fj({"@person": ["@quote", person]})
        return person

    def test_parent_term_unifies(self):
        self.assertEqual(
            self.fj(["@run", 1, "!X",
                     ["@unify", ["parent", "alice", "!X"],
                      ["parent", "alice", "bob"]]]),
            ["bob"],
        )

    def test_occurs_check_and_repeated_variable(self):
        self.assertEqual(
            self.fj(["@run", 1, "!X",
                     ["@unify", "!X", ["node", "!X"]]]),
            [],
        )
        self.assertEqual(
            self.fj(["@run", 1, "!X",
                     ["@unify", ["pair", "!X", "!X"], ["pair", 1, 2]]]),
            [],
        )
        x, y = LogicVar("X"), LogicVar("Y")
        linked = unify(x, y)
        self.assertIsNone(unify(y, ["node", x], linked))

    def test_structural_records_and_variable_chains(self):
        self.assertEqual(
            self.fj(["@run", 1, ["!X", "!Y"],
                     ["@unify", {"left": "!X", "right": "!Y"},
                      {"right": 2, "left": 1}]]),
            [[1, 2]],
        )
        x, y = LogicVar("X"), LogicVar("Y")
        first = unify(x, y)
        second = unify(y, 7, first)
        self.assertIsNone(first.get(y))
        self.assertEqual(reify(x, second), 7)

    def test_choice_and_conjunction(self):
        self.assertEqual(
            self.fj(["@run", 2, "!X",
                     ["@choice", ["@unify", "!X", "alice"],
                      ["@unify", "!X", "bob"]]]),
            ["alice", "bob"],
        )
        self.assertEqual(
            self.fj(["@run", 1, ["!X", "!Y"],
                     ["@conj", ["@unify", "!X", "alice"],
                      ["@unify", "!Y", ["child", "!X"]]]]),
            [["alice", ["child", "alice"]]],
        )
        self.assertEqual(
            self.fj(["@run", 2, "!X",
                     ["@conj",
                      ["@choice", ["@unify", "!X", 1],
                       ["@unify", "!X", 2]],
                      ["@unify", "!X", 2]]]),
            [2],
        )
        self.assertEqual(
            self.fj(["@run", 1, 1, ["@unify", True, 1]]),
            [],
        )

    def test_fresh_clause_variables_per_function_call(self):
        self.fj({"@clause": ["@function", ["@person"],
                             ["@unify", ["parent", "!Y", "@person"],
                              ["parent", "alice", "bob"]]]})
        first = self.fj(["@clause", "bob"])
        second = self.fj(["@clause", "bob"])
        self.assertIsInstance(first, UnifyGoal)
        self.assertIsNot(first.left[1], second.left[1])
        self.assertEqual(first.left[1].name, "Y")
        self.assertEqual(self.fj(["@run", 1, first.left[1], first]), ["alice"])

    def test_quote_is_literal_and_runtime_values_can_cross_calls(self):
        self.assertEqual(
            self.fj(["@run", 1, "!X",
                     ["@unify", ["@quote", ["parent", "!X"]],
                      ["parent", "bob"]]]),
            [],
        )
        x = self.fj("!X")
        goal = self.fj(["@unify", x, 42])
        self.assertEqual(self.fj(["@run", 1, x, goal]), [42])

    def test_unbound_reification_and_limits(self):
        self.assertEqual(
            self.fj(["@run", 1, ["!X", "!X", "!Y"],
                     ["@unify", 1, 1]]),
            [[{"var": "X", "index": 0},
              {"var": "X", "index": 0},
              {"var": "Y", "index": 1}]],
        )
        self.assertEqual(self.fj(["@run", 0, "!X", ["@unify", "!X", 1]]), [])
        with self.assertRaises(EvaluationError):
            self.fj(["@choice", 1, 2])
        with self.assertRaises(EvaluationError):
            self.fj(["@run", True, "!X", ["@unify", "!X", 1]])
        limited = Interpreter(max_steps=20)
        with self.assertRaises(ResourceLimitError):
            limited(["@run", 1, "!X",
                     ["@unify", list(range(100)), list(range(100))]])


    def test_partial_match_and_shared_variables(self):
        self.fred()
        query = ["@run", 1, ["!First", "!Last"],
                 ["@matcho", "@person", {
                     "FirstName": "!First", "Surname": "!Last",
                     "Address": {"City": "Winchester"},
                 }]]
        self.assertEqual(self.fj(query), [["Fred", "Smith"]])
        self.assertEqual(self.fj(["@run", 1, "!X",
            ["@matcho", "@person", {"FirstName": "!X", "Surname": "!X"}]]), [])
        self.assertEqual(self.fj(["@run", 1, 1,
            ["@matcho", "@person", {"Other": {"Misc": None}}]]), [1])
        self.assertEqual(self.fj(["@run", 1, 1,
            ["@matcho", "@person", {"Other": {"Missing": None}}]]), [])
        self.assertEqual(self.fj(["@run", 1, 1,
            ["@unify", "@person", {"FirstName": "Fred"}]]), [])

    def test_membero_and_nested_email(self):
        self.fred()
        office = ["@run", 10, "!Number", ["@conj",
            ["@patho", "@person", ["Phone"], "!Phones"],
            ["@membero", "!Phones", {"type": "office", "number": "!Number"}]]]
        self.assertEqual(self.fj(office), ["01962 001234", "01962 001235"])
        work_email = ["@run", 10, "!Address", ["@conj",
            ["@patho", "@person", ["Email"], "!Emails"],
            ["@conj",
                ["@membero", "!Emails", {"type": "work", "address": "!Addresses"}],
                ["@membero", "!Addresses", "!Address"]]]]
        self.assertEqual(self.fj(work_email),
                         ["fred.smith@my-work.com", "fsmith@my-work.com"])

    def test_membero_and_some_have_distinct_semantics(self):
        data = [{"a": 1, "b": 2}]
        self.assertEqual(self.fj(["@run", 1, "!X",
            ["@membero", data, {"a": "!X"}]]), [])
        self.assertEqual(self.fj(["@run", 1, "!X",
            ["@matcho", data, ["@some", ["@record", {"a": "!X"}]]]]), [1])
        self.assertEqual(self.fj(["@run", 1, "!X",
            ["@membero", ["!X"], 1]]), [1])
        self.assertEqual(self.fj(["@run", 1, "!X",
            ["@matcho", ["!X"], ["@some", 1]]]), [])

    def test_patho_forward_and_reverse(self):
        self.fred()
        self.assertEqual(self.fj(["@run", 1, "!City",
            ["@patho", "@person", ["Address", "City"], "!City"]]), ["Winchester"])
        self.assertEqual(self.fj(["@run", 1, "!Path",
            ["@patho", "@person", "!Path", "London"]]),
            [["Other", "Alternative.Address", "City"]])
        self.assertEqual(self.fj(["@run", 1, "!City",
            ["@patho", "@person", ["Other", "Alternative.Address", "City"], "!City"]]),
            ["London"])
        self.assertEqual(self.fj(["@run", 3, "!Path",
            ["@patho", {"a": 1, "b": 2}, "!Path", "!Value"]]),
            [[], ["a"], ["b"]])

    def test_delayed_neq_ge_and_project(self):
        self.fred()
        cities = ["@run", 1,
            {"person": "!Name", "main_city": "!City1", "alternative_city": "!City2"},
            ["@conj", ["@neqo", "!City1", "!City2"],
                ["@matcho", "@person", {
                    "FirstName": "!Name", "Address": {"City": "!City1"},
                    "Other": {"Alternative.Address": {"City": "!City2"}},
                }]]]
        self.assertEqual(self.fj(cities), [{
            "person": "Fred", "main_city": "Winchester", "alternative_city": "London",
        }])
        self.assertEqual(self.fj(["@run", 1, "!Age", ["@conj",
            ["@ge", "!Age", 18],
            ["@matcho", "@person", {"Age": "!Age"}]]]), [28])
        self.fj({"@adult": ["@function", ["@candidate"], ["@conj",
            ["@matcho", "@candidate", {"Age": "!Age"}],
            ["@ge", "!Age", 18]]]})
        self.assertEqual(self.fj(["@run", 1, True, ["@adult", "@person"]]), [True])
        self.assertEqual(self.fj(["@run", 1, "!Next", ["@conj",
            ["@project", "@plus", ["!Age", 1], "!Next"],
            ["@matcho", "@person", {"Age": "!Age"}]]]), [29])
        self.assertEqual(self.fj(["@run", 1, "!X", ["@neqo", "!X", 1]]), [])
        self.assertEqual(self.fj(["@run", 1, "!X", ["@conj",
            ["@neqo", "!X", 1], ["@unify", "!X", 1]]]), [])
        self.assertEqual(self.fj(["@run", 1, "!X", ["@conj",
            ["@neqo", "!X", 1], ["@unify", "!X", 2]]]), [2])
        self.assertEqual(self.fj(["@run", 1, "!X", ["@conj",
            ["@neqo", {"x": "!X"}, {"x": 1}], ["@unify", "!X", 2]]]), [2])
        self.assertEqual(self.fj(["@run", 1, "!X", ["@conj",
            ["@neqo", {"x": "!X"}, {"x": 1}], ["@unify", "!X", 1]]]), [])
        self.assertEqual(self.fj(["@run", 1, "!Age", ["@conj",
            ["@ge", "!Age", 18], ["@unify", "!Age", 17]]]), [])


if __name__ == "__main__":
    unittest.main()
