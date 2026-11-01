# Effekte und Capabilities im fjson-Host

Der eingefrorene [fjson-Sprachkern 0.3](CORE.md) enthält keine Datei-,
Prozess- oder Netzwerkoperationen. Python-Anwendungen können solche
Operationen als native Funktionen registrieren. Die Berechtigung kommt
ausschließlich vom Host, nicht aus FJ@-Quellcode.

## Zwei unabhängige Prüfungen

Eine native Host-Operation deklariert eine stabile `operation_id` und eine
Menge von Effekten. `Effect.READ`, `Effect.WRITE`, `Effect.EXEC` und
`Effect.NETWORK` sind unabhängige Kategorien, keine Rangfolge. Ein
Netzwerk-Leseaufruf kann zum Beispiel `READ` und `NETWORK` benötigen.

`CapabilityPolicy` enthält `allowed_effects` und `grants`. Vor jedem
Aufruf müssen **alle** verlangten Effekte freigegeben sein und die genaue
Operations-ID muss in `grants` stehen. Die leere Standard-Policy verweigert
alle Host-Operationen. Die eingebauten reinen Funktionen bleiben nutzbar.

Die folgende Funktion zeigt den Mechanismus ohne externen Zugriff:

```python
from fjson import CapabilityPolicy, Effect, Interpreter, SecurityError

calls = []
fj = Interpreter()
fj.register_native(
    "@host.record", 1, lambda value: calls.append(value) or value,
    operation_id="demo.record",
    effects=frozenset({Effect.WRITE}),
)

try:
    fj(["@host.record", "hello"])
except SecurityError:
    pass
assert calls == []

fj.policy = CapabilityPolicy(
    allowed_effects=frozenset({Effect.WRITE}),
    grants=frozenset({"demo.record"}),
)
assert fj(["@host.record", "hello"]) == "hello"
assert calls == ["hello"]
```

`register_native` ist eine Python-Methode der Interpreter-Instanz; es gibt
keine gleichnamige FJ@-Form. Ein registrierter Name kann keinen vorhandenen
eingebauten oder reservierten Namen ersetzen. Für `@apply` und Aufrufe aus
Closures gilt dieselbe Laufzeitprüfung. `SecurityError` ist kein
`EvaluationError`; `@try` kann ihn deshalb nicht abfangen. Die
Schrittgrenze des Interpreters bleibt aktiv.

## Aktuelle Grenze

Ein Grant gilt momentan für eine **ganze Operations-ID**. Es gibt noch
keine eingebauten Ressourcenscopes, Pfad- oder Hostnamenprüfung, Quoten
oder Ablaufzeiten. Deshalb liefert fjson selbst noch keine Adapter für
Dateien, Prozesse oder Netzwerk. Ein Host, der eigene Adapter registriert,
muss deren Eingaben und Ressourcen innerhalb des Adapters prüfen. Einen
breiten Grant für `fs.read` oder `http.fetch` als Schutz für beliebige
Pfade beziehungsweise Ziele zu behandeln wäre falsch.

Der nächste Schritt ist eine explizite Grant-Struktur mit
operationsspezifischer Scope-Prüfung. Datei-Adapter müssen aufgelöste Pfade
und symbolische Links beachten; Netzwerk-Adapter auch Weiterleitungen und
Zieladressen; Prozess-Adapter das tatsächlich gestartete Programm. Diese
Prüfung gehört an die Host-Grenze und ändert keine JSON-Quellform.

Die Tests in [tests/test_security.py](tests/test_security.py) prüfen
Default-Deny, unabhängige Effekte, fehlende Grants und indirekte Aufrufe.
