# fjson lernen: interaktiver Showcase

Die [fjson Studio Einzeldatei](web/fjson-studio.html) enthält 58 ausführbare
Beispiele in sieben Themenmenüs und 11 kurze Ausdrücke im Menü
**Shell-Snippets**. Sie läuft nach dem Herunterladen ohne Webserver. Code
steht links, JSON-Daten rechts; **Code ausführen** verwendet beide. Die
Themenmenüs führen von einfachen JSON-Werten über alle reservierten
Sprachformen zu Berechnungen, Listenoperationen und relationalen
JSON-Abfragen. Jeder Menüeintrag lädt ein vollständiges Programm, das
sofort ausführbar ist. Snippets werden zunächst nur in die Shell eingefügt.

## Kommentare in gültigem fjson

JSON hat keine Kommentarzeichen. Die Showcase-Programme verwenden daher
gewöhnliche Deklarationen für erklärende Strings:

```json
{
  "@kommentar": "Hinweis: @range erzeugt die Zahlen vor dem exklusiven Ende.",
  "@ergebnis": ["@range", 5]
}
```

Die Deklarationen werden in Reihenfolge ausgewertet; der letzte Wert
ist das Ergebnis. `@kommentar` wird dabei tatsächlich gebunden. Das ist
ein ausführbares Lernformat, keine neue Kommentar-Syntax. Beginnt ein
erklärender String selbst mit `@` oder einem logischen Variablennamen,
müsste er mit `@quote` geschützt werden. Der Showcase verwendet deshalb
den Präfix `Hinweis:`.

## Rechnen mit JSON-Zahlen

Alle folgenden Namen sind **Bibliotheksfunktionen**. Der eingefrorene
Sprachkern 0.3 erhält dadurch keine neuen Schlüsselwörter.

| Operation | Form und Bedeutung |
| --- | --- |
| Grundrechenarten | `@plus(a,b)`, `@minus(a,b)`, `@times(a,b)`, `@divide(a,b)` |
| Potenz und Wurzel | `@pow(a,b)`, `@sqrt(x)` für `x ≥ 0` |
| Ganze Zahlen | `@mod(a,b)` mit ganzzahligen Operanden und `b ≠ 0` |
| Vorzeichen | `@negate(x)`, `@abs(x)` |
| Runden | `@floor(x)`, `@ceil(x)`, `@trunc(x)`, `@round(x)` |
| Grenzen | `@min(a,b)`, `@max(a,b)` |
| Vergleiche | `@lt(a,b)`, `@le(a,b)`, `@gt(a,b)`, `@gte(a,b)` |
| Allgemeiner Vergleich | `@eq(a,b)` für JSON-Werte; `@not(x)` kehrt Wahrheit um |

`@round` rundet bei genau halben Werten **von null weg**:
`["@round", -2.5]` ergibt `-3`. `@trunc` schneidet dagegen gegen null
ab. `@mod` hat das Vorzeichen des Divisors: `-7 mod 3 = 2`,
`7 mod -3 = -2`. Diese Regeln sind in Python und JavaScript gleich.
Nicht endliche Ergebnisse, Division durch null und eine Wurzel aus einer
negativen Zahl sind Fehler. JavaScript beschränkt Ganzzahlen zusätzlich
auf seinen sicheren Bereich. `@ge` ist bereits ein **verzögertes
Logik-Goal**; für einen sofortigen numerischen Vergleich `a ≥ b` dient
`@gte`.

Beispiel:

```json
["@divide", ["@plus", ["@times", 6, 7], 2], 2]
```

Ergebnis: `22`.

## Bereiche und Listen

`@range` erzeugt ganze Zahlen vor einem **exklusiven** Ende. Es gibt drei
Formen: `@range(stop)`, `@range(start, stop)` und
`@range(start, stop, schritt)`. Die Schrittweite darf nicht null sein.
Ein negativer Schritt zählt rückwärts. Jeder erzeugte Wert verbraucht
einen Auswertungsschritt, sodass große Bereiche das Ressourcenlimit
respektieren.

```json
["@range", 2, 11, 2]
```

Ergebnis: `[2, 4, 6, 8, 10]`.

`@map(funktion, array)` ruft eine einstellige Funktion pro Element auf
und sammelt die Ergebnisse. `@filter(funktion, array)` behält Elemente,
für die die Funktion einen wahren Wert liefert.
`@reduce(funktion, array, anfang)` faltet das Array von links nach
rechts mit einer zweistelligen Funktion. Bei leerem Array liefert
`@reduce` den Anfangswert. Alle Aufrufe unterliegen dem normalen
Schritt- und Tiefenlimit.

```json
["@map",
  ["@function", ["@x"], ["@times", "@x", "@x"]],
  ["@range", 1, 6]]
```

Ergebnis: `[1, 4, 9, 16, 25]`.

```json
["@reduce", "@plus", ["@range", 1, 6], 0]
```

Ergebnis: `15`. Im Showcase gibt es außerdem Filter für gerade Zahlen,
JSON-Objekte aus `@map`, eine Quadratsumme, FizzBuzz und eine funktionale
Abfrage von Freds Büronummern. Damit sieht man sowohl die einzelnen
Bausteine als auch ihre Zusammensetzung.

## Was die Menüs zeigen

1. **Einstieg und JSON:** Literale, Arrays, Deklarationen, `@let`,
   `@quote`, `@get` und `@length`.
2. **Funktionen und Bindungen:** `@function`, Standardwerte, Closures,
   Funktionen als Argumente, `@list`, `@apply` und zwei Arten von `@letrec`.
3. **Entscheidungen und Fehler:** beide Zweige von `@if`, Kurzschluss
   und Ergebniswerte von `@and` und `@or`, `@not` sowie `@try`.
4. **Arithmetik:** Grundrechenarten, Potenzen, Wurzel, Modulo, Runden,
   Grenzen und Vergleiche.
5. **Bereiche und Listen:** `@range`, `@map`, `@filter`, `@reduce` und
   zusammengesetzte Beispiele.
6. **Logik und JSON-Daten:** `@run`, `@unify`, `@choice`, `@matcho`,
   `@membero`, `@patho`, verzögerte Constraints und `@project`.
7. **JSON als Graph:** `@graph`, `@edgeo`, `@matcho`, `@record`, `@some`,
   `@nodeo` und explizite `$ref`-Kanten.

Die Fred- und Referenzbeispiele laden automatisch ihren passenden
Datensatz in den rechten Editor. Andere Daten-Tabs und der linke
Code-Tab bleiben erhalten. Das Shell-Menü enthält kurze Ausdrücke für
Rechnen, Listen und Datenzugriff; nach der Auswahl genügt ein Klick auf
**Ausführen** in der Shell.
