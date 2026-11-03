# Logik für alle: Der große fjson-Primer für logische Variablen und JSON-Graphen

**Ein ausführlicher Einstieg für Menschen ohne Vorkenntnisse in Logikprogrammierung, Prolog, Graphen oder fjson**  
**Grundlage:** fjson-Sprachkern 0.3 sowie `LOGIC.md`, `LOGIC_JSON.md`, `GRAPH.md`, `logic.py` und `graph.py` (Stand: 3. November 2026).  
**Ziel:** Nach diesem Primer kannst du mit `!X` fragen, statt nur mit bekannten Werten zu rechnen; Daten durch Muster untersuchen, mehrere Lösungen finden und JSON als Graph durchsuchen.

> **Die wichtigste Idee:** Bei gewöhnlicher Programmierung weißt du oft, welche Eingaben du hast, und berechnest daraus ein Ergebnis. Bei der Logikprogrammierung kannst du eine *Beziehung* beschreiben und anschließend fragen: **Welche Werte machen diese Beziehung wahr?**

## So benutzt du diesen Primer

Du musst nichts über J, Prolog, Mathematik oder künstliche Intelligenz wissen. Wir beginnen mit Zahlen, Listen und einer einzigen unbekannten Variable. Danach steigern wir uns von kleinen Rätseln zu relationalen Abfragen und Graphnavigation.

**Praktische Hinweise:** Jeder `json`-Codeblock enthält genau **einen vollständigen JSON-Ausdruck**. Kopiere einen Block in den Code-Editor oder die Shell von **fjson Studio** und führe ihn aus. Erwartete Ausgaben stehen jeweils **unter** dem Codeblock und sind nicht Teil des Programms. In JSON sind `//`-Kommentare, nachgestellte Kommas und einfache Anführungszeichen nicht erlaubt. Die Beispiele verwenden die Standardfunktionen der vorhandenen fjson-Logik- und Graphbibliothek; ein separates J-Modul wird **nicht** benötigt.

**Notation:** Ein Name wie `@run` bezeichnet eine fjson-Funktion. Ein Name wie `!X` ist dagegen eine **logische Variable**. Ein Name ohne diese besonderen Präfixe, etwa `"alice"`, ist ein normaler Textwert. Die Großschreibung ist bei logischen Variablen entscheidend: `!X` ist eine Variable; `!x` ist nur ein String.

**Für die IDE:** Alle Beispiele mit direkt eingebauten Daten lassen sich unabhängig ausführen. Einige spätere Lektionen verwenden den rechten Daten-Tab `@data`; dort muss zuerst der angegebene Datensatz eingefügt werden. Bei zusammengesetzten Graphdaten sind zwei getrennte Codeblöcke für Daten und Abfrage angegeben.

## Inhaltsverzeichnis

**Teil I – Erste Begegnung:** 1. JSON verstehen · 2. Was bedeutet `!X`? · 3. Die erste Suche · 4. Ziele statt Wahrheitswerte · 5. Mehrere Lösungen

**Teil II – Beziehungen bauen:** 6. Zwei Bedingungen zugleich · 7. Listen vereinigen · 8. Objekte vereinigen · 9. Wiederholte Variablen · 10. Frische Variablen und Funktionen · 11. Offene Ergebnisse

**Teil III – JSON relational durchsuchen:** 12. Teilmuster mit `@matcho` · 13. Arrayelemente mit `@membero` · 14. `@record` und `@some` · 15. Verschachtelte Daten · 16. Pfade mit `@patho`

**Teil IV – Logik und Berechnung:** 17. Ungleichheit · 18. Zahlenbedingungen · 19. Berechnungen mit `@project` · 20. Goals als wiederverwendbare Funktionen

**Teil V – Graphen:** 21. Was ist ein Graph? · 22. `@edgeo` · 23. `@graph` und Knoten · 24. `@nodeo` und IDs · 25. `$ref`-Verweise · 26. Graphpfade

**Teil VI – Größere Projekte:** 27. Ein kleines Familienregister · 28. Produkt- und Bestelldaten · 29. Verknüpfte Personen und Firmen · 30. Übungen und Lösungen

**Anhang:** A. Spickzettel · B. Typische Fehler · C. Was fjson (noch) nicht ist · D. IDE-Integration und Testempfehlungen.

---

# Teil I – Erste Begegnung mit logischen Variablen

## Lektion 1: JSON ist gleichzeitig Datenformat und Programmsprache

### 1.1 Werte, Listen und Objekte

Ein JSON-Wert kann eine Zahl, ein Text, `true`, `false`, `null`, ein Array oder ein Objekt sein. Beginnen wir mit drei Beispielen:

```json
42
```

**Ergebnis:** `42`.

```json
["rot", "grün", "blau"]
```

**Ergebnis:** `["rot","grün","blau"]`.

```json
{"name": "Ada", "alter": 36}
```

**Ergebnis:** `{"name":"Ada","alter":36}`.

Ein **Array** (Liste) hat eine feste Reihenfolge; seine Plätze beginnen beim Index `0`. Ein **Objekt** hat Schlüssel wie `"name"` und zugehörige Werte. Mit `@get` kannst du auf einen Wert zugreifen:

```json
["@get", {"name": "Ada", "alter": 36}, "name"]
```

**Ergebnis:** `"Ada"`.

### 1.2 Ein Programm ist ebenfalls JSON

In fjson bedeutet ein Array, das mit einem Funktionsnamen `@...` beginnt, einen Funktionsaufruf:

```json
["@plus", 20, 22]
```

**Ergebnis:** `42`.

Die allgemeine Idee lautet `["@funktion", argument1, argument2, ...]`. Alle Funktionen stehen vorne (**Präfixschreibweise**). Wir brauchen also keine besondere Prolog- oder Graph-Abfragesprache zu lernen.

### 1.3 Zwei Sorten Namen: `@x` und `!X`

`@x` verweist auf einen *normalen* gebundenen Wert oder eine Funktion. `!X` bezeichnet eine *logische*, zunächst unbekannte Variable. Das ist ein grundlegender Unterschied.

```json
["@let", {"@x": 7}, ["@plus", "@x", 5]]
```

**Ergebnis:** `12`.

Hier ist `@x` ausdrücklich auf `7` festgelegt. Eine logische Variable `!X` soll dagegen bei einer Suche herausfinden, welchen Wert sie annehmen *kann*.

**Mini-Übung:** Ändere die `7` in `10`. Welche Zahl erwartest du? **Lösung:** `15`.

## Lektion 2: `!X` – eine Frage in einem Datenwert

Stell dir vor, du kennst diese Aussage:

> Alice ist Elternteil von Bob.

Wir können sie als gewöhnliche Liste darstellen:

```json
["parent", "alice", "bob"]
```

Was wäre, wenn uns das Kind nicht bekannt wäre? Wir würden die dritte Stelle offenlassen:

```json
["parent", "alice", "!X"]
```

Hier bedeutet `!X`: **Welcher Wert muss an dieser Stelle stehen, damit die Aussage passt?** Die Variable ist kein Platzhalter, den fjson sofort durch einen Default ersetzt. Sie wird bei einer erfolgreichen logischen Suche gebunden.

### 2.1 Variablen sind keine Textmakros

Zwei Vorkommen von `!X` innerhalb desselben relevanten Geltungsbereichs bezeichnen **dieselbe** Variable. `!Y` ist eine andere Variable. Dadurch kannst du gleiche Werte an mehreren Stellen verlangen.

Wichtig: Die gegenwärtige Schreibweise für logische Variablen folgt dem Muster `![A-Z][A-Za-z0-9_]*`. Beispiele sind `!X`, `!Person`, `!Address_2`. Andere Texte wie `!x` sind keine logischen Variablen.

### 2.2 Was passiert beim Zitieren?

```json
["@quote", "!X"]
```

**Ergebnis:** der wörtliche String `"!X"`, **keine** logische Variable. `@quote` ist wie ein Schild: „Nicht als Programm oder Spezialwert interpretieren!“ Das wird später wichtig, wenn du Quellcode oder Zeichenfolgen untersuchen willst.

## Lektion 3: Deine allererste logische Abfrage

Unsere erste Frage lautet: **Welcher Wert passt zu `!X`, wenn `!X` gleich 42 sein soll?**

