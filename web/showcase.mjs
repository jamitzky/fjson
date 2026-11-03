// Every lesson is executable fjson. @kommentar and @tipp are ordinary
// declarations, so the source remains valid JSON without a comment syntax.

export const fredData = {
  FirstName: 'Fred', Surname: 'Smith', Age: 28,
  Address: { Street: 'Hursley Park', City: 'Winchester', Postcode: 'SO21 2JN' },
  Phone: [
    { type: 'home', number: '0203 544 1234' },
    { type: 'office', number: '01962 001234' },
    { type: 'office', number: '01962 001235' },
    { type: 'mobile', number: '077 7700 1234' },
  ],
  Email: [
    { type: 'work', address: ['fred.smith@my-work.com', 'fsmith@my-work.com'] },
    { type: 'home', address: ['freddy@my-social.com', 'frederic.smith@very-serious.com'] },
  ],
  Other: {
    'Over 18 ?': true, Misc: null,
    'Alternative.Address': { Street: 'Brick Lane', City: 'London', Postcode: 'E1 6RF' },
  },
};

export const refsData = {
  people: [{ id: 'person:fred', name: 'Fred Smith', employer: { '$ref': 'company:acme' } }],
  companies: [{ id: 'company:acme', name: 'ACME', office: { City: 'Winchester' } }],
};

const lesson = (id, title, note, program, expected, data = null, tip = null) =>
  ({ id, title, note, program, expected, data, tip });
const fizzLabel = ['@if', ['@eq', ['@mod', '@n', 15], 0], 'FizzBuzz',
  ['@if', ['@eq', ['@mod', '@n', 3], 0], 'Fizz',
    ['@if', ['@eq', ['@mod', '@n', 5], 0], 'Buzz', '@n']]];

