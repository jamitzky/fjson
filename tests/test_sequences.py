"""Pure numeric and sequence operations used by the IDE showcase."""

import unittest

from fjson import ArityError, EvaluationError, Interpreter, ResourceLimitError


class SequenceTests(unittest.TestCase):
    def test_map_filter_reduce_and_empty_input(self):
        fj = Interpreter()
        self.assertEqual(fj(["@map", ["@function", ["@n"],
            ["@times", "@n", "@n"]], [2, 3, 4]]), [4, 9, 16])
        self.assertEqual(fj(["@filter", ["@function", ["@n"],
            ["@gt", "@n", 2]], [1, 2, 3, 4]]), [3, 4])
        self.assertEqual(fj(["@reduce", "@plus", [], 42]), 42)
        self.assertEqual(fj(["@reduce", "@minus", [2, 3], 10]), 5)

    def test_numeric_and_callback_errors(self):
        fj = Interpreter()
        for expression in (["@range", 0, 10, 0], ["@mod", 1, 0],
                           ["@mod", True, 2], ["@sqrt", -1],
                           ["@pow", -1, 0.5]):
            with self.subTest(expression=expression), self.assertRaises(EvaluationError):
                fj(expression)
        with self.assertRaises(ArityError):
            fj(["@map", "@plus", [1, 2]])
        with self.assertRaises(EvaluationError):
            fj(["@filter", "@plus", "not an array"])

    def test_large_range_and_callback_respect_step_limit(self):
        with self.assertRaises(ResourceLimitError):
            Interpreter(max_steps=30)(["@range", 100])
        with self.assertRaises(ResourceLimitError):
            Interpreter(max_steps=45)(["@map", ["@function", ["@x"], "@x"],
                [1] * 100])


if __name__ == "__main__":
    unittest.main()