```json
["@run", 1, "!X", ["@unify", "!X", 42]]
```

**Ergebnis:** `[42]`.

Lies den Ausdruck *von innen nach außen*:

1. `"!X"` ist eine noch unbekannte logische Variable.
2. `["@unify", "!X", 42]` erzeugt die Forderung: `!X` soll mit `42` vereinbar sein.
3. `"@run"` startet die Suche.
4. `1` ist die maximale Anzahl gewünschter Ergebnisse.
5. Das zweite `"!X"` sagt, **was** ausgegeben werden soll.
6. Die äußeren eckigen Klammern im Ergebnis stehen für die **Liste der gefundenen Lösungen**.

### 3.1 Eine Frage, die scheitert

```json
["@run", 1, "!X", ["@unify", 3, 4]]
```

**Ergebnis:** `[]`.

Die Behauptung `3 = 4` lässt sich nicht erfüllen. Ein leeres Ergebnis bedeutet: **In dieser Suche wurde keine Lösung gefunden.** Es ist kein Syntaxfehler und auch nicht der boolesche Wert `false`.

### 3.2 Man kann einen ganzen Term abfragen

```json
["@run", 1, ["Person", "!Name"], ["@unify", "!Name", "Ada"]]
```

**Ergebnis:** `[["Person","Ada"]]`.

Der äußere Array-Rahmen bezeichnet alle Lösungen, der innere ist unser selbstgewähltes Ergebnisformat.

### Übung

Formuliere die Frage „Welcher Wert passt zu `!Farbe`, wenn die Farbe `blau` ist?“

<details><summary>Lösung anzeigen</summary>

```json
["@run", 1, "!Farbe", ["@unify", "!Farbe", "blau"]]
```

Ergebnis: `["blau"]`.
</details>

## Lektion 4: Ein Goal ist kein gewöhnlicher Wahrheitswert

In JavaScript oder Python liefert ein Vergleich oft `true` oder `false`. fjson-Logik verwendet stattdessen ein **Goal** (Ziel). Ein Goal beschreibt eine Bedingung, die ein Suchverfahren später prüft.

```json
["@unify", "!X", 42]
```

Dieser Ausdruck erzeugt ein **Goal-Laufzeitobjekt**, nicht die Lösung `42`. Solche Laufzeitobjekte lassen sich nicht notwendigerweise als normales JSON ausgeben. Deshalb schreiben wir in unseren Beispielen fast immer:

```json
["@run", 1, "!X", ["@unify", "!X", 42]]
```

### 4.1 Warum ist diese Trennung wichtig?

Ein Goal ist wie ein kleiner Prüfauftrag. Mehrere solcher Prüfaufträge können vor der Suche zu einer größeren Bedingung zusammengesetzt werden. Erst `@run` untersucht die möglichen Bindungen der Variablen.

**Merksatz:** `@unify` **beschreibt** eine Vereinbarkeit; `@run` **sucht** Lösungen.

## Lektion 5: Mehrere Antworten finden – `@choice`

Vielleicht gibt es mehrere passende Werte. Dann verwenden wir `@choice`: **Entweder das linke Goal oder das rechte Goal darf erfolgreich sein.**

```json
["@run", 2, "!X", ["@choice", ["@unify", "!X", "alice"], ["@unify", "!X", "bob"]]]
```

**Ergebnis:** `["alice","bob"]`.

Die beiden Möglichkeiten werden in Quellreihenfolge besucht: erst links, dann rechts. Das ist ein **logisches Oder** für die Suche, nicht das normale kurzschließende `@or` aus fjson.

### 5.1 Das Lösungslimit verstehen

```json
["@run", 1, "!X", ["@choice", ["@unify", "!X", "alice"], ["@unify", "!X", "bob"]]]
```

**Ergebnis:** `["alice"]`.

Das heißt **nicht**, dass `"bob"` falsch wäre. Wir haben lediglich nach maximal einer Lösung gefragt. Deshalb sollte man das Limit bei Erkundungen bewusst wählen.

```json
["@run", 0, "!X", ["@unify", "!X", "alice"]]
```

**Ergebnis:** `[]` – null angeforderte Lösungen bedeuten immer eine leere Ergebnisliste.

---

# Teil II – Beziehungen aus mehreren Bedingungen

## Lektion 6: Zwei Bedingungen gleichzeitig – `@conj`

`@conj` heißt **Konjunktion**. Das bedeutet: **Beide** Bedingungen müssen erfüllt sein.

```json
["@run", 2, "!X", ["@conj", ["@choice", ["@unify", "!X", 1], ["@unify", "!X", 2]], ["@unify", "!X", 2]]]
```

**Ergebnis:** `[2]`.

Schritt für Schritt:

1. Die erste Teilbedingung lässt `!X = 1` **oder** `!X = 2` zu.
2. Die zweite Teilbedingung fordert `!X = 2`.
3. Der Zweig mit `1` scheitert. Der Zweig mit `2` gelingt.
4. Es bleibt genau die Lösung `2`.

Du kannst `@choice` und `@conj` beliebig schachteln. Beachte jedoch: In der derzeitigen Implementierung kombinieren beide Funktionen **genau zwei** Goals. Für drei Bedingungen schachtelst du zwei `@conj`-Aufrufe.

### 6.1 Zwei unbekannte Werte

```json
["@run", 1, {"first": "!A", "second": "!B"}, ["@conj", ["@unify", "!A", 10], ["@unify", "!B", 20]]]
```

**Ergebnis:** `[{"first":10,"second":20}]`.

Du kannst also ein Ergebnisobjekt aufbauen, obwohl die Werte beim Schreiben der Anfrage noch unbekannt sind.

### 6.2 Warum ist `@conj` keine Veränderung eines Speicherplatzes?

Jeder Suchzweig bekommt seine eigene Bindungssituation. Scheitert ein Zweig, „verdirbt“ seine versuchte Bindung die anderen Zweige nicht. Dies ist ein wesentlicher Unterschied zu einer Reihe von veränderbaren Variablenzuweisungen.

## Lektion 7: Listen vereinigen – strukturierte Unifikation

Bisher haben wir einzelne Zahlen und Strings verglichen. `@unify` kann aber auch **ganze Listen** elementweise vergleichen:

```json
["@run", 1, "!X", ["@unify", ["red", "!X", "blue"], ["red", "green", "blue"]]]
```

**Ergebnis:** `["green"]`.

Die erste und die dritte Position stimmen überein. Die zweite Position bindet `!X` an `"green"`.

### 7.1 Listenlängen müssen stimmen

```json
["@run", 1, "!X", ["@unify", [1, "!X"], [1, 2, 3]]]
```

**Ergebnis:** `[]`.

`@unify` ist bei Listen **exakt**. Es lässt keine zusätzlichen Elemente zu. Wenn du ein Element aus einer Liste auswählen möchtest, verwende später `@membero`.

### 7.2 Wiederholung als Gleichheitsbedingung

```json
["@run", 1, "!X", ["@unify", ["!X", "!X"], [7, 7]]]
```

**Ergebnis:** `[7]`.

```json
["@run", 1, "!X", ["@unify", ["!X", "!X"], [7, 8]]]
```

**Ergebnis:** `[]`.

Die Variable `!X` darf nicht zugleich `7` und `8` bedeuten.

## Lektion 8: Objekte vereinigen – Schlüssel und Werte

Ein JSON-Objekt hat Schlüssel und Werte. Auch diese kann fjson strukturell vereinigen:

```json
["@run", 1, "!Name", ["@unify", {"name": "!Name", "age": 36}, {"name": "Ada", "age": 36}]]
```

**Ergebnis:** `["Ada"]`.

### 8.1 Exakte Unifikation ist kein „enthält“-Test

```json
["@run", 1, "!Name", ["@unify", {"name": "!Name"}, {"name": "Ada", "age": 36}]]
```

**Ergebnis:** `[]`.

Das zweite Objekt hat einen zusätzlichen Schlüssel `"age"`. `@unify` verlangt bei Objekten **dieselbe Schlüsselmenge**. Die Reihenfolge der Schlüssel ist dagegen nicht wichtig. Für Teilmuster lernen wir später `@matcho` kennen.

