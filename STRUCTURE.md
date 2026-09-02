# Struktur – BZWU Milchpraktiker Lerntools

Diese Datei definiert die kanonischen Namen für Module, Tool-Typen und Ordner.
**Immer hier nachschauen bevor eine neue Kachel oder ein neues Tool erstellt wird.**

---

## Ordnerstruktur

```
/
├── index.html                          ← Startseite mit Filter-Pills
├── style.css                           ← Gemeinsames Design-System (BZWU Grundbildung)
├── STRUCTURE.md                        ← Diese Datei
├── assets/
│   ├── quiz-engine.js                   ← Multiple-Choice-Quiz (QuizEngine)
│   ├── zuordnung3.js                    ← 3-Stufen-Muster (Einfach/Mittel/Schwer)
│   ├── lernkaertchen-engine.js          ← Flip-Karten + Richtig/Falsch-Bestätigung (LKEngine)
│   └── logos/
│       ├── bzwu.png                    ← BZWU-Logo (weisser Hintergrund)
│       └── milchtechnologen.svg        ← Branchenlogo
└── tools/
    ├── einheiten-trainer.html
```

---

## Module

✅ = Tools vorhanden · 🔲 = noch keine Tools

| `data-module` | Badge | Sektions-Titel                             | Ordner                          | Status |
|---------------|-------|--------------------------------------------|---------------------------------|--------|


> **Animation** ist nur ein Tool-Typ, kein eigenes Modul. Eine Animation gehört zu ihrem
> Themen-Modul (`data-module="butter"` usw.), liegt physisch im Themen-Modulordner und erscheint
> auf der Startseite in dieser Modul-Sektion — genau wie jedes andere Tool. Nur `data-type="animation"`
> unterscheidet sie. Die Sektion `#section-animationen` / der Modul-Filter "Animationen" bleiben als
> Option bestehen, werden aber nicht mehr aktiv befüllt.

---

## Tool-Typen

| `data-type`        | Badge-Text        | Datei-Beispiel                          | Beschreibung                                            |
|--------------------|-------------------|-----------------------------------------|---------------------------------------------------------|
| `lernkaertchen`    | Lernkärtchen      | `lernkaertchen-sauermilch.html`         | Flip-Karten Begriff ↔ Erklärung, Shuffle, Kategoriefilter |
| `quiz`             | Quiz              | `quiz-qualitaetsmaengel.html`           | Multiple-Choice mit Sofortfeedback und Erklärung        |
| `memory`           | Memory            | `memory-trommelbestandteile.html`       | Paare aufdecken (Bild ↔ Name)                           |
| `sortierer`        | Sortierer         | `sortierer-jogurtherstellung.html`      | Schritte per Drag & Drop in richtige Reihenfolge bringen |
| `zuordnung`        | Zuordnung         | `zuordnung-anlagenteile-stichfest.html` | Begriffe per Drag & Drop auf Nummern/Positionen ziehen  |
| `lueckentext`      | Lückentext        | `lueckentext-saeuregerinnung.html`      | Lücken füllen – Einfach (Wortbank) oder Schwer (Tippen) |
| `fachrechner`      | Fachrechner       | `fachrechner-mischungskreuz.html`       | Fachspezifische Berechnung mit Rechenweg                |
| `trainer`          | Trainer           | `einheiten-trainer.html`               | Randomisierte Aufgaben, nie gleiche Aufgabe zweimal     |
| `wahr-falsch`      | Wahr/Falsch       | `wahr-falsch-sauermilch.html`           | Tinder-Swipe: rechts = wahr, links = falsch             |
| `tabellen-luecken` | Tabellen-Lücken   | `tabellen-luecken-kulturen.html`        | Vergleichstabelle mit Wortbank ausfüllen                |
| `prozessvergleich` | Prozessvergleich  | `prozessvergleich-jogurt.html`          | Zwei Produktionswege nebeneinander, aufklappbare Details |
| `hotspot`          | Hotspot           | `hotspot-bakterienzelle.html`           | Bild mit anklickbaren Zonen (Polygon/Kreis/Polylinie)   |
| `kreuzwortraetsel` | Kreuzworträtsel   | `kreuzwortraetsel-kulturen.html`        | Auto-Gitter aus Fachbegriffen, Hinweise waagrecht/senkrecht |
| `spiel`            | Spiel             | `spiel-homofermentativ.html`            | Geschicklichkeitsspiel (Canvas), Maus/Touch/Tasten, 3 Leben |
| `animation`        | Animation         | `animation-labgerinnung.html`           | Schrittweise SVG-Animation eines Prozesses mit Nav      |
| `prozess-entscheid`| Prozess-Entscheid | `prozess-entscheid-jogurt.html`         | Entscheidung pro Prozessschritt mit Fehleranalyse       |
| `beschriften`      | Beschriften       | `beschriften-oelbrenner.html`           | Bild beschriften, 3 Stufen (Einfach/Mittel/Schwer)      |

