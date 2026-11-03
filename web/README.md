# fjson Studio

Diese kleine IDE ist eine statische Web-App. Sie lädt direkt
[`../js/fjson.mjs`](../js/fjson.mjs) und benötigt weder Build-Schritt noch
Paketmanager. Der Editor nimmt JSON-Quelltext entgegen; **Ausführen**
wertet ihn im Browser aus. Deklarationen bleiben in der aktuellen
Interpreter-Sitzung erhalten. **Sitzung zurücksetzen** erstellt einen
frischen Interpreter. `Strg+Enter` beziehungsweise `⌘+Enter` führt den
Editorinhalt ebenfalls aus.

Aus dem Repository-Verzeichnis einen lokalen Webserver starten:

```powershell
python -m http.server 8000
```

Danach `http://localhost:8000/web/` öffnen. Die gesonderte
[Browser-Testseite](../js/browser-test.html) liegt unter
`http://localhost:8000/js/browser-test.html`.

Die App verwendet nur den reinen Sprachkern und die Logikbibliothek.
Programme erhalten keine Datei-, Prozess- oder Netzwerk-Capabilities.
Der JSON-Quelltext wird lokal im Browser ausgewertet; die App versendet
ihn nicht an einen Server. Der Webserver liefert lediglich die statischen
Dateien und die Testfälle aus.
