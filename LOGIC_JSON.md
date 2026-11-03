# Relationale Abfragen über JSON

Diese Bibliotheksfunktionen erweitern die Logikbibliothek, ohne die
Quellformen des eingefrorenen Sprachkerns 0.3 zu verändern. Sie erzeugen
Goals; `@run` sucht Lösungen. `@unify` behält seine exakte strukturelle
Bedeutung. Die Beispieldaten liegen in [examples/fred.json](examples/fred.json).

Eine Python-Sitzung kann Freds JSON als unveränderten Datenwert binden:

```python
import json
from pathlib import Path
from fjson import Interpreter

fj = Interpreter()
person = json.loads(Path("examples/fred.json").read_text(encoding="utf-8"))
fj({"@person": ["@quote", person]})
```

## Partielle Muster und Arrayelemente

`@matcho(Data, Pattern)` prüft ein rekursives Teilmuster. Musterobjekte
dürfen Schlüssel weglassen; bei Arrays müssen Länge und Positionen
übereinstimmen. Wiederholte logische Variablen müssen denselben Wert
annehmen. Fehlende Schlüssel und vorhandene Schlüssel mit `null` sind
verschieden. Ein ungebundener Datenwert wird nicht konstruiert.

```json
["@run", 1, {"name": "!First", "surname": "!Last"},
  ["@matcho", "@person",
    {"FirstName": "!First", "Surname": "!Last",
     "Address": {"City": "Winchester"}}]]
```

Ergebnis: `[{"name": "Fred", "surname": "Smith"}]`.

`@membero(Array, Term)` vereinigt jedes Element eines vorhandenen
Arrays exakt mit dem Term. Die Lösungen folgen der Arrayreihenfolge.
Für partielle Elementmuster bindet man zunächst ein Element und
verwendet danach `@matcho`.

```json
["@run", 10, "!Number",
  ["@conj",
    ["@patho", "@person", ["Phone"], "!Phones"],
    ["@membero", "!Phones", {"type": "office", "number": "!Number"}]]]
```

Ergebnis: `["01962 001234", "01962 001235"]`. Mit einer weiteren
`@membero`-Ebene lassen sich auch die Arbeitsadressen in Freds
verschachteltem `Email`-Array abfragen.

`@membero` vereinigt ein Element exakt und kann dabei auch eine noch
ungebundene Variable im Array binden. `@some` ist dagegen ein Musterkonstruktor
innerhalb von `@matcho`: Er durchsucht ein vorhandenes Array und kann mit
`@record` Felder eines Elements auslassen.

```json
["@run", 10, "!Number",
  ["@matcho", "@person",
    ["@record", {"Phone":
      ["@some", ["@record", {"type": "office", "number": "!Number"}]]}]]]
```

Das liefert dieselben beiden Büronummern, auch wenn Telefonobjekte weitere
Felder enthalten. `@some` erzeugt keine Arrayelemente aus einem ungebundenen
Datenwert. Für verschachtelte `@some`-Muster muss die umgebende Objektstufe
mit `@record` markiert sein.

## Pfade in beide Richtungen

`@patho(Data, Path, Value)` enumeriert Pfad-Wert-Paare eines vorhandenen
JSON-Werts. Der Pfad ist ein Array aus Objektschlüsseln und nullbasierten
Arrayindizes. Der leere Pfad `[]` bezeichnet den Wurzelwert. Die Suche
besucht zuerst die Wurzel und danach Kinder in Dokumentreihenfolge.

```json
["@run", 1, "!Path", ["@patho", "@person", "!Path", "London"]]
```

Ergebnis: `[["Other", "Alternative.Address", "City"]]`. Der Schlüssel
`"Alternative.Address"` ist ein einzelnes Pfadsegment. Bei unbekanntem
Pfad und unbekanntem Wert liefert `@run` bis zum gesetzten Limit alle
Pfad-Wert-Paare. `@patho` erzeugt keine beliebigen Dokumente aus einem
ungebundenen `Data`.

## Verzögerte Bedingungen

`@neqo(A, B)` prüft logische Ungleichheit auch dann, wenn Variablen erst
in späteren Goals gebunden werden. Wird Gleichheit festgestellt,
scheitert der Zweig. Eine am Ende noch offene Ungleichheit liefert
keine scheinbar vollständige Lösung.

```json
["@run", 1, "!X",
  ["@conj", ["@neqo", "!X", 1], ["@unify", "!X", 2]]]
```

Ergebnis: `[2]`. Ohne die Bindung an `2` wäre das Ergebnis `[]`.

`@ge(A, B)` ist ein verzögertes numerisches Goal für `A >= B`.
Beide Operanden müssen am Ende endliche Zahlen sein:

```json
["@run", 1, "!Age",
  ["@conj",
    ["@ge", "!Age", 18],
    ["@matcho", "@person", {"Age": "!Age"}]]]
```

Ergebnis: `[28]`. `@ge` liefert ein Goal, keinen sofortigen booleschen
Wert.

`@project(Funktion, Argumentarray, Ergebnis)` wartet, bis alle
Argumente gebunden sind, ruft die normale fjson-Funktion auf und
vereinigt ihren Rückgabewert mit `Ergebnis`:

```json
["@run", 1, "!Next",
  ["@conj",
    ["@project", "@plus", ["!Age", 1], "!Next"],
    ["@matcho", "@person", {"Age": "!Age"}]]]
```

Ergebnis: `[29]`. Der Funktionsaufruf durchläuft dieselbe
Capability-Policy wie ein direkter Aufruf. Externe Effekte werden
beim späteren Scheitern eines Suchzweigs nicht zurückgenommen;
für Projektionen sind reine Funktionen vorzuziehen.

Die Suche bleibt tiefenorientiert und arbeitet mit bereits aufgebauten,
endlichen Goal-Bäumen. Ein ungebundenes Array bei `@membero` und ein
ungebundener Datenwert bei `@patho` liefern keine Lösungen. Rekursive
Regeln, faire Suche und eine Faktenbasis sind spätere Erweiterungen.
