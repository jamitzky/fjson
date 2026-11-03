# Prolog denken – mit fjson programmieren

**Ein ausführlicher Primer für absolute Anfänger: Fakten, Regeln, Unifikation, logische Variablen und Suche in JSON**  
**Basis:** fjson-Sprachkern 0.3 und die vorhandenen Bibliotheken `LOGIC.md`, `LOGIC_JSON.md`, `GRAPH.md` (Stand: November 2026).  
**Voraussetzungen:** Keine. Du musst weder Prolog noch JSON noch fjson beherrschen.

> **Die wichtigste Idee:** Ein normales Programm beantwortet die Frage: *„Was soll der Computer als Nächstes tun?“* Ein logisches Programm beantwortet häufig eine andere Frage: *„Welche Belegungen machen diese Aussage wahr?“* Das kleine Zeichen `!` erlaubt uns, solche Fragen direkt in JSON auszudrücken.

**Wichtig zur Einordnung:** Wir lernen die **Denkweise von Prolog** mit der **tatsächlich vorhandenen fjson-Syntax**. fjson 0.3 ist kein vollständiger Prolog-Interpreter: Es besitzt noch keine Prolog-Textsyntax, keine automatisch durchsuchbare globale Klauseldatenbank, keine verzögert aufgebauten rekursiven Regeln, keinen Cut und keine vollständige faire oder unendliche Suche. Wo wir Prolog-Notation zeigen, ist sie ausdrücklich **nur zum Vergleich** gedacht; die `json`-Blöcke sind fjson-Programme.

## So benutzt du den Primer in fjson Studio

Jede Lektion besteht aus einer Idee, mindestens einem Beispiel, einer Erklärung und häufig einer Übung. Kopiere **jeweils einen vollständigen `json`-Block** in den Code-Editor oder die Shell und führe ihn aus. Das erwartete Ergebnis steht *unterhalb* des Blocks, nicht im Code. JSON erlaubt keine Kommentare wie `//`, keine einfachen String-Anführungszeichen und keine nachgestellten Kommas. Die meisten Beispiele enthalten alle notwendigen Daten selbst. Einige Lektionen nutzen den rechten **Daten**-Tab der IDE: Dort heißt das geladene JSON `@data`.

Du benötigst **kein J-Modul**. Die verwendeten Funktionen `@run`, `@unify`, `@choice`, `@conj`, `@membero`, `@matcho`, `@patho`, `@project` und die Graphfunktionen gehören zu den bestehenden fjson-Bibliotheken. Für einen schnellen Einstieg sollte man die Beispiele **in der angegebenen Reihenfolge** durchführen, die Daten und Zahlen verändern und erst dann zur nächsten Lektion gehen.

### Inhaltsverzeichnis

**Teil I – Die logische Denkweise:** 1. Aussagen und Fragen · 2. JSON lesen · 3. `@` gegen `!` · 4. Ein erstes Goal · 5. Fakten und Muster · 6. Fragen in verschiedene Richtungen.

**Teil II – Unifikation und Suche:** 7. Unifikation verstehen · 8. Wiederholte Variablen · 9. UND mit `@conj` · 10. ODER mit `@choice` · 11. Der Suchbaum und Backtracking · 12. Keine Lösung, eine Lösung, viele Lösungen · 13. Offene Werte und Occurs-Check.

**Teil III – Wie aus Fakten Regeln werden:** 14. Relationen als Funktionen · 15. Frische Variablen · 16. Eltern und Großeltern · 17. Geschwister · 18. Unterschied zwischen Relation und Berechnung · 19. Was mit rekursiven Prolog-Regeln derzeit nicht geht.

**Teil IV – Logik in echten JSON-Daten:** 20. `@membero` als Faktensuche · 21. `@matcho` und partielle Objekte · 22. `@record` und `@some` · 23. `@patho` · 24. Ungleichheit und Zahlenbedingungen · 25. `@project` und die Richtung von Berechnungen.

**Teil V – Graphen und größere Abfragen:** 26. JSON als Graph · 27. Kanten und Knoten · 28. Referenzen mit `$ref` · 29. Ein kleines Experten-/Empfehlungssystem · 30. Prolog-Konzepte und fjson im direkten Vergleich.

**Anhang:** A. Spickzettel · B. Fehlerdiagnose · C. Aufgaben mit Lösungen · D. IDE-Integration und Prüfung · E. Grenzen und mögliche Erweiterungen.

---

# Teil I – Die logische Denkweise

## Lektion 1: Ein Programm kann eine Frage sein

Stell dir eine einfache Familiengeschichte vor:

- Alice ist die Mutter von Bob.
- Bob ist der Vater von Clara.
- Alice ist also ein Großelternteil von Clara.

Eine gewöhnliche Programmiersprache würde vielleicht eine Liste von Personen durchlaufen und Vergleiche ausführen. Prolog startet anders: Wir schreiben *Beziehungen* auf und fragen, welche Personen in diese Beziehungen passen.

In klassischer Prolog-Schreibweise könnte eine Tatsache so aussehen:

```prolog
parent(alice, bob).
```

Lies das als: „Alice ist ein Elternteil von Bob.“ Die Schreibweise ist nur ein Vergleich: **Sie ist kein ausführbarer fjson-Code.**

Dasselbe als JSON-Daten:

```json
["parent", "alice", "bob"]
```

**Ergebnis:** `["parent","alice","bob"]`.

Das ist zunächst nur eine Liste aus drei Texten. Wir vereinbaren gedanklich: Das erste Element ist der Name der Beziehung, dann folgen die beteiligten Personen. Diese Konvention ist kein besonderer Sprachmechanismus.

Jetzt formulieren wir die Frage: *Wer ist das Kind von Alice?* Dazu lassen wir die letzte Stelle unbekannt:

```json
["@run", 1, "!Child",
  ["@unify",
    ["parent", "alice", "!Child"],
    ["parent", "alice", "bob"]]]
```

**Erwartetes Ergebnis:** `["bob"]`.

Du hast gerade eine kleine logische Anfrage ausgeführt – ohne eine Schleife zu schreiben. `!Child` war eine *offene Stelle*, die durch die passende Tatsache gefüllt wurde.

**Merksatz:** Wir berechnen nicht unbedingt von links nach rechts. Wir suchen nach einer Belegung, mit der zwei Ausdrücke zusammenpassen.

**Übung:** Ersetze die Tatsache rechts durch `["parent","alice","clara"]`. Was wird das Ergebnis? **Lösung:** `["clara"]`.

## Lektion 2: Die drei JSON-Bausteine

Wir benötigen zunächst nur drei Bausteine: **Werte**, **Listen (Arrays)** und **Objekte**.

Ein Wert:

```json
42
```

Eine Liste:

```json
["alice", "bob", "clara"]
```

Ein Objekt mit benannten Eigenschaften:

```json
{"name": "Bob", "age": 35, "city": "Berlin"}
```

Schreibweise: Alle Texte stehen in **doppelten** Anführungszeichen. `true`, `false` und `null` sind besondere JSON-Werte. Ein Array hat eine Reihenfolge; ein Objekt hat Schlüssel wie `"name"`.

fjson macht aus JSON auch Programme. Ein Array, dessen erstes Element ein `@`-Name ist, ist ein Funktionsaufruf:

```json
["@plus", 20, 22]
```

**Erwartetes Ergebnis:** `42`.

Ein gewöhnliches Array ist dagegen ein Datenwert:

```json
["parent", "alice", "bob"]
```

**Erwartetes Ergebnis:** `["parent","alice","bob"]`.

Damit können wir dieselbe Form sowohl für Daten als auch für Programme verwenden. Das ist bei fjson besonders praktisch: Ein Satz von Fakten kann direkt aus JSON-Dateien kommen.

## Lektion 3: `@X` ist nicht `!X`

Hier liegt der wichtigste Unterschied des gesamten Primers.

Ein Name wie `"@x"` bedeutet: **Schlage einen bereits gebundenen Namen nach.**

```json
["@let", {"@x": 7}, ["@plus", "@x", 5]]
```

**Erwartetes Ergebnis:** `12`.

`@x` ist eine lexikalisch gebundene Variable und hat in diesem Beispiel fest den Wert `7`.

