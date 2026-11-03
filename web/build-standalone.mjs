import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const read = path => readFileSync(join(directory, path), 'utf8');
export function buildStandalone() {
  const page = read('index.html');
  const style = read('style.css');
  const runtime = read('../js/fjson.mjs');
  const modules = read('../js/modules.mjs');
  const jLibrary = read('j-library.mjs');
  const showcase = read('showcase.mjs');
  const tutorial = read('tutorial.mjs');
  const app = read('app.mjs');

if (!page.includes('<link rel="stylesheet" href="./style.css">') ||
    !page.includes('<script type="module" src="./app.mjs"></script>') ||
    !app.startsWith("import { Closure, Goal, Interpreter, LogicVar, parseJson } from '../js/fjson.mjs';\n" +
      "import { fredData, refsData, showcaseGroups, shellGroups, lessonSource } from './showcase.mjs';\n" +
      "import { tutorialGroups, tutorialSteps } from './tutorial.mjs';\n" +
      "import { ModuleLoader } from '../js/modules.mjs';\n" +
      "import { jModuleSource } from './j-library.mjs';")) {
  throw new Error('Die Vorlagen haben sich geändert; Standalone-Build prüfen.');
}
if (/<\/script/i.test(runtime + modules + jLibrary + showcase + tutorial + app) || /<\/style/i.test(style)) {
  throw new Error('Ein eingebetteter Abschluss-Tag würde die HTML-Datei beschädigen.');
}

const inlineRuntime = runtime.replace(/^export (class|function) /gm, '$1 ');
if (/^export\s/m.test(inlineRuntime)) {
  throw new Error('Nicht unterstützter ES-Modul-Export im Interpreter.');
}
const inlineModules = modules
  .replace(/^import \{ EvaluationError, Interpreter, parseJson \} from '\.\/fjson\.mjs';\r?\n/m, '')
  .replace(/^export (class|function) /gm, '$1 ');
if (/^(?:import|export)\s/m.test(inlineModules)) {
  throw new Error('Nicht unterstützter ES-Modul-Import oder -Export im Modul-Loader.');
}
const inlineJLibrary = jLibrary.replace(/^export const /gm, 'const ');
if (/^export\s/m.test(inlineJLibrary)) {
  throw new Error('Nicht unterstützter ES-Modul-Export in der J-Bibliothek.');
}
const inlineShowcase = showcase.replace(/^export (const|function) /gm, '$1 ');
if (/^export\s/m.test(inlineShowcase)) {
  throw new Error('Nicht unterstützter ES-Modul-Export im Showcase.');
}
const inlineTutorial = tutorial
  .replace(/^import \{ showcaseGroups \} from '\.\/showcase\.mjs';\r?\n/m, '')
  .replace(/^export (const|function) /gm, '$1 ');
if (/^(?:import|export)\s/m.test(inlineTutorial)) {
  throw new Error('Nicht unterstützter ES-Modul-Import oder -Export im Tutorial.');
}
const inlineApp = app.replace(/^import \{ Closure, Goal, Interpreter, LogicVar, parseJson \} from '\.\.\/js\/fjson\.mjs';\r?\nimport \{ fredData, refsData, showcaseGroups, shellGroups, lessonSource \} from '\.\/showcase\.mjs';\r?\n/, '');
const inlineAppWithTutorial = inlineApp.replace(/^import \{ tutorialGroups, tutorialSteps \} from '\.\/tutorial\.mjs';\r?\nimport \{ ModuleLoader \} from '\.\.\/js\/modules\.mjs';\r?\nimport \{ jModuleSource \} from '\.\/j-library\.mjs';\r?\n/, '');
  return page
  .replace('<link rel="stylesheet" href="./style.css">', `<style>\n${style}</style>`)
  .replace('<script type="module" src="./app.mjs"></script>', '')
  .replace(/\s*<nav aria-label="Projektlinks">[\s\S]*?<\/nav>/, '')
    .replace('</body>', `<script>\n'use strict';\n${inlineRuntime}\n${inlineModules}\n${inlineJLibrary}\n${inlineShowcase}\n${inlineTutorial}\n${inlineAppWithTutorial}\n</script>\n</body>`);
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
