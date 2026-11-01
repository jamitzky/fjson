# Eingefrorener fjson-Sprachkern (0.3)

Der Sprachkern von fjson 0.3 ist als Basis für weitere FJ@-Implementierungen
festgelegt. [GRAMMAR.ebnf](GRAMMAR.ebnf) definiert die JSON-Quellformen;
[SEMANTICS.md](SEMANTICS.md) definiert ihre Auswertung. Bei einem Widerspruch
zwischen Implementierung und diesen Dokumenten ist das ein Fehler, den wir
mit einem Konformitätstest klären müssen. Eine absichtliche Änderung an einer
der folgenden Regeln braucht eine ausdrücklich benannte neue Kernversion.

## Festgelegte Regeln

- JSON ist das portable Quellformat. Die Python-API kann zusätzlich bereits
  erzeugte Laufzeitwerte übernehmen; das ist keine weitere Quellsyntax.
- `@name` ist eine Referenz. Ein Array mit einem `@`-Namen an erster Stelle
  ist eine reservierte Form oder ein Präfixaufruf. Andere Arrays sind
  Datenarrays und werden elementweise ausgewertet.
- Ein nichtleeres Objekt mit ausschließlich `@`-Schlüsseln deklariert Werte
  in der aktuellen Umgebung und liefert den letzten Wert. Andere Objekte
  sind Datenobjekte; gemischte Schlüssel sind ein Fehler. Auf oberster Ebene
  bleiben Deklarationen in derselben Interpreter-Sitzung erhalten.
- `@quote`, `@function`, `@let`, `@letrec`, `@if`, `@and`, `@or`, `@try` und
  `@apply` sind die reservierten Formen. `@define`, `@do`, `@pipe`, Infix-
  und Postfixaufrufe gehören nicht zum JSON-Kern.
- Funktionen sind lexikalische Closures. Eine Parameterliste verlangt alle
  Argumente; ein Parameterobjekt gibt allen Parametern Standardwerte.
  Parameter und Argumente folgen der Objektreihenfolge. Standardausdrücke
  werden bei der Erzeugung der Funktion einmal ausgewertet.
- `!X` nach dem Muster `![A-Z][A-Za-z0-9_]*` erzeugt eine logische
  Laufzeitvariable. Gleiche Namen teilen innerhalb eines obersten Aufrufs
  beziehungsweise Funktionsaufrufs ihre Identität. `@quote` bewahrt den
  wörtlichen String.
- Auswertungsreihenfolge, Kurzschluss, Fehlertypen und die Bedeutung von
  `@apply` sind Teil der Semantik in [SEMANTICS.md](SEMANTICS.md). Ein
  Ressourcenlimit ist kein von `@try` behandelter Auswertungsfehler.

## Erweiterungsgrenze

Aufrufbare Namen wie `@plus`, `@unify`, `@choice`, `@conj` und `@run` sind
Bibliotheks- oder Host-Funktionen, keine neuen Quellformen. Zusätzliche
Funktionen können ergänzt werden, ohne die Grammatik zu ändern. Die
Logikbibliothek ist in [LOGIC.md](LOGIC.md) spezifiziert; ihre Suche ist
derzeit auf bereits aufgebaute Goal-Bäume begrenzt.

Externe Datei-, Prozess-, Netzwerk- und Geräteeffekte gehören nicht zur
Sprache selbst. Der Host registriert solche Funktionen und vergibt Rechte.
Quellcode kann keine Rechte erzeugen oder erweitern. Jeder tatsächliche
Aufruf muss die vom Host gesetzte Policy und die Ressourcenlimits prüfen,
auch wenn er über eine Closure oder `@apply` erfolgt. `SecurityError` wird
von `@try` nicht als gewöhnlicher `EvaluationError` behandelt. Die
[Host-Schnittstelle](SECURITY.md) ist gesondert spezifiziert; ihre
Einführung ändert keine der oben festgelegten Quellformen.

Neue Bibliotheksfunktionen und strengere Host-Policies sind mit dem Kern
vereinbar. Eine Änderung an Parsing, Namensauflösung, Bindung oder
Auswertungsreihenfolge ist dagegen eine Sprachänderung und verlangt eine
neue Kernversion und angepasste Konformitätstests.
