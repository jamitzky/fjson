# fjson für JavaScript, TypeScript, Browser und Node

`fjson.mjs` ist eine eigenständige ESM-Referenzimplementierung des
[eingefrorenen Sprachkerns 0.3](../CORE.md) und der endlichen
[Logikbibliothek](../LOGIC.md). Dieselbe Datei läuft in Node und in modernen
Browsern. `fjson.d.mts` liefert TypeScript-Deklarationen für diesen
JavaScript-Code; es gibt keine zweite, abweichende Laufzeit.

## Node und TypeScript

Aus dem Repository-Verzeichnis:

```powershell
node js/test.mjs
node js/test-pages.mjs
node js/example.ts
```

Das TypeScript-Beispiel benutzt nur entfernbare Typannotationen und lief
hier direkt mit Node 24. Ein TypeScript-Compiler ist für die JavaScript-
Laufzeit nicht erforderlich. Projekte mit TypeScript können
`./js/fjson.mjs` importieren; `fjson.d.mts` beschreibt die öffentliche API.
Eine statische Typprüfung mit `tsc` wurde in dieser Umgebung nicht
ausgeführt, weil `tsc` nicht installiert ist.

```js
import { Interpreter } from './js/fjson.mjs';

const fjson = new Interpreter();
const result = fjson.eval([
  '@let',
  { '@inc': ['@function', ['@x'], ['@plus', '@x', 1]] },
  ['@inc', 41],
]);
console.log(result); // 42
```

`fjson.run(source)` nimmt JSON-Text entgegen und weist doppelte
Objektschlüssel zurück. `fjson.eval(value)` wertet bereits erzeugte
JavaScript-Werte aus. Definitionen bleiben innerhalb einer
Interpreter-Instanz erhalten.

## Browser

[browser.html](browser.html) lädt `fjson.mjs` direkt als ES-Modul und
zeigt `42`. Das Beispiel muss über einen lokalen Webserver oder eine
Website geöffnet werden; viele Browser sperren Modulimporte von
`file://`-Seiten. Ein einfacher Entwicklungsserver aus dem
Repository-Verzeichnis ist `python -m http.server 8000`; anschließend
`http://localhost:8000/js/browser.html` öffnen.

[browser-test.html](browser-test.html) zeigt 16 gemeinsame
Konformitätsfälle und fünf zusätzliche Browser-Checks mit Pass/Fail-
Ergebnissen. Unter `http://localhost:8000/js/browser-test.html` laufen
die Tests automatisch; der Knopf startet sie erneut. Die kleine
[modulare fjson-IDE](../web/README.md) liegt unter
`http://localhost:8000/web/`.

Für die IDE gibt es zusätzlich eine
[vollständig eigenständige HTML-Datei](../web/fjson-studio.html). Sie
enthält `fjson.mjs`, den App-Code und die Styles inline. Die Datei kann
allein heruntergeladen und ohne Webserver über `file://` geöffnet werden.
Sie wird aus den modularen Quelldateien mit
`node web/build-standalone.mjs` erzeugt; `node js/test-pages.mjs` prüft
den erzeugten Inhalt und die IDE-Funktionen mit Node.

Die Referenzimplementierung installiert keinerlei Datei-, Prozess-
oder Netzwerkfunktionen. Die [Python-Host-Adapter](../SECURITY.md) sind
plattformabhängig und gehören nicht zum eingefrorenen Sprachkern.
Eine spätere Browser- oder Node-Host-Schnittstelle muss dieselbe
Default-Deny- und Aufrufprüfung eigenständig umsetzen, bevor externe
Operationen verfügbar werden.

Die reinen Bibliotheksfunktionen `@get` und `@length` helfen beim
Verarbeiten von JSON-Daten. `@get` akzeptiert ein Objekt und einen
String-Schlüssel oder ein Array und einen nichtnegativen ganzzahligen
Index. `@length` akzeptiert ein Objekt oder Array. Fehlende Schlüssel,
Indizes und falsche Typen verursachen einen `EvaluationError`.

## Sprach- und Zahlenhinweise

Ein fjson-Array ist in JavaScript und TypeScript ein gültiger Ausdruck.
Ein Deklarationsobjekt muss an einer Ausdrucksposition stehen, etwa nach
`=` oder in Klammern; ein nacktes `{...}` am Beginn einer Anweisung kann
als Block gelesen werden. Für Python-Objekte heißen die JSON-Literale
`true`, `false` und `null` dagegen `True`, `False` und `None`.

JavaScript verwendet IEEE-754-Zahlen. Der strikte JSON-Parser weist
ganzzahlige Literale und Rechenergebnisse außerhalb des sicheren
Integer-Bereichs zurück, damit keine Zahl unbemerkt gerundet wird. Für solche Werte ist die
Python-Implementierung maßgeblich. Bei direkt übergebenen JavaScript-
Zahlen kann bereits vor `eval()` eine Rundung erfolgt sein.

Die JSON-Textschnittstelle bewahrt die Reihenfolge der Objektschlüssel
für Deklarationen und Datenobjekte. Bei JavaScript-Objekten gilt die
Reihenfolge von `Object.keys`; insbesondere numerische Schlüssel können
anders geordnet werden als im Quelltext. Die gemeinsamen Fälle in
[conformance.json](conformance.json) werden von Python und JavaScript
ausgeführt. Sie prüfen die portablen Kern- und Logikregeln.