Ein Name wie `"!X"` bedeutet dagegen: **Erzeuge beziehungsweise verwende eine logische Variable, deren Wert noch unbekannt sein darf.**

```json
["@run", 1, "!X", ["@unify", "!X", 7]]
```

**Erwartetes Ergebnis:** `[7]`.

Das `!X` wurde nicht über `@let` definiert. Die Unifikation versucht eine passende Belegung zu finden.

| Schreibweise | Bedeutung | Beispiel |
|---|---|---|
| `"alice"` | gewöhnlicher Text | der Name Alice |
| `"@x"` | lexikalische Referenz | bereits bekannte Bindung |
| `"!X"` | logische Variable | gesuchte oder noch offene Belegung |
| `"!Child"` | logische Variable | gesuchtes Kind |
| `"!x"` | gewöhnlicher Text | **keine** logische Variable |

Logische Variablen beginnen mit `!` und einem **großen ASCII-Buchstaben** (`!X`, `!Person`, `!A1`). Danach sind Buchstaben, Zahlen und `_` erlaubt.

Wichtig: `"!X"` sieht wie ein JSON-String aus, wird aber vom fjson-Interpreter zu einem speziellen logischen Laufzeitwert aufgelöst. Wer den wörtlichen Text `"!X"` behalten möchte, muss ihn zitieren:

```json
["@quote", "!X"]
```

**Erwartetes Ergebnis:** `"!X"`.

**Übung:** Warum ist `"!name"` keine logische Variable? **Lösung:** Nach `!` muss ein Großbuchstabe folgen.

## Lektion 4: Ein Goal ist eine Bedingung, nicht schon das Ergebnis

Das englische Wort **Goal** heißt „Ziel“. In der Logikprogrammierung bedeutet es eine Bedingung, die erfüllt sein soll.

```json
["@unify", "!X", 42]
```

Das ist **noch nicht** die Liste `[42]`. Der Aufruf konstruiert einen Goal-Wert. Er beschreibt die Bedingung „`!X` soll sich mit `42` vereinigen lassen“.

Erst `@run` führt die Suche aus:

```json
["@run", 1, "!X", ["@unify", "!X", 42]]
```

**Erwartetes Ergebnis:** `[42]`.

Die drei Argumente von `@run` sind:

1. **Wie viele Lösungen höchstens?** Hier `1`.
2. **Was möchten wir ausgeben?** Hier `!X`.
3. **Welche Bedingung soll erfüllt werden?** Hier die Unifikation.

Du kannst das Ausgabeziel auch als Objekt angeben:

```json
["@run", 1, {"answer": "!X"}, ["@unify", "!X", 42]]
```

**Erwartetes Ergebnis:** `[{"answer":42}]`.

Es ist also wichtig, zwei Begriffe zu trennen: **Eine logische Variable enthält nicht selbst eine Lösung.** Die Lösung entsteht durch eine erfolgreiche Suche und wird von `@run` ausgegeben.

## Lektion 5: Fakten sind gewöhnliche JSON-Daten

Prolog kann Fakten wie `likes(alice, tea).` als Klauseln speichern. In fjson 0.3 verwenden wir für solche Beziehungen bislang meist **JSON-Daten** und fragen mit der Logikbibliothek darüber ab.

Ein einzelner Fakt:

```json
{"person":"alice", "likes":"tea"}
```

Mehrere Fakten:

```json
[
  {"person":"alice", "likes":"tea"},
  {"person":"bob", "likes":"coffee"},
  {"person":"alice", "likes":"cake"}
]
```

Dies sind nur Daten, keine automatisch registrierten Prolog-Klauseln. Das ist eine bewusste Designentscheidung: Der fjson-Sprachkern 0.3 ändert sich dadurch nicht.

Um Fakten abzufragen, können wir `@membero` benutzen:

```json
["@run", 10, "!Food",
  ["@membero",
    [
      {"person":"alice","likes":"tea"},
      {"person":"bob","likes":"coffee"},
      {"person":"alice","likes":"cake"}
    ],
    {"person":"alice","likes":"!Food"}]]
```

**Erwartetes Ergebnis:** `["tea","cake"]`.

Lies die Anfrage so: „Nimm jedes Element der Liste, das exakt der Struktur `{"person":"alice","likes":!Food}` entspricht; gib `!Food` aus.“

**Achtung:** `@membero` verlangt hier **exakte** Objektstruktur. Ein Fakt mit einem zusätzlichen Schlüssel wie `"since"` passt nicht mehr auf dieses zweifeldrige Muster. Teilmuster behandeln wir mit `@matcho`.

## Lektion 6: Dieselbe Beziehung, verschiedene Fragen

Eine großartige Eigenschaft logischer Beziehungen ist, dass wir **andere Stellen offenlassen** können.

Wer trinkt Tee?

```json
["@run", 10, "!Person",
  ["@membero",
    [
      {"person":"alice","likes":"tea"},
      {"person":"bob","likes":"coffee"},
      {"person":"cara","likes":"tea"}
    ],
    {"person":"!Person","likes":"tea"}]]
```

**Erwartetes Ergebnis:** `["alice","cara"]`.

Wer mag was?

```json
["@run", 10, {"who":"!Person","what":"!Food"},
  ["@membero",
    [
      {"person":"alice","likes":"tea"},
      {"person":"bob","likes":"coffee"}
    ],
    {"person":"!Person","likes":"!Food"}]]
```

**Erwartetes Ergebnis:** `[{"who":"alice","what":"tea"},{"who":"bob","what":"coffee"}]`.

Wir haben keine zweite Suchfunktion gebraucht. Wir haben nur verändert, **welche Stellen bekannt sind und welche gesucht werden**.

---

# Teil II – Unifikation und Suche

## Lektion 7: Was Unifikation wirklich bedeutet

**Unifikation** ist das Herzstück von Prolog und fjson Logic. Zwei Ausdrücke werden vereinigt, wenn man Variablen so belegen kann, dass beide dieselbe Struktur und dieselben Werte haben.

Ein ganz einfaches Beispiel:

```json
["@run", 1, "!X", ["@unify", "!X", "alice"]]
```

**Erwartetes Ergebnis:** `["alice"]`.

Zwei gleiche feste Werte passen:

```json
["@run", 1, "ok", ["@unify", 7, 7]]
```

**Erwartetes Ergebnis:** `["ok"]`.

Zwei unterschiedliche feste Werte passen nicht:

```json
["@run", 1, "ok", ["@unify", 7, 8]]
```

**Erwartetes Ergebnis:** `[]`.

`[]` bedeutet **keine passende Lösung**, nicht „das Programm ist kaputt“. Ein ungültiger Funktionsaufruf dagegen erzeugt einen Fehler.

### Strukturelle Unifikation von Arrays

```json
["@run", 1, {"a":"!A","b":"!B"},
  ["@unify", ["point", "!A", 3], ["point", 2, "!B"]]]
```

**Erwartetes Ergebnis:** `[{"a":2,"b":3}]`.

Die beiden Listen haben jeweils drei Plätze. Der erste ist in beiden Fällen `"point"`; aus dem zweiten folgt `!A = 2`, aus dem dritten `!B = 3`.

Andere Längen können nicht vereinigt werden:

```json
["@run", 1, "ok", ["@unify", [1, 2], [1, 2, 3]]]
```

**Erwartetes Ergebnis:** `[]`.

**Übung:** Was kommt heraus, wenn du `["point","!X","!X"]` mit `["point",4,4]` vereinigen lässt? Und mit `["point",4,5]`? **Lösung:** Erst `[4]`, dann `[]`.

## Lektion 8: Wiederholte Variablen bedeuten Gleichheit

Ein unbekannter Name kann mehrmals vorkommen. Alle Vorkommen von `!X` in **demselben logischen Gültigkeitsbereich** bezeichnen dieselbe logische Variable.

```json
["@run", 1, "!X",
  ["@unify", ["!X", "!X"], ["red", "red"]]]
```

**Erwartetes Ergebnis:** `["red"]`.

Aber:

```json
["@run", 1, "!X",
  ["@unify", ["!X", "!X"], ["red", "blue"]]]
```

