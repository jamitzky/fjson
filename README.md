# fjson

**fjson** ist die Grundlage für eine in JSON geschriebene Implementierung von FJ@. Das reine Python-Modul wertet einen definierten Sprachkern aus: Referenzen, Funktionen, Funktionsaufrufe, lexikalische Bindungen und die unten beschriebenen besonderen Formen.

> **Stand:** Der Sprachkern 0.3 ist [eingefroren](CORE.md). Seine Quellformen stehen in [GRAMMAR.ebnf](GRAMMAR.ebnf), seine Auswertung in [SEMANTICS.md](SEMANTICS.md). Die erste [Logikbibliothek](LOGIC.md) sucht derzeit über bereits aufgebaute Goal-Bäume.

## Grundidee

Ein FJ@-Programm ist ein JSON-Wert. JSON-Zahlen, boolesche Werte, `null` und gewöhnliche Strings können Daten sein. Ein String, der mit `@` beginnt, ist dagegen ein **Bezeichner**: Er verweist auf eine Variable, ein Symbol oder eine Funktion. Beispielsweise bezeichnet `"@x"` einen gebundenen Wert und `"@plus"` eine Funktion. Ein unbekannter Bezeichner löst einen Fehler aus. Ein String wie `"!X"` bezeichnet einen logischen Variablenwert; dessen Namensbereich wird unten erklärt.

JSON-Arrays dienen sowohl als Daten als auch als Ausdrücke. Ein nicht zitiertes Array mit einem `@`-Namen an erster Stelle ist eine besondere Form oder ein **Präfixaufruf**. Ein unbekannter Name, ein nicht aufrufbarer Wert oder eine falsche Argumentzahl ist ein Fehler. Alle anderen Arrays werden elementweise als Datenarrays ausgewertet; sie sind keine impliziten Folgen, die nur ihren letzten Wert liefern.

Ein nichtleeres JSON-Objekt, dessen Schlüssel alle `@`-Bezeichner sind, ist eine **Deklaration**. Seine Werte werden in Schlüsselreihenfolge ausgewertet und in der aktuellen Umgebung gebunden. Das Objekt liefert den Wert seiner letzten Deklaration. Auf oberster Ebene bleiben die Namen für spätere Aufrufe derselben Interpreter-Instanz erhalten. Ein Objekt ohne `@`-Schlüssel ist ein Datenobjekt; auch `{}` ist ein Datenobjekt. Gemischte Schlüssel sind ein Fehler. `@quote` macht ein Deklarationsobjekt stattdessen zu unveränderten Daten.

## Der erste Baustein: `@function`

`@function` erzeugt eine Funktion aus einer Parameterliste und einem Rumpf:

```json
["@function", ["@x"], ["@plus", "@x", 1]]
```

Dies ist eine Funktion mit einem Parameter. Bei einem Aufruf wird der übergebene Wert an `@x` gebunden, und der Rumpf wird in dieser Umgebung ausgewertet. Mit `41` als Argument liefert sie `42`. `@plus` ist dabei eine eingebaute Funktion für Addition.

Die allgemeine Form des ersten Kerns ist:

```json
["@function", ["@x", "@y"], ["@plus", "@x", "@y"]]
```

Die Parameterliste enthält unterschiedliche Bezeichner, die mit `@` beginnen. `@function` wertet den Rumpf beim Erzeugen der Funktion noch nicht aus. Die Funktion ist ein Wert: Sie kann gebunden, übergeben und zurückgegeben werden.

### Parameter mit Standardwerten

Statt einer Liste kann `@function` ein JSON-Objekt als Parameterspezifikation erhalten. Jeder Schlüssel ist ein Parametername, der zugehörige Wert sein Standardausdruck:

```json
["@function", {"@x": 1}, ["@plus", "@x", 1]]
```

Ohne Argument wird `@x` auf `1` gesetzt und die Funktion liefert `2`. Mit einem Argument überschreibt dieses den Standardwert; mit `41` liefert die Funktion `42`. Ein Beispiel für beide Aufrufe:

```json
["@let",
  {"@inc": ["@function", {"@x": 1}, ["@plus", "@x", 1]]},
  ["@plus", ["@inc"], ["@inc", 41]]]
```

Erwartetes Ergebnis: `44`.

