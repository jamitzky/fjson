# Logikbibliothek in fjson 0.3

Die Logikbibliothek benutzt die in [SEMANTICS.md](SEMANTICS.md) beschriebenen
`!X`-Laufzeitwerte. Sie ergänzt den JSON-Sprachkern um aufrufbare Funktionen;
es gibt dafür keine neuen Special Forms. Ein Term kann aus JSON-Skalaren,
Listen, Objekten und logischen Variablen bestehen.

## Erste Anfrage

```json
["@run", 1, "!X",
  ["@unify",
    ["parent", "alice", "!X"],
    ["parent", "alice", "bob"]]]
```

Das Ergebnis ist `["bob"]`. `@unify` bindet beim Erzeugen des Ausdrucks
noch nichts, sondern erzeugt einen Goal-Wert. Erst `@run` führt ihn aus.
Der erste Parameter von `@run` ist die Höchstzahl der Lösungen, der zweite
ist der abzufragende Term und der dritte das Goal. Null als Limit liefert
immer `[]`. Ein Goal-Wert ist selbst kein JSON-Ergebnis.

`@unify` vergleicht Listen elementweise und Objekte nach ihrer Schlüsselmenge.
Die Reihenfolge der Objektschlüssel spielt für das Ergebnis keine Rolle.
`true` und `1` sind verschieden; `1` und `1.0` gelten als dieselbe Zahl.
Eine fehlgeschlagene Unifikation liefert keine Lösung, also bei einer
einzelnen Anfrage `[]`. Bereits vorhandene Substitutionen werden nicht
verändert; jeder Suchzweig erhält seinen eigenen Folgezustand.

## Alternativen und Konjunktion

`@choice` nimmt zwei Goals und sucht links vor rechts. `@conj` verlangt,
dass beide Goals nacheinander gelingen. Beide sind gewöhnliche, strikt
ausgewertete Funktionen, die Goal-Werte aufbauen.

```json
["@run", 2, "!X",
  ["@choice",
    ["@unify", "!X", "alice"],
    ["@unify", "!X", "bob"]]]
```

Ergebnis: `["alice", "bob"]`. Der Suchalgorithmus arbeitet zunächst
tiefenorientiert. Er hat noch keine faire Verzahnung unendlicher Zweige.

```json
["@run", 2, "!X",
  ["@conj",
    ["@choice", ["@unify", "!X", 1], ["@unify", "!X", 2]],
    ["@unify", "!X", 2]]]
```

Ergebnis: `[2]`. Der zweite Zweig bleibt erfolgreich, obwohl der erste
Zweig bei der Konjunktion scheitert.

## Frische Klauselvariablen

Jeder Aufruf einer `@function` bekommt bereits einen frischen
`!`-Namensbereich. Dadurch können innere Termvariablen einer Relation
bei jeder Verwendung neu entstehen:

```json
["@let",
  {"@parent": ["@function", ["@child"],
    ["@unify", ["parent", "!Y", "@child"],
               ["parent", "alice", "bob"]]]},
  ["@run", 1, "!X",
    ["@conj",
      ["@unify", "!X", "bob"],
      ["@parent", "!X"]]]]
```

Das Beispiel liefert `["bob"]`. `!Y` wird innerhalb des Aufrufs von
`@parent` erzeugt. Ein zweiter Aufruf derselben Funktion erhält eine
andere Variable mit demselben lesbaren Namen. Übergebene Variablen wie
`!X` behalten hingegen ihre Identität. Ein separater `@fresh`-Operator
ist für diese erste Form nicht nötig.

## Occurs-Check und offene Werte

Die Bibliothek weist zyklische Substitutionen zurück:

```json
["@run", 1, "!X", ["@unify", "!X", ["node", "!X"]]]
```

Ergebnis: `[]`. Der Occurs-Check verfolgt auch indirekte Bindungen über
andere Variablen.

Wenn nach einer erfolgreichen Suche Variablen ungebunden bleiben, ersetzt
`@run` sie im Ergebnis durch JSON-Marker wie
`{"var": "X", "index": 0}`. Der Index unterscheidet verschiedene
Laufzeitvariablen gleichen Namens innerhalb einer Lösung. Er wird für jede
Lösung neu vergeben und ist keine dauerhafte Objektkennung.

## Grenzen

- Die Suche ist auf einen endlichen, bereits aufgebauten Goal-Baum und ein
  explizites Ergebnislimit ausgelegt. Der Interpreter-Schrittzähler erfasst
  Suchschritte und Unifikationsarbeit; beim Limit entsteht ein
  `ResourceLimitError`.
- Eine rekursive Relation, die sich schon beim Aufbau ihres Goals selbst
  aufruft, benötigt eine spätere Verzögerungsform. Faire Suche, Cut,
  Negation, Klauseldatenbanken und eine Prolog-Textsyntax sind noch nicht
  implementiert.
- `["@quote", "!X"]` ist der wörtliche String `"!X"`. Ein vollständig
  zitierter Term enthält deshalb keine logische Variable. Der unzitierte
  Term `["parent", "alice", "!X"]` tut es.
- Die Bibliothek ist reines Python. `fjson.logic.unify`, `reify` und
  `search` können auch direkt aus Python verwendet werden.

Die ausführbaren Tests in [tests/test_logic.py](tests/test_logic.py) decken
die Beispiele, getrennte Suchzweige, Variablenidentität und Occurs-Check ab.
