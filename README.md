# fjson

**fjson** soll die Grundlage für eine in JSON geschriebene Implementierung von FJ@ bilden. Das erste Ziel ist ein kleines Python-Modul, das FJ@-Ausdrücke aus JSON auswertet. Die Sprache soll von einem einfachen, nachvollziehbaren Kern aus wachsen: Referenzen, Funktionen, Funktionsaufrufe und lexikalische Bindungen.

> **Stand:** Dieses Repository enthält derzeit die Sprachskizze und die Lizenz. Das Python-Modul ist noch nicht implementiert. Die Beispiele unten beschreiben das beabsichtigte Verhalten.

## Grundidee

Ein FJ@-Programm ist ein JSON-Wert. JSON-Zahlen, boolesche Werte, `null` und gewöhnliche Strings können Daten sein. Ein String, der mit `@` beginnt, ist dagegen ein **Bezeichner**: Er verweist auf eine Variable, ein Symbol oder eine Funktion. Beispielsweise bezeichnet `"@x"` einen gebundenen Wert und `"@add"` eine Funktion. Ein unbekannter Bezeichner soll einen Fehler auslösen.

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

Ein Beispiel für das angestrebte Verhalten:

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
| `@try` | Wertet einen Ausdruck mit einer definierten FJ@-Fehlerbehandlung aus; ein optionaler Ersatz-Ausdruck wird nur im Fehlerfall ausgewertet. |
| `@pipe` | Führt einen Wert durch Stufen; eine Stufe kann eine Aufrufvorlage sein, in die der aktuelle Wert eingesetzt wird. |

`@define` macht einen Wert für folgende Ausdrücke derselben Umgebung verfügbar. Zusammen mit `@do` entsteht so ein vollständiges Programm in einem JSON-Ausdruck:

```json
["@do",
  ["@define", "@inc", ["@function", {"@x": 1}, ["@add", "@x", 1]]],
  ["@inc", 41]]
```

Erwartetes Ergebnis: `42`. Bei einer fortbestehenden Interpreter-Sitzung bleibt `@inc` auch für spätere Auswertungen gebunden. `@let` begrenzt eine Bindung dagegen auf seinen lokalen Rumpf. Wie im bisherigen FJ@ werden `@let`-Bindungen in der Reihenfolge ihrer JSON-Objektschlüssel ausgewertet; spätere Bindungen können frühere verwenden.

`@apply` ist zusätzlich ein **Laufzeit-Primitiv** für `["@apply", funktion, argumentliste]`. Es übergibt die Werte der ausgewerteten Argumentliste direkt an die Funktion, ohne diese Werte nochmals als FJ@-Quelltext zu interpretieren. Das benötigt Unterstützung im Aufrufmechanismus, ist aber keine neue Bindungs- oder Kontrollform. Die genaue Fehlerstruktur von `@try` und die zulässigen Vorlagen von `@pipe` werden vor ihrer Implementierung mit Beispielen festgeschrieben.

Operationen wie `@add` sowie aus anderen Funktionen zusammensetzbare Operationen wie `@map`, `@filter`, `@compose` und `@curry` sind keine reservierten Sprachformen. Sie können als eingebaute Funktionen oder in einer FJ@-Bibliothek bereitgestellt werden. Auch ein aus Leistungsgründen nativ implementierter Rechenkern wie `@reduce` bleibt eine aufrufbare Funktion statt eines Keywords.

## Auswertung und Aufrufe

Der erste Python-Auswerter soll mindestens diese Regeln umsetzen:

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

`@quote` wird benötigt, wenn ein mit `@` beginnender String oder ein Ausdruck selbst als Daten behandelt werden soll. Ausdrücke werden sonst gemäß ihren Sprachregeln ausgewertet. Ein Funktionsaufruf wertet seine Argumente aus und bindet sie in der Reihenfolge der Parameter.

Ein minimales Programm zum Binden und Aufrufen der Funktion soll so aussehen:

```json
["@let",
  {"@inc": ["@function", ["@x"], ["@add", "@x", 1]]},
  ["@inc", 41]]
```

Erwartetes Ergebnis: `42`.

## Verhältnis zum bisherigen FJ@

Der oben beschriebene Sprachkern orientiert sich am bisherigen FJ@-Entwurf. `fjson` soll ihn schrittweise als eigenständiges Python-Modul zugänglich machen. Funktionen höherer Ordnung und Aufrufe in Präfix-, Infix- und Postfixposition gehören ebenfalls zum angestrebten FJ@-Sprachumfang. Die Dokumentation einer Form beschreibt zunächst ihr Zielverhalten; eine Implementierung ist damit noch nicht zugesichert.

Das Beispiel hier verwendet `@add`. Wo bestehende FJ@-Implementierungen andere Namen für dieselbe Operation verwenden, werden Namenskonventionen und mögliche Aliase vor der Kompatibilitätsfreigabe ausdrücklich festgelegt.

## Geplante Python-Schnittstelle

Die erste Implementierung soll mit der Python-Standardbibliothek auskommen und JSON-Text über `json.loads` einlesen. Angestrebt ist eine einfache API in dieser Art:

```python
import json
from fjson import Interpreter

source = '["@let", {"@inc": ["@function", ["@x"], ["@add", "@x", 1]]}, ["@inc", 41]]'
result = Interpreter().eval(json.loads(source))
assert result == 42
```

Funktionswerte und ihre eingefangenen Umgebungen sind Laufzeitwerte des Interpreters; sie müssen selbst keine JSON-Werte sein. Ein- und Ausgaben, die als JSON ausgegeben werden, müssen dagegen JSON-kompatibel bleiben.

## Nächste Implementierungsschritte

1. Bezeichnerauflösung, literale Werte und klare Fehler für unbekannte Namen.
2. `@function`, Aufrufe, Pflichtparameter, Standardwerte, Parameterprüfung und lexikalische Closures.
3. `@add`, `@let`, `@define`, `@do`, `@quote` und `@if` samt ausführbarer Tests für die Beispiele oben.
4. `@letrec`, `@and`, `@or`, `@try`, `@pipe` und `@apply` mit präzisen Fehler- und Auswertungsregeln.
5. Weitere FJ@-Funktionen, Aufrufpositionen und Kompatibilitätsregeln mit Tests.

## Lizenz

Dieses Repository steht unter der [GNU General Public License Version 3](LICENSE).