**Erwartetes Ergebnis:** `[]`.

Der Trick ist überraschend mächtig: **Gleichheit wird nicht als zusätzliche Vergleichsfunktion programmiert, sondern durch Wiederholung derselben Variablen ausgedrückt.**

Dasselbe in einem Objekt:

```json
["@run", 1, "!X",
  ["@unify", {"left":"!X","right":"!X"},
             {"left":17,"right":17}]]
```

**Erwartetes Ergebnis:** `[17]`.

Merke dir: Verschiedene Namen (`!X`, `!Y`) sind zunächst verschiedene Variablen; gleiche Namen in demselben Scope meinen dieselbe Variable.

## Lektion 9: UND – zwei Bedingungen gleichzeitig

In Prolog steht das Komma oft für „und“. In fjson verwenden wir `@conj` (von *conjunction*): Beide Goals müssen gelingen.

```json
["@run", 1, "!X",
  ["@conj",
    ["@unify", "!X", 5],
    ["@unify", "!X", 5]]]
```

**Erwartetes Ergebnis:** `[5]`.

Wenn sich beide Bedingungen widersprechen:

```json
["@run", 1, "!X",
  ["@conj",
    ["@unify", "!X", 5],
    ["@unify", "!X", 6]]]
```

**Erwartetes Ergebnis:** `[]`.

Lies den Ausdruck wie einen Satz: „Finde ein `!X`, sodass `!X = 5` **und** `!X = 6`.“ Das ist unmöglich.

Eine interessante Eigenschaft: `@conj` baut aus zwei Goals **ein neues Goal**. Es ist kein gewöhnliches boolesches `@and`. `@and` wertet Ausdrücke mit normalen Wahrheitswerten aus; `@conj` kombiniert logische Suchbedingungen.

## Lektion 10: ODER – alternative Möglichkeiten

Prolog kann Alternativen in Regeln notieren. In fjson übernimmt das `@choice`.

```json
["@run", 10, "!Color",
  ["@choice",
    ["@unify", "!Color", "red"],
    ["@unify", "!Color", "blue"]]]
```

**Erwartetes Ergebnis:** `["red","blue"]`.

Das ist der Unterschied zwischen dem **logischen Suchraum** und dem Ergebnis: Die eine Variable `!Color` kann in verschiedenen **Suchzweigen** unterschiedliche Werte annehmen. Innerhalb jedes Zweigs ist ihre Belegung dagegen konsistent.

Noch eine Alternative:

```json
["@run", 2, "!N",
  ["@choice",
    ["@unify", "!N", 10],
    ["@unify", "!N", 20]]]
```

**Erwartetes Ergebnis:** `[10,20]`.

**Übung:** Was ändert sich bei `@run` mit Limit `1`? **Lösung:** Nur die erste Lösung `[10]` wird ausgegeben.

## Lektion 11: Backtracking – wie eine Suche zurückgeht

Backtracking heißt: Wenn eine Möglichkeit später scheitert, kehrt die Suche zu einem früheren Entscheidungspunkt zurück und probiert die nächste Alternative.

Nehmen wir zwei Kandidaten für `!X`: `1` und `2`. Danach verlangen wir zusätzlich `!X = 2`:

```json
["@run", 10, "!X",
  ["@conj",
    ["@choice",
      ["@unify", "!X", 1],
      ["@unify", "!X", 2]],
    ["@unify", "!X", 2]]]
```

**Erwartetes Ergebnis:** `[2]`.

### Der Suchbaum in Worten

```text
Start
  |
  +-- X = 1
  |     |
  |     +-- X = 2 ?  Nein -> Zweig verworfen
  |
  +-- X = 2
        |
        +-- X = 2 ?  Ja -> Lösung 2
```

Wichtig: Beim Wechsel in den zweiten Suchzweig bleibt `!X` **nicht** auf `1` festgelegt. Jeder Zweig hat seinen eigenen Folgezustand. Genau deshalb bekommt man die Lösung `2`.

Die derzeitige Implementierung durchsucht einen **endlichen Goal-Baum tiefenorientiert**, und `@choice` besucht die linke Alternative vor der rechten. Es gibt noch keine automatische faire Verzahnung potenziell unendlicher Suchzweige.

## Lektion 12: Wie viele Antworten möchtest du?

Das erste Argument von `@run` begrenzt die Anzahl ausgegebener Lösungen:

```json
["@run", 1, "!X",
  ["@choice",
    ["@unify", "!X", "first"],
    ["@unify", "!X", "second"]]]
```

**Erwartetes Ergebnis:** `["first"]`.

```json
["@run", 2, "!X",
  ["@choice",
    ["@unify", "!X", "first"],
    ["@unify", "!X", "second"]]]
```

**Erwartetes Ergebnis:** `["first","second"]`.

```json
["@run", 0, "!X", ["@unify", "!X", 42]]
```

**Erwartetes Ergebnis:** `[]`.

`0` bedeutet nicht „unbegrenzt“, sondern **keine Antworten**. Ein hoher Wert ist weiterhin durch die vorhandenen Ressourcenlimits begrenzt. `@run` entfernt auch nicht automatisch doppelte Lösungen: Zwei Wege zum selben Wert sind zwei gefundene Lösungswege.

## Lektion 13: Offene Werte, unendliche Strukturen und der Occurs-Check

Manchmal findet eine Suche eine erfolgreiche Lösung, ohne jede Variable zu binden:

```json
["@run", 1, {"known":"!X","free":"!Y"},
  ["@unify", "!X", 12]]
```

**Erwartetes Ergebnis:** Ein Objekt mit `"known":12` und einem **Variablenmarker** bei `"free"`, etwa `{"var":"Y","index":0}`. Dieser Marker bedeutet: `!Y` ist noch offen. Er ist kein String `"!Y"` und keine feste Antwort.

Eine weitere wichtige Sicherheitsregel heißt **Occurs-Check**. Er verhindert, dass sich eine Variable selbst als Teil ihres eigenen Wertes enthalten muss:

```json
["@run", 1, "!X", ["@unify", "!X", ["node", "!X"]]]
```

**Erwartetes Ergebnis:** `[]`.

Denn sonst entstünde ein Wert der Form `X = ["node", X]`, der sich immer weiter selbst enthält. Klassisches Prolog erlaubt in manchen Implementierungen solche zyklischen Terme; unsere fjson-Logikbibliothek weist sie zurück.

**Mini-Übung:** Warum ist `!X = [1,2,3]` zulässig, aber `!X = [1,!X]` nicht? **Lösung:** Nur die zweite Gleichung enthält `!X` innerhalb der eigenen Bindung.

---

# Teil III – Wie aus Fakten Regeln werden

## Lektion 14: Eine Regel ist eine wiederverwendbare Relation

In Prolog kann eine Regel vereinfacht so aussehen:

```prolog
grandparent(X, Z) :- parent(X, Y), parent(Y, Z).
```

Das bedeutet: „X ist Großelternteil von Z, wenn es ein Y gibt, sodass X Elternteil von Y und Y Elternteil von Z ist.“ Der Doppelpunkt-Bindestrich bedeutet **wenn**. Das ist klassische Prolog-Notation – **kein ausführbares fjson**.

In fjson können wir Regeln zunächst als **Funktionen erzeugen, die Goals zurückgeben**.

Eine ganz einfache Relation: „Die gesuchte Person ist Alice“.

```json
["@let",
  {"@isAlice": ["@function", ["@who"], ["@unify", "@who", "alice"]]},
  ["@run", 1, "!Person", ["@isAlice", "!Person"]]]
```

**Erwartetes Ergebnis:** `["alice"]`.

Die Funktion `@isAlice` liefert nicht den Namen `"alice"` zurück. Sie liefert ein **Goal**; die Suche bestimmt erst später, welche Belegung passt.

### So liest man die Struktur

1. `@function` definiert eine normale fjson-Funktion.
2. Ihr Parameter `@who` ist eine **normale** lexikalische Bindung.
3. Beim Aufruf wird eine **logische** Variable `!Person` als Argument übergeben.
4. Der Funktionsrumpf baut `@unify(@who,"alice")`.
5. `@run` führt dieses Goal aus und gibt `!Person` zurück.