Die Listenform bezeichnet weiterhin Pflichtparameter; in der Objektform haben alle Parameter einen Standardwert. Bei mehreren Objekteinträgen ist ihre Reihenfolge im JSON-Quelltext die Positionsreihenfolge der Argumente. Der Python-Lader muss diese Reihenfolge erhalten. Standardausdrücke werden einmal bei der Erzeugung der Funktion in der dortigen lexikalischen Umgebung ausgewertet, bevor ein Aufruf sie gegebenenfalls überschreibt. Eine Mischung aus Pflichtparametern und Parametern mit Standardwerten ist in diesem ersten Format noch nicht festgelegt.

### Lexikalische Closures

Eine Funktion merkt sich die Umgebung, in der sie erzeugt wurde. Dadurch können freie Bezeichner im Rumpf auch später noch auf ihre ursprünglichen Bindungen zugreifen. Dieser lexikalische Geltungsbereich macht `@function` zur Grundlage für Funktionen höherer Ordnung.

Ein Beispiel:

```json
["@let",
  {"@n": 1},
  ["@function", ["@x"], ["@plus", "@x", "@n"]]]
```

Das Ergebnis ist eine Funktion, die `@n` mit dem Wert `1` festhält. Wird sie später mit `41` aufgerufen, ist das Ergebnis `42`.

## Sprachkern: besondere Formen

Einige Formen müssen vom Auswerter selbst erkannt werden. Eine gewöhnliche Funktion bekommt bereits ausgewertete Argumente und kann daher weder eine Bindung anlegen noch die Auswertung eines Zweigs verhindern. Neben Deklarationsobjekten sind die folgenden `@`-Namen für den Sprachkern reserviert:

| Form | Auswertungsregel |
| --- | --- |
| `@quote` | Gibt den folgenden JSON-Wert unverändert zurück; Referenzen und Aufrufe darin werden nicht ausgewertet. |
| `@function` | Erzeugt eine lexikalische Closure aus Parametern und einem noch nicht ausgewerteten Rumpf. |
| `@let` | Erzeugt eine lokale Umgebung, wertet ihre Bindungen aus und wertet darin den Rumpf aus. |
| `@letrec` | Legt alle lokalen Namen vor der Auswertung der Bindungen an, damit sich Funktionen rekursiv und gegenseitig aufrufen können. |
| `@if` | Wertet die Bedingung und anschließend nur den gewählten Zweig aus. |
| `@and`, `@or` | Werten Operanden von links nach rechts mit Kurzschluss aus und liefern den jeweils entscheidenden Wert. |
| `@try` | Fängt Auswertungsfehler ab; ein optionaler Ersatz-Ausdruck wird nur im Fehlerfall ausgewertet. Ohne Ersatz entsteht ein Fehlerobjekt. Ressourcenlimits bleiben Fehler. |

Ein Deklarationsobjekt kann mehrere Namen in einem Schritt binden. Spätere Werte können frühere Namen verwenden:

```json
{"@x": 41, "@answer": ["@plus", "@x", 1]}
```

Erwartetes Ergebnis: `42`. Bei einer fortbestehenden Interpreter-Sitzung bleiben `@x` und `@answer` für spätere Auswertungen gebunden. `@let` verwendet dasselbe Prinzip der geordneten Bindungen, begrenzt die Namen aber auf seinen lokalen Rumpf. Die Werte eines Deklarationsobjekts werden nacheinander ausgewertet; wenn ein späterer Wert fehlschlägt, bleiben frühere Bindungen bestehen.

Für Bedingungen gilt: `false`, `null`, `0`, `""`, `[]` und `{}` sind falsch; andere Werte sind wahr. `@if` wertet den nicht gewählten Zweig nicht aus. `@and` und `@or` liefern einen Operandenwert statt ihn in einen booleschen Wert umzuwandeln. Ohne Operanden liefern sie `true` beziehungsweise `false`.

`@apply` ist zusätzlich ein **Laufzeit-Primitiv** für `["@apply", funktion, argumentliste]`. Es übergibt die Werte der ausgewerteten Argumentliste direkt an die Funktion, ohne diese Werte nochmals als FJ@-Quelltext zu interpretieren. Das benötigt Unterstützung im Aufrufmechanismus, ist aber keine neue Bindungs- oder Kontrollform. `@try` fängt `EvaluationError` und dessen Unterklassen ab, aber keinen `ResourceLimitError`; ohne Ersatz liefert es `{"error": "Klassenname", "message": "Text"}`. Bereits erfolgte Deklarationen werden durch `@try` nicht zurückgerollt.

