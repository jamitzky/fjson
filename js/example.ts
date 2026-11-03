import { Interpreter, type JsonValue } from './fjson.mjs';

const program: JsonValue = [
  '@let',
  { '@inc': ['@function', ['@x'], ['@plus', '@x', 1]] },
  ['@inc', 41],
];

const fjson = new Interpreter();
console.log(fjson.eval(program)); // 42