### 8.2 JSON-Typen sind nicht immer austauschbar

```json
["@run", 1, "!X", ["@unify", true, 1]]
```

**Ergebnis:** `[]`. `true` ist in der Logikbibliothek nicht die Zahl `1`, auch wenn manche Programmiersprachen diese Werte numerisch ähnlich behandeln.

## Lektion 9: Derselbe Name, dieselbe Variable – aber nur im richtigen Scope

Eine logische Variable ist nicht einfach eine Textfolge. Intern besitzt sie eine **Identität**. Innerhalb eines obersten Aufrufs bzw. eines Funktionsaufrufs werden gleiche `!`-Namen nach den festgelegten Scope-Regeln aufgelöst.

```json
["@run", 1, {"x": "!X", "y": "!Y"}, ["@conj", ["@unify", "!X", 3], ["@unify", "!Y", 3]]]
```

**Ergebnis:** `[{"x":3,"y":3}]`.

Obwohl beide Variablen denselben **Wert** bekommen, bleiben sie zwei verschiedene logische Variablen.

### 9.1 `@let` ist kein neuer logischer Variablen-Scope

`@let` erzeugt einen normalen lexikalischen Geltungsbereich für `@...`-Namen. Es erzeugt **keinen** separaten `!`-Namensbereich. Darum darfst du dort weiter mit derselben `!X` arbeiten:

```json
["@let", {"@expected": 42}, ["@run", 1, "!X", ["@unify", "!X", "@expected"]]]
```

**Ergebnis:** `[42]`.

### 9.2 Eine neue oberste Auswertung ist neu

Wenn du in der IDE zwei separate Auswertungen mit dem Text `"!X"` startest, entstehen jeweils neue logische Variablen. Verwechsele deshalb die gleichlautenden **Namen** nicht mit einer über Sitzungen oder Aufrufe hinweg bestehenden Identität.

## Lektion 10: Funktionen bauen Beziehungen und erhalten frische Variablen

Wir können eine Beziehung als normale fjson-Funktion formulieren. Die Funktion soll ein Goal erzeugen – keine Zahl ausrechnen.

```json
["@let", {"@isBob": ["@function", ["@child"], ["@unify", ["parent", "alice", "@child"], ["parent", "alice", "bob"]]]}, ["@run", 1, "!X", ["@isBob", "!X"]]]
```

**Ergebnis:** `["bob"]`.

Die Funktion `@isBob` bekommt einen Wert oder eine logische Variable und erzeugt die Forderung, dass dieser Wert `"bob"` sein muss.

### 10.1 Frische interne Variablen

Ein Funktionsaufruf erzeugt einen frischen `!`-Namensbereich für intern verwendete logische Variablen. Das ist wichtig, wenn dieselbe Beziehungsfunktion mehrfach eingesetzt wird:

```json
["@let", {"@parent": ["@function", ["@child"], ["@unify", ["parent", "!Y", "@child"], ["parent", "alice", "bob"]]]}, ["@run", 1, "!X", ["@conj", ["@unify", "!X", "bob"], ["@parent", "!X"]]]]
```

**Ergebnis:** `["bob"]`.

Hier ist `!Y` **intern** zur Beziehungsfunktion, während `!X` **von außen** als Parameter hereingereicht wird. Wiederholte Aufrufe von `@parent` haben jeweils eigene interne `!Y`-Variablen.

**Wichtige Regel für eigene Funktionen:** Jede logische Variable, deren Bindung der Aufrufer erfahren soll, muss als Argument an die Funktion übergeben werden. Schreibe nicht versehentlich im Funktionskörper ein neues `!X`, wenn du eigentlich das von außen übergebene `!X` meintest.

## Lektion 11: Was passiert mit einer noch offenen Variable?

Eine Suche darf erfolgreich sein, obwohl die abgefragte Variable gar nicht festgelegt wurde.

```json
["@run", 1, "!X", ["@unify", 1, 1]]
```

**Ergebnis:** `[{"var":"X","index":0}]`.

Das ist **keine Bindung an ein Objekt mit `var` und `index`**. Es ist ein Marker in der JSON-Ausgabe, der sagt: `!X` ist nach dieser Suche noch ungebunden. Sein `index` unterscheidet offene Variablen innerhalb derselben Lösung.

### 11.1 Selbstreferenzen werden abgewiesen

```json
["@run", 1, "!X", ["@unify", "!X", ["node", "!X"]]]
```

**Ergebnis:** `[]`.

Warum? `!X` könnte nur gleich einer Liste sein, die wiederum `!X` enthält. Das wäre eine unendlich verschachtelte zyklische Bindung. Der **Occurs-Check** verhindert solche Zyklen.

---

# Teil III – Aus JSON-Daten Fragen machen

## Lektion 12: Teilmuster mit `@matcho`

Jetzt kommt ein besonders nützliches Werkzeug für reale JSON-Daten. Stell dir vor, du hast ein Personenobjekt:

```json
{"name":"Ada","age":36,"city":"London"}
```

Du möchtest nur nach dem Namen fragen. `@unify` wäre zu streng, weil das Objekt noch weitere Schlüssel besitzt. `@matcho` akzeptiert dagegen ein **partielles Objektmuster**:

```json
["@run", 1, "!Name", ["@matcho", {"name":"Ada","age":36,"city":"London"}, {"name":"!Name"}]]
```

**Ergebnis:** `["Ada"]`.

### 12.1 Der Unterschied in einem Satz

- `@unify`: Die komplette Struktur muss passen; bei Objekten die gesamte Schlüsselmenge.
- `@matcho`: Das Muster darf bei Objekten Schlüssel **weglassen**, die im Datenobjekt trotzdem vorhanden sind.

### 12.2 Verschachtelte Objekte

```json
["@run", 1, "!City", ["@matcho", {"name":"Ada","address":{"city":"London","zip":"SW1"}}, {"address":{"city":"!City"}}]]
```

**Ergebnis:** `["London"]`.

Der Mustervergleich kann rekursiv durch verschachtelte JSON-Objekte gehen.

### 12.3 Arrays bleiben bei `@matcho` positionsgenau

```json
["@run", 1, "!X", ["@matcho", [10,20,30], [10,"!X",30]]]
```

**Ergebnis:** `[20]`.

Das Muster `[20]` würde dagegen **nicht** irgendein Element des dreiteiligen Arrays finden: Auch bei `@matcho` müssen Arrays in ihrer Länge und Position passen. Dafür verwenden wir gleich `@membero` oder `@some`.

### Übung

Frage nach der Stadt im Objekt `{"user":{"name":"Mira","city":"Paris"},"active":true}`. Verwende ein partielles Muster.

<details><summary>Lösung anzeigen</summary>

```json
["@run", 1, "!City", ["@matcho", {"user":{"name":"Mira","city":"Paris"},"active":true}, {"user":{"city":"!City"}}]]
```

Ergebnis: `["Paris"]`.
</details>

## Lektion 13: Ein Element aus einer Liste finden – `@membero`

Angenommen, du hast `["red", "green", "blue"]`, weißt aber nicht, welches Element gesucht ist. `@membero` erzeugt für jedes **vorhandene** Element eine mögliche Lösung:

```json
["@run", 10, "!Color", ["@membero", ["red","green","blue"], "!Color"]]
```

**Ergebnis:** `["red","green","blue"]`.

Die Reihenfolge der Ergebnisse ist die Reihenfolge der Liste.

### 13.1 Ein Element muss zu einer Vorgabe passen

```json
["@run", 10, "!X", ["@conj", ["@membero", [1,2,3,4], "!X"], ["@unify", "!X", 3]]]
```

**Ergebnis:** `[3]`.

`@membero` liefert mögliche Werte, `@unify` filtert den gewünschten heraus.

### 13.2 Ganze Objekte als Elemente

```json
["@run", 10, "!Number", ["@membero", [{"type":"home","number":"111"},{"type":"office","number":"222"}], {"type":"office","number":"!Number"}]]
```

**Ergebnis:** `["222"]`.

**Achtung:** `@membero` vereinigt das *ganze* Element exakt. Enthielte das Büroobjekt zusätzlich beispielsweise `"country":"DE"`, würde das zweischlüsselige Muster nicht mehr exakt passen. Für solche Teilmuster kombinieren wir `@membero` mit `@matcho` oder verwenden `@some` und `@record`.

