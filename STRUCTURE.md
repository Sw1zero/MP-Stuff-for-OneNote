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


> **Animationen** ist eine eigenständige Rubrik (kein Modul). Tools vom Typ `animation` werden
> mit `data-module="animationen"` ausgezeichnet und in der Sektion `#section-animationen` gesammelt.
> Die Datei bleibt physisch im Themen-Modulordner (z. B. `frischkaese/`, `halbhartkaese/`); das
> Modul-Badge auf der Kachel zeigt weiterhin das Thema (frischkaese …). `↗ Anim` in der Status-Spalte
> oben heisst: Modul hat (nur) Tools, die unter der Rubrik Animationen gelistet sind.

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

**Karten-Grösse:**
- Begriff ↔ Erklärung (kurze Inhalte): `width: 440px; height: 270px`
- Frage ↔ Antwort (K2-Fragen, längere Inhalte): `width: 440px; height: 310px`

**HTML-Gerüst:**
```html
<div class="scene" id="scene" onclick="flipCard()">
  <div class="card" id="card">
    <div class="card-face card-front">
      <span class="card-category-badge" id="frontLabel"></span>
      <div class="card-term" id="frontTerm"></div>          <!-- oder card-question -->
      <div class="card-hint">Karte umdrehen für die Erklärung</div>
    </div>
    <div class="card-face card-back">
      <span class="card-category-badge" id="backLabel"></span>
      <div class="card-explanation" id="backExplanation"></div>  <!-- oder card-answer -->
    </div>
  </div>
</div>
```

**CSS-Klassen (in style.css definiert):**
- `.scene` – perspektivischer Container
- `.card` – flip-fähige Karte (`transform-style: preserve-3d`)
- `.card.flipped` – rotierter Zustand (`transform: rotateY(180deg)`)
- `.card-face` – gemeinsame Stile für Vorder-/Rückseite
- `.card-front` – weisser Hintergrund (`var(--surface)`)
- `.card-back` – blauer Hintergrund (`var(--blue-light)`)
- `.card-category-badge` – Kategorie-Pill oben links
- `.card-term` – grosser Begriff (1.42rem, fett)
- `.card-question` – K2-Frage (0.97rem, fett) – für Frage-Karten
- `.card-explanation` / `.card-answer` – Erklärungstext Rückseite

**Steuerung (immer gleich):**
```html
<div class="controls">
  <button class="btn btn-ghost"   onclick="prevCard()">← Zurück</button>
  <button class="btn btn-success" onclick="flipCard()">Umdrehen</button>
  <button class="btn btn-ghost"   onclick="nextCard()">Weiter →</button>
</div>
<div class="controls">
  <button class="btn btn-primary" onclick="shuffleCards()">⇄ Mischen</button>
</div>
<p class="keyboard-hint">
  ← → navigieren | Leertaste umdrehen | S mischen
</p>
```

**Keyboard-Shortcuts (immer identisch):**
```javascript
document.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
  if (e.key === 'ArrowRight') nextCard();
  if (e.key === 'ArrowLeft')  prevCard();
  if (e.key === 's' || e.key === 'S') shuffleCards();
});
```

**Fortschrittsanzeige (immer gleich):**
```html
<div class="progress-text" id="progressText"></div>
<div class="progress-bar-wrap">
  <div class="progress-bar-fill" id="progressBar"></div>
</div>
```
```javascript
document.getElementById('progressText').textContent = `Karte ${currentIndex + 1} von ${total}`;
document.getElementById('progressBar').style.width  = `${((currentIndex + 1) / total) * 100}%`;
```

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

## Checkliste – Neues Tool

1. HTML-Datei im richtigen Modulordner erstellen
2. `<link rel="stylesheet" href="../style.css">` im `<head>`
3. Header mit `.header-text` und `.header-logos` (Pfad `../assets/logos/`)
4. `<a class="back-link" href="../index.html">← Alle Lerntools</a>` oben im `<main>`
5. Kachel in `index.html` in der richtigen Modulsektion eintragen
6. Kachel erhält `data-module="[slug]"` und `data-type="[slug]"` (Werte aus dieser Datei)
7. Neuen `data-type` als Filter-Pill in `index.html` ergänzen
8. `git add / commit / push`
