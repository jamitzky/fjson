# Effekte, Grants und Host-Adapter

Der eingefrorene [fjson-Sprachkern 0.3](CORE.md) enthält keine
Datei-, Prozess- oder Netzwerkbefehle. Python-Anwendungen installieren
solche Funktionen ausdrücklich. FJ@-Quellcode kann weder Adapter
installieren noch Grants vergeben.

## Berechtigungsmodell

`Effect.READ`, `Effect.WRITE`, `Effect.EXEC` und `Effect.NETWORK` sind
unabhängige Kategorien. Ein Aufruf braucht **alle** deklarierten Effekte
und einen Grant für seine genaue interne Operations-ID. Ohne Policy sind
alle Host-Aufrufe gesperrt. Der Interpreter prüft beim tatsächlichen
Aufruf, auch über Closures oder `@apply`. Eine Ablehnung ist ein
`SecurityError`, den `@try` nicht abfängt.

Unscoped Host-Funktionen, die mit `register_native` ohne `scope_type`
registriert wurden, verwenden einen String-Grant für die ganze
Operations-ID. Ein solcher Grant ist bewusst breit. Die eingebauten
Adapter sind dagegen *scoped*: Sie verlangen `CapabilityGrant(id, scope)`.
Ein String-Grant kann einen scoped Adapter nicht freischalten. Jeder
Scope prüft die ausgewerteten Argumente; der ausgewählte Scope wird
anschließend dem Adapter übergeben.

## Eingebaute opt-in Adapter

`install_host_adapters(fj)` registriert die folgenden Namen. Es vergibt
keine Rechte. Die Kommandozeile installiert diese Adapter nicht.

| FJ@-Name | Operations-ID | Effekte | Argumente | Scope |
| --- | --- | --- | --- | --- |
| `@fs.read_text` | `fs.read_text` | `READ` | relativer Pfad | `PathScope` |
| `@fs.write_new_text` | `fs.write_new_text` | `WRITE` | relativer Pfad, UTF-8-Text | `PathScope` |
| `@process.run` | `process.run` | `EXEC` | Argumentliste | `ProcessScope` |
| `@https.get_text` | `https.get_text` | `READ`, `NETWORK` | HTTPS-URL | `HttpsScope` |

Ein ausführbares Beispiel aus dem Repository-Verzeichnis:

```python
from pathlib import Path
from fjson import (
    CapabilityGrant, CapabilityPolicy, Effect, Interpreter,
    PathScope, SecurityError, install_host_adapters,
)

fj = Interpreter()
install_host_adapters(fj)
try:
    fj(["@fs.read_text", "README.md"])
except SecurityError:
    pass
else:
    raise AssertionError("default deny failed")

fj.policy = CapabilityPolicy(
    allowed_effects=frozenset({Effect.READ}),
    grants=frozenset({
        CapabilityGrant("fs.read_text", PathScope(Path.cwd())),
    }),
)
assert fj(["@fs.read_text", "README.md"]).startswith("# fjson")
```

`PathScope(root)` nimmt nur relative Pfade innerhalb eines vorhandenen
Verzeichnisses an. Es löst den tatsächlichen Pfad auf und verwirft
absolute Pfade, `..` und Ziele außerhalb der Wurzel. Lesen und Schreiben
haben ein Byte-Limit (`max_bytes`, standardmäßig 1 MB). Schreiben erzeugt
nur neue Dateien (`open("x")`); vorhandene Dateien werden nicht ersetzt.

`ProcessScope(executable, arguments)` bindet einen absoluten Pfad zu
einer vorhandenen ausführbaren Datei und eine **exakte** Argumentliste.
Der Adapter startet ohne Shell und ohne Standard-Ein- oder -Ausgabe,
mit leerer Umgebung und Zeitlimit; Ergebnis ist der Exitcode.
`HttpsScope(hosts)` erlaubt nur HTTPS auf Port 443 zu exakt aufgeführten
DNS-Namen. Der Adapter verwendet nur öffentliche aufgelöste IP-Adressen,
bindet die Verbindung an die geprüfte Adresse, prüft das TLS-Zertifikat,
folgt keinen Weiterleitungen und begrenzt Zeit und Antwortgröße.

## Sicherheitsgrenze

Diese Adapter sind schmale Host-Werkzeuge, **keine Betriebssystem-Sandbox**.
Eine andere lokale Instanz kann nach der Pfadprüfung Dateien, Verzeichnisse
oder die ausführbare Datei austauschen. Für Dateibäume, die ein Angreifer
gleichzeitig verändern kann, sind betriebssystemseitige Isolation oder
Handle-basierte Prüfungen nötig. `ProcessScope` erlaubt genau einen
Befehl, aber dessen Verhalten muss der Host kennen; selbst feste
Argumente machen ein beliebiges Programm nicht harmlos. Der Prozess erbt
außerdem Arbeitsverzeichnis und Betriebssystemrechte des Hosts.
Netzwerkzugriff
verwendet weder Proxy noch Cookies und verweigert private Zieladressen.

Scope-Quoten, Ablaufzeiten und Genehmigungen sind noch nicht enthalten.
Hosts können eigene scoped Operationen mit `register_native(...,
scope_type=EigenerScope)` registrieren; der Scope muss eine Methode
`permits(tuple(arguments)) -> bool` anbieten, und die Python-Funktion
erhält den Scope als erstes Argument. Die Tests in
[tests/test_adapters.py](tests/test_adapters.py) und
[tests/test_security.py](tests/test_security.py) prüfen die Freigaben und
Ablehnungen. Dateischreiben und HTTPS-Antworten werden dort kontrolliert
simuliert; ein echter Netzwerkkontakt ist nicht Teil der Tests.