### 13.3 Eine ungebundene Liste wird nicht erfunden

`@membero` ist auf die Elemente einer **vorhandenen** Liste ausgelegt. Mit einer ungebundenen Listenquelle erzeugt es nicht automatisch beliebige mögliche Arrays. Das ist eine wichtige Beschränkung dieser endlichen Logikbibliothek.

## Lektion 14: `@some` und `@record` – das richtige Element durch ein Muster finden

Wir möchten alle Telefonnummern mit Typ `"office"` finden, aber die Objekte enthalten mehr Informationen als unser Muster.

```json
["@run", 10, "!Number", ["@matcho", {"phone":[{"type":"home","number":"111","verified":true},{"type":"office","number":"222","verified":false},{"type":"office","number":"333","verified":true}]}, ["@record", {"phone":["@some", ["@record", {"type":"office","number":"!Number"}]]}]]]
```

**Ergebnis:** `["222","333"]`.

Warum die beiden neuen Konstruktoren?

- `@record` sagt: **Dieses Objekt darf weitere Felder haben.** Das Muster benötigt nur die aufgeführten Schlüssel.
- `@some` sagt: **Probiere jedes Element dieses vorhandenen Arrays aus.** Jedes passende Element kann eine weitere Lösung liefern.

### 14.1 Was ist ein Konstruktor?

`@record` und `@some` führen nicht selbst die Suche durch. Sie erzeugen spezielle **Musterwerte**, die `@matcho` versteht. Im Kontext dieses Patterns können die passenden Stellen rekursiv untersucht werden.

### 14.2 Warum nicht einfach `@membero`?

`@membero` ist ideal für eine exakte Elementstruktur. `@some` zusammen mit `@record` ist ideal für eine **partielle** Struktur eines Elements, besonders wenn jedes Objekt zusätzliche Felder besitzt.

**Merke:** `@some` kann nicht aus einem völlig unbekannten Listenwert willkürlich neue Elemente erzeugen. Es untersucht existierende Listen.

## Lektion 15: Verschachtelte Daten – Schritt für Schritt

Nehmen wir eine kleine Datenbank von Schülern, die als ein einziges JSON-Objekt gespeichert ist:

```json
{"school":{"name":"Example School","students":[{"name":"Ada","grade":1},{"name":"Ben","grade":2},{"name":"Cara","grade":1}]}}
```

### 15.1 Alle Schülernamen finden

```json
["@run", 10, "!Name", ["@matcho", {"school":{"name":"Example School","students":[{"name":"Ada","grade":1},{"name":"Ben","grade":2},{"name":"Cara","grade":1}]}}, ["@record", {"school":["@record", {"students":["@some", ["@record", {"name":"!Name"}]]}]}]]]
```

**Ergebnis:** `["Ada","Ben","Cara"]`.

### 15.2 Nur Schüler aus Klasse 1

```json
["@run", 10, "!Name", ["@matcho", {"students":[{"name":"Ada","grade":1},{"name":"Ben","grade":2},{"name":"Cara","grade":1}]}, ["@record", {"students":["@some", ["@record", {"grade":1,"name":"!Name"}]]}]]]
```

**Ergebnis:** `["Ada","Cara"]`.

### 15.3 Eine zusätzliche Gleichheitsbedingung

```json
["@run", 10, "!Name", ["@matcho", {"students":[{"name":"Ada","grade":1},{"name":"Ben","grade":2},{"name":"Cara","grade":1}]}, ["@record", {"students":["@some", ["@record", {"grade":"!Grade","name":"!Name"}]]}]]]
```

**Ergebnis:** `["Ada","Ben","Cara"]`. Im ausgegebenen Ergebnis steht nur `!Name`, aber du könntest auch `{ "name":"!Name", "grade":"!Grade" }` als zweiten Parameter von `@run` verwenden, um beide Werte zu sehen.

## Lektion 16: Pfade durch JSON – `@patho`

Ein Pfad ist die Folge von Schlüsseln oder Arrayindizes, die vom äußeren JSON-Wert zu einer bestimmten Stelle führt.

Beispieldaten:

```json
{"address":{"city":"Berlin"},"tags":["science","music"]}
```

Der Pfad zur Stadt lautet `["address","city"]`. Der Pfad zum zweiten Tag lautet `["tags",1]`.

### 16.1 Ein Wert zu einem bekannten Pfad

```json
["@run", 1, "!City", ["@patho", {"address":{"city":"Berlin"},"tags":["science","music"]}, ["address","city"], "!City"]]
```

**Ergebnis:** `["Berlin"]`.

### 16.2 Einen Pfad zu einem bekannten Wert finden

```json
["@run", 1, "!Path", ["@patho", {"address":{"city":"Berlin"},"tags":["science","music"]}, "!Path", "music"]]
```

**Ergebnis:** `[["tags",1]]`.

Jetzt hat die unbekannte Variable die Rolle des **Pfades** übernommen, nicht mehr die des Werts. Das ist ein Beispiel für *relationales Programmieren*: Derselbe Operator kann unterschiedliche Fragen beantworten.

### 16.3 Alle Stellen untersuchen

```json
["@run", 10, {"path":"!P","value":"!V"}, ["@patho", {"a":1,"b":2}, "!P", "!V"]]
```

**Ergebnis:**

```json
[{"path":[],"value":{"a":1,"b":2}},{"path":["a"],"value":1},{"path":["b"],"value":2}]
```

`@patho` besucht zuerst die **Wurzel** (leerer Pfad) und anschließend die Kinder in Dokumentreihenfolge. Der leere Pfad `[]` ist also ein sinnvoller Pfad, kein Fehler.

### 16.4 Ein Punkt im Schlüsselnamen ist kein Pfadtrennzeichen

Beim Schlüssel `"Alternative.Address"` ist der Punkt Teil des Schlüssels. Der Pfad dazu könnte `["Other","Alternative.Address","City"]` lauten. fjson teilt solche Schlüssel nicht automatisch auf.

---

# Teil IV – Bedingungen, Berechnungen und wiederverwendbare Fragen

## Lektion 17: Ungleichheit als verzögerte Bedingung – `@neqo`

Wie fragst du: „Welcher Wert ist **nicht** 1?“ Eine gewöhnliche Suche kann nicht alle möglichen Werte des Universums aufzählen. Sie kann aber eine **endliche Auswahl** prüfen und zusätzlich die Ungleichheitsbedingung anwenden.

```json
["@run", 10, "!X", ["@conj", ["@membero", [1,2,3], "!X"], ["@neqo", "!X", 1]]]
```

**Ergebnis:** `[2,3]`.

### 17.1 Bedingungen dürfen vor einer Bindung stehen

```json
["@run", 1, "!X", ["@conj", ["@neqo", "!X", 1], ["@unify", "!X", 2]]]
```

**Ergebnis:** `[2]`.

`@neqo` darf zuerst auftreten, obwohl `!X` noch unbekannt ist. Das System **merkt sich** die Bedingung und prüft sie, sobald genügend Information vorhanden ist.

### 17.2 Offen heißt nicht automatisch gültig

```json
["@run", 1, "!X", ["@neqo", "!X", 1]]
```

**Ergebnis:** `[]`.

Die Bibliothek gibt keine scheinbar fertige Antwort für eine weiterhin ungeklärte Ungleichheit aus. Das ist wichtig: Ohne eine konkrete Bindung können wir die Bedingung nicht endgültig bestätigen.

## Lektion 18: Numerische Bedingungen mit `@ge`

`@ge(A,B)` ist ein logisches Goal für **A ≥ B**. Das ist nicht dasselbe wie ein sofort ausgeführter numerischer Vergleich.

```json
["@run", 10, "!Age", ["@conj", ["@membero", [12,18,21,9,42], "!Age"], ["@ge", "!Age", 18]]]
```

**Ergebnis:** `[18,21,42]`.

### 18.1 Bedingung vor Werten

```json
["@run", 10, "!Age", ["@conj", ["@ge", "!Age", 18], ["@membero", [12,18,21], "!Age"]]]
```

**Ergebnis:** `[18,21]`.

