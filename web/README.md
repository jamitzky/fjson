# fjson Studio

## Einzeldatei für den Offline-Einsatz

[`fjson-studio.html`](fjson-studio.html) enthält den vollständigen
JavaScript-Interpreter, die IDE und das CSS. Diese eine Datei herunterladen
und lokal im Browser öffnen, zum Beispiel per Doppelklick. Ein Webserver
und eine Internetverbindung sind nicht erforderlich.

Die IDE hat drei Tabs: **Programm** für fjson-Ausdrücke, **JSON-Daten**
für einen separaten Datenwert und **Shell** für interaktive Ausdrücke mit
Verlauf. Die Daten können eingefügt oder aus einer lokalen JSON-Datei
geladen werden. Bei jeder Ausführung werden sie als `@data` gebunden.
Ein Beispiel mit `{ "answer": 41 }` als Daten:

```json
["@plus", ["@get", "@data", "answer"], 1]
```

Das Ergebnis ist `42`. `@get` liest einen Objektschlüssel oder
Arrayindex; `@length` zählt Einträge. Ungültige JSON-Daten stoppen die
Auswertung mit einer Fehlermeldung. Beide Editoren und die Shell zeigen
Syntaxfarben für Bezeichner, Strings, Zahlen und JSON-Zeichen.

**Ausführen** oder `Strg+Enter`/`⌘+Enter` wertet den jeweiligen
Programm- oder Shell-Ausdruck aus. Globale Deklarationen bleiben während
der Sitzung erhalten. **Sitzung zurücksetzen** löscht sie und den
Shell-Verlauf. Programm und Daten lassen sich per Knopfdruck als
JSON-Dateien herunterladen. Das Laden und Speichern läuft über die
Browseroberfläche; fjson selbst erhält dadurch keine Datei-Capability.

## Quelldateien und Entwicklung

[`index.html`](index.html), [`app.mjs`](app.mjs) und
[`style.css`](style.css) sind die modulare Variante. Sie verwenden
[`../js/fjson.mjs`](../js/fjson.mjs). Nach Änderungen am Interpreter,
an der App oder am CSS wird die Einzeldatei neu erzeugt:

```powershell
node web/build-standalone.mjs
node js/test-pages.mjs
```

Für die modulare Variante und die
[Browser-Testseite](../js/browser-test.html) einen lokalen Server aus
dem Repository-Verzeichnis starten:

```powershell
python -m http.server 8000
```

Anschließend `http://localhost:8000/web/` beziehungsweise
`http://localhost:8000/js/browser-test.html` öffnen. Die Einzeldatei
braucht diesen Server nicht. Alle Auswertungen erfolgen lokal im Browser;
die IDE bietet keine Datei-, Prozess- oder Netzwerk-Capabilities für
fjson-Programme.
