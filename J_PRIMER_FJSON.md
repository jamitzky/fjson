# J für alle: Ein ausführlicher Einstieg in die J-Funktionsbibliothek von fjson

**Ein praxisnaher Primer für Menschen ohne Vorkenntnisse in J, fjson oder funktionaler Programmierung**  
**Basis:** `jamitzky/fjson`, eingefrorener Sprachkern 0.3, Modul `modules/j.fjsonl` (Stand: 3. November 2026)

> **Die wichtigste Idee:** In gewöhnlichen Programmen schreibt man oft eine Folge von Anweisungen. In J lernt man dagegen, kleine Funktionen zu größeren Funktionen zusammenzusetzen. fjson erlaubt uns, das mit normalem JSON und ohne besondere mathematische Sonderzeichen auszuprobieren.

## So benutzt du diesen Primer

Dieses Tutorial beginnt wirklich bei null. Du musst weder die Programmiersprache J noch JSON noch funktionale Programmierung kennen. Ein wenig Schulmathematik reicht völlig aus.

Jede Lektion hat eine Idee, ausführbare Beispiele, eine Erklärung des Ergebnisses und oft eine kleine Aufgabe. Probiere die Beispiele möglichst selbst aus. Verändere anschließend Zahlen, vertausche Funktionen oder baue dir eigene Beispiele.

**Kennzeichnung der Beispiele:**

- **Direkt ausführbar:** verwendet nur den vorhandenen fjson-Sprachkern und seine Standardfunktionen.
- **Mit J-Modul:** verwendet Namen wie `@fork@j` und setzt voraus, dass das J-Modul in der Sitzung geladen ist.
- **Konzept/Ausblick:** erklärt J-Ideen, die die derzeitige Bibliothek *noch nicht* implementiert. Solche Beispiele werden ausdrücklich als Pseudocode bezeichnet.

**Wichtig für die IDE:** Die J-Beispiele im Menü der aktuellen fjson-Studio-IDE laden das J-Modul beim Ausführen automatisch. Für einen selbst geschriebenen Ausdruck mit `@fork@j` muss das Modul bereits in derselben Sitzung geladen sein. Starte gegebenenfalls zuerst ein J-Beispiel aus dem Menü **Beispiele → J-Komposition**. Nach **Sitzung zurücksetzen** ist das Modul erneut zu laden. `['@import', 'j']` ist *kein* normaler fjson-Interpreteraufruf: Der Import wird von einem separaten Modul-Loader verarbeitet. Siehe Anhang A.

**Ein vollständiger Versuch:** Kopiere jeweils **einen** JSON-Block in die Code-Eingabe oder die Shell. Die kommentierenden Ergebniszeilen außerhalb des Blocks gehören nicht zum Programm. In JSON-Code gibt es keine Kommentare mit `//` oder `#`.

---

# Teil I – Die ersten Schritte

## Lektion 1: Was sind J, fjson und JSON?

### 1.1 Drei Begriffe auseinanderhalten

**JSON** ist ein einfaches Textformat für Daten. Damit kann man Zahlen, Texte, Listen und Objekte darstellen. Zum Beispiel:

```json
42
```

```json
[10, 20, 30]
```

```json
{"name": "Ada", "alter": 36}
```

**fjson** ist eine kleine Programmiersprache, deren Programme selbst JSON-Werte sind. fjson kann also nicht nur Daten speichern, sondern auch Funktionen aufrufen:

```json
["@plus", 20, 22]
```

**Ergebnis:** `42`.

**J** ist eine eigenständige, arrayorientierte Programmiersprache aus der Familie von APL. Ihre besondere Stärke ist die Kombination kleiner Operationen zu neuen Funktionen. Unser fjson-Modul **`j`** übernimmt zunächst einen kleinen, klar definierten Teil davon: die *funktionale Komposition*.

Das Modul ist **keine vollständige Implementierung der Sprache J** und derzeit auch **kein vollständiges NumPy für fjson**. Vor allem J-spezifische Ranks, automatische Array-Verarbeitung und viele J-Verben fehlen noch. Du wirst aber bereits die Denkweise verstehen, die J so spannend macht.

### 1.2 Die drei JSON-Grundformen, die wir brauchen

Eine **Zahl** ist einfach eine Zahl:

```json
3.5
```

Ein **Array** ist eine geordnete Folge von Werten:

```json
[2, 4, 6, 8]
```

Ein **Objekt** ordnet Schlüssel ihren Werten zu:

```json
{"temperatur": 21, "einheit": "C"}
```

In JSON stehen Texte in doppelten Anführungszeichen. Anders als Python benutzt JSON `true`, `false` und `null`, nicht `True`, `False` und `None`.

### 1.3 Das `@` ist das entscheidende Zeichen

In fjson bezeichnet `"@plus"` eine Funktion; `"plus"` ist dagegen gewöhnlicher Text.

```json
"Hallo"
```

liefert den String `"Hallo"`.

```json
["@plus", 3, 4]
```

liefert `7`.

fjson erkennt einen Funktionsaufruf daran, dass das Array **mit einem `@`-Funktionsnamen beginnt**. Diese Regel ist eine der wichtigsten des gesamten Tutorials.

### Kleine Übung

Berechne `17 + 25`. Ändere danach den Aufruf so, dass `17 * 25` berechnet wird. Die Multiplikation heißt `@times`.

**Lösung:**

```json
["@times", 17, 25]
```

**Ergebnis:** `425`.

---

## Lektion 2: Rechnen ist Funktionsaufruf

In fjson steht die Funktion *vor* ihren Argumenten. Das nennt man **Präfixnotation**.

| Gewöhnliche Mathematik | fjson |
|---|---|
| `2 + 3` | `["@plus", 2, 3]` |
| `7 - 4` | `["@minus", 7, 4]` |
| `6 × 5` | `["@times", 6, 5]` |
| `20 / 4` | `["@divide", 20, 4]` |
| `3²` | `["@pow", 3, 2]` |
| `√81` | `["@sqrt", 81]` |

**Direkt ausführbar:**

```json
["@divide", 20, 4]
```

**Ergebnis:** `5` (je nach Zahlendarstellung `5.0`).

### 2.1 Verschachtelte Berechnungen

Wie schreibt man `(3 + 4) × 5`?

```json
["@times", ["@plus", 3, 4], 5]
```

**Ergebnis:** `35`.

Lies den Ausdruck **von innen nach außen**:

1. `[@plus, 3, 4]` ergibt `7`.
2. `[@times, 7, 5]` ergibt `35`.

Du brauchst keine Klammerregeln zur Operatorpriorität. Die Verschachtelung der JSON-Arrays legt sie eindeutig fest.

### 2.2 Die Reihenfolge kann wichtig sein

```json
["@minus", 10, 3]
```

liefert `7`.

```json
["@minus", 3, 10]
```

liefert `-7`.

Dasselbe gilt für die Division. Wir nennen `@minus` und `@divide` **nichtkommutativ**: Das Vertauschen der Argumente verändert im Allgemeinen das Ergebnis.

### Übung

Berechne `(12 - 5)² + 1`.

**Lösung:**

```json
["@plus", ["@pow", ["@minus", 12, 5], 2], 1]
```

**Ergebnis:** `50`.

---

## Lektion 3: Listen und einzelne Werte

Eine Liste wird in JSON ebenfalls mit eckigen Klammern geschrieben:

```json
[1, 2, 3, 4]
```

Die Liste enthält vier Elemente. Mit der vorhandenen fjson-Funktion `@length` fragen wir die Anzahl ab:

```json
["@length", [10, 20, 30]]
```

**Ergebnis:** `3`.

Mit `@get` wählen wir ein Element nach Index aus. Indizes beginnen bei **0**:

```json
["@get", [10, 20, 30], 1]
```

**Ergebnis:** `20`.