Wie bei `@neqo` wird die Bedingung verzögert geprüft. Anders als `@membero` erfindet `@ge` nicht aus dem Nichts beliebige Zahlen ab 18. Beide Seiten müssen für die abschließende Prüfung zu endlichen Zahlen aufgelöst werden.

**Achtung:** Es gibt im aktuellen fjson außerdem `@gte` als normalen numerischen Vergleich. `@ge` gehört dagegen zur **Logikbibliothek** und liefert ein Goal. Verwende für logische Abfragen `@ge`.

## Lektion 19: Berechnungen innerhalb einer Suche – `@project`

Bislang haben wir Werte gefunden und gefiltert. Manchmal möchten wir **aus einem gefundenen Wert etwas berechnen**. `@project` schlägt eine Brücke zur gewöhnlichen funktionalen fjson-Welt.

```json
["@run", 1, "!Next", ["@conj", ["@unify", "!Age", 28], ["@project", "@plus", ["!Age",1], "!Next"]]]
```

**Ergebnis:** `[29]`.

Der Ablauf:

1. `!Age` wird mit `28` vereinigt.
2. `@project` nimmt die **vollständig bekannten** Argumente `[28,1]`.
3. Es ruft die gewöhnliche Funktion `@plus` auf.
4. Der Rückgabewert `29` wird mit `!Next` vereinigt.

### 19.1 Projektion vor der Bindung

```json
["@run", 1, "!Next", ["@conj", ["@project", "@plus", ["!Age",1], "!Next"], ["@unify", "!Age", 28]]]
```

**Ergebnis:** `[29]`.

Die Projektion wartet, bis die Eingabeargumente feststehen.

### 19.2 Projektion ist keine automatische inverse Mathematik

Wenn du nur das Ergebnis `29` kennst, kann `@project` **nicht** automatisch nach allen Zahlen suchen, für die `x+1=29` gilt. Der Operator wartet auf gebundene Eingaben und ruft dann die vorhandene Funktion auf. Für wirklich bidirektionale Arithmetik wären weitere relationale Operatoren nötig.

### 19.3 Seitenwirkungen vermeiden

`@project` verwendet dieselbe Host-Sicherheitsprüfung wie normale Funktionsaufrufe. Eine Dateioperation oder ein Netzwerkaufruf wird nicht rückgängig gemacht, nur weil der Suchzweig später scheitert. Für relationale Berechnung solltest du daher **reine Funktionen** einsetzen.

## Lektion 20: Eigene Relationen als wiederverwendbare Funktionen

Ein großer Vorteil von fjson ist, dass eine normale Funktion **ein Goal zurückgeben** kann. Wir bauen eine kleine Relation `@adult`, die prüft, ob ein Alter mindestens 18 beträgt:

```json
["@let", {"@adult": ["@function", ["@age"], ["@ge", "@age", 18]]}, ["@run", 10, "!Age", ["@conj", ["@membero", [16,18,22], "!Age"], ["@adult", "!Age"]]]]
```

**Ergebnis:** `[18,22]`.

Die Funktion `@adult` verändert die Programmiersprache nicht. Sie baut einen Goal-Wert und kann mit `@conj` und `@choice` kombiniert werden.

### 20.1 Eine mehrteilige Relation

```json
["@let", {"@isAdultPerson": ["@function", ["@person", "@name"], ["@conj", ["@matcho", "@person", {"name":"@name","age":"!Age"}], ["@ge", "!Age", 18]]]}, ["@run", 1, "!N", ["@isAdultPerson", {"name":"Ada","age":36,"city":"London"}, "!N"]]]
```

**Ergebnis:** `["Ada"]`.

Die interne Variable `!Age` ist lokal frisch für diesen Funktionsaufruf. Die von außen angefragte Variable `!N` wird hingegen ausdrücklich über `@name` übergeben. **So entstehen wiederverwendbare Relationen ohne neue Syntax.**

---

# Teil V – JSON als Graph verstehen

## Lektion 21: Ein Graph ist zunächst nur ein Netz aus Knoten und Kanten

Stell dir ein JSON-Objekt wie einen kleinen Stadtplan vor. Das äußere Objekt ist ein **Knoten**. Jeder Schlüssel zeigt über eine **Kante** auf seinen Wert:

```json
{"person":{"name":"Ada","address":{"city":"London"}}}
```

Als Bild in Gedanken:

```text
(Wurzel)
  |
  +-- person --> (Person-Objekt)
                     |
                     +-- name ----> "Ada"
                     |
                     +-- address -> (Adress-Objekt)
                                      |
                                      +-- city --> "London"
```

Bei Arrays sind die Kanten statt Schlüsseln die Positionen `0`, `1`, `2`, ... . Anders als ein normaler JSON-Baum kann eine **Graphsicht mit expliziten Referenzen** später auch Verbindungen zwischen entfernten Objekten verfolgen.

### 21.1 Warum Graphen nützlich sind

Du musst nicht mehr jeden einzelnen Objektschlüssel manuell auslesen. Du kannst fragen: **Welche Kante führt wohin? Welche Pfade erreichen einen bestimmten Wert? Welcher Knoten hat eine bestimmte ID?** Die Logikvariablen machen diese Fragen besonders flexibel.

## Lektion 22: Direkte Kanten durchsuchen – `@edgeo`

`@edgeo(source, key, target)` beschreibt eine direkte Beziehung: Von `source` führt eine Kante mit Beschriftung `key` zu `target`.

```json
["@run", 10, {"key":"!Key","value":"!Value"}, ["@edgeo", {"name":"Ada","age":36}, "!Key", "!Value"]]
```

**Ergebnis:**

```json
[{"key":"name","value":"Ada"},{"key":"age","value":36}]
```

### 22.1 Ein bestimmtes Feld

```json
["@run", 1, "!Name", ["@edgeo", {"name":"Ada","age":36}, "name", "!Name"]]
```

**Ergebnis:** `["Ada"]`.

### 22.2 Ein Array als Ausgangspunkt

```json
["@run", 10, {"index":"!I","value":"!V"}, ["@edgeo", ["red","green"], "!I", "!V"]]
```

**Ergebnis:**

```json
[{"index":0,"value":"red"},{"index":1,"value":"green"}]
```

Der Name `@edgeo` endet wie viele relationale Operatoren auf `o`: Er formuliert ein Goal und nicht einfach nur einen `get`-Zugriff.

## Lektion 23: Eine echte Graphsicht mit `@graph`

Ein normales JSON-Objekt genügt für einfache Feld- und Pfadabfragen. `@graph` erzeugt zusätzlich eine **Graphsicht** mit **Knotenidentität** für zusammengesetzte Werte:

```json
["@let", {"@g": ["@graph", {"Address":{"City":"Winchester"}}]}, ["@run", 1, "!City", ["@patho", "@g", ["Address","City"], "!City"]]]
```

**Ergebnis:** `["Winchester"]`.

### 23.1 Graphsicht und Originaldokument

`@graph` kopiert oder verändert die Daten nicht. Es erstellt eine Sicht auf die vorhandene JSON-Struktur. Objekt- und Arrayknoten bekommen stabile Handles innerhalb dieser Graphinstanz; Skalare wie Zahlen oder Texte bleiben Skalare.

### 23.2 Was ist ein Knoten-Handle?

Ein Handle ist eine interne Referenz auf einen Graphknoten. Wenn `@run` einen solchen Knoten ausgibt, sieht man eine spezielle JSON-Darstellung wie:

```json
{"node":["Address"]}
```

Das bedeutet **Knoten an Dokumentposition `["Address"]`**, nicht ein gewöhnliches Datenobjekt aus der ursprünglichen Eingabe. Die Wurzel wird als `{"node":[]}` dargestellt.

## Lektion 24: Knoten anhand von IDs finden – `@nodeo`

Graphen werden besonders interessant, wenn einzelne Objekte eine ID besitzen. Wir erstellen zwei Personenobjekte:

```json
["@let", {"@g": ["@graph", {"people":[{"id":"person:ada","name":"Ada"},{"id":"person:ben","name":"Ben"}]}]}, ["@run", 1, "!Node", ["@nodeo", "@g", "person:ben", "!Node"]]]
```

**Ergebnis:** `[{"node":["people",1]}]`.