Diese Mischung aus `@`-Parametern und `!`-Variablen ist der zentrale Baustein für relationale Programmierung in fjson.

## Lektion 15: Frische Variablen – warum Regeln mehrfach funktionieren

Ein Prolog-Prädikat bekommt bei jeder Benutzung neue lokale Variablen. Sonst würden sich verschiedene Regelaufrufe gegenseitig stören.

fjson 0.3 hat eine sehr praktische Regel: **Jeder Aufruf einer `@function` erzeugt einen frischen logischen Variablenscope für intern vorkommende `!`-Namen.** Übergebene logische Variablen behalten dagegen ihre Identität.

```json
["@let",
  {"@parentOfBob":
    ["@function", ["@child"],
      ["@unify", ["parent", "!Mother", "@child"],
                 ["parent", "alice", "bob"]]]},
  ["@run", 1, "!Person", ["@parentOfBob", "!Person"]]]
```

**Erwartetes Ergebnis:** `["bob"]`.

`!Mother` ist im Funktionsrumpf lokal und wird durch die Unifikation auf `"alice"` gebunden. `!Person` kommt von außen und ist die gesuchte Antwort.

### Noch ein Beispiel – zwei voneinander unabhängige Regelaufrufe

```json
["@let",
  {"@isParent":
    ["@function", ["@p", "@c"],
      ["@unify", ["parent", "@p", "@c"],
                 ["parent", "alice", "bob"]]]},
  ["@run", 1, {"first":"!A","second":"!B"},
    ["@conj",
      ["@isParent", "!A", "!X"],
      ["@isParent", "!B", "!Y"]]]]
```

**Erwartetes Ergebnis:** `[{"first":"alice","second":"alice"}]`.

Es gibt keine automatische Kollision zwischen den beiden Aufrufen. Lokale Hilfsvariablen einer Regel können denselben Namen tragen und trotzdem verschiedene Laufzeitwerte sein. Das ist wesentlich für wiederverwendbare Logikprogramme.

## Lektion 16: Eine Großelternregel aus zwei Elternbeziehungen

Wir bauen jetzt eine richtige logische Beziehung mit mehreren Familienfakten.

```json
["@let",
  {
    "@facts": [
      {"parent":"alice","child":"bob"},
      {"parent":"alice","child":"cara"},
      {"parent":"bob","child":"dina"},
      {"parent":"cara","child":"emil"}
    ],
    "@parent": ["@function", ["@p","@c"],
      ["@membero", "@facts", {"parent":"@p","child":"@c"}]],
    "@grandparent": ["@function", ["@p","@c"],
      ["@conj",
        ["@parent", "@p", "!Middle"],
        ["@parent", "!Middle", "@c"]]]
  },
  ["@run", 10, "!Grandchild", ["@grandparent", "alice", "!Grandchild"]]]
```

**Erwartetes Ergebnis:** `["dina","emil"]`.

### Ganz langsam erklärt

- `@facts` ist unser kleines Familienregister.
- `@parent(p,c)` sucht einen passenden Datensatz mit `parent=p` und `child=c`.
- `@grandparent(p,c)` stellt **zwei** Elternfragen.
- Die Person `!Middle` muss in beiden Teilfragen **dieselbe** sein.
- Mit `@run` fragen wir, welche Enkelkinder Alice hat.

Hier zeigt sich eine wesentliche Idee von Prolog: **Eine Regel beschreibt die Struktur eines Zusammenhangs.** Man muss nicht vorschreiben, wie genau die Liste durchlaufen werden soll. Die Suche und Unifikation erledigen das.

### Die Richtung umkehren

Mit denselben Regeldefinitionen könnten wir nach Großeltern von Dina fragen:

```json
["@let",
  {
    "@facts": [
      {"parent":"alice","child":"bob"},
      {"parent":"bob","child":"dina"}
    ],
    "@parent": ["@function", ["@p","@c"],
      ["@membero", "@facts", {"parent":"@p","child":"@c"}]],
    "@grandparent": ["@function", ["@p","@c"],
      ["@conj",
        ["@parent", "@p", "!Middle"],
        ["@parent", "!Middle", "@c"]]]
  },
  ["@run", 10, "!Grandparent", ["@grandparent", "!Grandparent", "dina"]]]
```

**Erwartetes Ergebnis:** `["alice"]`.

**Übung:** Ergänze einen Fakt `{ "parent":"bob", "child":"finn" }`. Welche Enkelkinder bekommt Alice? **Lösung:** Dina, Finn und Emil.

## Lektion 17: Geschwister – eine Regel mit einer Ungleichheit

Zwei Menschen sind nach einer einfachen Modellannahme Geschwister, wenn sie mindestens einen gemeinsamen Elternteil haben und nicht dieselbe Person sind.

In klassischer Prolog-Ideenschreibweise:

```prolog
sibling(X, Y) :- parent(P, X), parent(P, Y), X \= Y.
```

Im fjson-Modell erzeugen wir zwei `@membero`-Goals und ein `@neqo`-Goal. Weil `@conj` jeweils zwei Goals kombiniert, verschachteln wir es:

```json
["@let",
  {
    "@facts": [
      {"parent":"alice","child":"bob"},
      {"parent":"alice","child":"cara"},
      {"parent":"david","child":"emil"}
    ],
    "@sibling": ["@function", ["@x","@y"],
      ["@conj",
        ["@conj",
          ["@membero", "@facts", {"parent":"!P","child":"@x"}],
          ["@membero", "@facts", {"parent":"!P","child":"@y"}]],
        ["@neqo", "@x", "@y"]]]
  },
  ["@run", 10, "!Sibling", ["@sibling", "bob", "!Sibling"]]]
```

**Erwartetes Ergebnis:** `["cara"]`.

### Warum braucht man `@neqo`?

Ohne Ungleichheit wäre Bob auch sein eigenes „Geschwister“, weil er natürlich denselben Elternteil wie Bob hat. `@neqo` verhindert das.

### Warum ist `@neqo` verzögert?

Vielleicht ist `!Sibling` noch unbekannt, wenn `@neqo` erstellt wird. Würden wir sofort „ungleich?“ testen, könnten wir die Bedingung nicht sinnvoll prüfen. fjson merkt sich die Bedingung und überprüft sie, sobald sich die notwendigen Belegungen ergeben. Offene, nicht entscheidbare Bedingungen werden nicht einfach als fertige Lösung akzeptiert.

**Hinweis:** Diese Definition von Geschwistern zählt jede erfolgreiche Elternteil-Verbindung als einen Suchweg. Wenn zwei Personen zwei gemeinsame Elternteile haben, kann die gleiche Paarung mehrmals vorkommen. `@run` dedupliziert Lösungen nicht automatisch.

## Lektion 18: Eine Relation ist kein gewöhnlicher Rechner

Vergleichen wir zwei Dinge:

**Normale Berechnung:**

```json
["@plus", 3, 4]
```

**Erwartetes Ergebnis:** `7`.

**Logische Beziehung:**

```json
["@run", 1, "!X", ["@unify", "!X", 7]]
```

**Erwartetes Ergebnis:** `[7]`.

Bei der normalen Berechnung gibt es bekannte Eingaben und ein direktes Ergebnis. Bei der Beziehung fragen wir nach möglichen Belegungen.

Die Grenze sieht man bei Zahlen besonders gut: `@plus` ist aktuell keine voll bidirektionale Prolog-Relation. Ein Ausdruck wie „X plus 3 soll 7 ergeben, finde X“ funktioniert **nicht automatisch** durch einfaches Aufrufen von `@plus` mit `!X`.

Für bekannte Eingaben können wir dagegen mit `@project` normale Funktionen **in ein Goal einbetten**. Das lernen wir später.

## Lektion 19: Warum die bekannte rekursive Prolog-Regel noch fehlt

Eine der berühmtesten Prolog-Regeln lautet sinngemäß:

```prolog
ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).
```

Das ist eine **rekursive** Relation: Ein Vorfahr ist entweder ein direktes Elternteil oder ein Elternteil eines weiteren Vorfahren.