### 3.1 Ein kleines, aber wichtiges Problem

Eine gewöhnliche Datenliste beginnt mit einer Zahl. Was ist aber mit einer Liste, die den **Wert einer Variablen** als erstes Element enthalten soll? Ohne Hilfsfunktion sähe eine Liste mit führendem `"@x"` aus wie ein Funktionsaufruf.

Dafür hat fjson die Standardfunktion `@list`:

```json
["@let", {"@x": 7}, ["@list", "@x", 8, 9]]
```

**Ergebnis:** `[7, 8, 9]`.

Merke dir `@list` für spätere Beispiele mit dynamisch konstruierten Arrays.

### 3.2 Mehrere Werte berechnen

```json
["@map", ["@function", ["@x"], ["@times", "@x", 2]], [1, 2, 3]]
```

**Ergebnis:** `[2, 4, 6]`.

Keine Sorge, wenn dieser Ausdruck noch kompliziert aussieht. In den nächsten Lektionen zerlegen wir ihn in verständliche Teile.

---

# Teil II – Funktionen: die Bausteine von J

## Lektion 4: Was ist eine Funktion?

Eine Funktion nimmt Eingaben entgegen und produziert eine Ausgabe. Eine Funktion kann zum Beispiel eine Zahl verdoppeln:

\[
\operatorname{double}(x)=2x
\]

In fjson definieren wir sie so:

```json
["@function", ["@x"], ["@times", 2, "@x"]]
```

Der Ausdruck besteht aus drei Teilen:

1. `"@function"` sagt: **Erzeuge eine Funktion**.
2. `["@x"]` nennt die Eingabeparameter.
3. `["@times", 2, "@x"]` ist die Berechnung beim späteren Aufruf.

Die Definition **berechnet noch nichts**. Sie erzeugt lediglich einen aufrufbaren Funktionswert.

### 4.1 Eine Funktion vorübergehend benennen

Mit `@let` können wir einen lokalen Namen zuweisen:

```json
["@let",
  {"@double": ["@function", ["@x"], ["@times", 2, "@x"]]},
  ["@double", 21]
]
```

**Ergebnis:** `42`.

Lies das wie: »Sei `double` die Funktion `2*x`; berechne anschließend `double(21)`«.

### 4.2 Eine Funktion für die Sitzung speichern

Du kannst auch ein Deklarationsobjekt allein ausführen:

```json
{
  "@double": ["@function", ["@x"], ["@times", 2, "@x"]]
}
```

Danach kannst du in **derselben Interpreter-Sitzung** ausführen:

```json
["@double", 21]
```

**Ergebnis:** `42`.

Der Unterschied: `@let` erzeugt nur lokale Bindungen; eine Deklaration auf oberster Ebene bleibt bis zum Sitzungsreset erhalten.

### Übung

Schreibe `@triple`, sodass `[@triple, 7]` den Wert `21` liefert.

**Lösung:**

```json
{"@triple": ["@function", ["@x"], ["@times", 3, "@x"]]}
```

---

## Lektion 5: Monaden und Dyaden – die Sprache von J

In J haben die Wörter **Monad** und **Dyad** eine sehr einfache Bedeutung.

- Eine **Monad** ist eine Funktion mit **einem** Eingabewert.
- Eine **Dyad** ist eine Funktion mit **zwei** Eingabewerten.

Das hat nichts mit den »Monaden« aus der Kategorientheorie oder aus Haskell zu tun. J verwendet hier das Wort für die Anzahl der Argumente einer Operation.

### 5.1 Monad: eine Eingabe

```json
["@sqrt", 81]
```

`@sqrt` ist hier monadisch, weil nur ein Argument übergeben wird.

Eigene Monad:

```json
["@let",
  {"@square": ["@function", ["@x"], ["@times", "@x", "@x"]]},
  ["@square", 6]
]
```

**Ergebnis:** `36`.

### 5.2 Dyad: zwei Eingaben

```json
["@minus", 10, 3]
```

`@minus` bekommt zwei Argumente und liefert `7`.

Eigene Dyad:

```json
["@let",
  {"@average2": ["@function", ["@a", "@b"], ["@divide", ["@plus", "@a", "@b"], 2]]},
  ["@average2", 10, 20]
]
```

**Ergebnis:** `15`.

### 5.3 Warum wir Monaden und Dyaden trennen

In der Originalsprache J kann dasselbe Zeichen je nach Verwendung eine monadische oder dyadische Bedeutung haben. Das fjson-Modul macht daraus **explizite Funktionen**. Du kannst beispielsweise eine Funktion `@negate` und eine andere Funktion `@minus` verwenden. Keine automatische Auswahl anhand der Schreibposition ist nötig.

Das macht JSON-Programme einfacher lesbar und vermeidet Mehrdeutigkeiten.

---

## Lektion 6: Funktionen sind auch Werte

Bis jetzt haben wir Funktionen nur aufgerufen. Jetzt kommt der große gedankliche Schritt:

> Eine Funktion kann genau wie eine Zahl als Wert weitergegeben werden.

Angenommen, wir möchten eine Funktion bauen, die eine andere Funktion **zweimal hintereinander** ausführt.

```json
["@let",
  {
    "@inc": ["@function", ["@x"], ["@plus", "@x", 1]],
    "@twice": ["@function", ["@f"],
      ["@function", ["@x"], ["@f", ["@f", "@x"]]]],
    "@add2": ["@twice", "@inc"]
  },
  ["@add2", 10]
]
```

**Ergebnis:** `12`.

Gehen wir Schritt für Schritt vor:

1. `@inc` addiert `1`.
2. `@twice` nimmt eine Funktion `@f` entgegen.
3. `@twice` **liefert selbst eine Funktion zurück**.
4. `@add2` ist das Ergebnis von `@twice(@inc)`.
5. `@add2(10)` ergibt `inc(inc(10)) = 12`.

Diese Art Funktion heißt **Funktion höherer Ordnung**. Das ist die Grundlage der J-Bibliothek.

### 6.1 Eine Funktion erzeugt eine Funktion

Mathematisch:

\[
\operatorname{twice}(f)(x)=f(f(x))
\]

J benutzt dieses Prinzip an vielen Stellen. Wir werden lernen, wie man aus wenigen Funktionen ganze Rechenverfahren zusammensetzt.

---

# Teil III – Die J-Bibliothek kennenlernen

## Lektion 7: Das Modul `j` und seine acht Funktionen

**Ab hier: J-Modul laden!**

Die aktuelle Datei `modules/j.fjsonl` stellt diese acht Funktionen bereit:

| Funktion | Was sie macht | Erzeugt eine neue Funktion? |
|---|---|---|
| `@identity@j` | Gibt den Wert unverändert zurück | Nein |
| `@atop@j` | Verkettet zwei Monaden | Ja |
| `@hook@j` | Verbindet eine Dyad und eine Monad | Ja |
| `@fork@j` | Kombiniert zwei Monaden mit einer Dyad | Ja |
| `@fork2@j` | Kombiniert drei Dyaden | Ja |
| `@each@j` | Wendet eine Monad auf jedes Listenelement an | Ja |
| `@insert@j` | Faltet eine nichtleere Liste mit einer Dyad | Ja |
| `@curry@j` | Bindet ein Argument einer Dyad fest | Ja |

Das ist die **tatsächlich implementierte öffentliche API**, nicht die ganze Menge möglicher J-Operationen.

### 7.1 Ein Test: Identity

```json
["@identity@j", 42]
```

**Ergebnis:** `42`.

```json
["@identity@j", [1, 2, 3]]
```

**Ergebnis:** `[1, 2, 3]`.

Identity tut absichtlich »nichts«. Warum ist das nützlich? Weil eine Funktion, die den Eingabewert weiterreicht, in der Funktionskomposition ein wichtiger Platzhalter sein kann.