Das ist die Knotenposition des zweiten Eintrags, nicht sein kompletter kopierter Inhalt.

### 24.1 Die ID kann unbekannt sein

```json
["@let", {"@g": ["@graph", {"people":[{"id":"person:ada","name":"Ada"},{"id":"person:ben","name":"Ben"}]}]}, ["@run", 10, "!Id", ["@nodeo", "@g", "!Id", "!Node"]]]
```

**Ergebnis:** `["person:ada","person:ben"]`.

`@nodeo` funktioniert also sowohl als Nachschlagefunktion für eine bekannte ID als auch als Suche nach vorhandenen IDs. Der Index wird bei Bedarf erstellt; doppelte IDs führen zu einem Fehler, sobald der entsprechende Index verwendet wird.

### 24.2 Graphknoten weiter befragen

```json
["@let", {"@g": ["@graph", {"people":[{"id":"person:ada","name":"Ada"},{"id":"person:ben","name":"Ben"}]}]}, ["@run", 1, "!Name", ["@conj", ["@nodeo", "@g", "person:ben", "!Person"], ["@edgeo", "!Person", "name", "!Name"]]]]
```

**Ergebnis:** `["Ben"]`.

Hier sieht man den Vorteil zweier Goals: Das erste findet den Knoten, das zweite untersucht eine Kante von diesem Knoten.

## Lektion 25: Querverweise im Graphen – `$ref`

Normales JSON besitzt von sich aus keine Pointer. Man kann aber vereinbaren, dass ein Objekt mit **genau** einem Feld `$ref` auf eine andere Objekt-ID verweist.

Beispiel:

```json
{"people":[{"id":"person:ada","name":"Ada","worksAt":{"$ref":"company:acme"}}],"companies":[{"id":"company:acme","name":"Acme","city":"Berlin"}]}
```

**Wichtig:** Ohne `{"refs":true}` ist `$ref` einfach ein gewöhnlicher Schlüssel. Erst diese Option aktiviert die Referenzauflösung.

### 25.1 Vom Menschen zur Firma navigieren

```json
["@let", {"@g": ["@graph", {"people":[{"id":"person:ada","name":"Ada","worksAt":{"$ref":"company:acme"}}],"companies":[{"id":"company:acme","name":"Acme","city":"Berlin"}]}, {"refs":true}]}, ["@run", 1, "!Company", ["@conj", ["@nodeo", "@g", "person:ada", "!Person"], ["@patho", "!Person", ["worksAt","name"], "!Company"]]]]
```

**Ergebnis:** `["Acme"]`.

Das ist spannend: Obwohl die Firma im JSON-Dokument **an einer anderen Stelle** gespeichert ist, führt die Graphkante `worksAt` über `$ref` zur Firma. Anschließend kann `@patho` deren Namen lesen.

### 25.2 Welche Form löst eine Referenz aus?

Nur ein Objekt mit **genau einem** Stringfeld `"$ref"` ist in diesem Modus ein Verweispointer, zum Beispiel `{"$ref":"company:acme"}`. Ein Objekt mit zusätzlichen Metadaten ist nicht automatisch eine Referenz. Andere Namen für Identifikations- und Referenzfelder lassen sich über `id_key` und `ref_key` konfigurieren.

### 25.3 Fehlerfälle

Eine Referenz auf eine unbekannte ID ist ein Fehler, sobald diese Verbindung benutzt wird. Dasselbe gilt für doppelte IDs beim Aufbau des Referenzindexes. Das sind nicht einfach erfolglose `@unify`-Anfragen, sondern ungültige Graphkonfigurationen.

## Lektion 26: Pfade in Graphen können anders sein als JSON-Pfade

Bei rohem JSON beschreibt ein Pfad die Baumstruktur des Dokuments. Bei einer Graphsicht kann derselbe Operator `@patho` über Referenzkanten gehen.

```json
["@let", {"@g": ["@graph", {"people":[{"id":"p1","friend":{"$ref":"p2"}},{"id":"p2","name":"Mira"}]}, {"refs":true}]}, ["@run", 1, "!Name", ["@conj", ["@nodeo", "@g", "p1", "!Person"], ["@patho", "!Person", ["friend","name"], "!Name"]]]]
```

**Ergebnis:** `["Mira"]`.

### 26.1 Warum eine ungebundene Pfadvariable wertvoll ist

Wenn wir den Pfad nicht kennen, können wir ihn suchen:

```json
["@run", 10, "!Path", ["@patho", {"a":{"b":10},"c":20}, "!Path", 10]]
```

**Ergebnis:** `[["a","b"]]`.

### 26.2 Was ist mit Zyklen?

Mit `$ref` kann ein Graph Kreise enthalten, zum Beispiel A → B → A. Bei der Enumeration unbekannter Pfade verhindert die Graphbibliothek, dass sie demselben Knoten auf **einem Suchpfad** endlos folgt. Ein **bekannter**, endlicher Pfad darf auch durch einen Referenzzyklus führen. Zusätzlich begrenzen die `@run`-Ergebniszahl und das Ressourcenlimit die Suche.

---

# Teil VI – Größere Projekte zum Nachbauen

## Lektion 27: Projekt „Wer gehört zu dieser Familie?“

Wir beginnen mit einem kleinen Familienregister als JSON-Datenarray:

```json
[{"parent":"Alice","child":"Bob"},{"parent":"Alice","child":"Cara"},{"parent":"Bob","child":"Dina"}]
```

### 27.1 Alle Kinder von Alice

Wir kombinieren eine existierende Liste mit einem Muster für die einzelnen Einträge. Da `@membero` ganze Elemente vereinigt und die Datensätze hier genau zwei Felder haben, ist das besonders einfach:

```json
["@run", 10, "!Child", ["@membero", [{"parent":"Alice","child":"Bob"},{"parent":"Alice","child":"Cara"},{"parent":"Bob","child":"Dina"}], {"parent":"Alice","child":"!Child"}]]
```

**Ergebnis:** `["Bob","Cara"]`.

### 27.2 Wer ist Elternteil von Dina?

```json
["@run", 10, "!Parent", ["@membero", [{"parent":"Alice","child":"Bob"},{"parent":"Alice","child":"Cara"},{"parent":"Bob","child":"Dina"}], {"parent":"!Parent","child":"Dina"}]]
```

**Ergebnis:** `["Bob"]`.

Das ist ein wichtiger Lerneffekt: Wir verwenden **dieselbe Form der Relation**, aber binden eine andere Stelle als Unbekannte.

### 27.3 Großeltern durch zwei Beziehungen

Wir suchen einen Zwischenwert `!Middle`: Die erste Beziehung muss Alice → `!Middle` finden, die zweite `!Middle` → `!Grandchild`. Um die Aufgabe kompakt zu halten, benutzen wir zwei `@membero`-Goals über denselben Daten:

```json
["@let", {"@relations":[{"parent":"Alice","child":"Bob"},{"parent":"Alice","child":"Cara"},{"parent":"Bob","child":"Dina"}]}, ["@run", 10, "!Grandchild", ["@conj", ["@membero", "@relations", {"parent":"Alice","child":"!Middle"}], ["@membero", "@relations", {"parent":"!Middle","child":"!Grandchild"}]]]]
```

**Ergebnis:** `["Dina"]`.

Wir haben eine neue Beziehung gebildet, ohne eine Schleife zu programmieren. **Logische Variablen können Verbindungen zwischen mehreren Datenabfragen herstellen.**

### Denkaufgabe

Was passiert, wenn Cara ebenfalls ein Kind hat? Ergänze einen vierten Datensatz, erhöhe das Ergebnislimit auf `10` und beobachte die Reihenfolge.

## Lektion 28: Projekt „Bestellungen prüfen“

Stell dir eine kleine Liste von Bestellungen vor:

```json
[{"customer":"Ada","total":50},{"customer":"Ben","total":120},{"customer":"Cara","total":80}]
```

### 28.1 Alle Bestellungen ab 80

```json
["@run", 10, {"name":"!Name","amount":"!Amount"}, ["@conj", ["@membero", [{"customer":"Ada","total":50},{"customer":"Ben","total":120},{"customer":"Cara","total":80}], {"customer":"!Name","total":"!Amount"}], ["@ge", "!Amount", 80]]]
```

