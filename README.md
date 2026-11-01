# fjson

**fjson** ist die Grundlage für eine in JSON geschriebene Implementierung von FJ@. Das reine Python-Modul wertet einen definierten Sprachkern aus: Referenzen, Funktionen, Funktionsaufrufe, lexikalische Bindungen und die unten beschriebenen besonderen Formen.

> **Stand:** Version 0.1 implementiert den in [GRAMMAR.ebnf](GRAMMAR.ebnf) und diesem README beschriebenen Kern. Sie ist noch keine vollständige Implementierung aller FJ@-Bibliotheksfunktionen und Metafunktionsregeln.

## Grundidee

Ein FJ@-Programm ist ein JSON-Wert. JSON-Zahlen, boolesche Werte, `null` und gewöhnliche Strings können Daten sein. Ein String, der mit `@` beginnt, ist dagegen ein **Bezeichner**: Er verweist auf eine Variable, ein Symbol oder eine Funktion. Beispielsweise bezeichnet `"@x"` einen gebundenen Wert und `"@add"` eine Funktion. Ein unbekannter Bezeichner löst einen Fehler aus.

JSON-Arrays dienen sowohl als Daten als auch als Ausdrücke. Der Auswerter muss anhand der definierten Sprachformen und aufrufbaren Werte entscheiden, ob ein Array einen Aufruf darstellt. JSON-Objektschlüssel bleiben gewöhnliche Strings.

## Der erste Baustein: `@function`

`@function` erzeugt eine Funktion aus einer Parameterliste und einem Rumpf:

```json
["@function", ["@x"], ["@add", "@x", 1]]
```

Dies ist eine Funktion mit einem Parameter. Bei einem Aufruf wird der übergebene Wert an `@x` gebunden, und der Rumpf wird in dieser Umgebung ausgewertet. Mit `41` als Argument liefert sie `42`. `@add` ist dabei eine eingebaute Funktion für Addition.

Die allgemeine Form des ersten Kerns ist:

```json
["@function", ["@x", "@y"], ["@add", "@x", "@y"]]
```

Die Parameterliste enthält unterschiedliche Bezeichner, die mit `@` beginnen. `@function` wertet den Rumpf beim Erzeugen der Funktion noch nicht aus. Die Funktion ist ein Wert: Sie kann gebunden, übergeben und zurückgegeben werden.

### Parameter mit Standardwerten

Statt einer Liste kann `@function` ein JSON-Objekt als Parameterspezifikation erhalten. Jeder Schlüssel ist ein Parametername, der zugehörige Wert sein Standardausdruck:

```json
["@function", {"@x": 1}, ["@add", "@x", 1]]
```

Ohne Argument wird `@x` auf `1` gesetzt und die Funktion liefert `2`. Mit einem Argument überschreibt dieses den Standardwert; mit `41` liefert die Funktion `42`. Ein Beispiel für beide Aufrufe:

```json
["@let",
  {"@inc": ["@function", {"@x": 1}, ["@add", "@x", 1]]},
  ["@add", ["@inc"], ["@inc", 41]]]
```

Erwartetes Ergebnis: `44`.

Die Listenform bezeichnet weiterhin Pflichtparameter; in der Objektform haben alle Parameter einen Standardwert. Bei mehreren Objekteinträgen ist ihre Reihenfolge im JSON-Quelltext die Positionsreihenfolge der Argumente. Der Python-Lader muss diese Reihenfolge erhalten. Standardausdrücke werden einmal bei der Erzeugung der Funktion in der dortigen lexikalischen Umgebung ausgewertet, bevor ein Aufruf sie gegebenenfalls überschreibt. Eine Mischung aus Pflichtparametern und Parametern mit Standardwerten ist in diesem ersten Format noch nicht festgelegt.

### Lexikalische Closures

Eine Funktion merkt sich die Umgebung, in der sie erzeugt wurde. Dadurch können freie Bezeichner im Rumpf auch später noch auf ihre ursprünglichen Bindungen zugreifen. Dieser lexikalische Geltungsbereich macht `@function` zur Grundlage für Funktionen höherer Ordnung.

Ein Beispiel:

```json
["@let",
  {"@n": 1},
  ["@function", ["@x"], ["@add", "@x", "@n"]]]
```

Das Ergebnis ist eine Funktion, die `@n` mit dem Wert `1` festhält. Wird sie später mit `41` aufgerufen, ist das Ergebnis `42`.

## Sprachkern: besondere Formen

Einige Formen müssen vom Auswerter selbst erkannt werden. Eine gewöhnliche Funktion bekommt bereits ausgewertete Argumente und kann daher weder eine Bindung anlegen noch die Auswertung eines Zweigs verhindern. Die folgenden `@`-Namen sind deshalb für den Sprachkern reserviert:

| Form | Auswertungsregel |
| --- | --- |
| `@quote` | Gibt den folgenden JSON-Wert unverändert zurück; Referenzen und Aufrufe darin werden nicht ausgewertet. |
| `@function` | Erzeugt eine lexikalische Closure aus Parametern und einem noch nicht ausgewerteten Rumpf. |
| `@define` | Wertet einen Ausdruck aus, bindet das Ergebnis unter einem `@`-Namen in der aktuellen Umgebung und gibt den Wert zurück. Der Name selbst wird nicht als Referenz ausgewertet. |
| `@let` | Erzeugt eine lokale Umgebung, wertet ihre Bindungen aus und wertet darin den Rumpf aus. |
| `@letrec` | Legt alle lokalen Namen vor der Auswertung der Bindungen an, damit sich Funktionen rekursiv und gegenseitig aufrufen können. |
| `@if` | Wertet die Bedingung und anschließend nur den gewählten Zweig aus. |
| `@do` | Wertet mehrere Ausdrücke der Reihe nach in derselben Umgebung aus und liefert den letzten Wert. |
| `@and`, `@or` | Werten Operanden von links nach rechts mit Kurzschluss aus und liefern den jeweils entscheidenden Wert. |
| `@try` | Fängt Auswertungsfehler ab; ein optionaler Ersatz-Ausdruck wird nur im Fehlerfall ausgewertet. Ohne Ersatz entsteht ein Fehlerobjekt. Ressourcenlimits bleiben Fehler. |
| `@pipe` | Führt einen Wert durch Stufen: ein einzelner Name ruft eine einstellige Funktion auf, `[argument, ..., name]` setzt den aktuellen Wert als letztes Argument ein. |

`@define` macht einen Wert für folgende Ausdrücke derselben Umgebung verfügbar. Zusammen mit `@do` entsteht so ein vollständiges Programm in einem JSON-Ausdruck:

```json
["@do",
  ["@define", "@inc", ["@function", {"@x": 1}, ["@add", "@x", 1]]],
  ["@inc", 41]]
```

Erwartetes Ergebnis: `42`. Bei einer fortbestehenden Interpreter-Sitzung bleibt `@inc` auch für spätere Auswertungen gebunden. `@let` begrenzt eine Bindung dagegen auf seinen lokalen Rumpf. Wie im bisherigen FJ@ werden `@let`-Bindungen in der Reihenfolge ihrer JSON-Objektschlüssel ausgewertet; spätere Bindungen können frühere verwenden.

Für Bedingungen gilt: `false`, `null`, `0`, `""`, `[]` und `{}` sind falsch; andere Werte sind wahr. `@if` wertet den nicht gewählten Zweig nicht aus. `@and` und `@or` liefern einen Operandenwert statt ihn in einen booleschen Wert umzuwandeln. Ohne Operanden liefern sie `true` beziehungsweise `false`.

`@pipe` setzt bei einer Vorlagenstufe den laufenden Wert als letztes Argument ein. So liefert `["@pipe", 41, [1, "@add"]]` den Wert `42`. Eine einzelne Stufe `"@inc"` ruft dagegen `@inc` mit dem laufenden Wert als einzigem Argument auf.

`@apply` ist zusätzlich ein **Laufzeit-Primitiv** für `["@apply", funktion, argumentliste]`. Es übergibt die Werte der ausgewerteten Argumentliste direkt an die Funktion, ohne diese Werte nochmals als FJ@-Quelltext zu interpretieren. Das benötigt Unterstützung im Aufrufmechanismus, ist aber keine neue Bindungs- oder Kontrollform. `@try` fängt `EvaluationError` und dessen Unterklassen ab, aber keinen `ResourceLimitError`; ohne Ersatz liefert es `{"error": "Klassenname", "message": "Text"}`. Bereits erfolgte `@define`-Bindungen werden durch `@try` nicht zurückgerollt.

Operationen wie `@add` sowie aus anderen Funktionen zusammensetzbare Operationen wie `@map`, `@filter`, `@compose` und `@curry` sind keine reservierten Sprachformen. Version 0.1 bietet `@add` (auch `@plus`), `@minus`, `@times`, `@divide`, `@eq` und `@le` als eingebaute Funktionen. Die anderen genannten Funktionen sowie `@reduce` sind noch nicht enthalten. Ein später aus Leistungsgründen nativer Rechenkern bleibt eine aufrufbare Funktion statt eines Keywords.

## Auswertung und Aufrufe

Der Python-Auswerter setzt diese Grundregeln um:

| Form | Bedeutung |
| --- | --- |
| `42`, `true`, `null`, `"text"` | Literale Werte |
| `"@x"` | Referenz auf eine Bindung oder eingebaute Funktion |
| `["@function", ["@x"], rumpf]` | Funktion mit Pflichtparameter erzeugen |
| `["@function", {"@x": 1}, rumpf]` | Funktion mit Standardwert für `@x` erzeugen |
| `["@add", 41, 1]` | Funktion mit zwei Argumenten aufrufen |
| `["@let", {"@n": 1}, rumpf]` | Lokale Bindung für einen Rumpf |
| `["@define", "@n", 1]` | Wert in der aktuellen Umgebung deklarieren |
| `["@quote", "@x"]` | `"@x"` als Datenwert zurückgeben, ohne die Referenz aufzulösen |

`@quote` wird benötigt, wenn ein mit `@` beginnender String oder ein Ausdruck selbst als Daten behandelt werden soll. Ausdrücke werden sonst gemäß ihren Sprachregeln ausgewertet. Ein Funktionsaufruf wertet seine Argumente aus und bindet sie in der Reihenfolge der Parameter. Ein gewöhnliches Array ohne passenden aufrufbaren Wert wird als Datenarray elementweise ausgewertet. Für dreiteilige Arrays prüft der Auswerter zuerst die Infixposition, dann Präfix und schließlich Postfix. Ein aufrufbarer Wert mit falscher Argumentzahl führt zu einem Fehler.

Ein minimales Programm zum Binden und Aufrufen der Funktion soll so aussehen:

```json
["@let",
  {"@inc": ["@function", ["@x"], ["@add", "@x", 1]]},
  ["@inc", 41]]
```

Erwartetes Ergebnis: `42`.

## Verhältnis zum bisherigen FJ@

Der implementierte Sprachkern orientiert sich am bisherigen FJ@-Entwurf. Funktionen können übergeben und zurückgegeben werden; Aufrufe in Präfix-, Infix- und Postfixposition werden anhand der Argumentzahl erkannt. Weitergehende Metafunktionsregeln, Effekte, Tensoroperationen und die größere FJ@-Standardbibliothek gehören noch nicht zu Version 0.1.

Das Beispiel hier verwendet `@add`; `@plus` ist als kompatibler Alias derselben Operation vorhanden.

## Python-Schnittstelle und Ausführung

Die Laufzeit verwendet ausschließlich die Python-Standardbibliothek und benötigt Python 3.10 oder neuer. Liegt das Programm bereits als Python-Liste, -Dictionary oder anderer JSON-kompatibler Wert vor, wird die Interpreter-Instanz direkt aufgerufen. Eine Instanz behält Definitionen zwischen Aufrufen:

```python
from fjson import Interpreter

fjson = Interpreter()
result = fjson([
    "@let",
    {"@inc": ["@function", ["@x"], ["@add", "@x", 1]]},
    ["@inc", 41],
])
assert result == 42
```

Python prüft dabei bereits die Syntax des Python-Quelltexts. Der Interpreter prüft zusätzlich, ob der übergebene Wert eine gültige FJ@-Form ist. In Python-Programmen schreibt man `True`, `False` und `None` statt `true`, `false` und `null`.

Für JSON-Text und `.json`-Dateien gibt es weiterhin `fjson.run(source)`. Diese Methode verwendet `json.loads` und weist doppelte Objektschlüssel zurück; ein eigener `json.loads`-Aufruf ist dafür nicht nötig. `fjson.eval(value)` bleibt als gleichwertige Methode für bereits eingelesene Werte verfügbar.

Aus dem Repository-Verzeichnis lässt sich eine JSON-Datei ausführen:

```powershell
python -m fjson examples/inc.json
python -B -m unittest discover -s tests
```

Das Kommando gibt das Ergebnis als JSON aus. Funktionswerte und ihre eingefangenen Umgebungen sind Laufzeitwerte des Interpreters und nicht selbst JSON-serialisierbar. `@quote` erhält JSON-Quellwerte als Daten. Die Auswertung ist durch konfigurierbare Schritt- und Tiefengrenzen beschränkt.

## Nächste Schritte

1. Bibliotheksfunktionen wie `@map`, `@filter`, `@compose` und `@curry` auf dem Sprachkern aufbauen.
2. Die weitergehenden FJ@-Metafunktionsregeln und ihre Aufrufmehrdeutigkeiten spezifizieren und testen.
3. Effekte, Fähigkeiten und numerische Kerne getrennt vom reinen Sprachkern ergänzen.

## Lizenz

Dieses Repository steht unter der [GNU General Public License Version 3](LICENSE).