### 7.2 Ein Namensraum ist wie ein Nachname

Der Name `@fork@j` bedeutet ungefähr »die Funktion `fork` aus dem Modul `j`«. Das ist kein neues Sprachzeichen. Der Modul-Loader bindet eine normale Funktion unter einem qualifizierten Namen.

Das gleiche Konzept funktioniert für `@plus@math` aus dem Modul `math`. So können verschiedene Module ähnliche Namen verwenden, ohne sich gegenseitig zu überschreiben.

---

## Lektion 8: Atop – Funktionen hintereinander ausführen

Du möchtest zuerst `1` addieren und danach das Ergebnis quadrieren:

\[
F(x)=(x+1)^2
\]

Ohne J-Komposition:

```json
["@let",
  {"@inc": ["@function", ["@x"], ["@plus", "@x", 1]]},
  ["@times", ["@inc", 3], ["@inc", 3]]
]
```

**Ergebnis:** `16`. Das funktioniert, wiederholt aber die Berechnung.

### 8.1 Mit `@atop@j`

Wir definieren `square(x) = x*x` und `inc(x) = x+1`.

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@inc": ["@function", ["@x"], ["@plus", "@x", 1]],
    "@f": ["@atop@j", "@square", "@inc"]
  },
  ["@f", 3]
]
```

**Ergebnis:** `16`.

Die Regel lautet:

\[
\operatorname{atop}(f,g)(y)=f(g(y))
\]

Bei `atop(square, inc)` wird also **zuerst `inc`**, dann `square` ausgeführt. Das ist eine typische Stelle, an der man sich zunächst vertut.

### 8.2 Reihenfolge vertauschen

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@inc": ["@function", ["@x"], ["@plus", "@x", 1]],
    "@f": ["@atop@j", "@inc", "@square"]
  },
  ["@f", 3]
]
```

**Ergebnis:** `10`, denn diesmal gilt `inc(square(3)) = 9+1`.

### Übung

Bilde eine Funktion, die zuerst quadriert und danach die Quadratwurzel berechnet. Was passiert bei einer negativen Eingabe?

**Hinweis:** Für die äußere Funktion kannst du `@sqrt` verwenden.

**Lösung:**

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@f": ["@atop@j", "@sqrt", "@square"]
  },
  ["@f", -5]
]
```

**Ergebnis:** `5` (oder `5.0`), denn `sqrt((-5)²) = 5 = |-5|`. Das ist **nicht** die ursprüngliche negative Zahl.

---

## Lektion 9: Hook – der Eingabewert geht auf zwei Wege

Ein **Hook** ist eine Kombination aus einer Dyad `f` und einer Monad `g`.

\[
\operatorname{hook}(f,g)(y)=f(y,g(y))
\]

Das heißt:

1. Gib `y` direkt als erstes Argument an `f` weiter.
2. Berechne gleichzeitig `g(y)`.
3. Gib `g(y)` als zweites Argument an `f`.

### 9.1 Beispiel: `y - y²`

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@f": ["@hook@j", "@minus", "@square"]
  },
  ["@f", 3]
]
```

**Ergebnis:** `-6`, denn `3 - 3² = 3 - 9`.

### 9.2 Beispiel: `y + √y`

```json
["@let",
  {"@f": ["@hook@j", "@plus", "@sqrt"]},
  ["@f", 16]
]
```

**Ergebnis:** `20`.

### 9.3 Ein Hook ist keine gewöhnliche Verkettung

Vergleiche:

- `atop(f,g)(y)` heißt `f(g(y))`.
- `hook(f,g)(y)` heißt `f(y,g(y))`.

Bei Atop erhält die äußere Funktion **ein** Ergebnis. Beim Hook erhält die dyadische Funktion **zwei** Argumente. Genau darin liegt der Unterschied.

### Übung

Erzeuge mit einem Hook die Funktion `y / sqrt(y)` und probiere sie mit `y=25`.

**Lösung:**

```json
["@let", {"@f": ["@hook@j", "@divide", "@sqrt"]}, ["@f", 25]]
```

**Ergebnis:** `5`.

---

## Lektion 10: Fork – das Herzstück von J

Ein **Fork** kombiniert drei Funktionen. Das ist eine der charakteristischsten Ideen von J.

Du hast zwei monadische Funktionen `f` und `h`. Beide bekommen **dieselbe Eingabe** `y`. Ihre Ergebnisse werden von der dyadischen Funktion `g` kombiniert.

\[
\operatorname{fork}(f,g,h)(y)=g(f(y),h(y))
\]

Stell dir eine Kreuzung vor: Ein Wert fließt in zwei Zweige und anschließend werden die beiden Ergebnisse wieder zusammengeführt.

```text
             y
            / \
           v   v
           f   h
            \ /
             g
             |
          Ergebnis
```

### 10.1 Ein wirklich kleines Beispiel

Wir möchten `y² + 2y` berechnen. Für `y=5` ist das `25+10=35`.

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@double": ["@function", ["@x"], ["@times", 2, "@x"]],
    "@f": ["@fork@j", "@square", "@plus", "@double"]
  },
  ["@f", 5]
]
```

**Ergebnis:** `35`.

### 10.2 Alle Zwischenschritte

1. `square(5)` ergibt `25`.
2. `double(5)` ergibt `10`.
3. `plus(25, 10)` ergibt `35`.

Der Fork macht genau das – ohne dass wir eine neue Schleife, Variable oder Kontrollstruktur schreiben müssen.

### 10.3 Ein Fork kann eine einfache Statistik berechnen

Der **Mittelwert** einer Liste ist:

\[
\operatorname{mean}(xs)=\frac{\operatorname{sum}(xs)}{\operatorname{length}(xs)}
\]

Die derzeitige fjson-Bibliothek hat `@reduce` und `@length`, aber wir können einen Summen-Helper bauen:

```json
["@let",
  {
    "@sum": ["@function", ["@xs"], ["@reduce", "@plus", "@xs", 0]],
    "@mean": ["@fork@j", "@sum", "@divide", "@length"]
  },
  ["@mean", [2, 4, 6, 8]]
]
```

**Ergebnis:** `5`.

Hier liefert der linke Fork-Zweig die Summe `20`, der rechte die Länge `4`. In der Mitte steht die Division: `20/4=5`.

**Achtung:** Eine leere Liste verursacht hier eine Division durch null. Das ist ein guter Anlass, später über Randfälle zu sprechen.

### 10.4 Reihenfolge bei einem Fork

Die Position der Zweige ist insbesondere bei `@minus` und `@divide` wichtig.

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@double": ["@function", ["@x"], ["@times", 2, "@x"]],
    "@f": ["@fork@j", "@square", "@minus", "@double"]
  },
  ["@f", 5]
]
```

**Ergebnis:** `15` (`25-10`).

### Übung

Konstruiere `F(y) = y² - 3y`. Verwende `@fork@j` sowie die selbst definierten Funktionen `square` und `triple`.