export const showcaseGroups = [
  { title: '01 · Einstieg und JSON', lessons: [
    lesson('hello', 'Hallo, JSON!', 'Ein gewöhnlicher String ist bereits ein vollständiges fjson-Programm.', 'Hallo fjson!', 'Hallo fjson!'),
    lesson('literal_array', 'Datenarray', 'Ein Array ohne @-Funktionsnamen an erster Stelle wird als Datenarray ausgewertet.', [1, 'zwei', true, null], [1, 'zwei', true, null]),
    lesson('declarations', 'Globale Deklaration', 'Ein Objekt mit @-Schlüsseln bindet Namen. Der letzte Wert ist das Ergebnis.', { '@x': 40, '@antwort': ['@plus', '@x', 2] }, 42),
    lesson('let_local', '@let · lokal', '@let bindet Werte nur für seinen Rumpf.', ['@let', { '@preis': 19, '@anzahl': 3 }, ['@times', '@preis', '@anzahl']], 57),
    lesson('quote_name', '@quote · Bezeichner als Daten', '@quote verhindert die Auflösung von @namen und !Variablen.', ['@quote', ['@unbekannt', '!X']], ['@unbekannt', '!X']),
    lesson('quote_object', '@quote · Deklarationsobjekt als Daten', 'Ohne @quote wäre dieses Objekt eine Deklaration.', ['@quote', { '@farbe': 'blau' }], { '@farbe': 'blau' }),
    lesson('get_data', '@get · Daten lesen', '@data bezeichnet den Inhalt des rechten Daten-Editors.', ['@plus', ['@get', '@data', 'answer'], 1], 42),
    lesson('length', '@length · zählen', '@length zählt die Elemente eines Arrays oder die Felder eines Objekts.', ['@length', ['@get', '@data', 'items']], 3),
  ] },
  { title: '02 · Funktionen und Bindungen', lessons: [
    lesson('function_inc', '@function · Inkrement', 'Eine Funktion ist ein Wert. @let gibt ihr hier den Namen @inc.', ['@let', { '@inc': ['@function', ['@x'], ['@plus', '@x', 1]] }, ['@inc', 41]], 42),
    lesson('function_defaults', '@function · Standardwert', 'Ein Parameterobjekt legt Standardwerte fest; Aufrufe dürfen sie überschreiben.', ['@let', { '@inc': ['@function', { '@x': 1 }, ['@plus', '@x', 1]] }, ['@plus', ['@inc'], ['@inc', 41]]], 44),
    lesson('closure', 'Lexikalische Closure', 'Die Funktion merkt sich @basis aus der Umgebung ihrer Definition.', ['@let', { '@basis': 40, '@addiere': ['@function', ['@x'], ['@plus', '@basis', '@x']] }, ['@addiere', 2]], 42),
    lesson('higher_order', 'Funktion als Argument', '@map erhält eine Funktion als normalen Wert.', ['@let', { '@doppelt': ['@function', ['@x'], ['@times', '@x', 2]] }, ['@map', '@doppelt', [1, 2, 3]]], [2, 4, 6]),
    lesson('apply_native', '@apply · Argumentliste', '@apply ruft eine Funktion mit einer bereits erzeugten Argumentliste auf.', ['@apply', '@plus', [20, 22]], 42),
    lesson('apply_closure', '@apply · eigene Funktion', '@apply funktioniert genauso mit einer fjson-Closure.', ['@apply', ['@function', ['@x'], ['@times', '@x', 2]], [21]], 42),
    lesson('letrec_factorial', '@letrec · Fakultät', '@letrec erlaubt der Funktion, sich im eigenen Rumpf aufzurufen.', ['@letrec', { '@fak': ['@function', ['@n'], ['@if', ['@le', '@n', 1], 1, ['@times', '@n', ['@fak', ['@minus', '@n', 1]]]]] }, ['@fak', 5]], 120),
    lesson('letrec_even', '@letrec · gegenseitige Rekursion', 'Zwei Funktionen können sich mit @letrec gegenseitig aufrufen.', ['@letrec', {
      '@gerade': ['@function', ['@n'], ['@if', ['@le', '@n', 0], true, ['@ungerade', ['@minus', '@n', 1]]]],
      '@ungerade': ['@function', ['@n'], ['@if', ['@le', '@n', 0], false, ['@gerade', ['@minus', '@n', 1]]]],
    }, ['@gerade', 8]], true),
  ] },
  { title: '03 · Entscheidungen und Fehler', lessons: [
    lesson('if_positive', '@if · verzweigen', 'Nur der gewählte Zweig wird ausgewertet.', ['@if', ['@gt', 7, 0], 'positiv', 'nicht positiv'], 'positiv'),
    lesson('if_even', '@if · gerade Zahl', '@mod liefert bei ganzen Zahlen den Rest; @eq vergleicht JSON-Werte.', ['@if', ['@eq', ['@mod', 42, 2], 0], 'gerade', 'ungerade'], 'gerade'),
    lesson('and_short', '@and · Kurzschluss', '@and stoppt beim ersten falschen Wert. @unbekannt wird nicht aufgelöst.', ['@and', 0, '@unbekannt'], 0),
    lesson('and_values', '@and · alle Bedingungen', 'Sind alle Werte wahr, liefert @and den letzten Operanden.', ['@and', ['@gt', 5, 2], ['@lt', 5, 8], 'beide erfüllt'], 'beide erfüllt'),
    lesson('or_fallback', '@or · Ersatzwert', '@or liefert den ersten wahren Wert, hier 42.', ['@or', 0, '', 42], 42),
    lesson('or_short', '@or · Kurzschluss', '@or wertet spätere Operanden nach einem wahren Wert nicht mehr aus.', ['@or', 'gefunden', '@unbekannt'], 'gefunden'),
    lesson('not', '@not · umkehren', '@not ist eine reine Bibliotheksfunktion für die Wahrheit eines Wertes.', ['@not', []], true),
    lesson('try_fallback', '@try · Fehler abfangen', '@try fängt einen Auswertungsfehler und wertet dann den Ersatz aus.', ['@try', ['@get', { answer: 42 }, 'missing'], 42], 42),
    lesson('try_report', '@try · Fehlerobjekt', 'Ohne Ersatz gibt @try ein Objekt mit Fehlertyp und Meldung zurück.', ['@try', '@unbekannt'], { error: 'ResolutionError', message: 'unknown reference: @unbekannt' }),
  ] },
  { title: '04 · Arithmetik', lessons: [
    lesson('arithmetic', '+ − × ÷', 'Die vier Grundrechenarten sind normale Funktionen und lassen sich verschachteln.', ['@divide', ['@plus', ['@times', 6, 7], 2], 2], 22),
    lesson('power_sqrt', 'Potenz und Wurzel', '@pow berechnet Potenzen, @sqrt die nichtnegative Quadratwurzel.', ['@sqrt', ['@pow', 12, 2]], 12),
    lesson('modulo', 'Modulo mit negativen Zahlen', '@mod arbeitet mit ganzen Zahlen; der Rest folgt dem Vorzeichen des Divisors.', ['@mod', -7, 3], 2),
    lesson('rounding', 'Runden und Abschneiden', '@floor, @ceil, @trunc und @round unterscheiden sich bei negativen Werten.', [['@floor', -2.7], ['@ceil', -2.7], ['@trunc', -2.7], ['@round', -2.5]], [-3, -2, -2, -3]),
    lesson('minmax', 'Minimum und Maximum', '@min und @max vergleichen zwei Zahlen.', ['@minus', ['@max', 12, 7], ['@min', 12, 7]], 5),
    lesson('absolute', 'Betrag und Vorzeichen', '@abs liefert einen Betrag; @negate wechselt das Vorzeichen.', ['@plus', ['@abs', -9], ['@negate', 2]], 7),
    lesson('comparisons', 'Zahlen vergleichen', '@lt, @le, @gt und @gte liefern boolesche Werte. @ge gehört dagegen zur verzögerten Logik.', [['@lt', 2, 3], ['@le', 3, 3], ['@gt', 4, 3], ['@gte', 3, 3]], [true, true, true, true]),
  ] },
  { title: '05 · Bereiche und Listen', lessons: [
    lesson('range_simple', '@range · 0 bis n−1', '@range mit einem Argument beginnt bei null; das Ende ist exklusiv.', ['@range', 5], [0, 1, 2, 3, 4]),
    lesson('range_steps', '@range · Schrittweite', 'Start, exklusives Ende und Schrittweite können ausdrücklich angegeben werden.', ['@range', 2, 11, 2], [2, 4, 6, 8, 10]),
    lesson('range_backwards', '@range · rückwärts', 'Mit negativer Schrittweite kann ein Bereich absteigen.', ['@range', 5, 0, -1], [5, 4, 3, 2, 1]),
    lesson('map_squares', '@map · Quadrate', '@map ruft die Funktion für jedes Element auf und sammelt die Ergebnisse.', ['@map', ['@function', ['@x'], ['@times', '@x', '@x']], ['@range', 1, 6]], [1, 4, 9, 16, 25]),
    lesson('map_rows', '@map · Objekte bauen', 'Eine Funktion darf für jedes Element ein neues JSON-Objekt erzeugen.', ['@map', ['@function', ['@n'], { number: '@n', square: ['@times', '@n', '@n'] }], ['@range', 1, 4]], [{ number: 1, square: 1 }, { number: 2, square: 4 }, { number: 3, square: 9 }]),
    lesson('filter_even', '@filter · gerade Zahlen', '@filter behält ein Element, wenn die Funktion einen wahren Wert liefert.', ['@filter', ['@function', ['@n'], ['@eq', ['@mod', '@n', 2], 0]], ['@range', 1, 11]], [2, 4, 6, 8, 10]),
    lesson('reduce_sum', '@reduce · Summe', '@reduce erhält eine Funktion, ein Array und einen Anfangswert.', ['@reduce', '@plus', ['@range', 1, 6], 0], 15),
    lesson('reduce_product', '@reduce · Produkt', 'Mit @times statt @plus wird aus derselben Struktur ein Produkt.', ['@reduce', '@times', ['@range', 1, 6], 1], 120),
    lesson('reduce_average', 'Mittelwert', 'map/filter/reduce lassen sich wie gewöhnliche Funktionsaufrufe verschachteln.', ['@let', { '@zahlen': ['@range', 1, 6] }, ['@divide', ['@reduce', '@plus', '@zahlen', 0], ['@length', '@zahlen']]], 3),
    lesson('map_filter_reduce', 'Quadratsumme gerader Zahlen', 'Eine kleine Datenpipeline ohne zusätzliche Sprachsyntax.', ['@reduce', '@plus', ['@map', ['@function', ['@n'], ['@times', '@n', '@n']], ['@filter', ['@function', ['@n'], ['@eq', ['@mod', '@n', 2], 0]], ['@range', 1, 7]]], 0], 56),
    lesson('fizzbuzz', 'FizzBuzz mit @map', 'Eine klassische Transformation: @map erzeugt für jede Zahl einen Wert, @if wählt die Beschriftung.',
      ['@map', ['@function', ['@n'], fizzLabel], ['@range', 1, 16]],
      [1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz']),
    lesson('fred_office_pipeline', 'Freds Büronummern ohne Logik', '@filter und @map können denselben Datensatz auch funktional abfragen.', ['@map',
      ['@function', ['@phone'], ['@get', '@phone', 'number']],
      ['@filter', ['@function', ['@phone'], ['@eq', ['@get', '@phone', 'type'], 'office']],
        ['@get', '@data', 'Phone']]], ['01962 001234', '01962 001235'], 'fred'),
  ] },
  { title: '06 · Logik und JSON-Daten', lessons: [
    lesson('logic_unify', '@unify · Variable binden', '@run löst ein Goal und ersetzt !X im Ergebnis durch seinen gebundenen Wert.', ['@run', 1, '!X', ['@unify', '!X', 42]], [42]),
    lesson('logic_choice', '@choice · Alternativen', 'Jede Alternative kann eine eigene Lösung liefern.', ['@run', 2, '!X', ['@choice', ['@unify', '!X', 'Alice'], ['@unify', '!X', 'Bob']]], ['Alice', 'Bob']),
    lesson('logic_match', '@match · Teilobjekt', 'Nicht genannte Felder im Datensatz stören das Muster nicht.', ['@run', 1, '!Name', ['@match', '@data', { FirstName: '!Name', Address: { City: 'Winchester' } }]], ['Fred'], 'fred'),
    lesson('logic_member', '@membero · Arrayelemente', '@membero durchsucht ein Array relational.', ['@run', 4, '!N', ['@membero', [3, 5, 7], '!N']], [3, 5, 7]),
    lesson('logic_path_forward', '@patho · Wert finden', 'Ein bekannter Pfad liefert den Wert an dieser Stelle.', ['@run', 1, '!City', ['@patho', '@data', ['Address', 'City'], '!City']], ['Winchester'], 'fred'),
    lesson('logic_path_reverse', '@patho · Pfad finden', 'Ein unbekannter Pfad kann durch einen bekannten Wert gefunden werden.', ['@run', 1, '!Path', ['@patho', '@data', '!Path', 'London']], [['Other', 'Alternative.Address', 'City']], 'fred'),
    lesson('logic_constraint', '@neqo und @ge · verzögert', 'Constraints bleiben erhalten, bis !Age durch das Muster gebunden ist.', ['@run', 1, '!Age', ['@conj', ['@neqo', '!Age', 17], ['@conj', ['@guard', ['@ge', '!Age', 18]], ['@match', '@data', { Age: '!Age' }]]]], [28], 'fred'),
    lesson('logic_project', '@project · berechnen', '@project übergibt gebundene Logikwerte an eine gewöhnliche Funktion.', ['@run', 1, '!Next', ['@conj', ['@project', '@plus', ['!Age', 1], '!Next'], ['@match', '@data', { Age: '!Age' }]]], [29], 'fred'),
  ] },
  { title: '07 · JSON als Graph', lessons: [
    lesson('graph_edge', '@edgeo · direkte Kante', 'Objektschlüssel und Arrayindizes sind Kanten. Ein Graphknoten bleibt als Handle erhalten.', ['@let', { '@g': ['@graph', '@data'] }, ['@run', 1, '!City', ['@conj', ['@edgeo', '@g', 'Address', '!A'], ['@edgeo', '!A', 'City', '!City']]]], ['Winchester'], 'fred'),
    lesson('graph_matcho', '@matcho · mehrere Büronummern', '@record prüft Teilobjekte; @some liefert für jedes passende Arrayelement eine Lösung.', ['@run', 10, '!Number', ['@matcho', '@data', ['@record', { Phone: ['@some', ['@record', { type: 'office', number: '!Number' }]] }]]], ['01962 001234', '01962 001235'], 'fred'),
    lesson('graph_node', '@nodeo · ID nachschlagen', '@nodeo findet einen Knoten anhand seines id-Feldes.', ['@let', { '@g': ['@graph', '@data'] }, ['@run', 1, '!Name', ['@conj', ['@nodeo', '@g', 'company:acme', '!Company'], ['@edgeo', '!Company', 'name', '!Name']]]], ['ACME'], 'refs'),
    lesson('graph_refs', '@graph · Referenzen folgen', 'Nur {"refs":true} macht aus $ref eine Kante zum Zielobjekt.', ['@let', { '@g': ['@graph', '@data', { refs: true }] }, ['@run', 1, '!City', ['@conj', ['@nodeo', '@g', 'person:fred', '!Person'], ['@patho', '!Person', ['employer', 'office', 'City'], '!City']]]], ['Winchester'], 'refs'),
  ] },
];

export function lessonSource(item) {
  const source = { '@kommentar': 'Hinweis: ' + item.note };
  if (item.tip) source['@tipp'] = 'Tipp: ' + item.tip;
  source['@ergebnis'] = item.program;
  return source;
}

export const shellGroups = [
  { title: 'Schnell rechnen', snippets: [
    { title: '40 + 2', source: ['@plus', 40, 2], expected: 42 },
    { title: 'Quadratwurzel', source: ['@sqrt', 144], expected: 12 },
    { title: 'Modulo', source: ['@mod', -7, 3], expected: 2 },
    { title: 'Runden', source: ['@round', 2.5], expected: 3 },
    { title: 'Bereich', source: ['@range', 1, 6], expected: [1, 2, 3, 4, 5] },
  ] },
  { title: 'Listen', snippets: [
    { title: 'Summe', source: ['@reduce', '@plus', [1, 2, 3, 4], 0], expected: 10 },
    { title: 'Quadrate', source: ['@map', ['@function', ['@x'], ['@times', '@x', '@x']], [1, 2, 3]], expected: [1, 4, 9] },
    { title: 'Gerade Zahlen', source: ['@filter', ['@function', ['@x'], ['@eq', ['@mod', '@x', 2], 0]], [1, 2, 3, 4]], expected: [2, 4] },
  ] },
  { title: 'Daten und Logik', snippets: [
    { title: '@data lesen', source: ['@get', '@data', 'answer'], expected: 41 },
    { title: 'Fred: Stadt', source: ['@get', ['@get', '@data', 'Address'], 'City'], expected: 'Winchester', data: 'fred' },
    { title: 'Zwei Lösungen', source: ['@run', 2, '!X', ['@choice', ['@unify', '!X', 'ja'], ['@unify', '!X', 'nein']]], expected: ['ja', 'nein'] },
  ] },
];