---

## Design-System (style.css)

**BZWU Grundbildung Farben:**
- Dunkelblau `--blue-dark: #134061` (Pantone 7694 C) – Header, Buttons, aktive Filter
- Hellblau `--blue-light: #69A9C9` (Pantone 542 C) – sekundäre Elemente
- Blau-Tint `--blue-tint: #ddeef5` – Hintergründe, Badges
- Rot `--red: #CC3333` – nur für Fehler / falsche Antworten

**Logos:** `assets/logos/` – in jedem Header als `.header-logos` eingebunden (auf Mobil ausgeblendet)

---

## Datei-Namenskonvention

```
[typ]-[thema].html

Beispiele:
  lernkaertchen-sauermilchprodukte.html
  quiz-qualitaetsmaengel.html
  memory-trommelbestandteile.html
  sortierer-jogurtherstellung.html
  zuordnung-anlagenteile-stichfest.html
  lueckentext-saeuregerinnung.html
  fachrechner-mischungskreuz.html
  wahr-falsch-sauermilch.html
  tabellen-luecken-kulturen.html
  prozessvergleich-jogurt.html
```

## Bilder-Namenskonvention

```
[modul]_[nr]_[name].[ext]

Beispiele:
  konsummilch_01_Greiferkammerverschluss.png
  sauermilchprodukte_Anlage_stichfest_Nummern.png
```

Bilder liegen immer in `[modulordner]/images/[thema]/`

---

## Corporate Design – Komponentenvorlagen

Jedes neue Tool **muss** diesen Vorlagen folgen. Abweichungen nur bei technischer Notwendigkeit.

---

### Lernkärtchen (Canonical Pattern)

Die Engine ist gemeinsam in **`assets/lernkaertchen-engine.js`** ausgelagert (nicht mehr copy-pasten). Referenz: `butter/lernkaertchen-nachbehandlung.html`, `butter/lernkaertchen-rahmreifung.html`, `frischkaese/lernkaertchen-mozzarella.html` (Init-Aufruf `LKEngine.init({...})`).

**Karten-Grösse:**
- Begriff ↔ Erklärung (kurze Inhalte): `width: 440px; height: 270px`
- Frage ↔ Antwort (K2-Fragen, längere Inhalte): `width: 440px; height: 310px`

**Richtig/Falsch-Bestätigung (Pflicht seit 2026-09):** nach dem Umdrehen erscheinen zwei Buttons "Wusste ich" / "Wusste ich nicht". Als "Wusste ich nicht" markierte Karten werden ans Ende des aktuellen Durchgangs angehängt (nicht neu gemischt); der Durchgang wiederholt sich, bis alle Karten in einem Durchgang "gewusst" wurden. Kein Score/Punktesystem — reine Selbsteinschätzung.