**Lösung:**

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@triple": ["@function", ["@x"], ["@times", 3, "@x"]],
    "@f": ["@fork@j", "@square", "@minus", "@triple"]
  },
  ["@f", 5]
]
```

**Ergebnis:** `10`.

---

## Lektion 11: Dyadischer Fork – zwei Eingaben, zwei Rechenwege

Bis jetzt bekamen unsere zusammengesetzten Funktionen nur **eine** Eingabe. Der aktuelle J-Modul-Export `@fork2@j` nimmt dagegen drei **dyadische** Funktionen entgegen und erzeugt selbst eine Dyad.

\[
\operatorname{fork2}(f,g,h)(x,y)=g(f(x,y),h(x,y))
\]

### 11.1 Beispiel mit drei vorhandenen Dyaden

```json
["@let",
  {"@f": ["@fork2@j", "@plus", "@minus", "@times"]},
  ["@f", 5, 3]
]
```

**Ergebnis:** `-7`.

Erklärung:

1. `plus(5,3) = 8`.
2. `times(5,3) = 15`.
3. `minus(8,15) = -7`.

### 11.2 Warum ein eigener Name?

Der fjson-Kern versucht nicht, anhand der Schreibposition zu erraten, ob ein Fork monadisch oder dyadisch verwendet wird. Deshalb gibt es **zwei ausdrücklich benannte Kombinatoren**:

- `@fork@j` für die monadische Variante.
- `@fork2@j` für die dyadische Variante.

Das ist leichter zu lernen und leichter zu testen als ein überladenes Sonderzeichen.

### Übung

Was berechnet `fork2(times, plus, minus)(8,3)`?

**Lösung:** `(8*3) + (8-3) = 24+5 = 29`.

---

# Teil IV – Mit Listen arbeiten

## Lektion 12: Each – eine Funktion auf jedes Element anwenden

Angenommen, du hast die Liste `[1,2,3,4]` und willst alle Zahlen quadrieren.

Von Hand:

\[
[1^2,2^2,3^2,4^2]=[1,4,9,16]
\]

In fjson gibt es `@map`. Das J-Modul liefert darauf aufbauend `@each@j`.

### 12.1 Einfache Anwendung

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@squares": ["@each@j", "@square"]
  },
  ["@squares", [1, 2, 3, 4]]
]
```

**Ergebnis:** `[1, 4, 9, 16]`.

`@each@j` nimmt eine monadische Funktion und **erzeugt eine neue Funktion**, die eine Liste verarbeitet.

### 12.2 Die Funktion wiederverwenden

```json
{
  "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
  "@squares": ["@each@j", "@square"]
}
```

Danach in derselben Sitzung:

```json
["@squares", [2, 3, 5]]
```

**Ergebnis:** `[4, 9, 25]`.

### 12.3 Beispiel: Quadratwurzeln

```json
["@let", {"@roots": ["@each@j", "@sqrt"]}, ["@roots", [1, 4, 9, 16]]]
```

**Ergebnis:** `[1, 2, 3, 4]` (eventuell als Fließkommazahlen).

### 12.4 Unterschied zwischen `@each@j` und automatischer NumPy-Vektorisierung

NumPy kann viele elementweise Operationen direkt auf Arrays anwenden. Im aktuellen fjson-Kern passiert das bei gewöhnlichen Zahlenfunktionen **nicht automatisch**. Deshalb ist `@each@j` ausdrücklich eine Funktion für Listenverarbeitung.

Bei verschachtelten Arrays reicht ein einfaches `each` nur über die **oberste Ebene**. Für echte J-Rank-Semantik braucht es weitere Bibliotheksfunktionen.

### Übung

Wende `sqrt` auf `[25,36,49]` an.

**Lösung:**

```json
["@let", {"@f": ["@each@j", "@sqrt"]}, ["@f", [25, 36, 49]]]
```

**Ergebnis:** `[5, 6, 7]`.

---

## Lektion 13: Insert – eine ganze Liste zusammenfalten

Manchmal wollen wir nicht jedes Element einzeln verwandeln, sondern aus einer Liste **einen einzigen Wert** machen.

Zum Beispiel die Summe:

\[
1+2+3+4=10
\]

Das nennt man **Reduktion** oder **Faltung** (*fold*).

`@insert@j` nimmt eine Dyad `f` und erzeugt eine Funktion für Listen. Sie beginnt mit dem ersten Listenelement und verarbeitet alle weiteren von **links nach rechts**.

### 13.1 Addition

```json
["@let",
  {"@sum": ["@insert@j", "@plus"]},
  ["@sum", [1, 2, 3, 4]]
]
```

**Ergebnis:** `10`.

### 13.2 Multiplikation

```json
["@let",
  {"@product": ["@insert@j", "@times"]},
  ["@product", [2, 3, 4]]
]
```

**Ergebnis:** `24`.

### 13.3 Die Reihenfolge ist nicht egal

```json
["@let", {"@f": ["@insert@j", "@minus"]}, ["@f", [10, 3, 2]]]
```

**Ergebnis:** `5`.

Die Schritte sind:

```text
Start: 10
10 - 3 = 7
 7 - 2 = 5
```

Das heißt **linksassoziative Reduktion**:

\[
((10-3)-2)=5
\]

**Wichtig:** Das ist eine bewusste Eigenschaft **unserer jetzigen fjson-J-Bibliothek**. Sie darf nicht stillschweigend mit jeder Faltungsregel der Originalsprache J gleichgesetzt werden. Der Name übernimmt die Idee; das Modul definiert die konkrete Reihenfolge.

### 13.4 Was passiert bei einer leeren Liste?

Dieser Aufruf ergibt **einen Fehler**:

```json
["@let", {"@f": ["@insert@j", "@plus"]}, ["@f", []]]
```

Der Grund: `@insert@j` benutzt das erste Element als Startwert. Eine leere Liste hat kein erstes Element. Es wird **keine** automatische neutrale Zahl (`0` für Addition, `1` für Multiplikation) eingesetzt.

Wenn du ein festes neutrales Element verwenden möchtest, kannst du stattdessen das vorhandene `@reduce` direkt aufrufen:

```json
["@reduce", "@plus", [], 0]
```

**Ergebnis:** `0`.

### 13.5 Mittelwert aus Insert und Length

```json
["@let",
  {
    "@sum": ["@insert@j", "@plus"],
    "@mean": ["@fork@j", "@sum", "@divide", "@length"]
  },
  ["@mean", [4, 6, 8]]
]
```

**Ergebnis:** `6`.

Das kombiniert bereits **zwei** J-Ideen: Insert bildet eine Summe, Fork baut daraus einen Mittelwert.

---

## Lektion 14: Each und Insert zusammen

Wir möchten für eine Liste die **Summe der Quadrate** berechnen:

\[
1^2+2^2+3^2+4^2=30
\]

Dazu brauchen wir:

