// Guided tour based on README.md, CORE.md, SHOWCASE.md, LOGIC_JSON.md,
// GRAPH.md, MODULES.md and SECURITY.md. Every step loads runnable fjson.
import { showcaseGroups } from './showcase.mjs';

const lessons = new Map(showcaseGroups.flatMap(group => group.lessons)
  .map(item => [item.id, item]));
const step = (id, title, lessonId, markdown) => {
  const lesson = lessons.get(lessonId);
  if (!lesson) throw new Error(`unknown tutorial lesson: ${lessonId}`);
  return { id, title, lesson, markdown };
};

const namespaceLesson = {
  id: 'tutorial_namespace_code', title: 'Qualifizierte Namen lokal',
  note: '@let kann einen qualifizierten Namen lokal binden; @namespace und @import verarbeitet dagegen nur der Modul-Loader.',
  program: ['@let', {
    '@inc@demo': ['@function', ['@x'], ['@plus', '@x', 1]],
  }, ['@inc@demo', 41]],
  expected: 42, data: null,
};

export const tutorialGroups = [
  { title: '01 · Was ist fjson?', steps: [
    step('tour_hello', 'Ein JSON-Wert ist schon ein Programm', 'hello', `
**Willkommen!** fjson verwendet JSON als Quellformat. Eine Zahl, ein String, ein boolescher Wert oder null kann direkt ausgewertet werden. Der erste Schritt gibt einfach einen String zurück.

Drücke **Beispiel laden und ausführen**. Der Code erscheint links, das Ergebnis unten rechts. Ändere danach den String und führe ihn erneut aus. Das Tutorial bleibt über das Menü jederzeit erreichbar.`),
    step('tour_arrays', 'Datenarrays und Aufrufe', 'literal_array', `
Ein Array ohne Funktionsnamen an erster Stelle wird Element für Element als Datenarray ausgewertet. Steht dort ein Name wie \`"@plus"\`, ist das Array ein Funktionsaufruf.

Die Unterscheidung hängt nur vom **ersten Element** ab. Diese einfache Regel hält die JSON-Syntax kompakt. Ein Array ist keine Folge von Befehlen, die stillschweigend nur den letzten Wert liefert.`),
    step('tour_names', 'Namen und Deklarationen', 'declarations', `
Strings mit führendem \`@\` bezeichnen Werte oder Funktionen. Ein Objekt, dessen Schlüssel alle mit \`@\` beginnen, legt Bindungen an. Im Beispiel wird zuerst \`@x\` gebunden; der zweite Eintrag verwendet diesen Wert und liefert 42.

Globale Deklarationen bleiben in derselben Interpreter-Sitzung erhalten. Du kannst danach unten in der Shell \`"@antwort"\` eingeben. **Sitzung zurücksetzen** entfernt selbst definierte Bindungen.`),
    step('tour_quote', 'Code als Daten mit @quote', 'quote_name', `
Normalerweise würde \`"@unbekannt"\` als Referenz aufgelöst und einen Fehler auslösen. \`@quote\` gibt den folgenden JSON-Wert unverändert zurück. Das ist nützlich, wenn Namen, Funktionsformen oder logische Variablen Daten sein sollen.

Auch ein Objekt mit \`@\`-Schlüsseln kann so als Datenobjekt erhalten bleiben. Der Sprachkern braucht dafür keine zweite Objekt-Syntax.`),
  ] },
  { title: '02 · Funktionen und Geltungsbereiche', steps: [
    step('tour_let', 'Lokale Namen mit @let', 'let_local', `
\`@let\` erhält ein Bindungsobjekt und einen Rumpf. Die Bindungen gelten nur im Rumpf. Im Beispiel werden Preis und Anzahl multipliziert; außerhalb dieses Ausdrucks sind die lokalen Namen nicht verfügbar.

Die Werte im Bindungsobjekt werden in Reihenfolge ausgewertet. Ein späterer Wert kann einen zuvor gebundenen Namen verwenden.`),
    step('tour_function', 'Die kleinste Funktion', 'function_inc', `
\`@function\` besteht aus **Parameterliste** und **Rumpf**. \`["@function", ["@x"], ["@plus", "@x", 1]]\` erzeugt eine Funktion, die eins addiert. \`@let\` gibt ihr hier den Namen \`@inc\`.

Der Rumpf wird erst beim Aufruf ausgeführt. Funktionen sind Werte: Sie können gespeichert, übergeben und von anderen Funktionen zurückgegeben werden.`),
    step('tour_defaults', 'Parameter mit Standardwerten', 'function_defaults', `
Statt einer Parameterliste darf \`@function\` ein Objekt verwenden. Der Wert zu jedem Parameternamen ist sein Standardausdruck. Im Beispiel funktioniert \`@inc\` mit und ohne Argument.

Standardausdrücke werden **bei der Erzeugung der Funktion** ausgewertet, nicht bei jedem Aufruf. Ein einzelner Parameterstring wie \`"@x"\` ist keine gültige Parameterspezifikation.`),
    step('tour_closure', 'Closures merken sich ihre Umgebung', 'closure', `
Die Funktion im Beispiel verwendet \`@basis\`, obwohl dieser Name kein Parameter ist. Sie merkt sich die Umgebung, in der sie erzeugt wurde. Das nennt man eine **lexikalische Closure**.

Der gespeicherte Geltungsbereich ist die Grundlage für Funktionen höherer Ordnung. Ein späterer Aufruf kann auf die damals sichtbaren Bindungen zugreifen.`),
    step('tour_recursion', 'Gegenseitige Rekursion', 'letrec_even', `
\`@letrec\` legt lokale Namen vor der Auswertung ihrer Definitionen an. Dadurch können zwei Funktionen einander aufrufen. Das Beispiel prüft mit \`@even\` und \`@odd\`, ob 8 gerade ist.

Die Namen müssen beim tatsächlichen Aufruf bereits initialisiert sein. Für einfache Funktionen ohne gegenseitige Verweise genügt \`@let\`.`),
  ] },
  { title: '03 · Entscheidungen und Fehler', steps: [
    step('tour_if', 'Nur einen Zweig auswerten', 'if_positive', `
\`@if\` wertet zuerst die Bedingung aus und danach **nur** den gewählten Zweig. So lassen sich auch teure oder fehlerhafte Ausdrücke im nicht gewählten Zweig vermeiden.

Falsch sind unter anderem \`false\`, \`null\`, \`0\`, der leere String sowie leere Arrays und Objekte. Andere Werte gelten als wahr.`),
    step('tour_short', 'Kurzschluss mit @and und @or', 'and_short', `
\`@and\` stoppt beim ersten falschen Wert, \`@or\` beim ersten wahren. Beide geben einen Operandenwert zurück, nicht zwingend \`true\` oder \`false\`.

Hier wird \`@unbekannt\` nie aufgelöst, weil die Auswertung bereits bei 0 stoppt. Probiere als ersten Operanden 1: Dann wird der unbekannte Name zum Fehler.`),
    step('tour_try', 'Fehler gezielt behandeln', 'try_fallback', `
\`@try\` wertet einen Ausdruck aus und verwendet bei einem Auswertungsfehler optional einen Ersatz. Ohne Ersatz gibt es ein Fehlerobjekt mit Typ und Meldung.

Ein Ressourcenlimit wird nicht als normaler Auswertungsfehler geschluckt. Bereits ausgeführte Seiteneffekte oder Deklarationen macht \`@try\` nicht rückgängig.`),
  ] },
  { title: '04 · Rechnen und Listen', steps: [
    step('tour_math', 'Arithmetik sind Funktionen', 'arithmetic', `
\`@plus\`, \`@minus\`, \`@times\` und \`@divide\` sind Bibliotheksfunktionen. Sie sind keine neuen Sprachformen: Aufrufe werden verschachtelt wie andere JSON-Arrays.

Weitere Funktionen sind \`@pow\`, \`@sqrt\`, \`@mod\`, \`@abs\`, Rundung und Zahlenvergleiche. \`@ge\` gehört dagegen zur verzögerten Logik; für einen sofortigen Vergleich gibt es \`@gte\`.`),
    step('tour_range', 'Zahlenbereiche erzeugen', 'range_steps', `
\`@range\` erzeugt ein Array ganzer Zahlen. Mit drei Argumenten gibst du Start, **exklusives** Ende und Schrittweite an. Eine negative Schrittweite zählt rückwärts.

\`["@range", 5]\` ergibt 0 bis 4. Bereiche können direkt an \`@map\`, \`@filter\` oder \`@reduce\` weitergegeben werden.`),
    step('tour_map', 'Jedes Element transformieren', 'map_squares', `
\`@map\` erhält eine Funktion und ein Array. Die Funktion wird für jedes Element aufgerufen; die Rückgabewerte bilden ein neues Array. Hier werden die Zahlen 1 bis 5 quadriert.

Die Funktion kann auch ein neues JSON-Objekt zurückgeben. So lassen sich Datenansichten ohne zusätzliche Schleifen-Syntax aufbauen.`),
    step('tour_filter', 'Elemente auswählen', 'filter_even', `
\`@filter\` behält diejenigen Elemente, für die die übergebene Funktion einen wahren Wert liefert. Im Beispiel bleiben gerade Zahlen erhalten.

Die Prüfung ist eine gewöhnliche fjson-Funktion. Mit \`@get\` kann sie auch Felder von JSON-Objekten untersuchen.`),
    step('tour_reduce', 'Viele Werte zusammenfassen', 'reduce_sum', `
\`@reduce\` hat drei Argumente: Funktion, Array und Anfangswert. Die Funktion kombiniert den bisherigen Zwischenwert mit dem nächsten Element.

Mit \`@plus\` wird daraus eine Summe, mit \`@times\` ein Produkt. Zusammen mit \`@map\` und \`@filter\` entstehen kleine Datenpipelines ohne weitere Schlüsselwörter.`),
  ] },
  { title: '05 · Mit JSON-Daten arbeiten', steps: [
    step('tour_data', 'Code links, Daten rechts', 'get_data', `
Der rechte Editor enthält den Daten-Tab \`@data\`. Vor dem Ausführen bindet die IDE diesen JSON-Wert an den Namen. \`@get\` liest einen Objektschlüssel oder Arrayindex; \`@length\` zählt Einträge.

Du kannst weitere Daten-Tabs anlegen. Sie heißen \`@data2\`, \`@data3\` und so weiter. Die Dateneingabe muss gültiges JSON sein; der Code-Editor darf dagegen fjson-Ausdrücke enthalten.`),
    step('tour_fred', 'Freds Telefone funktional abfragen', 'fred_office_pipeline', `
Dieses Beispiel lädt den Fred-Datensatz automatisch rechts. \`@get\` liest die Telefonliste, \`@filter\` wählt Büroeinträge aus, und \`@map\` nimmt jeweils die Nummer.

Du siehst Daten und Code gleichzeitig. Vergleiche später dieselbe Anfrage mit \`@matcho\`, \`@record\` und \`@some\` im Logik-Kapitel.`),
  ] },
  { title: '06 · Logik und relationale Abfragen', steps: [
    step('tour_logic', 'Logische Variablen und Goals', 'logic_unify', `
Ein Name wie \`"!X"\` ist eine logische Variable. \`@unify\` erzeugt ein Goal, das Werte strukturell vereinigt. \`@run\` sucht bis zum angegebenen Limit nach Lösungen und setzt die gebundenen Werte in die Ergebnisvorlage ein.

Das Goal ist zunächst ein Wert; die eigentliche Suche beginnt bei \`@run\`. Zwei Vorkommen derselben logischen Variable müssen denselben Wert annehmen.`),
    step('tour_match', 'Partielle JSON-Muster', 'logic_match', `
\`@matcho\` prüft, ob vorhandene Daten zu einem Muster passen. Bei Objektmustern dürfen Felder fehlen. Freds Vorname und Stadt werden gefunden, obwohl sein Datensatz viele weitere Angaben enthält.

\`@unify\` verlangt dagegen exakte strukturelle Gleichheit. Die Trennung hilft, wenn Datenobjekte mehr Informationen tragen als eine Anfrage benötigt.`),
    step('tour_member', 'Arrayelemente relational finden', 'logic_member', `
\`@membero\` vereinigt jedes Element eines vorhandenen Arrays **exakt** mit einem Term. Jede passende Position kann eine eigene Lösung liefern.

Es kann auch Variablen in einem Array binden. \`@some\` ist etwas anderes: ein Musterkonstruktor innerhalb von \`@matcho\`, der mit \`@record\` partielle Elementmuster erlaubt.`),
    step('tour_path', 'Einen unbekannten Pfad suchen', 'logic_path_reverse', `
\`@patho\` kann einen bekannten Pfad zu einem Wert verfolgen oder umgekehrt Pfade zu einem bekannten Wert suchen. Hier findet es den Weg zu \`"London"\` in Freds Daten.

Ein Pfad ist ein JSON-Array aus Schlüsseln und Arrayindizes. \`"Alternative.Address"\` bleibt ein einzelner Schlüssel; eine Punktnotation wäre hier mehrdeutig.`),
    step('tour_constraints', 'Verzögerte Bedingungen', 'logic_constraint', `
\`@neqo\` speichert eine Ungleichheit, bis genug Werte bekannt sind. \`@ge\` ist ein verzögertes numerisches Goal für größer oder gleich. Im Beispiel wird \`!Age\` erst durch das Muster gebunden.

\`@conj\` verknüpft Goals. Für alternative Lösungszweige gibt es \`@choice\`; für Berechnungen mit gebundenen Werten \`@project\`.`),
  ] },
  { title: '07 · Graph, Module und Grenzen', steps: [
    step('tour_graph', 'JSON als Graph durchsuchen', 'graph_matcho', `
\`@graph\` betrachtet Objektschlüssel und Arraypositionen als Kanten. \`@matcho\` funktioniert auch auf rohen JSON-Daten. Im Beispiel verzweigt \`@some\` über Freds Telefone; \`@record\` lässt nicht genannte Felder weg.

Das liefert beide Büronummern. Bei \`@membero\` müsste das Elementmuster dagegen exakt zur Struktur passen oder anschließend separat geprüft werden.`),
    step('tour_refs', 'Referenzen zwischen Objekten', 'graph_refs', `
Mit \`{"refs":true}\` kann eine Graphsicht \`$ref\`-Objekte als Verweise auf Knoten mit passender ID behandeln. \`@nodeo\` findet einen Knoten anhand dieser ID; \`@patho\` folgt dann einem Pfad.

Diese Graphsicht verändert den ursprünglichen JSON-Datensatz nicht. Ohne die Option \`refs\` bleiben Verweisobjekte gewöhnliche Daten.`),
    { id: 'tour_modules', title: 'Namensräume und Module', lesson: namespaceLesson, markdown: `
Ein qualifizierter Name wie \`@inc@demo\` ist für den Evaluator ein normaler Bezeichner. Das Beispiel bindet ihn lokal mit \`@let\` und ruft ihn auf. **Der Sprachkern 0.3 bleibt dabei unverändert.**

Außerhalb der IDE verarbeitet der separate JSONL-Modul-Loader Direktiven wie \`["@import","math"]\` und \`["@import","logic"]\`. Danach sind etwa \`@plus@math\` und \`@unify@logic\` verfügbar. \`@namespace\` erzeugt eigene qualifizierte Bindungen. Diese Direktiven sind keine Ausdrücke für den IDE-Code-Editor; dort verwendest du direkte Bindungen wie in diesem Beispiel.

Der Loader liest keine Dateien oder Netzwerke selbst. Eine Host-Anwendung gibt ihm Modultexte ausdrücklich. Datei-, Prozess- und Netzwerkzugriffe des Python-Interpreters unterliegen weiterhin der Capability-Policy.` },
  ] },
];

export const tutorialSteps = tutorialGroups.flatMap(group => group.steps);
