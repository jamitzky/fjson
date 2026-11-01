import json
import unittest

from fjson import ArityError, EvaluationError, Interpreter, ResolutionError, ResourceLimitError


class InterpreterTests(unittest.TestCase):
    def setUp(self):
        self.fj = Interpreter()

    def test_readme_function_and_defaults(self):
        self.assertEqual(
            self.fj.run('["@let", {"@inc": ["@function", {"@x": 1}, '
                        '["@add", "@x", 1]]}, ["@add", ["@inc"], ["@inc", 41]]]'),
            44,
        )
        self.assertEqual(
            self.fj.run('["@let", {"@inc": ["@function", ["@x"], '
                        '["@add", "@x", 1]]}, ["@inc", 41]]'),
            42,
        )

    def test_direct_python_call(self):
        fjson = Interpreter()
        program = [
            "@let",
            {"@inc": ["@function", ["@x"], ["@add", "@x", 1]]},
            ["@inc", 41],
        ]
        self.assertEqual(fjson(program), 42)
        self.assertEqual(fjson(["@define", "@answer", 42]), 42)
        self.assertEqual(fjson("@answer"), 42)
        self.assertEqual(fjson([True, None]), [True, None])

    def test_define_persists_and_do_sequences(self):
        self.assertEqual(
            self.fj.run('["@do", ["@define", "@inc", '
                        '["@function", {"@x": 1}, ["@add", "@x", 1]]], '
                        '["@inc", 41]]'),
            42,
        )
        self.assertEqual(self.fj.run('["@inc"]'), 2)

    def test_default_evaluated_once_at_definition(self):
        self.fj.run('["@define", "@n", 3]')
        self.fj.run('["@define", "@f", ["@function", '
                    '{"@x": ["@add", "@n", 1]}, "@x"]]')
        self.fj.run('["@define", "@n", 99]')
        self.assertEqual(self.fj.run('["@f"]'), 4)
        self.assertEqual(self.fj.run('["@f", 7]'), 7)

    def test_lexical_closure_and_let_order(self):
        self.assertEqual(
            self.fj.run('["@let", {"@n": 1, "@f": '
                        '["@function", ["@x"], ["@add", "@x", "@n"]]}, '
                        '["@f", 41]]'),
            42,
        )
        with self.assertRaises(ResolutionError):
            self.fj.run('"@n"')

    def test_mutual_recursion(self):
        source = [
            "@letrec",
            {
                "@even": ["@function", ["@n"],
                          ["@if", ["@le", "@n", 0], True,
                           ["@odd", ["@minus", "@n", 1]]]],
                "@odd": ["@function", ["@n"],
                         ["@if", ["@le", "@n", 0], False,
                          ["@even", ["@minus", "@n", 1]]]],
            },
            ["@even", 8],
        ]
        self.assertTrue(self.fj.eval(source))

    def test_quote_and_literal_data(self):
        self.assertEqual(self.fj.run('["@quote", ["@missing", 2]]'), ["@missing", 2])
        self.assertEqual(self.fj.run('[1, 2, {"key": 3}]'), [1, 2, {"key": 3}])
        self.assertEqual(self.fj.run('["@quote", "@name"]'), "@name")
        with self.assertRaises(ResolutionError):
            self.fj.run('"@missing"')
        with self.assertRaises(ResolutionError):
            self.fj.run('"@"')

    def test_fixities_and_ambiguous_infix_precedence(self):
        self.assertEqual(self.fj.run('["@add", 40, 2]'), 42)
        self.assertEqual(self.fj.run('[40, "@add", 2]'), 42)
        self.assertEqual(self.fj.run('[40, 2, "@add"]'), 42)
        self.assertEqual(self.fj.run('["@plus", 40, 2]'), 42)

    def test_short_circuit_and_conditional(self):
        self.assertEqual(self.fj.run('["@if", true, 42, "@missing"]'), 42)
        self.assertEqual(self.fj.run('["@and", 0, "@missing"]'), 0)
        self.assertEqual(self.fj.run('["@or", 7, "@missing"]'), 7)
        self.assertTrue(self.fj.run('["@and"]'))
        self.assertFalse(self.fj.run('["@or"]'))

    def test_apply_does_not_reinterpret_values(self):
        self.assertEqual(self.fj.run('["@apply", "@add", [40, 2]]'), 42)
        self.assertEqual(
            self.fj.run('["@apply", ["@function", ["@x"], "@x"], '
                        '[["@quote", ["@missing", 2]]]]'),
            ["@missing", 2],
        )

    def test_pipe_template(self):
        self.assertEqual(self.fj.run('["@pipe", 41, [1, "@add"]]'), 42)
        self.fj.run('["@define", "@inc", ["@function", ["@x"], '
                    '["@add", "@x", 1]]]')
        self.assertEqual(self.fj.run('["@pipe", 40, "@inc", "@inc"]'), 42)

    def test_try_catches_language_errors_not_resource_limits(self):
        self.assertEqual(self.fj.run('["@try", "@missing", 42]'), 42)
        record = self.fj.run('["@try", "@missing"]')
        self.assertEqual(record["error"], "ResolutionError")
        limited = Interpreter(max_steps=20)
        with self.assertRaises(ResourceLimitError):
            limited.run('["@try", ["@letrec", {"@loop": '
                        '["@function", [], ["@loop"]]}, ["@loop"]], 42]')

    def test_errors_and_json_input(self):
        with self.assertRaises(ArityError):
            self.fj.run('["@add", 1]')
        with self.assertRaises(EvaluationError):
            self.fj.run('["@function", ["@x", "@x"], "@x"]')
        with self.assertRaises(EvaluationError):
            self.fj.run('["@function", {"@x": 1}, "@x", 2]')
        with self.assertRaises(ValueError):
            self.fj.run('{"x": 1, "x": 2}')
        with self.assertRaises(ValueError):
            self.fj.run('NaN')
        with self.assertRaises(EvaluationError):
            self.fj.run('["@add", true, 1]')


if __name__ == "__main__":
    unittest.main()