1. `square`: eine Zahl quadrieren.
2. `each(square)`: eine Liste quadrieren.
3. `insert(plus)`: die Ergebnisse addieren.
4. `atop(sum, squares)`: beide Schritte verbinden.

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@squares": ["@each@j", "@square"],
    "@sum": ["@insert@j", "@plus"],
    "@sum_of_squares": ["@atop@j", "@sum", "@squares"]
  },
  ["@sum_of_squares", [1, 2, 3, 4]]
]
```

**Ergebnis:** `30`.

### 14.1 Warum ist das interessant?

Die Funktion `@sum_of_squares` enthält keine explizite Schleife. Wir beschreiben **was** aus den kleinen Funktionen zusammengesetzt werden soll, statt jeden Schritt mit einer Schleifenvariable zu programmieren.

Diese Denkweise heißt *funktionale Komposition*. Sie ist ein Kernmotiv von J und von Array-Sprachen im Allgemeinen.

### Übung

Baue eine Funktion, die die Summe der Quadratwurzeln von `[1,4,9]` berechnet.

**Lösung:**

```json
["@let",
  {
    "@roots": ["@each@j", "@sqrt"],
    "@sum": ["@insert@j", "@plus"],
    "@f": ["@atop@j", "@sum", "@roots"]
  },
  ["@f", [1, 4, 9]]
]
```

**Ergebnis:** `6`.

---

# Teil V – Funktionen spezialisieren und kombinieren

## Lektion 15: Curry – aus zwei Argumenten wird eines

Stell dir eine Funktion `minus(a,b)=a-b` vor. Manchmal möchten wir immer denselben Wert abziehen.

Beispielsweise:

\[
f(x)=x-10
\]

Anstatt eine völlig neue Funktion zu schreiben, können wir **ein Argument festhalten**. Das nennt man *Currying* bzw. hier präziser **partielle Anwendung**.

### 15.1 Rechtes Argument festhalten

```json
["@let",
  {"@subtract10": ["@curry@j", "@minus", "right", 10]},
  ["@subtract10", 17]
]
```

**Ergebnis:** `7`, denn `17-10=7`.

### 15.2 Linkes Argument festhalten

```json
["@let",
  {"@ten_minus_x": ["@curry@j", "@minus", "left", 10]},
  ["@ten_minus_x", 17]
]
```

**Ergebnis:** `-7`, denn `10-17=-7`.

### 15.3 Addition

Bei der Addition spielt es keine Rolle, ob du links oder rechts bindest:

```json
["@let", {"@add100": ["@curry@j", "@plus", "right", 100]}, ["@add100", 23]]
```

**Ergebnis:** `123`.

### 15.4 Wichtiger Unterschied

Die Strings `"left"` und `"right"` sind **gewöhnliche Texte**, keine `@`-Namen. Nur diese beiden Werte sind gültig. Eine ungültige Seite wie `"middle"` führt zu einem Fehler.

Die gebundene Zahl wird beim Erzeugen der neuen Funktion ausgewertet und von der Closure festgehalten.

### Übung

Konstruiere `F(x)=100/x` und berechne `F(4)`.

**Lösung:**

```json
["@let", {"@f": ["@curry@j", "@divide", "left", 100]}, ["@f", 4]]
```

**Ergebnis:** `25`.

---

## Lektion 16: J-Komposition ohne Variablennamen – Tacit Programming

Bis jetzt haben wir immer wieder einen Funktionsparameter `@x` geschrieben:

```json
["@function", ["@x"], ["@plus", "@x", 10]]
```

Mit `@curry@j` geht es aber ohne eine ausdrücklich benannte Eingabe:

```json
["@curry@j", "@plus", "right", 10]
```

Beide Ausdrücke erzeugen eine Funktion `x → x+10`.

Diese Art, Funktionen **ohne explizite Namen für die späteren Argumente** zu beschreiben, heißt *Tacit Programming*, auch *Point-free Programming* genannt.

### 16.1 Warum »point-free«?

»Point« bezeichnet hier ein Argument wie `x`, nicht einen Punkt im geometrischen Raum. Wir sprechen also nicht über Dezimalpunkte oder zweidimensionale Punkte.

In der funktionalen Beschreibung:

\[
f(x)=x+10
\]

steht `x` ausdrücklich da. In der tacit Beschreibung:

\[
f=\operatorname{curryRight}(+,10)
\]

wird die Funktion als **Kombination anderer Funktionen** beschrieben.

### 16.2 Ein vollständiges tacit Beispiel

```json
["@let",
  {
    "@inc": ["@curry@j", "@plus", "right", 1],
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@f": ["@atop@j", "@square", "@inc"]
  },
  ["@f", 4]
]
```

**Ergebnis:** `25`.

Wir definieren `@f` nicht mehr durch »Nimm x, addiere 1, quadriere«, sondern durch »**verkette** Quadrat und Inkrement«.

### 16.3 Tacit Programming ist ein Werkzeug, kein Selbstzweck

Sehr kurze Ausdrücke können elegant sein; extrem verschachtelte Kombinationen können dagegen schwer lesbar werden. In diesem Tutorial geben wir deshalb Zwischenfunktionen wie `@inc`, `@sum` oder `@squares` bewusst sprechende Namen.

Ein gutes tacit Programm ist nicht unbedingt das kürzeste, sondern eines, dessen Struktur verständlich ist.

---

## Lektion 17: Ein größeres Beispiel – Varianz

Jetzt kombinieren wir mehrere Lektionen. Die Varianz beschreibt, wie stark Werte um ihren Mittelwert streuen.

Für die **Populationsvarianz** einer nichtleeren Liste `xs` gilt:

\[
\mu=\frac{1}{n}\sum_{i=1}^{n}x_i,\qquad
\operatorname{var}(xs)=\frac{1}{n}\sum_{i=1}^{n}(x_i-\mu)^2
\]

Für die Liste `[2,4,6]` ist der Mittelwert `4`. Die Abweichungen sind `[-2,0,2]`, ihre Quadrate `[4,0,4]`; die Varianz ist `8/3`.

### 17.1 Eine gut lesbare fjson-Lösung

```json
["@let",
  {
    "@sum": ["@function", ["@xs"], ["@reduce", "@plus", "@xs", 0]],
    "@mean": ["@fork@j", "@sum", "@divide", "@length"],
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@variance": ["@function", ["@xs"],
      ["@let",
        {
          "@mu": ["@mean", "@xs"],
          "@deviation": ["@curry@j", "@minus", "right", "@mu"],
          "@squared_deviation": ["@atop@j", "@square", "@deviation"],
          "@squared_deviations": ["@each@j", "@squared_deviation"]
        },
        ["@mean", ["@squared_deviations", "@xs"]]
      ]
    ]
  },
  ["@variance", [2, 4, 6]]
]
```

**Ergebnis:** ungefähr `2.6666666667`.

### 17.2 Was haben wir hier gemacht?

1. `@sum` addiert Listenelemente.
2. `@mean` kombiniert Summe, Division und Länge mit einem Fork.
3. `@variance` berechnet zunächst den Mittelwert `@mu`.
4. `@deviation` erzeugt eine neue Funktion `x → x-μ`.
5. `@squared_deviation` verkettet Quadrat und Abweichung.
6. `@squared_deviations` wendet diese Funktion elementweise an.
7. `@mean` berechnet den Mittelwert der quadrierten Abweichungen.

Du siehst: **Wir bauen ein kleines numerisches Programm aus wiederverwendbaren Teilen.** Genau diese Wiederverwendung ist eine Stärke der J-Denkweise.

**Hinweis:** Für die *Stichprobenvarianz* würde man durch `n-1` statt durch `n` teilen. Das Beispiel berechnet bewusst die Populationsvarianz.

### Übung

Ändere die Daten zu `[1,1,1]`. Welche Varianz erwartest du? **Lösung:** `0`.

---

## Lektion 18: Funktionskombinationen im Alltag – Preise und Rabatte

Nicht alle Beispiele müssen abstrakte Mathematik sein. Nehmen wir eine Liste von Nettopreisen. Wir wollen zunächst `10 %` Rabatt gewähren und dann `19 %` Umsatzsteuer aufschlagen.

Mathematisch:

\[
\operatorname{final}(p)=1.19\cdot(0.9p)
\]

```json
["@let",
  {
    "@discount": ["@curry@j", "@times", "left", 0.9],
    "@tax": ["@curry@j", "@times", "left", 1.19],
    "@final_price": ["@atop@j", "@tax", "@discount"],
    "@final_prices": ["@each@j", "@final_price"]
  },
  ["@final_prices", [10, 20, 30]]
]
```

**Ergebnis:** ungefähr `[10.71, 21.42, 32.13]` (Binär-Fließkommaarithmetik kann minimale Abweichungen zeigen).

Beachte die Reihenfolge: `atop(tax,discount)` bedeutet *erst Rabatt, dann Steuer*. Im Beispiel sind beide Schritte reine Multiplikationen, deshalb wäre das numerische Ergebnis bei vertauschter Reihenfolge gleich. Bei anderen Operationen kann die Reihenfolge entscheidend sein.

### Übung

Entferne den Rabatt und wende nur die Steuer auf die Liste an. **Hinweis:** Verwende `@each@j` mit `@tax`.

---

# Teil VI – Tiefer verstehen, sicher programmieren

## Lektion 19: Was bedeutet »Conjunction« und »Adverb«?

In der Originalsprache J gibt es eine ungewöhnliche Wortwahl, die an Grammatik erinnert:

- **Noun (Substantiv)**: ein Datenwert, etwa `5` oder eine Liste.
- **Verb**: eine Funktion, beispielsweise Addition oder Quadratwurzel.
- **Adverb**: nimmt typischerweise ein Verb und leitet daraus ein neues Verb ab.
- **Conjunction**: kombiniert zwei Operanden, um ein neues Verb abzuleiten.

Für Anfänger klingt das komplizierter als es ist. In unserer fjson-Bibliothek bedeutet es einfach **Funktionen, die Funktionen erzeugen**.

### 19.1 `@each@j` ist adverbartig

```json
["@each@j", "@sqrt"]
```

Der Ausdruck nimmt **eine Funktion** und liefert eine neue Funktion zurück: »Wende `sqrt` auf alle Elemente einer Liste an«.

### 19.2 `@atop@j` ist conjunction-artig

```json
["@atop@j", "@sqrt", "@identity@j"]
```

Der Ausdruck kombiniert **zwei Funktionen** und liefert eine neue Funktion zurück: »Wende erst identity und dann sqrt an«.

### 19.3 Wir benötigen keine eigenen Sprachtypen

`@each@j`, `@atop@j`, `@hook@j` und `@fork@j` sind im fjson-Modul gewöhnliche Closures. Sie brauchen keinen speziellen Interpretertyp »Adverb« oder »Conjunction« und keine Infix- oder Postfixsyntax.

Das ist eine der zentralen Vereinfachungen gegenüber dem früheren FJ@-Entwurf.

---

## Lektion 20: Selbst kombinieren – geschachtelte Forks

Ein Fork kann Funktionen als Zweige enthalten, die **selbst durch andere Kombinatoren entstanden sind**.

Angenommen, du möchtest berechnen:

\[
F(y)=(y+1)^2+(y+2)^2
\]

Ein gut lesbarer Aufbau:

```json
["@let",
  {
    "@add1": ["@curry@j", "@plus", "right", 1],
    "@add2": ["@curry@j", "@plus", "right", 2],
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@square_after_add1": ["@atop@j", "@square", "@add1"],
    "@square_after_add2": ["@atop@j", "@square", "@add2"],
    "@f": ["@fork@j", "@square_after_add1", "@plus", "@square_after_add2"]
  },
  ["@f", 3]
]
```

**Ergebnis:** `41`, denn `4²+5²=16+25=41`.

Wichtig: Der Fork weiß nicht, *wie* die Zweigfunktionen programmiert wurden. Er ruft sie einfach auf. Darum können wir beliebig komplexe Funktionen als Bausteine verwenden.

### Übung

Welche Änderung ergibt `(y+1)² - (y+2)²`? Ersetze im Fork `@plus` durch `@minus`. Für `y=3` ist die Antwort `-9`.

---

## Lektion 21: Fehler verstehen – nicht nur Erfolgsergebnisse

Programmiersprachen werden verständlicher, wenn man ihre Grenzen kennt.

### 21.1 Ein unbekannter Funktionsname

```json
["@unbekannt", 5]
```

führt zu einem Fehler: Der Name ist nicht gebunden.

### 21.2 Falsche Zahl von Argumenten

```json
["@plus", 1]
```

führt zu einem Fehler, weil `@plus` zwei Argumente benötigt.

### 21.3 Eine Funktion mit der falschen Valenz im Fork

```json
["@let",
  {"@f": ["@fork@j", "@plus", "@plus", "@sqrt"]},
  ["@f", 9]
]
```

führt beim Aufruf zu einem Argumentzahlfehler, denn der linke Zweig `@plus` sollte monadisch aufgerufen werden, ist aber dyadisch.

### 21.4 Leere Liste bei Insert

```json
["@let", {"@f": ["@insert@j", "@plus"]}, ["@f", []]]
```

führt zu einem Fehler, weil es keinen Startwert gibt.

### 21.5 Listen sind nicht automatisch numerische Vektoren

```json
["@plus", [1, 2, 3], 10]
```

ist **nicht** die aktuell vorgesehene elementweise J-Arithmetik. Nutze stattdessen etwa `@each@j` mit einer Funktion `x → x+10`:

```json
["@let",
  {
    "@add10": ["@curry@j", "@plus", "right", 10],
    "@f": ["@each@j", "@add10"]
  },
  ["@f", [1, 2, 3]]
]
```

**Ergebnis:** `[11, 12, 13]`.

### 21.6 `@quote` und `@apply`

Manchmal soll ein Name **als Text** vorliegen, nicht als Referenz. Dann hilft `@quote`:

```json
["@quote", "@plus"]
```

**Ergebnis:** der String `"@plus"`.

`@apply` ruft dagegen eine Funktion mit einer **bereits ausgewerteten Argumentliste** auf:

```json
["@apply", "@plus", [20, 22]]
```

**Ergebnis:** `42`.

Der Unterschied ist gerade beim Schreiben von Funktionskombinatoren entscheidend: `@apply` wertet die Werte seiner fertigen Argumentliste nicht erneut als Quelltext aus.

---

# Teil VII – Projekte für den eigenen Einstieg

## Lektion 22: Projekt 1 – Quadratsumme und euklidische Länge

Die euklidische Länge eines Vektors `[x₁,...,xₙ]` ist:

\[
\sqrt{x_1^2+\cdots+x_n^2}
\]

Für `[3,4]` ist das `5`.

```json
["@let",
  {
    "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
    "@squares": ["@each@j", "@square"],
    "@sum": ["@insert@j", "@plus"],
    "@sum_squares": ["@atop@j", "@sum", "@squares"],
    "@norm": ["@atop@j", "@sqrt", "@sum_squares"]
  },
  ["@norm", [3, 4]]
]
```

**Ergebnis:** `5`.

**Selbstversuch:** Setze die Eingabe auf `[1,2,2]`. Erwartete Länge: `3`.

---

## Lektion 23: Projekt 2 – Celsius in Fahrenheit

Die bekannte Umrechnung lautet:

\[
F=1.8 C+32
\]

Bilde eine Funktion für die Umrechnung und wende sie auf mehrere Celsius-Werte an.

```json
["@let",
  {
    "@scale": ["@curry@j", "@times", "right", 1.8],
    "@offset": ["@curry@j", "@plus", "right", 32],
    "@c_to_f": ["@atop@j", "@offset", "@scale"],
    "@convert_list": ["@each@j", "@c_to_f"]
  },
  ["@convert_list", [0, 10, 20, 100]]
]
```

**Ergebnis:** `[32, 50, 68, 212]` (mit möglicher Fließkommadarstellung).

**Selbstversuch:** Wie definierst du die Umkehrung `C=(F-32)/1.8` durch zwei `@curry@j`-Funktionen und `@atop@j`?

---

## Lektion 24: Projekt 3 – Ein kleiner Datenbericht

Wir haben Messwerte `[5, 7, 9, 11]` und möchten drei Informationen berechnen: Anzahl, Summe und Mittelwert.

Das J-Modul hat noch keinen speziellen Report-Kombinator. Wir verwenden darum zunächst ein gewöhnliches fjson-Objekt:

```json
["@let",
  {
    "@xs": [5, 7, 9, 11],
    "@sum": ["@insert@j", "@plus"],
    "@mean": ["@fork@j", "@sum", "@divide", "@length"]
  },
  {
    "anzahl": ["@length", "@xs"],
    "summe": ["@sum", "@xs"],
    "mittelwert": ["@mean", "@xs"]
  }
]
```

**Ergebnis:**

```json
{"anzahl": 4, "summe": 32, "mittelwert": 8}
```

Ein normaler JSON-Datenbericht kann also das Ergebnis einer funktionalen J-Berechnung sein. Das passt gut zu Anwendungen, die Programme und Ergebnisse als JSON austauschen.

---

## Lektion 25: Projekt 4 – Ein kleines eigenes Funktionsmodul

Du kannst eigene Funktionen auf oberster Ebene deklarieren und in derselben Sitzung wiederverwenden.

```json
{
  "@square": ["@function", ["@x"], ["@times", "@x", "@x"]],
  "@double": ["@function", ["@x"], ["@times", 2, "@x"]],
  "@polynomial": ["@fork@j", "@square", "@plus", "@double"]
}
```

Danach:

```json
["@polynomial", 10]
```

**Ergebnis:** `120`.

Das ist bereits eine kleine selbst gebaute Funktionsbibliothek. In einer Host-Anwendung kannst du Definitionen außerdem als JSONL-Modul unter einem qualifizierten Namensraum bereitstellen.

### 25.1 Ein mögliches Modulformat

Die folgende Zeile ist **eine Direktive für den Modul-Loader**, nicht ein gewöhnlicher IDE-Interpreteraufruf:

```json
["@namespace", "examples", {"inc": ["@function", ["@x"], ["@plus", "@x", 1]]}]
```

Wird sie vom Loader verarbeitet, entsteht die Funktion `@inc@examples`. Der eigentliche Sprachkern 0.3 bleibt dabei unverändert.

---

# Teil VIII – Was aus der Originalsprache J noch hinzukommen kann

## Lektion 26: Warum J auch eine Array-Sprache ist

Die ursprüngliche Sprache J ist nicht nur eine Sprache zur Funktionskomposition. Sie ist vor allem für **ganze Arrays** gedacht.

Ein Array kann etwa sein:

- eine einzelne Zahl (Skalar),
- eine Liste von Zahlen (Vektor),
- eine Tabelle von Zahlen (Matrix),
- oder ein höherdimensionaler Zahlentensor.

In Array-Sprachen lassen sich Operationen häufig gleich auf ganze Datenstrukturen anwenden.

Beispielsweise wünschen wir uns perspektivisch:

\[
[1,2,3]+10=[11,12,13]
\]

In unserer aktuellen fjson-J-Bibliothek wird das jedoch explizit durch `@each@j` ausgedrückt. So bleibt der Aufrufmechanismus des Kernes eindeutig.

## Lektion 27: Rank, Cells und Frames – ein Vorgeschmack

**Dieser Abschnitt beschreibt das J-Konzept, keine bereits implementierte `@rank@j`-Funktion.**

*Rank* beschreibt grob, auf welcher Dimensionsebene eine Operation arbeiten soll. Bei einer Matrix kann das beispielsweise sein:

```json
[[1, 2, 3], [4, 5, 6]]
```

Wir können jede **Zeile** als eine Cell auffassen:

```text
Cell 1: [1, 2, 3]
Cell 2: [4, 5, 6]
```

Eine künftige Funktion könnte dann eine Zeilensumme direkt auf alle Zeilen anwenden und `[6,15]` liefern.

Mit dem heutigen fjson lässt sich das für diesen Fall bereits mit verschachtelten Listenfunktionen bauen:

```json
["@let",
  {
    "@sum": ["@insert@j", "@plus"],
    "@row_sums": ["@each@j", "@sum"]
  },
  ["@row_sums", [[1, 2, 3], [4, 5, 6]]]
]
```

**Ergebnis:** `[6, 15]`.

Das illustriert die Idee, ersetzt aber noch nicht das vollständige Rank-Modell von J, bei dem Form, Zellen, Frames und die Behandlung unterschiedlicher Shapes systematisch festgelegt sind.

## Lektion 28: Lange Trains und symbolische Optimierung

Die J-Sprache kann ganze Folgen von Verben zu neuen Funktionen zusammensetzen (*trains*). Unser Modul bietet derzeit ausdrücklich `@hook@j`, `@fork@j`, `@fork2@j` und `@atop@j`, aber **keinen allgemeinen `@train@j`-Export**.

Du kannst längere Kompositionen heute bereits ausdrücklich verschachteln, wie in Lektion 20. Ein künftiger Train-Builder könnte diese Verschachtelung vereinfachen.

Auch **symbolische J-IR**, **automatische Differentiation**, **LLVM-Optimierung** und **GPU-Backends** sind spannende mögliche Erweiterungen, aber *keine Funktionen, die das aktuelle `j.fjsonl` bereitstellt*.

Diese ehrliche Trennung ist wichtig: Die Beispiele dieses Primers sollen das vorhandene Modul erklären und nicht nur eine mögliche Zukunft beschreiben.

---

# Teil IX – Spickzettel, Fehlerdiagnose und Wiederholung

## Lektion 29: Alle acht J-Operationen auf einen Blick

| Name | Eingaben | Berechnung |
|---|---|---|
| `@identity@j` | `y` | `y` |
| `@atop@j` | `f, g` | erzeugt `y → f(g(y))` |
| `@hook@j` | `f, g` | erzeugt `y → f(y,g(y))` |
| `@fork@j` | `f, g, h` | erzeugt `y → g(f(y),h(y))` |
| `@fork2@j` | `f, g, h` | erzeugt `(x,y) → g(f(x,y),h(x,y))` |
| `@each@j` | `f` | erzeugt `xs → map(f,xs)` |
| `@insert@j` | `f` | erzeugt linksfaltende Funktion für nichtleere `xs` |
| `@curry@j` | `f, side, value` | bindet `left` oder `right` an eine Dyad |

**Wichtig:** Außer `@identity@j` geben diese Funktionen *eine Funktion* zurück, wenn man sie mit ihren Kombinator-Argumenten aufruft. Erst diese **abgeleitete** Funktion wird anschließend auf den eigentlichen Datenwert angewandt.

### Ein Standardmuster, das immer funktioniert

```json
["@let",
  {"@f": ["@curry@j", "@plus", "right", 3]},
  ["@f", 10]
]
```

**Ergebnis:** `13`.

Die Struktur lautet:

```text
["@let", {"@f": [KOMBINATOR, ...FUNKTIONEN...]}, ["@f", DATEN]]
```

Du kannst so den Funktionsaufbau klar von der eigentlichen Berechnung trennen.

---

## Lektion 30: Häufige Fragen von Einsteigern

### »Wieso stehen überall eckige Klammern?«

Weil das Programm im JSON-Format geschrieben wird. Ein Array mit einem `@`-Namen am Anfang wird als Aufruf interpretiert; andere Arrays dienen als Datenarrays.

### »Ist `@fork@j` ein besonderer Befehl des Interpreters?«

Nein. Das ist eine normale Funktion, die das nachladbare Modul bereitstellt. Im eingefrorenen fjson-Kern 0.3 ist kein Fork als Sprachform eingebaut.

### »Weshalb heißt das Monad?«

Weil die J-Terminologie eine Funktion mit einem Argument so nennt. Dafür sind keine Kenntnisse der mathematischen Kategorientheorie nötig.

### »Wieso gibt `@atop@j` nicht gleich eine Zahl zurück?«

Weil `@atop@j` zunächst zwei **Funktionen** entgegennimmt und daraus eine **neue Funktion** konstruiert. Die neue Funktion braucht danach noch einen Datenwert.

### »Wieso kann ich mit `@plus` nicht direkt eine Zahl zu einer Liste addieren?«

Der aktuelle Kern hat keine automatische J-Array-Liftung. Mit `@each@j` und `@curry@j` geht das ausdrücklich und nachvollziehbar.

### »Warum schreibt J manchmal Sonderzeichen, fjson aber lange Namen?«

Die Originalsprache J hat eine andere Quellsyntax. Unser Modul übernimmt einzelne funktionale Konzepte und bietet sie als sprechende Präfixnamen an. So bleibt der unveränderte JSON-Sprachkern einfach.

### »Muss ich alles tacit schreiben?«

Nein. Ein einfacher `@function`-Ausdruck kann übersichtlicher sein. Tacit-Komposition ist besonders sinnvoll, wenn bereits gut benannte Funktionen existieren.

### »Kann ich meine Funktionen speichern?«

Ja. Deklarationen können während einer Sitzung bestehen bleiben. Für wiederverwendbare Bibliotheken gibt es den separaten Modul-Loader und JSONL-Quelltexte.

### »Funktioniert das im Browser?«

Die aktuelle fjson-IDE enthält den Interpreter und die J-Bibliothek offline. Ihre eingebauten J-Beispiele sorgen für das Laden des Moduls. Für beliebige, selbst geschriebene Aufrufe muss der Modultext zuvor in die Sitzung geladen worden sein.

---

## Lektion 31: Selbsttest – zehn Aufgaben

Versuche zunächst ohne die Lösungen zu arbeiten.

1. Was ergibt `["@plus", 12, 30]`?
2. Welche Funktion mit einem Argument berechnet `x³`?
3. Was ist der Unterschied zwischen einer Monad und einer Dyad?
4. Was ergibt `atop(square, inc)(3)`?
5. Was ergibt `hook(minus, square)(4)`?
6. Was ergibt `fork(square, plus, double)(3)`?
7. Was ergibt `fork2(plus, minus, times)(4,2)`?
8. Was macht `each(sqrt)` mit `[1,4,9]`?
9. Was ergibt `insert(minus)([20,5,2])`?
10. Wodurch unterscheiden sich `curry(minus,left,10)` und `curry(minus,right,10)`?

**Lösungen:**

1. `42`.
2. Beispielsweise `[@function, [@x], [@pow, @x, 3]]` in gültiger JSON-Schreibweise: `["@function", ["@x"], ["@pow", "@x", 3]]`.
3. Eine Monad hat ein Argument; eine Dyad hat zwei.
4. `(3+1)² = 16`.
5. `4-4² = -12`.
6. `3²+2*3 = 15`.
7. `(4+2)-(4*2)=6-8=-2`.
8. `[1,2,3]`.
9. `(20-5)-2=13`.
10. Die linke Bindung erzeugt `10-x`, die rechte erzeugt `x-10`.

---

# Anhang A – Das J-Modul außerhalb der IDE laden

Die Bibliothek liegt im Repository unter **`modules/j.fjsonl`**. Eine JSONL-Datei enthält pro Zeile genau einen vollständigen JSON-Wert. Im Modul sind dies `@namespace`-Direktiven.

**Python:**

```python
from pathlib import Path
from fjson import Interpreter, ModuleLoader

