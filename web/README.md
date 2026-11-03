# fjson Studio

## Einzeldatei für den Offline-Einsatz

[`fjson-studio.html`](fjson-studio.html) enthält den vollständigen
JavaScript-Interpreter, die IDE und das CSS. Diese eine Datei herunterladen
und lokal im Browser öffnen, zum Beispiel per Doppelklick. Ein Webserver
und eine Internetverbindung sind nicht erforderlich.

Die Arbeitsfläche startet mit **Code links und Daten rechts**. Beide
Editoren bleiben gleichzeitig sichtbar; der senkrechte Trenner zwischen
ihnen ist verschiebbar. Ein Code-Tab wechselt nur den linken Editor, ein
Daten-Tab nur den rechten. Die Toolbar führt immer den sichtbaren Code mit
allen offenen Daten-Tabs aus. Öffnen und Speichern beziehen sich auf den
zuletzt ausgewählten Tab.

Die Arbeitsfläche startet mit den Tabs **Input** und **Daten**.
Im Menü oben erzeugen **＋ Code** und **＋ Daten** weitere Tabs. Der erste
Daten-Tab ist als `@data` verfügbar, weitere als `@data2`, `@data3` usw.
Diese Namen bleiben einem Tab zugeordnet; beim Schließen eines Daten-Tabs
wird seine Bindung entfernt. Die Daten können eingefügt oder aus einer
lokalen JSON-Datei geladen werden. Bei jeder Ausführung werden alle
offenen Daten-Tabs neu gebunden.
Ein Beispiel mit `{ "answer": 41 }` als Daten:

```json
["@plus", ["@get", "@data", "answer"], 1]
```

Das Ergebnis ist `42`. `@get` liest einen Objektschlüssel oder
Arrayindex; `@length` zählt Einträge. Ungültige JSON-Daten stoppen die
Auswertung mit einer Fehlermeldung. Der aktive Editor zeigt Syntaxfarben
für Bezeichner, Strings, Zahlen und JSON-Zeichen.

Für Abfragen über verschachtelte Daten stehen auch `@match`, `@membero`
und `@patho` zur Verfügung. Die Beispiele in
[LOGIC_JSON.md](../LOGIC_JSON.md) lassen sich mit einem geladenen
Daten-Tab ausführen; dessen Bindung heißt standardmäßig `@data`.

Die Beispielauswahl enthält elf direkt ausführbare Abfragen mit Freds
vollständigem Datensatz: Teilmuster, Büronummern, Arbeits-E-Mails,
Rückwärtspfad, Volljährigkeit, verschiedene Städte, Projektion sowie
[Graphpfad, Kanten, Graphmuster und eine Regel](../GRAPH.md).
Beim Auswählen eines Fred-Beispiels wird der Inhalt des `@data`-Tabs
durch [examples/fred.json](../examples/fred.json) ersetzt. Der Datensatz
ist auch in der Offline-HTML-Datei enthalten; dafür ist kein Laden über
das Netzwerk nötig. Vorherige Änderungen am `@data`-Tab bei Bedarf
zuerst speichern. Die Beispiele sind kompakt formatiert: einfache Listen
und Objekte stehen jeweils auf einer Zeile, während verschachtelte
Ausdrücke eingerückt bleiben.

**Code ausführen** oder `Strg+Enter`/`⌘+Enter` wertet den links sichtbaren
Code mit den rechts sichtbaren Daten aus.
Die **Shell liegt unten links** und hat einen eigenen Ausführen-Knopf
sowie `Strg+Enter`/`⌘+Enter`. **Ergebnisse und Fehler stehen unten rechts**.
Der waagerechte Trenner über dem unteren Bereich verändert seine Höhe;
der senkrechte Trenner zwischen Shell und Ergebnis verändert ihre Breite.
Beide lassen sich ziehen oder mit den jeweiligen Pfeiltasten bedienen.
Die Toolbar öffnet eine lokale JSON-Datei im aktiven Tab, speichert den
Tab als Datei und setzt die Interpreter-Sitzung zurück. `Strg+S` oder
`⌘+S` speichert ebenfalls den aktiven Tab. Globale Deklarationen bleiben
bis zum Zurücksetzen erhalten. Das Laden und Speichern läuft über die
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
