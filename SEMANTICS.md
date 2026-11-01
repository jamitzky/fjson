# fjson 0.2: Auswertungssemantik

Dieses Dokument beschreibt das Verhalten des kleinen Python-Interpreters.
[GRAMMAR.ebnf](GRAMMAR.ebnf) beschreibt die Quellsyntax. Die folgende
Reihenfolge ist Teil der Semantik; eine spätere Implementierung darf sie nicht
ohne ausdrückliche Sprachänderung vertauschen.

## Quellwerte und Laufzeitwerte

JSON ist das portable Quellformat. Die Python-API nimmt dieselben Werte als
`dict`, `list`, `str`, Zahl, `bool` und `None` entgegen. Zusätzlich kann
sie bereits erzeugte Laufzeitwerte (`Native`, `Closure`, `LogicVar`) wieder
entgegennehmen, ohne sie als Quelltext neu auszuwerten. Diese Werte sind nicht
selbst JSON-serialisierbar. Eine JSON-Ausgabe verlangt daher ein
JSON-kompatibles Ergebnis.

Ein `@name` ist eine lexikalische Referenz. Ein unbekannter Name ist ein
`ResolutionError`. Ein String der Form `!X`, `!Person` oder `!X_2` ist
ein logischer Variablenwert. Die Form ist `![A-Z][A-Za-z0-9_]*`; andere
`!`-Strings bleiben gewöhnliche Strings. `!_` hat noch keine Sonderregel.
Mit `["@quote", "!X"]` entsteht der wörtliche String `"!X"` statt eines
logischen Variablenwerts. In einem zitierten Term bleibt jedes `!X` wörtlich.

Gleiche `!`-Namen innerhalb eines obersten Interpreter-Aufrufs bezeichnen
denselben `LogicVar`-Wert. Jeder neue oberste Aufruf beginnt einen frischen
logischen Namensbereich. `@let` und `@letrec` teilen den Namensbereich ihres
Ausdrucks; jeder Aufruf einer `@function` erzeugt einen neuen. Ein als Wert
übergebener oder gespeicherter `LogicVar` behält dagegen seine Identität.
Standardwerte einer Funktion werden schon bei ihrer Erzeugung ausgewertet;
ein dort erzeugter logischer Variablenwert bleibt deshalb als Standardwert
über spätere Funktionsaufrufe hinweg derselbe Wert.

Das ist zunächst nur ein Werte- und Geltungsbereichsprototyp. Unifikation,
Occurs-Check, frische Klauselvariablen, Suche und Backtracking sind noch
keine Funktionen dieser Version. Insbesondere hat `@quote` keine zweite
Auswertungsebene: Eine Logikbibliothek erhält in einem zitierten Term
wörtliche Strings.

## Reihenfolge

1. Skalare und Referenzen werden unmittelbar ausgewertet.
2. Ein Array mit einem `@name` an erster Stelle ist eine Sonderform oder ein
   Präfixaufruf. Der Name und die Argumentzahl werden geprüft, dann werden
   die Argumente von links nach rechts genau einmal ausgewertet und die
   Funktion aufgerufen. Weitere Arraypositionen werden nicht nach einer
   aufrufbaren Funktion durchsucht.
3. Ein anderes Array ist ein Datenarray. Seine Elemente werden von links
   nach rechts ausgewertet; das Ergebnis bleibt ein Array.
4. Ein Objekt ohne `@`-Schlüssel ist ein Datenobjekt. Seine Werte werden in
   Schlüsselreihenfolge ausgewertet; das Ergebnis bleibt ein Objekt mit
   denselben Schlüsseln. Berechnete Records brauchen deshalb kein neues
   `@record`.
5. Ein nichtleeres Objekt mit ausschließlich `@`-Schlüsseln deklariert die
   Namen in der aktuellen Umgebung. Werte werden in Schlüsselreihenfolge
   ausgewertet und jeweils sofort gebunden. Das Ergebnis ist der letzte
   Wert. Gemischte `@`- und Datenschlüssel sind ein Fehler.
6. `@let` und `@letrec` erzeugen lokale Umgebungen. `@let` bindet in
   Schlüsselreihenfolge; `@letrec` legt zuerst alle Namen an. Eine Closure
   merkt sich die Umgebung ihrer Erzeugung.
7. `@apply` wertet zuerst den Funktionsausdruck und dann den Ausdruck für
   die Argumentliste aus. Die so erhaltenen Listenelemente sind Werte:
   Beim Aufruf werden sie nicht noch einmal als FJ@-Quelltext interpretiert.
   Ein berechneter Funktionswert kann damit aufgerufen werden.

`@if` wertet nur den gewählten Zweig aus; `@and` und `@or` stoppen
gegebenenfalls vor späteren Operanden. `@quote` wertet seinen JSON-Operanden
überhaupt nicht aus. `@try` fängt nur `EvaluationError` und Unterklassen.
Ein Ressourcenlimit bleibt ein Fehler. Deklarationen, die vor einem Fehler
bereits erfolgt sind, werden nicht zurückgerollt.

## Bindung und Effekte

Eine `@let`-Bindung ist lokal. Ein Deklarationsobjekt verändert seine
aktuelle Umgebung; auf oberster Ebene bleibt diese Änderung in der
Interpreter-Sitzung bestehen. Das ist ein beobachtbarer Sitzungseffekt.
Externe Datei-, Netzwerk- und Geräteeffekte enthält der Kern nicht.
Optimierungen dürfen beobachtbare Deklarationen und Aufrufe nicht umordnen.

Ein allgemeines `@seq` gehört bislang nicht zum Kern. Das bloße Umschreiben
einer Folge in verschachtelte `@let`-Ausdrücke ist nicht immer gleichwertig:
Dabei können Deklarationen in einem neuen lokalen Geltungsbereich landen,
statt wie vorher in der Sitzung zu bleiben. Ein Frontend darf `@seq` erst
anbieten, wenn seine Übersetzung für Bindungen, Fehler und Ergebniswerte
nachweislich dieselbe Semantik hat.

Die Python-Tests in [tests/test_interpreter.py](tests/test_interpreter.py)
prüfen diese Regeln an ausführbaren Beispielen.