**Ergebnis:**

```json
[{"name":"Ben","amount":120},{"name":"Cara","amount":80}]
```

### 28.2 Eine Steuer oder Gebühr berechnen

Wir wollen versuchsweise zu einem vorhandenen Betrag `10` addieren:

```json
["@run", 10, {"name":"!Name","withFee":"!NewTotal"}, ["@conj", ["@membero", [{"customer":"Ada","total":50},{"customer":"Ben","total":120}], {"customer":"!Name","total":"!Amount"}], ["@project", "@plus", ["!Amount",10], "!NewTotal"]]]
```

**Ergebnis:**

```json
[{"name":"Ada","withFee":60},{"name":"Ben","withFee":130}]
```

Hier haben wir **Datenabfrage, logische Bindung und gewöhnliche Berechnung** in einem Programm kombiniert.

## Lektion 29: Projekt „Personen, Firmen und Städte“

Für dieses Projekt legen wir einen kleinen verknüpften Datensatz in der Graphsicht an:

```json
{"people":[{"id":"p:ada","name":"Ada","company":{"$ref":"c:acme"}},{"id":"p:ben","name":"Ben","company":{"$ref":"c:beta"}}],"companies":[{"id":"c:acme","name":"Acme","city":"Berlin"},{"id":"c:beta","name":"Beta","city":"Munich"}]}
```

Wir möchten wissen: **In welcher Stadt arbeitet Ada?**

```json
["@let", {"@g": ["@graph", {"people":[{"id":"p:ada","name":"Ada","company":{"$ref":"c:acme"}},{"id":"p:ben","name":"Ben","company":{"$ref":"c:beta"}}],"companies":[{"id":"c:acme","name":"Acme","city":"Berlin"},{"id":"c:beta","name":"Beta","city":"Munich"}]}, {"refs":true}]}, ["@run", 1, "!City", ["@conj", ["@nodeo", "@g", "p:ada", "!Person"], ["@patho", "!Person", ["company","city"], "!City"]]]]
```

**Ergebnis:** `["Berlin"]`.

### 29.1 Dasselbe für Ben

Im letzten Ausdruck muss lediglich die ID `"p:ada"` durch `"p:ben"` ersetzt werden. Ergebnis: `["Munich"]`.

### 29.2 Warum ist das ein Graphproblem?

Die Stadt steht **nicht direkt** im Personenobjekt. Sie gehört zur Firma; das Personenobjekt verweist über `$ref` auf den Firmenknoten. `@nodeo` lokalisiert den Startknoten, `@patho` folgt der Verbindung. Das ist die Grundidee eines einfachen Knowledge-Graph-Queries.

## Lektion 30: Übungen mit Lösungen

Versuche diese Aufgaben zuerst ohne Nachschlagen. Alle benutzen ausschließlich die bereits erklärten Funktionen.

### Aufgabe 1: Zwei passende Zahlen

Aus `[1,2,3,4,5]` sollen alle Zahlen gefunden werden, die mindestens `4` sind.

<details><summary>Lösung</summary>

```json
["@run", 10, "!X", ["@conj", ["@membero", [1,2,3,4,5], "!X"], ["@ge", "!X", 4]]]
```

Ergebnis: `[4,5]`.
</details>

### Aufgabe 2: Ein verborgenes Objektfeld

Finde aus `{"user":{"name":"Nora","age":25},"active":true}` den Namen mit einem Teilmuster.

<details><summary>Lösung</summary>

```json
["@run", 1, "!Name", ["@matcho", {"user":{"name":"Nora","age":25},"active":true}, {"user":{"name":"!Name"}}]]
```

Ergebnis: `["Nora"]`.
</details>

### Aufgabe 3: Ein unbekannter Pfad

Finde den Pfad zum Wert `9` in `{"x":{"y":9},"z":1}`.

<details><summary>Lösung</summary>

```json
["@run", 1, "!P", ["@patho", {"x":{"y":9},"z":1}, "!P", 9]]
```

Ergebnis: `[["x","y"]]`.
</details>

### Aufgabe 4: Eine Ungleichheit

Aus `["Ada","Ben","Cara"]` sollen alle außer `"Ben"` übrig bleiben.

<details><summary>Lösung</summary>

```json
["@run", 10, "!N", ["@conj", ["@membero", ["Ada","Ben","Cara"], "!N"], ["@neqo", "!N", "Ben"]]]
```

Ergebnis: `["Ada","Cara"]`.
</details>

### Aufgabe 5: Ein Graphfeld

Finde alle direkten Kanten des Objekts `{"a":1,"b":2}`.

<details><summary>Lösung</summary>

```json
["@run", 10, {"field":"!F","value":"!V"}, ["@edgeo", {"a":1,"b":2}, "!F", "!V"]]
```

Ergebnis: `[{"field":"a","value":1},{"field":"b","value":2}]`.
</details>

### Aufgabe 6: Logische Konsistenz

Warum liefert diese Abfrage keine Lösung?

```json
["@run", 1, "!X", ["@unify", ["!X","!X"], [5,6]]]
```

**Lösung:** Weil dieselbe Variable gleichzeitig `5` und `6` sein müsste. Ein einzelnes `!X` kann innerhalb einer Lösung nur einen konsistenten Wert haben.

---

# Teil VII – Nachschlagen und typische Fehler verstehen

## Anhang A: Spickzettel für die Logik- und Graphfunktionen

| Funktion | Grundidee | Typische Form |
|---|---|---|
| `@run` | Suche starten; maximal N Lösungen | `["@run", N, query, goal]` |
| `@unify` | Zwei vollständige Terme vereinigen | `["@unify", a, b]` |
| `@choice` | Entweder Goal 1 oder Goal 2 | `["@choice", goal1, goal2]` |
| `@conj` | Goal 1 und Goal 2 | `["@conj", goal1, goal2]` |
| `@matcho` | Vorhandene Daten mit Teilmuster vergleichen | `["@matcho", data, pattern]` |
| `@membero` | Element einer vorhandenen Liste suchen | `["@membero", list, item]` |
| `@record` | Objekt-Teilmuster erzeugen | `["@record", fields]` |
| `@some` | Ein passendes Arrayelement im Muster suchen | `["@some", pattern]` |
| `@patho` | Pfad und Wert zueinander finden | `["@patho", data, path, value]` |
| `@neqo` | Verzögerte Ungleichheit | `["@neqo", a, b]` |
| `@ge` | Verzögertes numerisches ≥ | `["@ge", a, b]` |
| `@project` | Bekannt gewordene Werte berechnen | `["@project", fn, args, result]` |
| `@graph` | JSON als Graph betrachten | `["@graph", data]` |
| `@edgeo` | Direkte Kante finden | `["@edgeo", source, key, target]` |
| `@nodeo` | Knoten per ID suchen | `["@nodeo", graph, id, node]` |

**Faustregel:** Die Funktionen mit einem „o“ am Ende (zum Beispiel `@membero`, `@patho`, `@nodeo`) formulieren **Relationen**. `@run` ist der Suchmotor. `@record` und `@some` sind dagegen **Musterkonstruktoren**, `@graph` ein **Graphkonstruktor**.

## Anhang B: Die häufigsten Anfängerfehler

### B.1 `!X` mit `@X` verwechseln

- `!X` ist eine **logische Variable**, die eine Suche binden kann.
- `@X` ist eine **Referenz** auf einen normalen benannten Wert; ist er nicht definiert, entsteht ein Fehler.

### B.2 Ein Goal direkt wie ein JSON-Ergebnis behandeln

`["@unify", "!X", 3]` erzeugt ein Goal. Verwende `@run`, um Lösungsergebnisse als JSON-Liste zu bekommen.

### B.3 Ein `@quote` um die logischen Variablen legen

`["@quote", "!X"]` liefert nur Text. Die unzitierte Schreibweise `"!X"` im passenden Ausdruck erzeugt die Variable.

### B.4 `@unify` für ein unvollständiges Objektmuster nutzen

`@unify` verlangt bei Objekten **dieselben Schlüssel**. Nutze `@matcho` für partielle Datenobjekte und `@record` innerhalb von `@some`-Mustern.

### B.5 `@matcho` wie eine Suche nach beliebigen Arrayelementen benutzen

