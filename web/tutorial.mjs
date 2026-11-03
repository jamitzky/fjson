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
    step('tour_list', 'Arrays aus Werten bauen', 'list_ast', `
Ein gewöhnliches Array mit einem Namen an erster Stelle wäre ein Aufruf. **@list** nimmt dagegen beliebig viele bereits ausgewertete Argumente und erzeugt daraus ein Datenarray. Auch null Argumente sind erlaubt.

Hier wird der Funktionsname mit @quote als Datenwert festgehalten und zusammen mit dem Wert von @x in ein neues Array gesetzt. So kann fjson einen Ausdruck als Daten konstruieren, ohne ihn sofort auszuführen. Für @apply kann @list die Argumentliste erzeugen.`),
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
  { title: '08 · J: Grundformen', steps: [
    step('tour_j_identity', 'J beginnt mit Funktionen', 'j_identity', `
**J in fjson ist eine Bibliothek, keine neue Syntax.** Die IDE lädt das Modul beim Ausführen eines J-Beispiels. Namen wie @identity@j sind gewöhnliche qualifizierte Funktionsnamen. Die Identität gibt ihren Eingabewert unverändert zurück, auch wenn er ein ganzes Array ist.

Im alten FJAT gab es verschiedene Laufzeittypen und implizite Aufrufpositionen. Hier bleibt jeder Aufruf in Präfixform. Die Identität ist besonders nützlich, wenn ein Zweig einer Komposition den ursprünglichen Wert weiterreichen soll.`),
    step('tour_j_atop', 'Atop: erst g, dann f', 'j_atop', `
**Atop komponiert zwei monadische Funktionen.** Aus f und g entsteht eine neue Funktion, die für y zuerst g(y) und danach f auf dieses Ergebnis anwendet. Im Beispiel wird 3 erst zu 4 erhöht und dann quadriert: 16.

Die abgeleitete Funktion wird als Wert an @f gebunden. Ihr Körper wird erst beim Aufruf ausgewertet. Vertausche Quadrat und Inkrement: Dann wird zuerst 3 quadriert und das Ergebnis erhöht, also 10.`),
    step('tour_j_hook', 'Hook: Original und Ableitung', 'j_hook', `
**Ein Hook kombiniert den Eingabewert mit seiner Ableitung.** Die monadische Funktion g berechnet g(y); die dyadische Funktion f erhält anschließend y und g(y). Im Beispiel ist f die Subtraktion und g das Quadrat: 3 minus 9 ergibt -6.

Das unterscheidet sich von Atop: Bei Atop sieht f nur g(y). Beim Hook bleiben beide Werte verfügbar. Diese Rollen sind ausdrücklich festgelegt; der Interpreter muss keine Valenz aus der Position im Array erraten.`),
    step('tour_j_fork', 'Fork: zwei Wege, ein Ergebnis', 'j_fork', `
**Der monadische Fork verzweigt über denselben Wert y.** Der linke Zweig f berechnet f(y), der rechte h berechnet h(y), und die dyadische Mitte g verbindet beide Ergebnisse als g(f(y), h(y)).

Im Beispiel wird 5 links quadriert zu 25 und rechts verdoppelt zu 10. @plus verbindet beide zu 35. Die drei übergebenen Funktionen werden beim Erzeugen des Forks gespeichert; spätere Aufrufe können dieselbe abgeleitete Funktion wiederverwenden.`),
    step('tour_j_order', 'Fork-Zweige haben eine Reihenfolge', 'j_fork_order', `
**Links und rechts sind nicht austauschbar.** Mit @minus in der Mitte wird f(y) minus h(y) berechnet. Der Identitätszweig liefert hier 5, der Quadratzweig 25. Das Ergebnis ist daher -20.

Ein Fork wertet beide Zweige aus, bevor die Mitte aufgerufen wird. Für Funktionen mit externen Effekten wäre diese Reihenfolge wichtig; diese erste J-Bibliothek demonstriert reine Berechnungen und führt keine neue Effektberechtigung ein.`),
  ] },
  { title: '09 · J: Dyaden und Modifikatoren', steps: [
    step('tour_j_fork2', 'Dyadischer Fork mit x und y', 'j_fork2', `
**Fork2 ist ausdrücklich zweistellig.** Beide äußeren Zweige erhalten x und y. Ihre Ergebnisse werden in dieser Reihenfolge an die dyadische Mitte übergeben. Hier ist f die Addition, h die Multiplikation und g die Subtraktion.

Bei x=5 und y=3 berechnet der linke Zweig 8, der rechte 15; die Mitte liefert 8 minus 15 = -7. Anders als im alten FJAT gibt es keine automatische Wahl zwischen monadischem und dyadischem Fork: Der Name @fork2@j macht die Valenz sichtbar.`),
    step('tour_j_each', 'Each hebt eine Funktion über ein Array', 'j_each', `
**Each macht aus einer monadischen Funktion eine Arrayfunktion.** Intern verwendet es die vorhandene Bibliotheksfunktion @map. Das Quadrat wird für jedes Element von [1,2,3] berechnet; das Ergebnis ist [1,4,9].

Das ist eine ausdrückliche Transformation. @times selbst erhält in fjson nicht automatisch ein Array mit Broadcasting-Semantik. Für verschachtelte Arrays, Rank und Cells sind später eigene Regeln nötig.`),
    step('tour_j_insert_sum', 'Insert faltet ein nichtleeres Array', 'j_insert_sum', `
**Insert leitet eine Faltungsfunktion aus einer dyadischen Funktion ab.** Das erste Arrayelement ist der Anfangswert; die übrigen Elemente werden der Reihe nach kombiniert. Mit @plus entsteht die Summe 1+2+3+4 = 10.

Ein leeres Array hat in dieser ersten Bibliothek keine allgemeine Identität und führt zu einem Fehler. Für eine gewünschte Identität, etwa 0 bei Addition, kann man stattdessen die vorhandene @reduce-Funktion mit explizitem Anfangswert verwenden.`),
    step('tour_j_insert_order', 'Insert faltet von links', 'j_insert_order', `
**Die Faltungsrichtung ist Teil der Semantik.** Bei @minus ergibt die linksassoziative Folge (10−3)−2 den Wert 5. Eine rechtsassoziative Auswertung 10−(3−2) ergäbe 9 und wäre eine andere Operation.

Dieses Beispiel ist absichtlich nicht kommutativ. So prüfst du eine Kompositionsregel besser als nur mit Addition: Die Testdaten machen eine vertauschte Reihenfolge sofort sichtbar.`),
    step('tour_j_curry_left', 'Curry bindet das linke Argument', 'j_curry_left', `
**Curry speichert ein Argument einer dyadischen Funktion.** Mit der Seite left und dem Wert 10 entsteht aus @minus eine monadische Funktion für 10−x. Beim Aufruf mit 3 liefert sie 7.

Der gebundene Wert wird einmal beim Erzeugen der Closure ausgewertet. Die neue Funktion hält ihn in ihrer lexikalischen Umgebung fest. Die Seitenauswahl ist ein gewöhnlicher Datenstring, keine neue fjson-Form.`),
    step('tour_j_curry_right', 'Curry bindet das rechte Argument', 'j_curry_right', `
**Die andere Seite ändert die Bedeutung.** Mit right und 10 entsteht die Funktion x−10. Für x=3 ist das Ergebnis -7. Bei @plus wäre der Unterschied unsichtbar; die Subtraktion zeigt ihn direkt.

Die Bibliothek akzeptiert nur left und right. Ein anderer Seitenname ist ein Fehler. Das Beispiel demonstriert, warum partielle Anwendung einer dyadischen Funktion die gebundene Position ausdrücklich benennen sollte.`),
  ] },
  { title: '10 · J: Programme zusammensetzen', steps: [
    step('tour_j_mean', 'Mittelwert ohne neue Syntax', 'j_mean', `
**Kleine Kombinatoren lassen sich zusammensetzen.** Insert mit @plus erzeugt zuerst eine Summenfunktion. Ein Fork verwendet sie als linken Zweig, @length als rechten und @divide als Mitte. Auf [2,4,6] entstehen 12 und 3, also der Mittelwert 4.

Die Datenliste muss nichtleer sein, weil Insert ein erstes Element braucht. Die Division bleibt die gewöhnliche fjson-Bibliotheksfunktion. Es gibt keine versteckte J-Array-Arithmetik oder besondere Mittelwert-Operation im Interpreter.`),
    step('tour_j_compose', 'Atop innerhalb von Each', 'j_each_compose', `
**Modifikatoren können abgeleitete Funktionen weiterverarbeiten.** Atop erzeugt zuerst eine Funktion, die x erhöht und dann quadriert. Each wendet diese neue Funktion auf alle Elemente des Arrays an.

Für [1,2,3] entsteht [4,9,16]. Beachte die Reihenfolge der lokalen Bindungen: @after wird nach @sq und @inc definiert, @all danach. Das nutzt nur die bestehenden lexikalischen Bindungen von @let.`),
    step('tour_j_projection', 'Identität als Fork-Zweig', 'j_identity_branch', `
**Die Identität ist eine Projektion des ganzen Werts.** Links reicht sie y unverändert weiter, rechts berechnet @abs seinen Betrag. @plus kombiniert beide. Für -3 entsteht -3+3 = 0.

Bei einem Array würde die Identität das ganze Array liefern und es nicht elementweise behandeln. Diese Unterscheidung ist für ein späteres Rank- und Cell-Modell wichtig: Solche Regeln gehören nicht automatisch zur heutigen Funktionskomposition.`),
    step('tour_j_array', 'Komposition mit einem Listenwert', 'j_atop_array', `
**Listen können durch Funktionen fließen, ohne automatische Vektorarithmetik.** Atop ruft zuerst @length auf dem ganzen Array auf und übergibt die Zahl 4 an @sqrt. Das Ergebnis ist 2.

Die J-Erweiterung übernimmt hier die Idee der taciten Komposition. Sie übernimmt noch nicht die alte Infix- oder Postfix-Syntax, implizite Trains, Broadcasting oder numerische Tensoroperationen. Diese Grenzen sind bewusst sichtbar, damit Beispiele eindeutig bleiben.`),
  ] },
];

export const tutorialSteps = tutorialGroups.flatMap(group => group.steps);
