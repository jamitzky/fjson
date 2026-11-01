import unittest

from fjson import EvaluationError, Interpreter, LogicVar, ResourceLimitError
from fjson.logic import UnifyGoal, reify, unify


class LogicLibraryTests(unittest.TestCase):
    def setUp(self):
        self.fj = Interpreter()

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


if __name__ == "__main__":
    unittest.main()
