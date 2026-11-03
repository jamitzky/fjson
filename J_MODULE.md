# J-Funktionsbibliothek auf fjson CORE 0.3

[`modules/j.fjsonl`](modules/j.fjsonl) ist eine nachladbare Bibliothek aus
fjson-Definitionen. Sie verändert weder den [eingefrorenen Kern](CORE.md) noch
den Python- oder JavaScript-Evaluator. Der [Modul-Loader](MODULES.md) macht
die Exporte unter qualifizierten Namen wie `@fork@j` verfügbar. Die
Definitionen verwenden `@function`, `@if`, `@let`-fähige Closures und
gewöhnliche Bibliotheksaufrufe. Es gibt keinen neuen Laufzeittyp für
Verben, Adverbs oder Conjunctions.

## Laden

Der Loader erhält Modultexte ausdrücklich vom Host. Er sucht nicht
automatisch nach Dateinamen.

```python
from pathlib import Path
from fjson import Interpreter, ModuleLoader

fj = Interpreter()
source = Path("modules/j.fjsonl").read_text(encoding="utf-8")
ModuleLoader(fj, {"j": source}).load('["@import","j"]')
print(fj(["@identity@j", 42]))  # 42
```

```js
import { readFileSync } from 'node:fs';
import { Interpreter } from './js/fjson.mjs';
import { ModuleLoader } from './js/modules.mjs';

const fj = new Interpreter();
const source = readFileSync('modules/j.fjsonl', 'utf8');
new ModuleLoader(fj, { j: source }).load('["@import","j"]');
console.log(fj.eval(['@identity@j', 42])); // 42
```

Für einen Browser kann die Host-Anwendung denselben JSONL-Text bereitstellen.
Die IDE lädt das J-Modul beim Ausführen eines J-Beispiels automatisch; die Einzeldatei enthält denselben Modultext offline.

## Erste API

| Name | Eingabe | Abgeleitete Funktion |
| --- | --- | --- |
| `@identity@j` | `y` | gibt `y` unverändert zurück |
| `@atop@j` | monadische `f`, `g` | `y → f(g(y))` |
| `@hook@j` | dyadische `f`, monadische `g` | `y → f(y, g(y))` |
| `@fork@j` | monadische `f`, dyadische `g`, monadische `h` | `y → g(f(y), h(y))` |
| `@fork2@j` | dyadische `f`, `g`, `h` | `(x,y) → g(f(x,y), h(x,y))` |
| `@each@j` | monadische `f` | `xs → map(f, xs)` |
| `@insert@j` | dyadische `f` | nichtleeres `xs →` linksassoziative Faltung |
| `@curry@j` | dyadische `f`, `"left"` oder `"right"`, Wert | bindet eine Seite und liefert eine monadische Funktion |

Die Valenz ist ausdrücklich durch den gewählten Kombinator bestimmt. Ein
falsch verwendeter Operand scheitert beim Aufruf durch die normale
Arity-Prüfung des Interpreters. `@insert@j` faltet von links:
`[10,3,2]` mit `@minus` ergibt `(10-3)-2 = 5`. Ein leeres Array ist ein
Fehler; es gibt keine implizite Identität. `@curry@j` wertet den gebundenen
Wert einmal beim Erzeugen der Closure aus und verlangt eine gültige Seite.

## Beispiel: monadischer Fork

```json
["@let",
  {"@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
   "@double": ["@function", ["@x"], ["@times", 2, "@x"]],
   "@f": ["@fork@j", "@square", "@plus", "@double"]},
  ["@f", 5]]
```

Ergebnis: `35`, denn `5² + 2·5 = 35`. Die Reihenfolge von `f` und `h`
ist bei nichtkommutativen `g` wesentlich. Ein dyadischer Fork verwendet
ausdrücklich `@fork2@j`; er wird nicht aus der Anzahl der Aufrufargumente
oder der Position eines Namens im Array erraten.

## Verhältnis zum alten FJAT

Die drei mitgelieferten FJAT-Dokumente beschreiben sowohl implementierte
Teile als auch weitergehende Entwürfe. Diese Bibliothek übernimmt die
funktionale Idee von Monaden, Dyaden, Hooks, Forks und Modifikatoren. Sie
übernimmt **nicht** die alte Infix-/Postfix-Aufrufauflösung, implizite
Fork-Syntax, Meta-Level-Prioritäten, automatische Array-Liftung oder
Rank-/Cell-Semantik. Aufrufe bleiben in fjson-Präfixform. Längere Trains,
Prefix-Reduktionen, Broadcasting und symbolische J-IR sind hier noch nicht
definiert; ihre genaue Semantik braucht eigene Beispiele und Tests.

Die neun gemeinsamen [Testfälle](modules/j_cases.json) werden in Python
und JavaScript ausgeführt. Die Bibliothek besteht vollständig aus
JSONL-Definitionen und nutzt keine zusätzliche Host-Capability.
