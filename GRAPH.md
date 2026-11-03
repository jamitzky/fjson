# JSON als Graph: `fjson.graph` 0.1

Diese Bibliothek ergänzt den [eingefrorenen Sprachkern](CORE.md) und die
[endliche Logikbibliothek](LOGIC.md). Ein JSON-Objekt oder -Array wird ohne
Umkopieren als Graph betrachtet: Objektschlüssel und Arrayindizes sind
gerichtete Kanten. Zusammengesetzte Werte erhalten stabile Knoten-Handles;
skalare JSON-Werte bleiben skalare Werte. Der Graph verändert die Daten nicht.

```json
["@let", {"@g": ["@graph", {"Address": {"City": "Winchester"}}]},
  ["@run", 1, "!City",
    ["@patho", "@g", "@g", ["Address", "City"], "!City"]]]
```

Ergebnis: `["Winchester"]`. `@g` als Startknoten bezeichnet die Wurzel.
`@graph` ist ein Bibliotheksaufruf und kein neues Sprachkonstrukt.

## Operatoren

| Form | Bedeutung |
| --- | --- |
| `["@graph", data]` | Erstellt eine Sicht auf `data`. |
| `["@graph", data, {"refs": true}]` | Folgt expliziten `$ref`-Kanten. |
| `["@edgeo", source, key, target]` | Sucht direkte Kanten eines Graphknotens oder eines rohen Objekts/Arrays. |
| `["@patho", graph, start, path, value]` | Sucht Pfade in der Graphsicht; Pfad oder Wert können logische Variablen sein. |
| `["@nodeo", graph, id, node]` | Findet Knoten über ein String-Feld `id`; auch die ID kann unbekannt sein. |
| `["@matcho", data, pattern]` | Sucht Lösungen eines Musters. |
| `["@record", fields]` | Partielle Objektstruktur im Muster. |
| `["@some", item]` | Jedes passende Arrayelement liefert eine Lösung. |

`@patho` mit drei Argumenten bleibt die bisherige Operation auf rohen
JSON-Daten. Die vierstellige Form navigiert über Graphkanten und beachtet
optional Referenzen. Ein Pfad ist immer ein Array von Schlüsseln und
ganzzahligen Indizes. `"Alternative.Address"` ist dabei ein einzelner
Schlüssel. Bei unbekanntem Pfad werden alle erreichbaren Pfad-Wert-Paare in
Tiefensuche und Quellreihenfolge erzeugt. Zyklen durch Referenzen werden bei
der Enumeration pro Pfad begrenzt; `@run` und das Schrittlimit begrenzen die
Suche zusätzlich. Ein bekannter Pfad darf einen Referenzzyklus durchlaufen,
solange er endlich ist.

Die Ergebnisdarstellung eines Knoten-Handles ist `{"node": [...]}` mit
seinem Dokumentpfad; die Wurzel ist `{"node": []}`. Diese Markierung ist
eine Ausgabeform für `@run`, kein JSON-Feld des Ausgangsdokuments. Knoten
werden nach Graphinstanz und Dokumentposition identifiziert. Der
Referenzindex wird erst bei ID- oder Referenzabfragen aufgebaut.

## Fred: Kanten und Teilmuster

Wenn `@person` an den Inhalt von [fred.json](examples/fred.json) gebunden
ist, liefert diese Abfrage `"Winchester"`:

```json
["@let", {"@g": ["@graph", "@person"]},
  ["@run", 1, "!City", ["@conj",
    ["@edgeo", "@g", "Address", "!Address"],
    ["@edgeo", "!Address", "City", "!City"]]]]
```

Die folgende Abfrage liefert beide Büronummern. `@some` verzweigt über
Arrayelemente, `@record` ignoriert nicht genannte Felder. Dieselbe
logische Variable kann an mehreren Stellen eine Gleichheitsbedingung
ausdrücken. Die ältere Operation `@match` bleibt für ein einzelnes
partielles Muster ohne `@some` erhalten.

```json
["@let", {"@g": ["@graph", "@person"]},
  ["@run", 10, "!Number",
    ["@matcho", "@g",
      ["@record", {"Phone":
        ["@some", ["@record", {"type": "office", "number": "!Number"}]]}]]]]
```

Ergebnis: `["01962 001234", "01962 001235"]`. Die Konstruktoren
`@record` und `@some` sind ausdrücklich im Muster nötig. Ein gewöhnliches
JSON-Objekt und ein gewöhnliches JSON-Array behalten ihre bisherige
Auswertungsbedeutung.

Eine Funktion kann ein wiederverwendbares Goal bilden. Logische Variablen,
die das aufrufende Goal binden soll, werden als Parameter übergeben:

```json
["@let", {
  "@adult": ["@function", ["@person", "@age"],
    ["@conj", ["@edgeo", "@person", "Age", "@age"],
      ["@ge", "@age", 18]]],
  "@g": ["@graph", "@person"]
}, ["@run", 1, "!Age", ["@adult", "@g", "!Age"]]]
```

## Explizite Referenzen

[graph_refs.json](examples/graph_refs.json) enthält Personen- und
Firmenobjekte mit IDs und `$ref`-Feldern. Nur `{"refs": true}` löst ein
Objekt mit **genau einem** String-Feld `$ref` als Kante zum Objekt mit der
entsprechenden `id` auf. Ohne diese Option ist `$ref` ein gewöhnliches
JSON-Feld. Andere Identitäts- und Referenzschlüssel lassen sich mit
`id_key` und `ref_key` konfigurieren. Doppelte IDs und nicht auflösbare
Referenzen erzeugen einen Auswertungsfehler, sobald der jeweilige Index
oder die Referenz benutzt wird. Fehlende Felder bleiben von explizitem
`null` unterscheidbar.

```json
["@let", {
  "@g": ["@graph", "@data", {"refs": true}]
}, ["@run", 1, "!City",
  ["@patho", "@g", "person:fred",
    ["employer", "office", "City"], "!City"]]]
```

Ergebnis mit `graph_refs.json` als `@data`: `["Winchester"]`.
`@nodeo` kann stattdessen einen Knoten über seine ID binden:

```json
["@run", 1, "!Node", ["@nodeo", "@g", "company:acme", "!Node"]]
```

Die Graphsicht ist derzeit eine endliche, im Speicher gehaltene Sicht auf
JSON. Sie enthält keine persistente Faktenbasis, keine Datalog-Fixpunkte
und keine generischen Adapter für externe Datenquellen. Solche Schichten
können später über diesen Operatoren aufgebaut werden.
