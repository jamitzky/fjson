import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const read = path => readFileSync(join(directory, path), 'utf8');
export function buildStandalone() {
  const page = read('index.html');
  const style = read('style.css');
  const runtime = read('../js/fjson.mjs');
  const app = read('app.mjs');

if (!page.includes('<link rel="stylesheet" href="./style.css">') ||
    !page.includes('<script type="module" src="./app.mjs"></script>') ||
    !app.startsWith("import { Closure, Goal, Interpreter, LogicVar, parseJson } from '../js/fjson.mjs';")) {
  throw new Error('Die Vorlagen haben sich geändert; Standalone-Build prüfen.');
}
if (/<\/script/i.test(runtime + app) || /<\/style/i.test(style)) {
  throw new Error('Ein eingebetteter Abschluss-Tag würde die HTML-Datei beschädigen.');
}

const inlineRuntime = runtime.replace(/^export (class|function) /gm, '$1 ');
if (/^export\s/m.test(inlineRuntime)) {
  throw new Error('Nicht unterstützter ES-Modul-Export im Interpreter.');
}
const inlineApp = app.replace(/^import \{ Closure, Goal, Interpreter, LogicVar, parseJson \} from '\.\.\/js\/fjson\.mjs';\r?\n/, '');
  return page
  .replace('<link rel="stylesheet" href="./style.css">', `<style>\n${style}</style>`)
  .replace('<script type="module" src="./app.mjs"></script>', '')
  .replace(/\s*<nav aria-label="Projektlinks">[\s\S]*?<\/nav>/, '')
    .replace('</body>', `<script>\n'use strict';\n${inlineRuntime}\n${inlineApp}\n</script>\n</body>`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const standalone = buildStandalone();
  if (process.argv.includes('--stdout')) {
    process.stdout.write(standalone);
  } else {
    writeFileSync(join(directory, 'fjson-studio.html'), standalone);
    console.log(`web/fjson-studio.html erstellt (${Buffer.byteLength(standalone)} Bytes)`);
  }
}