**Neues Tool erstellen:**
1. `<link rel="stylesheet" href="../style.css">` (Card-Flip-/Progress-Bar-CSS ist dort definiert, nicht inline duplizieren).
2. `<script src="../assets/lernkaertchen-engine.js"></script>` einbinden.
3. Eigenes Karten-Array + Markup-Grundgerüst übernehmen, `LKEngine.init({cards, ...})` aufrufen.
4. Steuerung (Vorne/Hinten, Mischen, Kategoriefilter falls gebraucht, Tastatur-Shortcuts ← → Leertaste/Enter S) kommt automatisch aus der Engine.

**Kategorie-Badge-Farben (Standard):**
```javascript
const CATEGORY_COLORS = {
  "Mikrobiologie":       { bg: "#f3e8ff", fg: "#6b21a8" },
  "Chemie & Physik":     { bg: "#dbeeff", fg: "#1e4e8c" },
  "Produktion":          { bg: "#dcfce7", fg: "#15803d" },
  "Zutaten":             { bg: "#fef9c3", fg: "#854d0e" },
  "Recht & Qualität":    { bg: "#fde8ed", fg: "#c40027" },
  "Qualitätsmängel":     { bg: "#ffedd5", fg: "#9a3412" },
  // Subkategorien Qualitätsmängel:
  "Mikrobiologisch":     { bg: "#ffedd5", fg: "#9a3412" },
  "Konsistenz & Struktur": { bg: "#dbeeff", fg: "#1e4e8c" },
  "Geschmack":           { bg: "#dcfce7", fg: "#15803d" },
};
```

---

### Hotspot (Canonical Pattern)

**Zonentypen:**
- `circle` – Kreiszone: `{ type:'circle', cx:50, cy:46, r:35 }` (cx/cy in %, r in px)
- `polygon` – Flächenzone (point-in-polygon): `{ type:'polygon', points:[{cx,cy},...] }`
- `polyline` – Linienzzone (Nähe zur Linie): `{ type:'polyline', tolerance:25, points:[...] }`

**Debug-Modus:** URL-Parameter `?debug` zeigt alle Zonen + Klickkoordinaten zur Kalibrierung.

**Wann welcher Typ:**
- Einzelne Strukturen (Organellen, Punkte): `circle`
- Flächige Bereiche (Cytoplasma, Chromosom): `polygon`
- Ringe, Linien, Kurven (Membran, Geissel): `polyline`

---

### 3-Stufen-Muster / Beschriften (Canonical Pattern)

Die Engine ist gemeinsam in **`assets/zuordnung3.js`** ausgelagert (nicht mehr copy-pasten). Referenz: `frischkaese/beschriften-oelbrenner.html`, `konsummilch/beschriften-milchsammelwagen.html`, `konsummilch/zuordnung-milchzusammensetzung.html`.

**Aufbau:** ein `level-bar` mit drei Buttons (`Zuordnung3.setLevel('einfach'|'mittel'|'schwer')`), Auswertung über `Zuordnung3.checkLevel()`/`resetLevel()`. Modul-eigene Unterschiede (Bild-Tausch pro Stufe, Klick-Toleranzen, Beschriftungstexte) laufen über die `Zuordnung3.init({...})`-Config, nicht über Kopien der Engine.

Kein Debug-/Kalibrierungscode (`?debug`, `drawDebugZones`) in Produktivdateien — Kalibrierung nur temporär lokal einbauen, nie committen.

---

## Checkliste – Neues Tool

1. HTML-Datei im richtigen Modulordner erstellen
2. `<link rel="stylesheet" href="../style.css">` im `<head>`
3. Header mit `.header-text` und `.header-logos` (Pfad `../assets/logos/`)
4. `<a class="back-link" href="../index.html">← Alle Lerntools</a>` oben im `<main>`
5. Kachel in `index.html` in der richtigen Modulsektion eintragen
6. Kachel erhält `data-module="[slug]"` und `data-type="[slug]"` (Werte aus dieser Datei)
7. Neuen `data-type` als Filter-Pill in `index.html` ergänzen
8. `git add / commit / push`