In einem vollständigen Prolog-System kann die Auswertung solche Regeln bedarfsgerecht erweitern. Die derzeitige fjson-Logikbibliothek baut ihre Goals dagegen zunächst als **endliche Strukturen** auf. Wenn eine fjson-Funktion beim *Bau* ihres Goals direkt wieder sich selbst aufruft, entsteht keine automatisch verzögerte Prolog-Regel. Der Bau kann vor Beginn von `@run` rekursiv ausufern.

**Deshalb ist eine unbegrenzte rekursive `@ancestor`-Definition nicht als lauffähiges Beispiel dieses Primers enthalten.**

Was geht bereits?

- Vorfahren für eine **fest vorgegebene Zahl von Generationen** über endlich verschachtelte Goals.
- Abfragen einer **bereits vorhandenen, endlichen** Liste von Beziehungen.
- Suche nach gespeicherten Pfaden in JSON mit `@patho`.
- Graphpfade mit einer expliziten Referenzauflösung (`@graph`, `@nodeo`, `@patho`).

Was fehlt für Prolog-artige allgemeine Rekursion? Insbesondere eine **verzögerte Goal-Ausführung** beziehungsweise ein Mechanismus, der rekursive Relationen erst bei der Suche erweitert, statt schon beim Zusammenbauen des Ausdrucks. Dies wäre eine Bibliotheks-/Host-Erweiterung; sie ist **nicht** Teil der heutigen API.

---

# Teil IV – Prolog-Ideen auf echten JSON-Daten

## Lektion 20: `@membero` – ein Fakt aus einer vorhandenen Tabelle

Stellen wir uns eine Tabelle von Bestellungen vor:

```json
[
  {"customer":"ada","item":"book"},
  {"customer":"bob","item":"pen"},
  {"customer":"ada","item":"lamp"}
]
```

Mit `@membero` wählen wir nicht einfach den ersten passenden Datensatz aus. Wir erhalten **einen logischen Suchzweig pro passendem Arrayelement**.

```json
["@run", 10, "!Item",
  ["@membero",
    [
      {"customer":"ada","item":"book"},
      {"customer":"bob","item":"pen"},
      {"customer":"ada","item":"lamp"}
    ],
    {"customer":"ada","item":"!Item"}]]
```

**Erwartetes Ergebnis:** `["book","lamp"]`.

Die Ergebnisse folgen der Reihenfolge der Einträge im Eingabearray.

### Eine unbekannte Faktenstruktur

Wenn alle Elemente unterschiedliche Felder besitzen, scheitert ein exaktes Objektmuster manchmal. Das ist keine Einschränkung der Logik an sich, sondern eine konkrete Eigenschaft von `@membero`: **Es benutzt strukturelle Unifikation.** Ein Objekt mit zusätzlichen Schlüsseln vereinigt sich nicht mit einem kleineren Objekt.

Die nächste Lektion zeigt das passende Werkzeug.

## Lektion 21: `@matcho` – ein Teilmuster genügt

Nehmen wir einen Datensatz mit vielen Feldern:

```json
{"name":"Ada","city":"Berlin","age":36,"team":"Research"}
```

Vielleicht interessiert uns nur die Stadt. `@unify` erwartet bei Objekten dieselben Schlüssel. `@matcho` erlaubt dagegen ein Muster mit weniger Feldern:

```json
["@run", 1, "!Name",
  ["@matcho",
    {"name":"Ada","city":"Berlin","age":36,"team":"Research"},
    {"name":"!Name","city":"Berlin"}]]
```

**Erwartetes Ergebnis:** `["Ada"]`.

Das Muster nennt nur `"name"` und `"city"`. Die Felder `"age"` und `"team"` werden ignoriert.

Wichtig: **Arrays werden bei normalem `@matcho` positionsweise und mit gleicher Länge verglichen.** Ein kleineres Arraymuster durchsucht nicht automatisch ein längeres Array. Für eine Suche über Arrayelemente nehmen wir `@membero` oder `@some`.

### Wiederholte Namen im Teilmuster

```json
["@run", 1, "!X",
  ["@matcho",
    {"a":5,"b":5,"comment":"equal"},
    {"a":"!X","b":"!X"}]]
```

**Erwartetes Ergebnis:** `[5]`.

Ändere `"b":5` auf `"b":6`: Dann gibt es keine Lösung mehr.

## Lektion 22: `@record` und `@some` – „ein passender Eintrag existiert“

Ein typischer Prolog-Gedanke lautet: „Es gibt mindestens ein Listenelement mit diesen Eigenschaften.“

In fjson können wir bei `@matcho` den Musterkonstruktor `@some` einsetzen. Ein `@record` markiert ein partielles Objektmuster.

```json
["@run", 10, "!City",
  ["@matcho",
    {"name":"Ada","addresses":[
      {"kind":"home","city":"Berlin","zip":"10115"},
      {"kind":"office","city":"Munich","zip":"80331"}
    ]},
    ["@record", {"addresses":
      ["@some", ["@record", {"kind":"office","city":"!City"}]]}]]]
```

**Erwartetes Ergebnis:** `["Munich"]`.

### Was passiert hier?

1. `@record` prüft die äußere Objektstruktur, ohne alle Felder zu verlangen.
2. `@some` geht mögliche Elemente des vorhandenen `addresses`-Arrays durch.
3. Das innere `@record` verlangt `"kind":"office"` und bindet die Stadt.
4. `@run` sammelt die Belegungen von `!City`.

`@some` erzeugt **keine** Elemente in einem völlig unbekannten Array. Es untersucht ein bereits vorhandenes Array. So vermeidet fjson, scheinbar beliebige JSON-Dokumente erfinden zu müssen.

**Übung:** Ändere `"office"` in `"home"`. **Lösung:** `["Berlin"]`.

## Lektion 23: `@patho` – Pfade als Fragen

Verschachtelte JSON-Daten kann man über **Pfade** ansprechen. Ein Pfad ist eine Liste von Schlüsseln und Zahlen. Listenplätze beginnen bei `0`.

```json
["@run", 1, "!City",
  ["@patho",
    {"user":{"address":{"city":"Berlin"}}},
    ["user","address","city"],
    "!City"]]
```

**Erwartetes Ergebnis:** `["Berlin"]`.

Viel spannender: Wir können den **Pfad selbst** suchen!

```json
["@run", 10, "!Path",
  ["@patho",
    {"user":{"address":{"city":"Berlin"}}},
    "!Path",
    "Berlin"]]
```

**Erwartetes Ergebnis:** `[["user","address","city"]]`.

Das ist ein schönes Beispiel für relationale Programmierung: Eine Relation kann mit unterschiedlichen bekannten und unbekannten Argumenten benutzt werden.

### Pfade sind nicht Zeichenketten

`["user","address","city"]` besteht aus **drei Pfadsegmenten**. Ein Feld namens `"user.address.city"` wäre dagegen **ein einzelner Schlüssel**, falls es genau so im JSON steht.

### Grenze

`@patho` kann Paare aus Pfad und Wert **eines bekannten Datenwerts** auflisten. Es erzeugt nicht beliebige neue JSON-Strukturen, wenn der gesamte Datenwert noch ungebunden ist.

## Lektion 24: Verzögerte Bedingungen – `@neqo` und `@ge`

Logische Bedingungen sollten möglichst erst dann geprüft werden, wenn die nötigen Belegungen feststehen.

### Ungleichheit mit `@neqo`

```json
["@run", 1, "!X",
  ["@conj",
    ["@neqo", "!X", 1],
    ["@unify", "!X", 2]]]
```

**Erwartetes Ergebnis:** `[2]`.

`@neqo` bedeutet nicht „ändere den Wert“; es bedeutet „diese beiden Terme dürfen am Ende nicht gleich sein“.

### Zahlenvergleich mit `@ge`

`@ge` ist **hier ein verzögertes logisches Goal** mit der Bedeutung „größer oder gleich“, nicht bloß ein numerischer Vergleich im normalen fjson-Ausdruck.

```json
["@run", 1, "!Age",
  ["@conj",
    ["@ge", "!Age", 18],
    ["@unify", "!Age", 21]]]
```

**Erwartetes Ergebnis:** `[21]`.

Mit `17` statt `21` wäre das Ergebnis `[]`.

### Was passiert, wenn die Bedingung offen bleibt?