Ein einfaches Arraymuster muss dieselbe Länge und Position haben wie die Datenliste. Für einzelne Elemente: `@membero` oder `@some`.

### B.6 Eine endlose Menge möglicher Werte erwarten

`@ge` kann prüfen, ob bekannte Zahlen ≥ 18 sind. Es **generiert** nicht alle denkbaren Zahlen über 18. `@membero` benötigt eine vorhandene Liste.

### B.7 Eine interne Variable aus einer Funktion versehentlich nach außen erwarten

Jeder Funktionsaufruf erzeugt eigene interne `!`-Variablen. Wenn eine Variable außerhalb der Funktion gebunden werden soll, **übergib sie als Parameter**.

### B.8 Das Ergebnislimit mit der Zahl der wirklichen Lösungen verwechseln

`["@run", 1, ...]` gibt maximal eine Lösung zurück. Eine zweite Lösung kann trotzdem existieren.

### B.9 Einen `$ref`-Verweis ohne `{"refs":true}` traversieren

Ohne Aktivierung ist `$ref` lediglich ein normales JSON-Feld. Die Referenzkanten gehören zur optionalen Graphsicht.

### B.10 Vergessen, dass zusammengesetzte Graphziele Knoten-Handles sind

Die Ausgabe `{"node":["people",0]}` ist eine Positionsrepräsentation, **nicht** das kopierte Personenobjekt. Für Felder verwende `@edgeo`, `@patho` oder `@matcho`.

### B.11 Aus einem Suchfehler einen normalen Falschwert machen

Eine legitime erfolglose Suche liefert `[]`; ungültiges JSON, unbekannte Funktionen, fehlende Graphreferenzen oder überschrittene Ressourcenlimits sind dagegen **Fehler**. Behandle diese Fälle getrennt.

## Anhang C: Was die aktuelle Logikbibliothek bewusst noch nicht kann

Damit du nicht versehentlich Fähigkeiten erwartest, die erst geplant sind, hier die Grenzen der vorliegenden Implementierung:

1. **Keine vollständige Prolog-Sprache.** Es gibt keine Prolog-Textsyntax mit `:-`, keine allgemeine Klauseldatenbank und keine automatisch rückwärts ausgeführten arithmetischen Funktionen.
2. **Keine unbeschränkte faire Suche.** Der Suchalgorithmus untersucht bereits konstruierte endliche Goal-Bäume tiefenorientiert, links vor rechts. Rekursive Relationsdefinitionen, die sich bereits beim Aufbau ihrer Goals selbst aufrufen, benötigen eine zusätzliche Verzögerungsform, die hier noch nicht implementiert ist.
3. **Keine stillschweigende Erzeugung unbekannter JSON-Dokumente.** `@patho`, `@matcho` und `@membero` durchsuchen vorhandene Daten bzw. bekannte Strukturen; sie generieren nicht beliebige neue Dokumente.
4. **Keine generischen Datenbank- oder Knowledge-Graph-Adapter.** `@graph` ist eine Graphsicht auf JSON im Speicher, keine persistente Datenbank, kein SPARQL-Server und keine Datalog-Fixpunktmaschine.
5. **Keine automatische Rollback-Garantie für externe Effekte.** Logische Suchzustände sind isoliert; Dateizugriffe oder Netzwerkaktionen wären es nicht. `@project` sollte deshalb nach Möglichkeit reine Funktionen verwenden.
6. **Begrenzte Ressourcen.** Auch endliche Suchräume können groß werden. `@run`-Limits und das Interpreter-Schrittbudget sind Teil einer sicheren Ausführung.

Das sind keine Schwächen der Grundidee. Es sind **bewusste Grenzen einer kleinen, verständlichen Logikbibliothek auf dem unveränderten Kern 0.3**.

## Anhang D: Die Beispiele in die fjson-IDE integrieren

### D.1 Unterrichtsmodus

Für jede Lektion empfehlen sich vier IDE-Felder:

- **Erklärung:** ein bis drei kurze Absätze aus dieser Markdown-Datei.
- **Programm:** genau ein ausführbarer `json`-Block.
- **Erwartete Ausgabe:** eine unveränderliche Vergleichsansicht.
- **Aufgabe:** verändere nur eine Sache und beobachte den Unterschied.

Die Lektionen bauen schrittweise aufeinander auf, funktionieren aber – soweit sie ihre Beispieldaten direkt enthalten – auch unabhängig voneinander. So kann die IDE direkt zu einer bestimmten Funktion springen.

### D.2 Daten-Tab `@data`

Für größere Dokumente (zum Beispiel `examples/fred.json` oder `examples/graph_refs.json`) sollte die IDE den Datensatz im Daten-Tab bereitstellen. Die Abfrage kann dann kurz bleiben:

```json
["@run", 1, "!City", ["@patho", "@data", ["Address","City"], "!City"]]
```

**Erwartung:** Mit `examples/fred.json` im `@data`-Tab ` ["Winchester"] `. Für diesen konkreten Datenbestand ist der Pfad dokumentiert. Ohne passende Daten im Tab ist die Abfrage nicht sinnvoll.

Die IDE kann die vorhandenen Fred- und Referenzgraph-Beispiele weiterverwenden, statt dieselben großen Datensätze in jede Lektion einzubetten.

### D.3 Verifizierbare Beispieltests

Die gekennzeichneten JSON-Programmblöcke sollten in Python **und** JavaScript automatisiert ausgeführt und mit ihren erwarteten Ausgaben verglichen werden. Tests sollten insbesondere prüfen:

- Identität von `!X` innerhalb eines Aufrufs und neue Identität zwischen separaten Aufrufen;
- `@unify` gegen `@matcho` bei zusätzlichen Objektfeldern;
- `@membero`/`@some` bei mehreren passenden Elementen;
- Reihenfolge von `@choice` und Traversierung bei `@patho`;
- verzögerte `@neqo`-, `@ge`- und `@project`-Bedingungen;
- Knoten-Handles, IDs, `$ref`-Auflösung und zyklische Graphen;
- Ressourcenlimit, fehlende Referenzen und ungültige Eingaben.

### D.4 Quellgrundlagen

Dieser Primer ist **keine freie Prolog-Neuimplementierung**. Seine Operatoren und Aussagen orientieren sich an den konkreten Dateien:

- [`LOGIC.md`](LOGIC.md) – Unifikation, Goal-Komposition, Scope, Suche und Occurs-Check;
- [`LOGIC_JSON.md`](LOGIC_JSON.md) – partielle JSON-Muster, Array- und Pfadrelationen, verzögerte Bedingungen;
- [`GRAPH.md`](GRAPH.md) – Graphsicht, Knoten, Kanten, IDs, Referenzen und Traversierung;
- [`logic.py`](fjson/logic.py) – Implementierung der Suchzustände, Unifikation, Projektion und Goal-Auswertung;
- [`graph.py`](fjson/graph.py) – Implementierung der Graphsicht und Referenzauflösung.

**Hinweis zum Versionsstand:** Dieser Primer ist für die Dokumentation der am 3. November 2026 bereitgestellten Bibliothek geschrieben. Er führt keine neuen Special Forms ein und verändert den fjson-Kern 0.3 nicht. In einer künftigen Version können zusätzliche logische Relationen oder Graph-Backends hinzukommen.

---

# Und jetzt?

Du hast eine ungewöhnliche, aber sehr mächtige Denkweise kennengelernt. Statt dem Computer immer nur zu sagen, **wie** er eine Liste schrittweise bearbeiten soll, kannst du in fjson Beziehungen formulieren: „Finde alle Elemente, die diese Form haben“, „Finde den Wert zu diesem Pfad“, „Verbinde diese beiden Bedingungen“ oder „Welches Objekt ist über diese Referenz erreichbar?“

**Die wichtigste Entdeckung ist `!X`:** Die Variable ist zunächst unbekannt und wird durch eine erfolgreiche Beziehung bestimmt. Mit `@run`, `@unify`, `@choice`, `@conj`, `@matcho`, `@membero`, `@patho`, `@edgeo` und `@nodeo` entsteht daraus eine kleine, ausdrucksstarke Sprache für **relationale Programmierung auf JSON** – ohne den eingefrorenen Sprachkern ändern zu müssen.
