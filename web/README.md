# fjson Studio

## Einzeldatei für den Offline-Einsatz

[`fjson-studio.html`](fjson-studio.html) enthält den vollständigen
JavaScript-Interpreter, die IDE und das CSS. Diese eine Datei herunterladen
und lokal im Browser öffnen, zum Beispiel per Doppelklick. Ein Webserver
und eine Internetverbindung sind nicht erforderlich.

Der Editor nimmt JSON-Quelltext entgegen. **Ausführen** oder
`Strg+Enter`/`⌘+Enter` wertet ihn aus. Fünf Beispiele zeigen Funktionen,
Standardwerte, logische Suche, Rekursion und `@quote`. Globale
Deklarationen bleiben während der Sitzung erhalten; **Sitzung
zurücksetzen** löscht sie.

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
die IDE bietet keine Datei-, Prozess- oder Netzwerk-Capabilities.