```json
["@run", 1, "!Age", ["@ge", "!Age", 18]]
```

**Erwartetes Ergebnis:** `[]`.

Warum nicht „alle Zahlen ab 18“? Weil die heutige Bibliothek keine unendliche mathematische Menge als Antwort erzeugt und kein vollständiger Constraint-Solver für offene Zahlenbereiche ist. Sie kann die Bedingung prüfen, **sobald Zahlenwerte gebunden sind**.

## Lektion 25: `@project` – Berechnen in einem logischen Programm

Manchmal brauchen wir eine gewöhnliche fjson-Funktion innerhalb einer Relation. Beispielsweise möchten wir aus `!Age` das Alter im nächsten Jahr berechnen.

```json
["@run", 1, "!NextAge",
  ["@conj",
    ["@unify", "!Age", 28],
    ["@project", "@plus", ["!Age", 1], "!NextAge"]]]
```

**Erwartetes Ergebnis:** `[29]`.

`@project` wartet darauf, dass **alle Funktionsargumente einen konkreten Wert haben**. Dann ruft es `@plus` auf und vereinigt das Ergebnis mit `!NextAge`.

Die Reihenfolge der Goal-Erzeugung ist nicht entscheidend für die arithmetische Abhängigkeit:

```json
["@run", 1, "!NextAge",
  ["@conj",
    ["@project", "@plus", ["!Age", 1], "!NextAge"],
    ["@unify", "!Age", 28]]]
```

**Erwartetes Ergebnis:** `[29]`.

Die Projektionsbedingung wird aufgeschoben, bis `!Age` einen Wert erhalten hat.

### Wichtige Grenze: nicht automatisch rückwärts rechnen

Wenn `!NextAge = 29` bekannt ist, kann `@project("@plus",[!Age,1],!NextAge)` daraus **nicht automatisch** `!Age = 28` gewinnen. `@plus` bleibt eine gewöhnliche vorwärtsgerichtete Berechnung und ist kein vollwertiges arithmetisches Prolog-Prädikat. Dafür wären zusätzliche relationale Arithmetik- oder Constraint-Funktionen nötig.

### Nebenwirkungen vermeiden

Weil eine logische Suche Alternativen verfolgt, sollten projizierte Funktionen möglichst **rein** sein: Sie lesen oder berechnen Werte, ohne Dateien zu ändern oder Netzwerkanfragen auszulösen. Die Host-Sicherheitsregeln werden bei Projektionen weiterhin geprüft; bereits ausgelöste externe Effekte könnten bei einem später scheiternden Suchzweig nicht einfach zurückgenommen werden.

---

# Teil V – Graphen und größere Abfragen

## Lektion 26: Was ist ein Graph – und was hat das mit Prolog zu tun?

Ein **Graph** besteht aus Knoten und Kanten. Ein Knoten ist beispielsweise eine Person oder eine Firma; eine Kante kann bedeuten „arbeitet bei“, „hat eine Adresse“ oder „kennt“.

JSON enthält von Natur aus solche Beziehungen: Ein Objektschlüssel zeigt auf einen Wert, ein Arrayindex auf ein Element. fjson kann JSON deshalb als Graph betrachten.

```json
["@run", 1, "!City",
  ["@patho",
    {"name":"Ada","address":{"city":"Berlin"}},
    ["address","city"],
    "!City"]]
```

**Erwartetes Ergebnis:** `["Berlin"]`.

Für diese einfache Baumstruktur benötigen wir nicht einmal `@graph`. Erst wenn wir **Knotenidentität**, Kanten oder **Referenzverknüpfungen** wollen, wird die Graphsicht besonders nützlich.

## Lektion 27: `@graph`, `@edgeo` und `@nodeo`

`@graph` erstellt eine Sicht auf ein JSON-Dokument. Objektschlüssel und Arrayindizes werden zu gerichteten Kanten.

```json
["@let",
  {"@g": ["@graph", {"address":{"city":"Berlin"}}]},
  ["@run", 1, "!City",
    ["@conj",
      ["@edgeo", "@g", "address", "!Address"],
      ["@edgeo", "!Address", "city", "!City"]]]]
```

**Erwartetes Ergebnis:** `["Berlin"]`.

Hier ist `!Address` ein **Knoten-Handle**, das auf das innere Objekt verweist. Wir verwenden dieses Handle direkt als Ausgangspunkt der zweiten Kante.

### IDs: einen bestimmten Knoten finden

```json
["@let",
  {"@g": ["@graph", {"people":[{"id":"p1","name":"Ada"}]}]},
  ["@run", 1, "!Name",
    ["@conj",
      ["@nodeo", "@g", "p1", "!Person"],
      ["@edgeo", "!Person", "name", "!Name"]]]]
```

**Erwartetes Ergebnis:** `["Ada"]`.

`@nodeo` sucht ein Objekt anhand eines String-Feldes `"id"`. Es kann auch alle vorhandenen IDs auflisten, wenn die ID selbst eine logische Variable ist. Knoten-Handles sind Laufzeitwerte, keine gewöhnlichen JSON-Dictionaries.

## Lektion 28: `$ref` – Verbindungen über Objekte hinweg

Ein JSON-Dokument kann explizite Referenzen enthalten:

```json
{
  "people": [{"id":"p1","name":"Ada","worksAt":{"$ref":"c1"}}],
  "companies": [{"id":"c1","name":"Example Lab","city":"Munich"}]
}
```

Normalerweise ist `{ "$ref":"c1" }` einfach ein kleines JSON-Objekt. Wenn wir jedoch `@graph` mit `{"refs":true}` verwenden, wird eine Referenz auf das Objekt mit `"id":"c1"` aufgelöst.

```json
["@let",
  {"@g": ["@graph",
    {
      "people": [{"id":"p1","name":"Ada","worksAt":{"$ref":"c1"}}],
      "companies": [{"id":"c1","name":"Example Lab","city":"Munich"}]
    },
    {"refs":true}]},
  ["@run", 1, "!City",
    ["@conj",
      ["@nodeo", "@g", "p1", "!Person"],
      ["@patho", "!Person", ["worksAt","city"], "!City"]]]]
```

**Erwartetes Ergebnis:** `["Munich"]`.

Das ist eine echte Graphnavigation: Vom Personenknoten führt `worksAt` nicht zu einem normalen Datenobjekt mit dem Feld `$ref`, sondern zum Firmenknoten.

**Wichtig:** Nur Objekte, die *genau* das String-Feld `$ref` enthalten, werden als Referenz interpretiert. Ungültige oder nicht auflösbare IDs können Fehler auslösen. Referenzverfolgung muss explizit eingeschaltet werden.

## Lektion 29: Mini-Projekt – eine Empfehlungsregel

Wir wollen mit sehr einfachen Fakten herausfinden, wem wir ein bestimmtes Getränk empfehlen können. Die Regel lautet: **Eine Person ist eine Kandidatin oder ein Kandidat, wenn sie oder er ein Getränk mag und dieses Getränk verfügbar ist.**

Das klingt banal, ist aber genau die Form, aus der große Regelsysteme aufgebaut werden: mehrere Relationen, eine gemeinsame Variable und eine Anfrage.

```json
["@let",
  {
    "@likes": [
      {"person":"alice","drink":"tea"},
      {"person":"bob","drink":"coffee"},
      {"person":"cara","drink":"tea"}
    ],
    "@available": ["tea", "water"],
    "@recommend": ["@function", ["@person","@drink"],
      ["@conj",
        ["@membero", "@likes", {"person":"@person","drink":"@drink"}],
        ["@membero", "@available", "@drink"]]]
  },
  ["@run", 10, {"person":"!P","drink":"!D"},
    ["@recommend", "!P", "!D"]]]
```

**Erwartetes Ergebnis:** `[{"person":"alice","drink":"tea"},{"person":"cara","drink":"tea"}]`.

### Schrittweise Erklärung

1. Die Liste `@likes` stellt eine Faktenrelation dar.
2. Die Liste `@available` stellt eine zweite Relation dar.
3. Die Funktion `@recommend` baut ein `@conj`-Goal: Eine passende Vorliebe **und** ein verfügbares Getränk müssen existieren.
4. `!P` und `!D` sind die gesuchten Werte.
5. `@run` sammelt bis zu zehn Lösungen.