fj = Interpreter()
source = Path("modules/j.fjsonl").read_text(encoding="utf-8")
loader = ModuleLoader(fj, {"j": source})
loader.load('["@import", "j"]')

print(fj(["@identity@j", 42]))
```

**Ausgabe:** `42`.

**JavaScript / Node.js:**

```javascript
import { readFileSync } from 'node:fs';
import { Interpreter } from './js/fjson.mjs';
import { ModuleLoader } from './js/modules.mjs';

const fj = new Interpreter();
const source = readFileSync('modules/j.fjsonl', 'utf8');
new ModuleLoader(fj, { j: source }).load('["@import","j"]');
console.log(fj.eval(['@identity@j', 42]));
```

Der Loader verarbeitet `@import` und `@namespace` **außerhalb des Evaluators**. Das ist wichtig für den eingefrorenen Kern 0.3. Du kannst deshalb nicht erwarten, dass `['@import', 'j']` in einer gewöhnlichen Interpreter-Sitzung automatisch ein Modul nachlädt.

---

# Anhang B – Von J-Gedanken zu fjson-Schreibweisen

| Gedanke | fjson-Beispiel |
|---|---|
| Eine Zahl verdoppeln | `["@times", 2, 21]` |
| Eine Funktion definieren | `["@function", ["@x"], ["@times", 2, "@x"]]` |
| Zwei Monaden kombinieren | `["@atop@j", "@sqrt", "@abs"]` |
| Eingabe und Ergebnis kombinieren | `["@hook@j", "@plus", "@sqrt"]` |
| Zwei Ergebnisse kombinieren | `["@fork@j", "@sqrt", "@plus", "@abs"]` |
| Drei Dyaden kombinieren | `["@fork2@j", "@plus", "@minus", "@times"]` |
| Eine Monad auf eine Liste anwenden | `["@each@j", "@sqrt"]` |
| Eine Liste von links reduzieren | `["@insert@j", "@plus"]` |
| Ein dyadisches Argument festlegen | `["@curry@j", "@minus", "right", 10]` |

Alle Einträge mit Kombinatoren (außer der ersten Einzeloperation) **erzeugen zunächst eine Funktion**. Du kannst sie als Wert in einem Deklarationsobjekt oder `@let` speichern und danach auf Daten anwenden.

---

# Anhang C – Lehrplan für die fjson-IDE

Der Primer lässt sich in vier Lernabschnitte mit separat ausführbaren Beispielen aufteilen:

1. **Grundlagen (Lektionen 1–6):** JSON, fjson-Aufrufe, Arrays, Funktionen, Monaden, Dyaden und Funktionen höherer Ordnung. Keine J-Modul-Abhängigkeit.
2. **J-Kombinatoren (Lektionen 7–11):** Identity, Atop, Hook, Fork und dyadischer Fork. Vor Ausführung das J-Modul laden.
3. **Listen und Komposition (Lektionen 12–20):** Each, Insert, Curry, Tacit Programming und Kombinationen.
4. **Praxis und Vertiefung (Lektionen 21–31):** Fehlerfälle, Datenprojekte, eigene Module, Ausblick, FAQ und Selbsttest.

**Empfehlung für die IDE-Integration:** Jeder Codeblock mit einem gültigen JSON-Ausdruck kann als einzelnes Beispiel übernommen werden. Die IDE sollte bei J-Beispielen das `j`-Modul laden, beim Anzeigen eines Beispiels das erwartete Ergebnis aus den erklärenden Texten einblenden und für Übungen zunächst nur Aufgabe und Tipp zeigen. Die JSONL- und Python-/JavaScript-Blöcke aus Anhang A sind **keine** gewöhnlichen fjson-Codebeispiele.

---

# Quellen, Geltungsbereich und Version

Dieser Primer ist auf den **tatsächlichen öffentlichen Exporten** aus [`modules/j.fjsonl`](https://github.com/jamitzky/fjson/blob/main/modules/j.fjsonl) aufgebaut. Die Semantik wurde mit [`J_MODULE.md`](https://github.com/jamitzky/fjson/blob/main/J_MODULE.md) und den gemeinsamen [`modules/j_cases.json`](https://github.com/jamitzky/fjson/blob/main/modules/j_cases.json) abgeglichen. Die Loader-Nutzung folgt [`MODULES.md`](https://github.com/jamitzky/fjson/blob/main/MODULES.md); die Regeln für normale fjson-Ausdrücke folgen [`CORE.md`](https://github.com/jamitzky/fjson/blob/main/CORE.md) und [`SHOWCASE.md`](https://github.com/jamitzky/fjson/blob/main/SHOWCASE.md). Informationen zur IDE stammen aus [`web/README.md`](https://github.com/jamitzky/fjson/blob/main/web/README.md).

Als didaktische Inspiration dient der klassische **J Primer** der J-Gemeinschaft. Dieser Text ist jedoch **eine eigenständige Einführung** für fjson und nicht die Übersetzung eines fremden Lehrbuchs.

**Abgrenzung:** Original-J besitzt eine erheblich größere Sprache einschließlich Verben mit unterschiedlichen Valenzen, Rank-Verarbeitung, ausgefeiltem Array-Modell und weiteren Kombinatoren. Unser `j`-Modul implementiert derzeit nur die acht oben dokumentierten Operationen. Wenn die Bibliothek wächst, sollte auch dieser Primer versioniert und durch ausführbare Beispieltests abgesichert werden.
