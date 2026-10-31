# Entscheidungen

Hier steht, **warum** das Projekt so gebaut ist, wie es gebaut ist. Eine Datei pro
Entscheidung, fortlaufend nummeriert. Der Code zeigt das _Was_, diese Dateien das _Warum_.

## Übersicht

| Nr.  | Entscheidung                                                                                                   | Status                             | Datum      |
| ---- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- |
| 0001 | [Review-Agent für Pull Requests](0001-pr-review-agent.md)                                                      | akzeptiert                         | 2026-09-09 |
| 0002 | [Preview-App pro Pull Request](0002-pr-preview.md)                                                             | akzeptiert                         | 2026-09-09 |
| 0003 | [Sprach- und Dokumentationsregeln](0003-sprache-und-dokumentation.md)                                          | akzeptiert                         | 2026-09-09 |
| 0004 | [Design-Kit bleibt JSX, App bleibt TSX](0004-design-kit-und-frontend.md)                                       | akzeptiert                         | 2026-09-10 |
| 0005 | [Preview nur bei Code-Änderungen](0005-preview-nur-bei-code.md)                                                | ersetzt durch 0042                 | 2026-09-10 |
| 0006 | [Fokus: ein LV vollständig verstehen](0006-fokus-lv-verstehen.md)                                              | akzeptiert                         | 2026-09-11 |
| 0007 | [Previews werden beim Deploy aufgeräumt](0007-previews-im-deploy-aufraeumen.md)                                | akzeptiert                         | 2026-09-11 |
| 0008 | [Positionen als Wolke statt als Ring](0008-graph-layout-positionswolke.md)                                     | ersetzt durch 0035                 | 2026-09-11 |
| 0009 | [Demo-LV in der App](0009-demo-lv.md)                                                                          | akzeptiert                         | 2026-09-11 |
| 0010 | [Positions-Index und vorberechnete Aggregate](0010-positions-index-und-aggregate.md)                           | akzeptiert                         | 2026-09-14 |
| 0011 | [Extraktoren und Fundstellen im Langtext](0011-extraktoren-und-fundstellen.md)                                 | ergänzt durch 0044                 | 2026-09-14 |
| 0012 | [Prüfregeln: Norm-Verweise aus der Referenzdatei](0012-pruefregeln-und-norm-verweise.md)                       | akzeptiert                         | 2026-09-14 |
| 0013 | [Eine Gewerk-Farbskala für alle Ansichten](0013-gewerk-farbskala.md)                                           | ergänzt durch 0043, 0044           | 2026-09-16 |
| 0014 | [Zweites Demo-LV: Angebot mit Preisen](0014-demo-lv-mit-preisen.md)                                            | akzeptiert                         | 2026-09-16 |
| 0015 | [Gewerk aus der Abschnittsüberschrift erben](0015-gewerk-aus-der-abschnittsueberschrift.md)                    | ersetzt durch 0044                 | 2026-09-16 |
| 0016 | [Ähnliche Positionen: wie Bubble sie findet](0016-aehnlichkeit-und-cluster.md)                                 | akzeptiert                         | 2026-09-16 |
| 0017 | [Keine Nutzungsmessung, nur ein Melde-Knopf](0017-keine-nutzungsmessung.md)                                    | ersetzt durch 0056                 | 2026-09-21 |
| 0018 | [Treffer im Graphen: isolieren oder im Ganzen zeigen](0018-graph-treffer-isolation.md)                         | ersetzt durch 0035                 | 2026-09-22 |
| 0019 | [Mengen im Graphen nur innerhalb einer Einheit](0019-mengen-nur-je-einheit.md)                                 | akzeptiert                         | 2026-09-22 |
| 0020 | [Langtext-Vergleich: Wortmenge statt Teilfolge](0020-langtext-vergleich-ohne-bibliothek.md)                    | akzeptiert                         | 2026-09-22 |
| 0021 | [Matrix: Zählregeln und Farbskala](0021-matrix-zaehlregeln.md)                                                 | ersetzt durch 0031                 | 2026-09-22 |
| 0022 | [Export, Druck und Fehlermeldung ohne Request](0022-export-und-druck-ohne-request.md)                          | akzeptiert                         | 2026-09-22 |
| 0023 | [Ansicht, Filter und Auswahl im URL-Fragment](0023-zustand-im-url-fragment.md)                                 | akzeptiert                         | 2026-09-22 |
| 0024 | [Fehler melden ohne GitHub-Konto](0024-fehler-melden-ohne-konto.md)                                            | akzeptiert                         | 2026-09-23 |
| 0025 | [Typecheck läuft auch über die Tests](0025-typecheck-ueber-die-tests.md)                                       | akzeptiert                         | 2026-09-23 |
| 0026 | [Ein Absturz zeigt eine Seite, keine weiße Fläche](0026-absturz-auffangnetz.md)                                | akzeptiert                         | 2026-09-23 |
| 0027 | [Versionsnummer, Changelog und „Über diese App"](0027-versionsnummer-und-ueber-diese-app.md)                   | teilweise ersetzt durch 0079       | 2026-09-24 |
| 0028 | [Zwei Leisten, „Mitnehmen" in die Befehle](0028-zwei-leisten-und-befehle.md)                                   | ersetzt durch 0034                 | 2026-09-24 |
| 0029 | [Markierungen im Graphen: Ringe und Muster](0029-markierungen-im-graphen.md)                                   | akzeptiert                         | 2026-09-25 |
| 0030 | [Material-Filter ausblenden, bis die Liste geprüft ist](0030-material-filter-ausblenden.md)                    | ersetzt durch 0044                 | 2026-10-04 |
| 0031 | [Drei Ansichten statt acht](0031-drei-ansichten.md)                                                            | teilweise ersetzt durch 0034, 0037 | 2026-10-04 |
| 0032 | [STLB-Katalog ohne Spalte `positionsart_default`](0032-stlb-katalog-ohne-positionsart.md)                      | ersetzt durch 0044                 | 2026-10-04 |
| 0033 | [Neuer Look und Dunkelmodus](0033-neuer-look-und-dunkelmodus.md)                                               | teilweise ersetzt durch 0069       | 2026-10-05 |
| 0034 | [Der Graph ist der Hauptscreen](0034-graph-als-hauptscreen.md)                                                 | teilweise ersetzt durch 0038, 0074 | 2026-10-05 |
| 0035 | [Graph: Gliederung „nach LV" oder „frei"](0035-graph-gliederung.md)                                            | ergänzt durch 0040, 0059, 0075     | 2026-10-05 |
| 0036 | [Alle Rechte vorbehalten statt AGPL](0036-alle-rechte-vorbehalten.md)                                          | akzeptiert                         | 2026-10-05 |
| 0037 | [Vergleich als Fenster über dem Graphen](0037-vergleichsfenster.md)                                            | akzeptiert                         | 2026-10-05 |
| 0038 | [Keine Befehlspalette mehr](0038-keine-befehlspalette.md)                                                      | akzeptiert                         | 2026-10-05 |
| 0039 | [Tabelle im eigenen Fenster](0039-tabelle-im-eigenen-fenster.md)                                               | akzeptiert                         | 2026-10-06 |
| 0040 | [Auswertungen aus dem, was im LV steht](0040-auswertung-ohne-klassifizierung.md)                               | akzeptiert                         | 2026-10-08 |
| 0041 | [Workflows: knappe Rechte, Fremd-Actions fest verdrahtet](0041-workflow-rechte-und-pinning.md)                 | akzeptiert                         | 2026-10-10 |
| 0042 | [Preview nur auf Zuruf](0042-preview-auf-zuruf.md)                                                             | akzeptiert                         | 2026-10-10 |
| 0043 | [Punktfarbe im Graphen nach Hauptabschnitt](0043-punktfarbe-nach-abschnitt.md)                                 | akzeptiert                         | 2026-10-10 |
| 0044 | [Leistungsbereich (Gewerk) aus der App entfernt](0044-leistungsbereich-entfernt.md)                            | akzeptiert                         | 2026-10-11 |
| 0045 | [Materialwissen als Tabelle je Material](0045-materialwissen-als-tabelle.md)                                   | akzeptiert                         | 2026-10-11 |
| 0046 | [Zuletzt geöffnete Datei im Browser behalten](0046-letzte-datei-im-browser.md)                                 | akzeptiert                         | 2026-10-12 |
| 0047 | [Eigene Markierungen und Kommentare je Position](0047-kommentare-und-markierungen.md)                          | akzeptiert                         | 2026-10-12 |
| 0048 | [Referenzdaten ohne Kopie im Frontend](0048-referenzdaten-ohne-kopie.md)                                       | akzeptiert                         | 2026-10-14 |
| 0049 | [Prüfregeln als Tabelle, keine wertenden Kennzahlen](0049-pruefregeln-als-tabelle.md)                          | Tabellen-Teil ersetzt durch 0086   | 2026-10-15 |
| 0050 | [Eingabefelder aus der Datei](0050-eingabefelder-aus-der-datei.md)                                             | akzeptiert                         | 2026-10-15 |
| 0052 | [Kein Bauteiltyp](0052-kein-bauteiltyp.md)                                                                     | akzeptiert                         | 2026-10-15 |
| 0051 | [Kein Status-Filter](0051-kein-status-filter.md)                                                               | akzeptiert                         | 2026-10-15 |
| 0053 | [Drei Marker, Kommentar-Verlauf, Mengenstufe, gelernte Begriffe](0053-marker-verlauf-und-gelernte-begriffe.md) | teilweise ersetzt durch 0062       | 2026-10-16 |
| 0054 | [Kern als eigenes Paket im selben Repo](0054-kern-als-paket.md)                                                | akzeptiert                         | 2026-10-17 |
| 0055 | [Positions-Hash und Datei-ID im Link](0055-positions-hash.md)                                                  | akzeptiert                         | 2026-10-17 |
| 0056 | [Anonyme Nutzungszählung mit GoatCounter](0056-anonyme-nutzungszaehlung.md)                                    | akzeptiert                         | 2026-10-17 |
| 0057 | [Notizen hängen am Positions-Hash](0057-notizen-am-positions-hash.md)                                          | akzeptiert                         | 2026-10-17 |
| 0058 | [Schalter „Nicht-Treffer" sitzt in der Suche](0058-nicht-treffer-in-der-suche.md)                              | ergänzt durch 0077                 | 2026-10-19 |
| 0059 | [Matrix als Kacheln, Gliederungswechsel gleitet](0059-matrix-kacheln.md)                                       | akzeptiert                         | 2026-10-19 |
| 0060 | [Wissensgraph als Datenmodell, keine Graph-Datenbank](0060-wissensgraph-als-datenmodell.md)                    | vorgeschlagen                      | 2026-10-21 |
| 0061 | [Notizen als Datei sichern und laden](0061-notizen-sichern-und-laden.md)                                       | akzeptiert                         | 2026-10-21 |
| 0062 | [Fortschritt und „Wichtig" statt drei Marker](0062-fortschritt-und-wichtig.md)                                 | akzeptiert                         | 2026-10-21 |
| 0063 | [Eigene Textmarkierungen im Langtext](0063-anstreichen-im-langtext.md)                                         | ergänzt durch 0077                 | 2026-10-21 |
| 0064 | [Splitscreen neben den Fenstern](0064-splitscreen.md)                                                          | teilweise ersetzt durch 0070, 0074 | 2026-10-22 |
| 0065 | [Filterleiste, Kopfzeile der Positionskarte und Rechtsklick-Menü](0065-filterleiste-kopfzeile-rechtsklick.md)  | akzeptiert                         | 2026-10-22 |
| 0066 | [Als Material gelernte Begriffe stehen im Filter „Material"](0066-gelernte-materialien-im-filter.md)           | akzeptiert                         | 2026-10-22 |
| 0067 | [Tabelle als Arbeitsliste](0067-tabelle-als-arbeitsliste.md)                                                   | akzeptiert                         | 2026-10-22 |
| 0068 | [LV als JSON für das Matching-Labor bauonto](0068-lv-export-fuer-bauonto.md)                                   | vorgeschlagen                      | 2026-10-22 |
| 0069 | [Neuer Name Conocto und Apple-Look](0069-conocto-look.md)                                                      | akzeptiert                         | 2026-10-22 |
| 0070 | [Splitscreen nahtlos, Bereiche stapelbar](0070-splitscreen-nahtlos-stapeln.md)                                 | teilweise ersetzt durch 0073       | 2026-10-23 |
| 0071 | [Kurzumfrage nach einigen Minuten Nutzung](0071-kurzumfrage.md)                                                | akzeptiert                         | 2026-10-23 |
| 0072 | [Begleitdokument als PDF anstreichen und verknüpfen](0072-begleitdokument-pdf.md)                              | ergänzt 0077, teilw. ersetzt 0080  | 2026-10-23 |
| 0073 | [Splitscreen frei teilen, letzte Anordnung merken](0073-splitscreen-frei-teilen-und-merken.md)                 | teilweise ersetzt durch 0074       | 2026-10-23 |
| 0074 | [Nur noch Splitscreen, ein Knopf „Ansicht“](0074-nur-noch-splitscreen.md)                                      | akzeptiert                         | 2026-10-24 |
| 0075 | [Graph: Inseln je Hauptabschnitt, Abschnitt hervorheben](0075-inseln-und-hervorhebung.md)                      | teilweise ersetzt durch 0078       | 2026-10-25 |
| 0076 | [Designsystem als eigenes Paket](0076-designsystem-als-paket.md)                                               | akzeptiert                         | 2026-10-26 |
| 0077 | [Eine Suche für LV und PDFs, Begriff aus dem Text übernehmen](0077-eine-suche-fuer-lv-und-pdf.md)              | ersetzt durch 0084                 | 2026-10-26 |
| 0078 | [Schlanke Startansicht, ein Schalter für blass/ausblenden](0078-schlanke-startansicht-ein-schalter.md)         | akzeptiert                         | 2026-10-26 |
| 0079 | [Logo-Menü gruppiert, Exporte gebündelt](0079-logo-menue-gruppiert.md)                                         | akzeptiert                         | 2026-10-27 |
| 0080 | [Vorschläge im PDF: OZ und Mengen aus dem LV](0080-oz-und-mengen-vorschlaege-im-pdf.md)                        | akzeptiert, teils ersetzt d. 0087  | 2026-10-27 |
| 0081 | [Regeleditor und Regelformat `bubble-rule-v1`](0081-regeleditor-und-regelformat.md)                            | akzeptiert, ergänzt durch 0085     | 2026-10-28 |
| 0082 | [Eigene Domain conocto.app](0082-eigene-domain.md)                                                             | akzeptiert                         | 2026-10-28 |
| 0083 | [Nicht in Suchmaschinen, keine KI-Crawler](0083-nicht-in-suchmaschinen.md)                                     | akzeptiert                         | 2026-10-28 |
| 0084 | [Eigene Suche im PDF](0084-eigene-suche-im-pdf.md)                                                             | akzeptiert                         | 2026-10-28 |
| 0085 | [Ein Regelformat für alles](0085-ein-regelformat-fuer-alles.md)                                                | akzeptiert (Schritt 3 von 5)       | 2026-10-29 |
| 0086 | [Prüfregeln als Regeln](0086-pruefregeln-als-regeln.md)                                                        | akzeptiert                         | 2026-10-30 |
| 0087 | [PDF-Vorschläge als Regeln](0087-pdf-vorschlaege-als-regeln.md)                                                | akzeptiert                         | 2026-10-30 |

## Wann schreibe ich eine neue Datei?

Neue Datei, wenn eine Änderung eine dieser Fragen berührt:

- Kommt eine neue Abhängigkeit, ein neuer Dienst oder ein neuer Workflow dazu?
- Ändert sich etwas an den Architekturregeln aus `.claude/CLAUDE.md`?
- Gab es mehrere sinnvolle Wege und einer wurde bewusst verworfen?
- Muss der Repo-Owner etwas von Hand einstellen (Secrets, Repo-Settings)?

Keine neue Datei für: Bugfixes, Umbenennungen, Tests, Formatierung, normale Features
ohne Weichenstellung.

## Regeln

- Nummern werden nie wiederverwendet. Dateiname: `NNNN-kurzer-titel.md`.
- Eine getroffene Entscheidung wird **nicht umgeschrieben**. Wird sie hinfällig, setzt
  man den Status auf `ersetzt durch NNNN` und schreibt eine neue Datei.
- Erklärung in einfacher Sprache, kurze Sätze, Stichpunkte statt Fließtext.
- Nach dem Anlegen: Zeile in der Übersichtstabelle oben ergänzen.

## Vorlage

```markdown
# NNNN – Titel

- **Status:** akzeptiert
- **Datum:** JJJJ-MM-TT
- **Betrifft:** <Bereich, z. B. CI, Frontend, Parser>

## Worum geht's

Ein bis drei Sätze in einfacher Sprache: welches Problem wird gelöst.

## Entscheidung

Was gilt ab jetzt. Stichpunkte.

## Warum

Die Gründe. Stichpunkte.

## Verworfene Alternativen

- **Option A** – warum nicht.

## Folgen

- Was ändert sich im Alltag, was muss der Repo-Owner einmalig tun.
```