### Neue Fragen ohne neue Regel

- Welche Getränke kann man Alice empfehlen? Übergib `"alice"` statt `"!P"` und gib `"!D"` aus.
- Wem lässt sich Tee empfehlen? Übergib `"tea"` statt `"!D"` und gib `"!P"` aus.
- Welche Paare erfüllen die Regel? Lass beide Positionen offen wie im Beispiel.

Das ist der Kern des Prolog-Denkens: **Eine Regel, mehrere Fragerichtungen.**

### Erweiterungsaufgabe

Füge eine Liste `@forbidden` hinzu und verbiete mit `@neqo` bestimmte Werte. Zum Beispiel soll Wasser nicht empfohlen werden. Überlege zuerst, ob du eine konkrete Belegung brauchst oder ob du tatsächlich ein zusätzliches Goal über die Daten erstellen willst.

## Lektion 30: Klassisches Prolog und heutiges fjson im Vergleich

| Klassisches Prolog | fjson 0.3 / Logic | Status / Unterschied |
|---|---|---|
| `X`, `Y` als ungebundene Variablen | `"!X"`, `"!Y"` | Vorhanden; Großbuchstaben nach `!` |
| Ein Term `parent(alice,bob)` | `["parent","alice","bob"]` | Als JSON-Daten repräsentierbar |
| Unifikation `X = bob` | `["@unify","!X","bob"]` | Goal, mit `@run` ausführbar |
| Konjunktion `A, B` | `["@conj",goalA,goalB]` | Zwei Goals |
| Disjunktion `A ; B` | `["@choice",goalA,goalB]` | Zwei Alternativen |
| Logische Variable als Antwort | `@run(limit,query,goal)` | Ergebnisliste |
| Faktensuche | `@membero` | Über vorhandene Arrays |
| Strukturelle Teilmuster | `@matcho`, `@record` | Vorhanden |
| Existenz eines Arrayelements | `@some` | Innerhalb von Mustern |
| Ungleichheit | `@neqo` | Verzögerte Prüfung |
| Numerischer Mindestwert | `@ge` | Verzögerte Prüfung mit konkreten Zahlen |
| Rechnen mit bekannten Eingaben | `@project` | Vorwärts, kein vollständiger Constraint-Solver |
| Regeln als Klauseln | `@function`, die Goals erzeugt | Explizite Relation statt Klauseldatenbank |
| Frische lokale Regelvariablen | frischer `!`-Scope pro Funktionsaufruf | Vorhanden |
| Automatische rekursive Klauseln | noch nicht | Goal-Verzögerung fehlt |
| Unbegrenzte / faire Suche | noch nicht | Endlicher Goal-Baum, Tiefensuche |
| Cut (`!` in Prolog) | noch nicht | fjson-`!X` hat **nichts** mit dem Prolog-Cut zu tun |
| Dynamische Fakten (`assertz`, `retract`) | noch nicht | Keine globale Prolog-Faktenbasis |
| Listenmuster `[H|T]` | nicht als eigene Syntax | JSON-Listen + explizite Operationen |
| Gerichtete Graphkanten | `@graph`, `@edgeo`, `@patho` | Vorhanden, über JSON-Graphsicht |

### Ein kleiner, wichtiger Unterschied: Prolog-`!` ist nicht fjson-`!X`

In manchen Prolog-Lehrbüchern steht ein einzelnes `!` für **Cut**: Es kann die Suche abschneiden. In fjson bedeutet das Präfix `!` vor einem **Großbuchstaben** dagegen eine **logische Variable**. Diese Konzepte haben nichts miteinander zu tun. Ein fjson-Ausdruck `"!X"` ist also kein Cut, sondern eine offene Variable namens `X`.

### Auch „Variablen“ sind nicht alle gleich

In klassischem Prolog gelten etwa `X` und `_Tmp` als Variablen. In fjson sind logische Variablen ausdrücklich `"!X"` und `"!Tmp"`; der String `"_Tmp"` ist nur Text. Außerdem gibt es in fjson normale `@`-Variablen, die über `@let` und `@function` gebunden werden.

---

# Anhang A – Spickzettel für fjson-Prolog

| Ausdruck | Lies ihn als |
|---|---|
| `"!X"` | Gesuchter / offener Wert X |
| `"@x"` | Bereits gebundener normaler Name |
| `["@unify",A,B]` | A und B sollen vereinbar sein |
| `["@run",10,Q,G]` | Finde höchstens 10 Belegungen von Q, die G erfüllen |
| `["@choice",G1,G2]` | G1 **oder** G2 |
| `["@conj",G1,G2]` | G1 **und** G2 |
| `["@membero",Xs,X]` | X ist ein Element der bekannten Liste Xs |
| `["@matcho",D,P]` | Das bekannte D passt zum Teilmuster P |
| `["@record",F]` | Partielles Objektmuster mit Feldern F |
| `["@some",P]` | Mindestens ein passendes Arrayelement innerhalb eines Musters |
| `["@patho",D,P,V]` | Pfad P im bekannten JSON D hat Wert V |
| `["@neqo",A,B]` | A und B müssen verschieden sein |
| `["@ge",A,B]` | A muss eine Zahl ≥ B sein |
| `["@project",F,Args,R]` | Berechne F(Args), wenn Args gebunden sind, und vereinige mit R |
| `["@graph",D]` | Interpretiere bekanntes JSON D als Graphsicht |
| `["@edgeo",S,K,T]` | Eine direkte Kante K von S nach T |
| `["@nodeo",G,Id,N]` | Knoten N hat in Graph G die ID Id |

Die meisten relationalen Funktionen **erzeugen Goals**, sie liefern nicht sofort ein `true` oder `false`. Das Ergebnis entsteht, wenn `@run` die Goal-Struktur durchsucht.

# Anhang B – Die zehn häufigsten Anfängerfehler

1. **`"@X"` statt `"!X"`:** Ein `@`-Name wird nachgeschlagen; er ist keine ungebundene Variable.
2. **`"!x"` mit kleinem x:** Das ist gewöhnlicher Text; korrekt wäre `"!X"`.
3. **`@unify` als direktes Ergebnis erwarten:** `@unify` erzeugt ein Goal; führe es mit `@run` aus.
4. **`@and` statt `@conj`:** `@and` ist normaler Kurzschluss; `@conj` verknüpft Suchbedingungen.
5. **`@membero` mit einem zu kleinen Objektmuster:** Exakte Unifikation ist nicht dasselbe wie partielle Mustererkennung.
6. **`@matcho` als freie Array-Suche verwenden:** Arrays brauchen gleiche Länge; für Elemente eignen sich `@membero` oder `@some`.
7. **`@run` mit Limit `0` als „unbegrenzt“ verstehen:** `0` bedeutet null Ergebnisse.
8. **`@project` rückwärts als Gleichungslöser verwenden:** Die Argumente müssen konkret werden, damit die Funktion aufgerufen werden kann.
9. **Eine beliebig rekursive Regel bauen:** Der aktuelle Sucher erwartet bereits konstruierte, endliche Goals.
10. **`@quote` um eine logische Variable setzen:** Dann entsteht wörtlicher Text statt eines offenen logischen Werts.

### Drei typische Fehlversuche

Falsch, wenn du eine logische Variable möchtest:

```json
["@run", 1, "!X", ["@unify", ["@quote","!X"], 42]]
```

**Erwartetes Ergebnis:** `[]`, weil der wörtliche String `"!X"` nicht mit der Zahl `42` übereinstimmt.

Richtig:

```json
["@run", 1, "!X", ["@unify", "!X", 42]]
```

**Erwartetes Ergebnis:** `[42]`.

Und als Beispiel für eine absichtlich gescheiterte Suche:

```json
["@run", 10, "!X", ["@conj", ["@unify","!X",1], ["@unify","!X",2]]]
```

**Erwartetes Ergebnis:** `[]`. Das ist ein reguläres Suchergebnis, kein Syntaxfehler.

# Anhang C – Übungen mit Lösungen

## Aufgabe 1: Eine Variable bestimmen

