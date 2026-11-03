# Module und Namensräume

Der Modul-Loader verarbeitet `@import` und `@namespace` **vor** dem
Interpreter. Beide sind Direktiven in JSONL-Dateien und keine Special Forms
des [eingefrorenen Sprachkerns 0.3](CORE.md). Eine nicht an den Loader
übergebene Direktive ist für den Interpreter ein gewöhnlicher Aufruf und
scheitert ohne passende Bindung.

## Format

Jede nichtleere Zeile ist genau ein vollständiger JSON-Wert. Zeilenumbrüche
innerhalb eines Werts und Kommentare sind nicht Teil dieses JSONL-Formats.
Der Loader verarbeitet alle Direktiven zuerst und wertet danach die übrigen
Ausdrücke in Dokumentreihenfolge aus. Das Ergebnis ist der Wert des letzten
Ausdrucks oder `null`/`None`, wenn keiner vorhanden ist.

```jsonl
["@import", "math"]
["@import", "logic"]
["@namespace", "demo", {"inc": ["@function", ["@x"], ["@plus@math", "@x", 1]]}]
["@inc@demo", 41]
```

Das Ergebnis ist `42`. `@import` akzeptiert genau einen einfachen Modulnamen.
`@namespace` akzeptiert einen einfachen Namensraumnamen und ein Objekt mit
Definitionen. Für Namen und Exporte gilt `[A-Za-z][A-Za-z0-9_]*`.
`"inc"` im Namensraum `"demo"` wird zu `@inc@demo`; qualifizierte Namen
werden auch innerhalb eines Moduls ausdrücklich ausgeschrieben. Der Loader
erzeugt keine unqualifizierten Aliase und schreibt Funktionsrümpfe nicht um.

Eine Closure sieht die gemeinsame persistente Umgebung. Deshalb darf ihr
Rumpf eine andere Funktion desselben Namensraums aufrufen, die erst später
definiert wird. Gewöhnliche Werte und Standardparameter werden schon bei
der Definition ausgewertet; für sie zählt die Reihenfolge der Definitionen.

## Standardmodule

`["@import", "math"]` stellt die vorhandenen reinen Zahlenfunktionen unter
qualifizierten Namen bereit, etwa `@plus@math`, `@sqrt@math` und
`@gte@math`. `logic` stellt die vorhandenen Logik- und Graphfunktionen
bereit, etwa `@unify@logic`, `@matcho@logic`, `@some@logic` und
`@run@logic`:

```jsonl
["@import", "logic"]
["@run@logic", 1, "!X", ["@unify@logic", "!X", 42]]
```

Ergebnis: `[42]`. Die qualifizierten Bindungen entstehen erst beim Import.
Die bisherigen unqualifizierten Bibliotheksnamen bleiben für vorhandene
Programme verfügbar. Standardmodule sind somit zunächst explizite
Namensräume über derselben Bibliothek, keine separate Laufzeit oder neue
Effektberechtigung.

## Eigene Module und Konflikte

Ein Host stellt eigene Module als explizite Abbildung von Modulnamen auf
JSONL-Quelltext bereit. Importierte Module enthalten nur Direktiven; ihre
Programmausdrücke würden sonst beim Import unbemerkt ausgeführt. Ein Modul
kann weitere Module importieren. Mehrfache Imports desselben Namens sind
idempotent. Unbekannte Module, Importzyklen, doppelte qualifizierte Namen
und ungültige Direktiven sind Fehler. Die Bindungen eines fehlgeschlagenen
Direktivenblocks werden zurückgesetzt; bereits ausgeführte Programmausdrücke
und externe Effekte werden nicht rückgängig gemacht.

Python:

```python
from fjson import Interpreter, ModuleLoader

fj = Interpreter()
loader = ModuleLoader(fj, {
    "util": '["@import", "math"]\n'
            '["@namespace", "util", {"inc": '
            '["@function", ["@x"], ["@plus@math", "@x", 1]]}]',
})
assert loader.load('["@import", "util"]\n["@inc@util", 41]') == 42
```

JavaScript/Node:

```js
import { Interpreter } from './js/fjson.mjs';
import { ModuleLoader } from './js/modules.mjs';

const fj = new Interpreter();
const loader = new ModuleLoader(fj);
console.log(loader.load('["@import", "math"]\n["@plus@math", 40, 2]')); // 42
```

Der Loader selbst liest weder Dateien noch das Netzwerk. Ein Host kann
JSONL-Dateien lesen und ihren Inhalt an den Loader übergeben. Damit bleiben
Datei- und Netzwerkzugriff außerhalb des Sprachkerns und unter der Kontrolle
der Host-Anwendung.