Operationen wie `@plus` sowie aus anderen Funktionen zusammensetzbare Operationen wie `@map`, `@filter`, `@compose` und `@curry` sind keine reservierten Sprachformen. Version 0.3 bietet `@plus`, `@minus`, `@times`, `@divide`, `@eq`, `@le` sowie die Logikfunktionen `@unify`, `@choice`, `@conj` und `@run` als eingebaute Funktionen. Die anderen genannten Funktionen sowie `@reduce` sind noch nicht enthalten. Ein später aus Leistungsgründen nativer Rechenkern bleibt eine aufrufbare Funktion statt eines Keywords.

## Auswertung und Aufrufe

Der Python-Auswerter setzt diese Grundregeln um:

| Form | Bedeutung |
| --- | --- |
| `42`, `true`, `null`, `"text"` | Literale Werte |
| `"@x"` | Referenz auf eine Bindung oder eingebaute Funktion |
| `["@function", ["@x"], rumpf]` | Funktion mit Pflichtparameter erzeugen |
| `["@function", {"@x": 1}, rumpf]` | Funktion mit Standardwert für `@x` erzeugen |
| `["@plus", 41, 1]` | Funktion mit zwei Argumenten aufrufen |
| `["@let", {"@n": 1}, rumpf]` | Lokale Bindung für einen Rumpf |
| `{"@n": 1}` | Wert in der aktuellen Umgebung deklarieren |
| `["@quote", "@x"]` | `"@x"` als Datenwert zurückgeben, ohne die Referenz aufzulösen |

`@quote` wird benötigt, wenn ein mit `@` beginnender String, ein Array mit führendem `@`-String oder ein Deklarationsobjekt selbst als Daten behandelt werden soll. Ein Funktionsaufruf wertet seine Argumente aus und bindet sie in der Reihenfolge der Parameter. Nur die erste Arrayposition kann einen Aufruf bezeichnen; spätere `@`-Werte werden nie als Infix- oder Postfixoperatoren interpretiert. `@define`, `@do` und `@pipe` sind keine Sprachformen dieses Kerns.

### Logische Variablen: `!X`

`"!X"`, `"!Person"` und `"!X_2"` erzeugen logische Variablenwerte. Die Form lautet `![A-Z][A-Za-z0-9_]*`; andere `!`-Strings bleiben normale Strings. Wiederholte Vorkommen desselben Namens innerhalb einer Auswertung sind derselbe Wert. Ein neuer oberster Interpreter-Aufruf und jeder Aufruf einer `@function` erzeugen einen frischen Namensbereich. `@let` und `@letrec` teilen den umgebenden Namensbereich. Bereits erzeugte Werte behalten ihre Identität, wenn sie gespeichert oder übergeben werden.

```python
from fjson import Interpreter, LogicVar

fjson = Interpreter()
x, again = fjson(["!X", "!X"])
assert isinstance(x, LogicVar) and x is again
assert fjson("!X") is not x
assert fjson(["@quote", "!X"]) == "!X"
```

`@quote` verhindert auch in verschachtelten JSON-Werten die Umwandlung: `["@quote", ["parent", "alice", "!X"]]` enthält danach den wörtlichen String `"!X"`. Ein nicht zitierter Term wie `["parent", "alice", "!X"]` enthält einen echten Variablenwert. `!_` als anonyme Variable ist noch nicht implementiert.

### Logikbibliothek

`@unify` baut ein Goal für zwei Terme auf. `@choice` und `@conj` kombinieren Goals; `@run` sucht bis zur angegebenen Anzahl von Lösungen und liefert die Werte eines Abfrageterms:

```json
["@run", 2, "!X",
  ["@choice",
    ["@unify", "!X", "alice"],
    ["@unify", "!X", "bob"]]]
```

Ergebnis: `["alice", "bob"]`. Die Bibliothek vereinigt Listen und Objekte strukturell, prüft den Occurs-Check und trennt Suchzweige. Jeder Funktionsaufruf gibt seinen inneren `!`-Namen einen frischen Geltungsbereich; so lassen sich Variablen einer mehrfach verwendeten Klausel frisch erzeugen. Die genaue Semantik, weitere ausführbare Beispiele und die Grenzen der derzeit tiefenorientierten Suche stehen in [LOGIC.md](LOGIC.md).