Finde `!Color`, sodass sie `"green"` ist.

<details><summary>Lösung</summary>

```json
["@run", 1, "!Color", ["@unify", "!Color", "green"]]
```

Ergebnis: `["green"]`.
</details>

## Aufgabe 2: Zwei Variablen gleichzeitig

Finde `!X` und `!Y`, sodass sie den Werten `3` und `4` entsprechen.

<details><summary>Lösung</summary>

```json
["@run", 1, {"x":"!X","y":"!Y"},
  ["@unify", ["!X","!Y"], [3,4]]]
```

Ergebnis: `[{"x":3,"y":4}]`.
</details>

## Aufgabe 3: Ein Datum aus einer Liste suchen

Finde alle Lebensmittel, die Alice mag.

<details><summary>Lösung</summary>

```json
["@run", 10, "!Food",
  ["@membero",
    [
      {"person":"alice","food":"apple"},
      {"person":"bob","food":"pear"},
      {"person":"alice","food":"bread"}
    ],
    {"person":"alice","food":"!Food"}]]
```

Ergebnis: `["apple","bread"]`.
</details>

## Aufgabe 4: Eine Mindestalterregel

Welche Alterswerte aus den Alternativen `16` und `20` erfüllen `>=18`?

<details><summary>Lösung</summary>

```json
["@run", 10, "!Age",
  ["@conj",
    ["@choice", ["@unify","!Age",16], ["@unify","!Age",20]],
    ["@ge","!Age",18]]]
```

Ergebnis: `[20]`.
</details>

## Aufgabe 5: Einen fehlenden Weg finden

Suche den Pfad zum String `"Munich"`.

<details><summary>Lösung</summary>

```json
["@run", 10, "!Path",
  ["@patho", {"office":{"city":"Munich"}}, "!Path", "Munich"]]
```

Ergebnis: `[["office","city"]]`.
</details>

## Aufgabe 6: Eine Mini-Regel

Definiere eine Funktion `@isBlue`, die ein Goal erzeugt. Suche nach einer passenden Farbe.

<details><summary>Lösung</summary>

```json
["@let",
  {"@isBlue": ["@function", ["@color"], ["@unify","@color","blue"]]},
  ["@run",1,"!Color",["@isBlue","!Color"]]]
```

Ergebnis: `["blue"]`.
</details>

## Aufgabe 7: Mehrere gleiche Antworten verstehen

Führe diese Anfrage aus:

```json
["@run", 10, "!X",
  ["@choice", ["@unify","!X",1], ["@unify","!X",1]]]
```

**Erwartetes Ergebnis:** `[1,1]`. Warum zweimal? Weil zwei erfolgreiche Suchzweige existieren. Die Bibliothek behandelt Lösungswege nicht als mathematische Menge.

## Aufgabe 8: Ein Graph-Rätsel

Ein Objekt hat `"owner":{"id":"p1","name":"Ada"}`. Frage mit `@patho` nach dem Wert von `owner.name`.

<details><summary>Lösung</summary>

```json
["@run",1,"!Name",
  ["@patho",{"owner":{"id":"p1","name":"Ada"}},
    ["owner","name"],"!Name"]]
```

Ergebnis: `["Ada"]`.
</details>

# Anhang D – Einbindung in die fjson-IDE

Dieser Primer ist so aufgebaut, dass er als eigener Tutorial-Bereich **„Prolog mit fjson“** eingebunden werden kann:

- **Erklärung:** Verwende Titel, Absätze und kurze Tabellen der jeweiligen Lektion.
- **Beispiel:** Jede `json`-Codebox enthält einen vollständigen Ausdruck; die **Erwartete Ausgabe** steht unmittelbar darunter.
- **Experiment:** Biete nach jeder Lektion eine kleine Änderung des Programms an.
- **Lösung:** Übungen sind im Markdown teilweise mit einklappbaren `<details>`-Abschnitten versehen. Wenn die IDE kein HTML-Markdown rendert, lassen sich die Lösungen als separate Tutorial-Schritte anzeigen.
- **Unabhängigkeit:** Die meisten Lektionen enthalten `@let`-Definitionen und Beispieldaten direkt im Code, sodass man sie unabhängig laden kann. Das ist für eine IDE mit wechselnden Code-Tabs praktischer als globale Definitionen, die eine bestimmte Ausführungsreihenfolge erfordern.

## Vorschlag für automatische Tests

Für die IDE sollte jeder `json`-Block, der als **ausführbar** markiert wird, in Python und JavaScript mit einem frischen Interpreter getestet werden. Die Ergebnisse sollen mit den angegebenen Erwartungen verglichen werden. Die `prolog`-Blöcke sind **nur Lehrnotation** und dürfen nicht als fjson ausgeführt werden. Die `details`-Lösungen kann man ebenfalls automatisch extrahieren und prüfen. Zusätzlich sollte man Tests für gebrochene Constraints, offene Variablen, Occurs-Check und `$ref`-Fehler vorsehen.

## Prüfgrenzen

Ein `json`-Codeblock ist **syntaktisch** JSON, nicht automatisch korrektes fjson. Eine endgültige Integrationsprüfung muss daher wirklich den aktuellen fjson-Interpreter ausführen. Insbesondere Graph-Handles, Ressourcenlimits und Reihenfolgen bei größeren kombinierten Queries sind durch die Tests abzusichern. Der Primer vermeidet bewusst Features, die nur in künftigen Versionen geplant sind.

# Anhang E – Wohin wir fjson-Logik später erweitern könnten

Die aktuelle Bibliothek demonstriert bereits ungewöhnlich viel mit einem kleinen Sprachkern. Um Prolog noch näher zu kommen, wären mögliche **separate Bibliotheks-/Host-Erweiterungen**:

1. **Verzögerte rekursive Goals:** Funktionen können sich bei der Suche selbst aufrufen, ohne beim Goal-Aufbau endlos zu rekursieren.
2. **Regel-/Faktenmodule:** Relationen als nachladbare Daten und Regeln, aber ohne neue fjson-Kernsyntax.
3. **Faire Suche:** Verzahnung rekursiver Alternativen, damit ein unendlicher linker Zweig nicht alle rechten Zweige verhungern lässt.
4. **Mehr relationale Arithmetik:** Constraints wie `X + Y = Z`, bei denen mehrere Fragerichtungen wirklich unterstützt werden.
5. **Tabling / Memoisierung:** Schon gelöste Unterziele wiederverwenden, um manche rekursiven Abfragen effizient und terminierend auszuwerten.
6. **Graphregeln:** Explizite Erreichbarkeit, Zyklen und Pfadbedingungen auf dem vorhandenen Graphmodell.

Das sind **Perspektiven**, nicht vorhandene Funktionen. Der eingefrorene Kern 0.3 muss dafür nicht zwangsläufig geändert werden: Seine `!`-Variablen, Closures, `@apply` und Bibliotheksfunktionen geben eine gute Grundlage ab, solange neue semantische Fähigkeiten als externe Bibliotheken oder Host-Dienste implementiert werden.

---

## Zum Schluss: Die ganze Idee in einem Satz

**Mit fjson kannst du Daten nicht nur verarbeiten, sondern Bedingungen über Daten aufschreiben – und mit `!X` danach fragen, welche Werte diese Bedingungen erfüllen.**

Der wichtigste Lernschritt ist nicht, viele Befehle auswendig zu lernen. Er besteht darin, nicht mehr sofort in Schleifen und Zuweisungen zu denken, sondern in **Fakten, Relationen, unbekannten Werten und möglichen Lösungen**. Genau das macht die Prolog-Idee so produktiv – und genau diese Denkweise lässt sich in fjson mit gewöhnlichem JSON erlernen.

**Quellen im Repository:** `CORE.md`, `SEMANTICS.md`, `LOGIC.md`, `LOGIC_JSON.md`, `GRAPH.md`, `logic.py`, `graph.py`, `tests/test_logic.py`, `tests/test_graph.py` (soweit vorhanden).  
**Weiterführend:** `FJSON_LOGIC_GRAPH_PRIMER.md` vertieft relationale JSON-Abfragen und Graphen; `J_PRIMER_FJSON.md` behandelt die funktionale J-Erweiterung.
