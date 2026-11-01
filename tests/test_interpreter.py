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
        self.assertEqual(fjson({"@answer": 42}), 42)
        self.assertEqual(fjson("@answer"), 42)
        self.assertEqual(fjson([True, None]), [True, None])

    def test_declarations_persist_and_are_ordered(self):
        self.fj.run('{"@inc": ["@function", {"@x": 1}, ["@add", "@x", 1]]}')
        self.assertEqual(self.fj.run('["@inc"]'), 2)
        self.assertEqual(self.fj.run('["@inc", 41]'), 42)
        self.assertEqual(self.fj.run('{"@x": 41, "@y": ["@add", "@x", 1]}'), 42)
        self.assertEqual(self.fj.run('"@y"'), 42)

    def test_nested_declaration_uses_current_scope(self):
        self.assertEqual(
            self.fj.run('["@let", {"@x": 41}, {"@answer": ["@add", "@x", 1]}]'),
            42,
        )
        with self.assertRaises(ResolutionError):
            self.fj.run('"@answer"')
        self.assertEqual(
            self.fj.run('{"record": ["@quote", {"@answer": 42}]}'),
            {"record": {"@answer": 42}},
        )

    def test_default_evaluated_once_at_definition(self):
        self.fj.run('{"@n": 3}')
        self.fj.run('{"@f": ["@function", '
                    '{"@x": ["@add", "@n", 1]}, "@x"]}')
        self.fj.run('{"@n": 99}')
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
        self.assertEqual(self.fj.run('["@quote", {"@x": 1}]'), {"@x": 1})
        with self.assertRaises(ResolutionError):
            self.fj.run('"@x"')
        with self.assertRaises(ResolutionError):
            self.fj.run('"@missing"')
        with self.assertRaises(ResolutionError):
            self.fj.run('"@"')

    def test_prefix_is_the_only_call_position(self):
        self.assertEqual(self.fj.run('["@add", 40, 2]'), 42)
        self.assertEqual(self.fj.run('["@plus", 40, 2]'), 42)
        infix_data = self.fj.run('[40, "@add", 2]')
        postfix_data = self.fj.run('[40, 2, "@add"]')
        self.assertEqual([infix_data[0], infix_data[2]], [40, 2])
        self.assertEqual(postfix_data[:2], [40, 2])
        self.assertIs(infix_data[1], postfix_data[2])
        self.fj({"@x": 1})
        with self.assertRaises(EvaluationError):
            self.fj.run('["@x", 1]')
        with self.assertRaises(ResolutionError):
            self.fj.run('["@pipe", 41, [1, "@add"]]')

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
        with self.assertRaises(EvaluationError):
            self.fj.run('{"@x": 1, "ordinary": 2}')
        with self.assertRaises(EvaluationError):
            self.fj.run('{"@if": 1}')
        with self.assertRaises(ResolutionError):
            self.fj.run('["@define", "@x", 1]')
        with self.assertRaises(ResolutionError):
            self.fj.run('["@do", 1, 2]')

    def test_noncall_arrays_remain_data(self):
        self.assertEqual(self.fj.run('[1, 2, 3]'), [1, 2, 3])
        self.assertEqual(self.fj.run('[{"@x": 1}, "@x"]'), [1, 1])
        self.assertEqual(self.fj.run('"@x"'), 1)


if __name__ == "__main__":
    unittest.main()