Ein minimales Programm zum Binden und Aufrufen der Funktion soll so aussehen:

```json
["@let",
  {"@inc": ["@function", ["@x"], ["@plus", "@x", 1]]},
  ["@inc", 41]]
```

Erwartetes Ergebnis: `42`.

## Verhältnis zum bisherigen FJ@

Der [eingefrorene Sprachkern](CORE.md) orientiert sich am bisherigen FJ@-Entwurf. Funktionen können übergeben und zurückgegeben werden; Aufrufe haben genau eine kanonische Präfixform. `fj@nice` kann später Pipeline-, Infix- und Postfixschreibweisen in diese Form übersetzen. Diese Schreibweisen werden vom Basisinterpreter nicht erkannt. Weitergehende Metafunktionsregeln, externe Effekte, Tensoroperationen und die größere FJ@-Standardbibliothek gehören noch nicht zu Version 0.3. Rechte für externe Funktionen werden künftig vom Host vergeben, ohne neue Sprachformen einzuführen.

`@plus` ist der Name für die Addition, wie im bisherigen FJ@-Entwurf. `@add` ist kein eingebauter Alias.

## Python-Schnittstelle und Ausführung

Die Laufzeit verwendet ausschließlich die Python-Standardbibliothek und benötigt Python 3.10 oder neuer. Liegt das Programm bereits als Python-Liste, -Dictionary oder anderer JSON-kompatibler Wert vor, wird die Interpreter-Instanz direkt aufgerufen. Eine Instanz behält Definitionen zwischen Aufrufen:

```python
from fjson import Interpreter

fjson = Interpreter()
result = fjson([
    "@let",
    {"@inc": ["@function", ["@x"], ["@plus", "@x", 1]]},
    ["@inc", 41],
])
assert result == 42
```

Eine globale Deklaration und ihre spätere Verwendung sind zwei Aufrufe derselben Instanz:

```python
fjson({"@inc": ["@function", ["@x"], ["@plus", "@x", 1]]})
assert fjson(["@inc", 41]) == 42
```

Python prüft dabei bereits die Syntax des Python-Quelltexts. Der Interpreter prüft zusätzlich, ob der übergebene Wert eine gültige FJ@-Form ist. In Python-Programmen schreibt man `True`, `False` und `None` statt `true`, `false` und `null`.

Für JSON-Text und `.json`-Dateien gibt es weiterhin `fjson.run(source)`. Diese Methode verwendet `json.loads` und weist doppelte Objektschlüssel zurück; ein eigener `json.loads`-Aufruf ist dafür nicht nötig. `fjson.eval(value)` bleibt als gleichwertige Methode für bereits eingelesene Werte verfügbar.

Aus dem Repository-Verzeichnis lässt sich eine JSON-Datei ausführen:

```powershell
python -m fjson examples/inc.json
python -m fjson examples/parent.json
python -B -m unittest discover -s tests
```

Das Kommando gibt das Ergebnis als JSON aus. Closures, logische Variablen und Goals sind Laufzeitwerte und nicht selbst JSON-serialisierbar; eine Datei mit einem solchen Ergebnis kann daher nicht als JSON ausgegeben werden. `@run` liefert für gebundene JSON-Terme dagegen JSON-kompatible Lösungen. `@quote` erhält JSON-Quellwerte als Daten. Die Auswertung ist durch konfigurierbare Schritt- und Tiefengrenzen beschränkt.

## Nächste Schritte

1. Bibliotheksfunktionen wie `@map`, `@filter`, `@compose` und `@curry` auf dem Sprachkern aufbauen.
2. Die Logikbibliothek um verzögerte rekursive Goals und faire Suche erweitern; anonyme Variablen und Klauseldatenbanken gesondert spezifizieren.
3. Die weitergehenden FJ@-Metafunktionsregeln getrennt vom Präfixkern spezifizieren und testen; syntaktische Varianten für `fj@nice` entwerfen.
4. Effekte, Fähigkeiten und numerische Kerne getrennt vom reinen Sprachkern ergänzen.

## Lizenz

Dieses Repository steht unter der [GNU General Public License Version 3](LICENSE).

